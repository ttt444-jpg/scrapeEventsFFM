import fs from "node:fs";
import puppeteer from "puppeteer";
import { utils_truncate } from "./utils.js";
import { ocrFlyer } from "./ollamaRunner.js";
import { parseTimes } from "./parseTimes.js";

// Manche Locations veröffentlichen ihr Programm nur als Instagram-Posts
// (meist Flyer-Bilder). Diese Helper rendert das Profil mit puppeteer, sammelt
// die letzten Posts und wertet den Flyer-Text aus – zuerst über den von
// Instagram mitgelieferten Alt-Text (enthält bereits eine OCR), als Fallback
// per Vision-Modell (ocrFlyer in utils/ollamaRunner.js).

const MAX_POSTS = 12;
// Vision-OCR ist langsam (~15-45 s/Bild) – nur die neuesten Posts ohne
// Alt-Text-Datum werden per Modell nachgelesen, ältere sind ohnehin vorbei.
const MAX_OCR_CALLS = 6;
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

/**
 * @param {object} opts
 * @param {string} opts.handle           Instagram-Handle ohne @ (z.B. "the_kapelle")
 * @param {string} opts.site             Anzeigename der Location
 * @param {string} [opts.fallbackImage]  Bild für den Fallback-Eintrag
 * @param {string} [opts.fallbackExcerpt]
 */
export async function scrapeInstagramEvents({ handle, site, fallbackImage, fallbackExcerpt }) {
  const profile = `https://www.instagram.com/${handle}/`;

  const fallback = {
    site,
    url: profile,
    events: [
      {
        date: "",
        title: site,
        excerpt: fallbackExcerpt || `Programm nur auf Instagram – siehe @${handle}`,
        link: profile,
        image: fallbackImage || null,
      },
    ],
  };

  let rendered;
  try {
    rendered = await fetchRecentPosts(profile);
  } catch (err) {
    console.error(`${site}: Instagram (puppeteer) fehlgeschlagen:`, err.message);
    return fallback;
  }
  if (!rendered.posts.length) return fallback;

  const ownNames = [handle, site, rendered.accountName]
    .filter(Boolean)
    .map((s) => s.toLowerCase());

  let ocrDown = false;
  let ocrCalls = 0;
  const collected = [];

  for (const post of rendered.posts) {
    let ocrText = ocrFromAlt(post.alt);

    if (!hasDate(ocrText) && !ocrDown && ocrCalls < MAX_OCR_CALLS) {
      try {
        ocrCalls++;
        const buf = await downloadImage(post.image);
        ocrText = await ocrFlyer(buf);
      } catch (err) {
        ocrDown = true;
        console.error(`${site}: Vision-OCR nicht verfügbar:`, err.message);
      }
    }

    if (!ocrText) continue;

    const author = extractAuthor(post.alt, ownNames);
    const anchor = extractPostDate(post.alt); // Post-Datum als Jahres-Anker
    for (const ev of parseFlyer(ocrText, post, author, site, anchor)) {
      collected.push(ev);
    }
  }

  const events = dedupeUpcoming(collected);
  if (!events.length) return fallback;

  return { site, url: profile, events };
}

// --- Instagram -----------------------------------------------------------------

// Instagram liefert Server-/Datacenter-IPs ohne Login nichts aus, sondern
// leitet auf /accounts/login/ um. Wir injizieren daher die Session-Cookies
// eines eingeloggten Browsers. Quelle (in dieser Reihenfolge):
//   1. Env IG_SESSIONID (+ optional IG_DS_USER_ID, IG_CSRFTOKEN)
//   2. Datei ig-session.json im Projektwurzelverzeichnis
//      { "sessionid": "...", "ds_user_id": "...", "csrftoken": "..." }
// sessionid holst du aus den DevTools (Application > Cookies > instagram.com)
// eines Browsers, in dem du bei Instagram eingeloggt bist.
function loadInstagramCookies() {
  let raw = null;
  if (process.env.IG_SESSIONID) {
    raw = {
      sessionid: process.env.IG_SESSIONID,
      ds_user_id: process.env.IG_DS_USER_ID,
      csrftoken: process.env.IG_CSRFTOKEN,
    };
  } else {
    try {
      raw = JSON.parse(
        fs.readFileSync(new URL("../ig-session.json", import.meta.url), "utf8"),
      );
    } catch {
      return [];
    }
  }
  if (!raw || !raw.sessionid) return [];

  const base = { domain: ".instagram.com", path: "/", secure: true };
  const cookies = [{ name: "sessionid", value: String(raw.sessionid), httpOnly: true, ...base }];
  if (raw.ds_user_id)
    cookies.push({ name: "ds_user_id", value: String(raw.ds_user_id), ...base });
  if (raw.csrftoken)
    cookies.push({ name: "csrftoken", value: String(raw.csrftoken), ...base });
  return cookies;
}

async function fetchRecentPosts(profile) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const cookies = loadInstagramCookies();
    if (cookies.length) await browser.setCookie(...cookies);

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    );
    await page.goto(profile, { waitUntil: "networkidle2", timeout: 40000 });

    if (/\/accounts\/login/.test(page.url())) {
      throw new Error(
        cookies.length
          ? "Instagram-Session abgelaufen – ig-session.json / IG_SESSIONID erneuern"
          : "Instagram verlangt Login – ig-session.json bzw. IG_SESSIONID setzen",
      );
    }

    await page.waitForSelector('a[href*="/p/"] img', { timeout: 15000 });

    const accountName = (await page.title()).split(/\s*\(@/)[0].trim();

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

    return { accountName, posts: posts.slice(0, MAX_POSTS) };
  } finally {
    await browser.close();
  }
}

