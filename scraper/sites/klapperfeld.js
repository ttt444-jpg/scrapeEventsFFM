import { loadPage } from "../scraperBase.js";
import { parseTimes } from "../../utils/parseTimes.js";

const MONTHS_DE = {
  januar: 1, jänner: 1, februar: 2, märz: 3, maerz: 3, april: 4, mai: 5,
  juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12,
};

// Titel enthalten oft mehrdeutige Zahlen vor dem eigentlichen Datum, z.B.
// "...feiert 18. Geburtstag – Sommerfest am 8. August ab 14 Uhr...". Ein
// numerisches Datum ("8.8.2026") hat daher Vorrang; bei ausgeschriebenen
// Monatsnamen gewinnt der Kandidat mit Jahresangabe, sonst der erste mit
// einem gültigen Monatsnamen (verwirft so Zahlen wie "18. Geburtstag").
function extractDate(title) {
  const numeric = title.match(/\b(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?)\b/);
  if (numeric) return numeric[1];

  const candidates = [...title.matchAll(/(\d{1,2})\.?\s*([A-Za-zäöüÄÖÜ]+)(?:\s+(\d{4}))?/g)]
    .map((m) => ({ day: m[1], month: m[2], year: m[3], valid: MONTHS_DE[m[2].toLowerCase()] }))
    .filter((c) => c.valid);

  if (!candidates.length) return "";
  const chosen = candidates.find((c) => c.year) || candidates[0];
  return `${chosen.day}. ${chosen.month}${chosen.year ? " " + chosen.year : ""}`;
}

export async function scrapeKlapperfeld() {
  const year = new Date().getFullYear();
  const baseUrl = `https://www.faitesvotrejeu.org/${year}/`;

  const $ = await loadPage(baseUrl);
  const events = [];

  $("div.td_module_wrap").each((_, el) => {
    const $el = $(el);

    // Titel + Link
    const linkEl = $el.find("h3.entry-title a");
    const link = linkEl.attr("href");
    const title = linkEl.attr("title")?.trim() || linkEl.text().trim();

    // Datum + Uhrzeit aus Titel extrahieren
    const date = extractDate(title);
    const { start } = parseTimes(title);

    // Bild-URL extrahieren
    const imgEl = $el.find("img.entry-thumb");
    const image = imgEl.attr("src") || "";

    events.push({
      date,
      start,
      title,
      link,
      image,
      excerpt: ""
    });
  });

  return {
    site: "Klapperfeld",
    url: baseUrl,
    events
  };
}
