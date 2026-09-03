import puppeteer from "puppeteer";
import { utils_truncate } from "../../utils/utils.js";
import { ocrFlyer } from "../../utils/ollamaRunner.js";

// Yachtklub veröffentlicht sein Programm ausschließlich als Instagram-Posts
// (meist Flyer-Bilder). Deshalb: Profil mit puppeteer rendern, die letzten
// Posts einsammeln und den Flyer-Text auswerten – zuerst über den von
// Instagram mitgelieferten Alt-Text (enthält bereits eine OCR), als Fallback
// per llava-Vision-Modell (utils/ollamaRunner.js).

const PROFILE = "https://www.instagram.com/yachtklub_ffm/";
const MAX_POSTS = 12;
const PAST_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

const MONTHS = {
  januar: 1, jan: 1, january: 1,
  februar: 2, feb: 2, february: 2,
  "märz": 3, maerz: 3, mrz: 3, mar: 3, march: 3,
  april: 4, apr: 4,
  mai: 5, may: 5,
  juni: 6, jun: 6, june: 6,
  juli: 7, jul: 7, july: 7,
  august: 8, aug: 8,
  september: 9, sept: 9, sep: 9,
  oktober: 10, okt: 10, oct: 10, october: 10,
  november: 11, nov: 11,
  dezember: 12, dez: 12, dec: 12, december: 12,
};
const MONTH_KEYS = Object.keys(MONTHS).join("|");
const WEEKDAYS = "MONTAG|DIENSTAG|MITTWOCH|DONNERSTAG|FREITAG|SAMSTAG|SONNTAG";

export async function scrapeYachtclub() {
  const fallback = {
    site: "Yachtclub",
    url: PROFILE,
    events: [
      {
        date: "",
        title: "Yachtklub",
        excerpt: "Programm nur auf Instagram – siehe @yachtklub_ffm",
        link: PROFILE,
        image: "https://yachtklub.de/wp-content/uploads/2022/03/yk_signet.svg",
      },
    ],
  };

  let posts;
  try {
    posts = await fetchRecentPosts();
  } catch (err) {
    console.error("Yachtclub: Instagram (puppeteer) fehlgeschlagen:", err.message);
    return fallback;
  }
  if (!posts.length) return fallback;

  let llavaDown = false;
  const collected = [];

  for (const post of posts) {
    let ocrText = ocrFromAlt(post.alt);

    if (!hasDate(ocrText) && !llavaDown) {
      try {
        const buf = await downloadImage(post.image);
        ocrText = await ocrFlyer(buf);
      } catch (err) {
        llavaDown = true;
        console.error("Yachtclub: llava OCR nicht verfügbar:", err.message);
      }
    }

    if (!ocrText) continue;

    for (const ev of parseFlyer(ocrText, post, extractAuthor(post.alt))) {
      collected.push(ev);
    }
  }

  const events = dedupeUpcoming(collected);
  if (!events.length) return fallback;

  return { site: "Yachtclub", url: PROFILE, events };
}

// --- Instagram ---------------------------------------------------------------

async function fetchRecentPosts() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    );
    await page.goto(PROFILE, { waitUntil: "networkidle2", timeout: 40000 });
    await page.waitForSelector('a[href*="/p/"] img', { timeout: 15000 });

    const posts = await page.evaluate(() => {
      const seen = new Set();
      const out = [];
      for (const a of document.querySelectorAll('a[href*="/p/"]')) {
        const m = a.href.match(/\/p\/([^/]+)\//);
        if (!m || seen.has(m[1])) continue;
        const img = a.querySelector("img");
        if (!img || !img.src) continue;
        seen.add(m[1]);
        out.push({
          link: `https://www.instagram.com/p/${m[1]}/`,
          image: img.src,
          alt: img.getAttribute("alt") || "",
        });
      }
      return out;
    });

    return posts.slice(0, MAX_POSTS);
  } finally {
    await browser.close();
  }
}