async function downloadImage(src) {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Bild-Download HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// --- Flyer-Text --------------------------------------------------------------

// Instagram legt seine eigene Bild-OCR in den Alt-Text: … text that says "…"
function ocrFromAlt(alt) {
  if (!alt) return "";
  const m = alt.match(/text that says\s*["“”«‹]?(.+?)["“”»›]?\.?\s*$/is);
  return (m ? m[1] : "").replace(/[‎‏‪-‮]/g, "").trim();
}

// "Photo by <Name> on <Datum> …" – der Reposter ist oft der Veranstaltungsname
function extractAuthor(alt, ownNames) {
  const m = alt && alt.match(/^Photo (?:by|shared by)\s+(.+?)\s+on\s+\w+\s+\d/i);
  const name = m ? m[1].trim() : "";
  if (!name || name.startsWith("@")) return "";
  return ownNames.includes(name.toLowerCase()) ? "" : name;
}

// "… on July 09, 2026." – Post-Datum, dient als Jahres-Anker für Flyer ohne Jahr
function extractPostDate(alt) {
  const m = alt && alt.match(/\bon\s+([A-Za-z]+)\s+\d{1,2},\s*(20\d{2})/i);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  return month ? { month, year: Number(m[2]) } : null;
}

function hasDate(text) {
  if (!text) return false;
  return (
    /\b\d{1,2}\s*\.\s*\d{1,2}\s*\./.test(text) ||
    new RegExp(`\\b\\d{1,2}\\s*\\.?\\s*(${MONTH_KEYS})\\b`, "i").test(text) ||
    new RegExp(`\\b(${MONTH_KEYS})\\s+\\d{1,2}`, "i").test(text) ||
    new RegExp(`(${WEEKDAYS})\\s+\\d{1,2}\\b`, "i").test(text)
  );
}

function parseFlyer(text, post, author, site, anchor) {
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
          date: resolveDate(day, month, year, anchor),
          title: utils_truncate(headline(chunk), 90),
          excerpt: utils_truncate(chunk, 160),
          ...parseTimes(chunk),
        });
      });
      if (out.length) return out;
    }
  }

  // Einzelevent
  const found = findSingleDate(clean);
  if (!found) return [];

  return [
    {
      ...base,
      date: resolveDate(found.day, found.month, found.year, anchor),
      title: author || utils_truncate(headline(stripLeadingDate(clean)), 90) || site,
      excerpt: utils_truncate(clean, 160),
      ...parseTimes(clean),
    },
  ];
}

// "20.08.", "23.08.2026", "11. Juli", "July 25th 2026"
function findSingleDate(clean) {
  const dm = clean.match(/\b(\d{1,2})\s*\.\s*(\d{1,2})\s*\.(?:\s*(20\d{2}))?/);
  if (dm) return { day: dm[1], month: dm[2], year: dm[3] };

  const dMon = clean.match(new RegExp(`\\b(\\d{1,2})\\s*\\.?\\s*(${MONTH_KEYS})\\b`, "i"));
  if (dMon) {
    return { day: dMon[1], month: MONTHS[dMon[2].toLowerCase()], year: yearNear(clean) };
  }

  const monD = clean.match(
    new RegExp(`\\b(${MONTH_KEYS})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "i"),
  );
  if (monD) {
    return { day: monD[2], month: MONTHS[monD[1].toLowerCase()], year: yearNear(clean) };
  }

  return null;
}

function yearNear(s) {
  const y = s.match(/\b(20\d{2})\b/);
  return y ? y[1] : null;
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

function stripLeadingDate(s) {
  return s
    .replace(
      new RegExp(
        `^(?:(?:${WEEKDAYS}|MON|TUE|WED|THU|FRI|SAT|SUN)[,.\\s]+)?` +
          `(?:\\d{1,2}\\s*\\.\\s*\\d{1,2}\\s*\\.?(?:\\s*20\\d{2})?` +
          `|\\d{1,2}\\s*\\.?\\s*(?:${MONTH_KEYS})` +
          `|(?:${MONTH_KEYS})\\s+\\d{1,2}(?:st|nd|rd|th)?)[,.\\s]*`,
        "i",
      ),
      "",
    )
    .trim();
}

function monthFromText(s) {
  if (!s) return null;
  const m = s.match(new RegExp(`\\b(${MONTH_KEYS})\\b`, "i"));
  if (!m) return null;
  return { month: MONTHS[m[1].toLowerCase()], year: yearNear(s) ? Number(yearNear(s)) : null };
}

function resolveDate(day, month, year, anchor) {
  day = Number(day);
  month = Number(month);
  if (!year) {
    if (anchor) {
      // Flyer ohne Jahr: Post-Datum als Anker. Event deutlich vor dem
      // Post-Monat => nächstes Jahr (z.B. Post im Dezember, Event im Januar).
      year = anchor.year + (month < anchor.month - 6 ? 1 : 0);
    } else {
      year = new Date().getFullYear();
    }
  }
  return (
    String(day).padStart(2, "0") + "." + String(month).padStart(2, "0") + "." + year
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
