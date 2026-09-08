import { loadPage } from "../scraperBase.js";
import { parseTimes } from "../../utils/parseTimes.js";
import { formatEventDate, eventDateISO } from "../../utils/formatDate.js";

// ichi ichi ist ein Konzert-Veranstalter, kein Venue. Die Shows auf
// https://ichiichi.de/shows/ finden an wechselnden Orten statt – manche davon
// sind schon über einen Venue-Scraper erfasst, manche nicht, manche an
// ungewöhnlichen Orten. Diese Funktion übernimmt eine Show nur dann in die
// Ergebnisse, wenn sie nicht bereits (an irgendeiner Location) gelistet ist.

const SHOWS_URL = "https://ichiichi.de/shows/";

const STOPWORDS = new Set([
  "the", "and", "und", "der", "die", "das", "feat", "featuring", "vs", "live",
  "konzert", "concert", "show", "shows", "fest", "festival", "tour", "support",
  "supports", "present", "presents", "praesentiert", "präsentiert", "tba",
  "day", "floor", "floors", "vol", "uvm", "ao", "with", "mit",
]);

function deaccent(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Signifikante Tokens eines Titels (klein, ohne Klammern/Füllwörter/Kurzwörter)
function titleTokens(title) {
  return new Set(
    deaccent(String(title || "").toLowerCase())
      .replace(/\([^)]*\)/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w)),
  );
}

function shareTitle(a, b) {
  if (!a.size || !b.size) return false;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  if (shared >= 2) return true;
  // Eine Titelmenge komplett in der anderen enthalten + markantes Wort.
  // (gleicher Tag ist bereits Voraussetzung, daher reicht ein 4+-Zeichen-Wort)
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  if ([...small].every((t) => big.has(t))) {
    return [...small].some((t) => t.length >= 4);
  }
  return false;
}

// Normalisierter Venue-Name für den Abgleich mit vorhandenen `site`-Namen.
function normVenue(v) {
  return deaccent(String(v || "").toLowerCase())
    .replace(/^\d+\s*og\.?\s*/i, "") // "2 OG. Dondorf" -> "dondorf"
    .replace(/^(cafe|café)\b/, "cafe")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// ichi-ichi-Venue-Bezeichnungen auf den tatsächlichen Ort abbilden.
const VENUE_ALIASES = {
  dondorf: {
    name: "Schirn Kunsthalle Dondorf",
    address: "Zeppelinallee 13, 60325 Frankfurt am Main",
  },
};

function displayVenue(v) {
  const clean = String(v || "")
    .replace(/^\d+\s*OG\.?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  const alias = VENUE_ALIASES[normVenue(clean)];
  return alias ? alias.name : clean;
}

function venueAliasAddress(v) {
  const alias = VENUE_ALIASES[normVenue(v)];
  return alias ? alias.address : "";
}

// vorhandenes results-Objekt, dessen `site` zum Venue passt (oder null)
function findSite(results, venue) {
  const nv = normVenue(venue);
  if (!nv) return null;
  for (const s of results) {
    if (!s || !s.site) continue;
    const ns = normVenue(s.site);
    if (ns === nv) return s;
    if (nv.length >= 4 && ns.length >= 4 && (ns.includes(nv) || nv.includes(ns))) {
      return s;
    }
  }
  return null;
}

// Größeres Bild aus dem data-srcset ziehen (~768w), sonst data-src.
function pickImage($img) {
  const srcset = $img.attr("data-srcset") || "";
  const m = srcset.match(/(\S+)\s+768w/) || srcset.match(/(\S+)\s+512w/);
  return (m && m[1]) || $img.attr("data-src") || null;
}

async function fetchShows() {
  const $ = await loadPage(SHOWS_URL);
  const shows = [];

  $("div.text.lay-textformat-parent").each((_, el) => {
    const $el = $(el);
    const rawDate = $el.find("p._SubHead span").first().text().trim();
    if (!/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(rawDate)) return; // z.B. "2025" (Fundraiser)

    const title = $el.find("h1").first().text().replace(/\s+/g, " ").trim();
    if (!title) return;

    const ps = $el
      .find("p:not(._SubHead)")
      .map((_, p) => $(p).text().replace(/\s+/g, " ").trim())
      .get()
      .filter(Boolean);

    const timeLine = ps.find((p) => /\b(doors|music|einlass|beginn)\b/i.test(p)) || "";
    const venueLine = ps[ps.length - 1] || "";
    const genre = ps.find((p) => p && p !== timeLine && p !== venueLine) || "";

    const [venueRaw, city] = venueLine.split(/\s*\/\s*/);
    const venue = displayVenue(venueRaw);
    if (!venue) return;
    const aliasAddr = venueAliasAddress(venueRaw);

    const $stack = $el.closest('[data-type="stack"]');
    let link = $stack.find('a[href*="loveyourartist"]').attr("href") || SHOWS_URL;
    let image = pickImage($stack.find("img[data-src]").first());
    if (image) image = new URL(image, SHOWS_URL).href;

    const { doors, start } = parseTimes(timeLine);

    shows.push({
      date: rawDate,
      title,
      excerpt: genre,
      doors,
      start,
      link,
      image,
      venue,
      address: aliasAddr || [venue, (city || "").trim()].filter(Boolean).join(", "),
    });
  });

  return shows;
}

// Übernimmt nicht-doppelte ichi-ichi-Shows in `results` (mutiert das Array).
export async function mergeIchiIchiShows(results, today) {
  const shows = await fetchShows();
  const cutoff = today || new Date().toISOString().slice(0, 10);
  let added = 0;

  for (const show of shows) {
    const date = formatEventDate(show.date);
    const iso = eventDateISO(date);
    if (iso && iso < cutoff) continue; // vorbei

    // Schon irgendwo gelistet? (gleicher Tag + überlappender Titel)
    const showTokens = titleTokens(show.title);
    const dup = results.some((s) =>
      (s.events || []).some(
        (ev) =>
          eventDateISO(ev.date) === iso &&
          shareTitle(showTokens, titleTokens(ev.title)),
      ),
    );
    if (dup) continue;

    const ev = {
      date,
      title: show.title,
      excerpt: show.excerpt,
      doors: show.doors || "",
      start: show.start || "",
      link: show.link,
      image: show.image || null,
      address: show.address,
      promoter: "ichi ichi",
    };

    const site = findSite(results, show.venue);
    if (site) {
      (site.events = site.events || []).push(ev);
    } else {
      let entry = results.find((s) => s.site === show.venue);
      if (!entry) {
        entry = { site: show.venue, url: SHOWS_URL, events: [] };
        results.push(entry);
      }
      entry.events.push(ev);
    }
    added++;
  }

  if (added) console.log(`ichi ichi: ${added} zusätzliche Shows übernommen`);
  return added;
}