async function downloadImage(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Bild-Download HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// --- Flyer-Text ------------------------------------------------------------

// Instagram legt seine eigene Bild-OCR in den Alt-Text: … text that says "…"
function ocrFromAlt(alt) {
  if (!alt) return "";
  const m = alt.match(/text that says\s*["“”«‹]?(.+?)["“”»›]?\.?\s*$/is);
  return (m ? m[1] : "").replace(/[‎‏‪-‮]/g, "").trim();
}

// "Photo by <Name> on <Datum> …" – der Reposter ist oft der Veranstaltungsname
function extractAuthor(alt) {
  const m = alt && alt.match(/^Photo (?:by|shared by)\s+(.+?)\s+on\s+\w+\s+\d/i);
  const name = m ? m[1].trim() : "";
  return /yachtklub/i.test(name) ? "" : name;
}

function hasDate(text) {
  if (!text) return false;
  return (
    /\b\d{1,2}\s*\.\s*\d{1,2}\s*\./.test(text) ||
    new RegExp(`\\b\\d{1,2}\\s*\\.?\\s*(${MONTH_KEYS})\\b`, "i").test(text) ||
    new RegExp(`(${WEEKDAYS})\\s+\\d{1,2}\\b`, "i").test(text)
  );
}

function parseFlyer(text, post, author) {
  const clean = text.replace(/\s+/g, " ").trim();
  const base = { link: post.link, image: post.image };

  // Wochenübersicht: "… DIENSTAG 01 … MITTWOCH 02 … FREITAG 04 …"
  const hits = [...clean.matchAll(new RegExp(`(${WEEKDAYS})\\s+(\\d{1,2})\\b`, "gi"))];
  if (hits.length >= 2) {
    const ctx = monthFromText(clean.slice(0, hits[0].index)) || monthFromText(clean);
    if (ctx) {
      const out = [];
      let { month, year } = ctx;
      let prev = null;
      hits.forEach((h, i) => {
        const day = Number(h[2]);
        if (prev != null && day < prev - 3) {
          month = month === 12 ? 1 : month + 1;
          if (month === 1 && year) year += 1;
        }
        prev = day;
        const from = h.index + h[0].length;
        const to = i + 1 < hits.length ? hits[i + 1].index : clean.length;
        const chunk = tidy(clean.slice(from, to));
        if (!chunk) return;
        out.push({
          ...base,
          date: resolveDate(day, month, year),
          title: utils_truncate(headline(chunk), 90),
          excerpt: utils_truncate(chunk, 160),
        });
      });
      if (out.length) return out;
    }
  }

  // Einzelevent: "20.08.", "23.08.2026" oder "29. august"
  let day;
  let month;
  let year;
  const dm = clean.match(/\b(\d{1,2})\s*\.\s*(\d{1,2})\s*\.(?:\s*(20\d{2}))?/);
  if (dm) {
    [, day, month, year] = dm;
  } else {
    const nm = clean.match(new RegExp(`\\b(\\d{1,2})\\s*\\.?\\s*(${MONTH_KEYS})\\b`, "i"));
    if (nm) {
      day = nm[1];
      month = MONTHS[nm[2].toLowerCase()];
      const y = clean.match(/\b(20\d{2})\b/);
      year = y ? y[1] : null;
    }
  }
  if (!day) return [];

  return [
    {
      ...base,
      date: resolveDate(day, month, year),
      title: author || utils_truncate(headline(clean), 90) || "Yachtklub",
      excerpt: utils_truncate(clean, 160),
    },
  ];
}

function tidy(s) {
  return s
    .replace(/^[\s:–—-]+/, "")
    .replace(/^START:\s*\d{1,2}\s*UHR\s*/i, "")
    .replace(/^ab\s+\d{0,2}\s*uhr:?\s*/i, "")
    .trim();
}

function headline(s) {
  return (s.split(/(?<=[.!?])\s|\s{2,}|,\s(?=[a-zäöü])/)[0] || s).trim();
}

function monthFromText(s) {
  if (!s) return null;
  const m = s.match(new RegExp(`\\b(${MONTH_KEYS})\\b`, "i"));
  if (!m) return null;
  const y = s.match(/\b(20\d{2})\b/);
  return { month: MONTHS[m[1].toLowerCase()], year: y ? Number(y[1]) : null };
}

function resolveDate(day, month, year) {
  day = Number(day);
  month = Number(month);
  if (!year) {
    const now = new Date();
    year = now.getFullYear();
    if (new Date(year, month - 1, day).getTime() < now.getTime() - 31 * 864e5) {
      year += 1;
    }
  }
  return (
    String(day).padStart(2, "0") +
    "." +
    String(month).padStart(2, "0") +
    "." +
    year
  );
}

function dedupeUpcoming(events) {
  const cutoff = Date.now() - PAST_GRACE_MS;
  const map = new Map();

  for (const ev of events) {
    const [d, m, y] = ev.date.split(".").map(Number);
    if (!d || !m || !y) continue;
    if (new Date(y, m - 1, d).getTime() < cutoff) continue;

    const key = `${ev.date}|${ev.title.toLowerCase().slice(0, 32)}`;
    if (!map.has(key)) map.set(key, ev);
  }

  return [...map.values()].sort((a, b) => {
    const pa = a.date.split(".").reverse().join("");
    const pb = b.date.split(".").reverse().join("");
    return pa.localeCompare(pb);
  });
}
