import { loadPage } from "../scraperBase.js";
import { ocrFromUrl } from "../../utils/ocr.js";

// Cave-Events haben kein eigenes Vorschaubild – stattdessen das Club-Logo.
const CAVE_LOGO = "https://www.the-cave.de/Flyer/Logo10002.gif";
// Im Cave beginnt es immer um 22:00 Uhr (steht nicht auf dem Flyer).
const CAVE_START = "22:00";

export async function scrapeCave() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const url = "https://www.the-cave.de/Flyer/PL-" + month + "-26-A21000.gif";
  const $ = await loadPage(url);

  const ocrResult = await ocrFromUrl(url);

  let cleaned = ocrResult.replace(
    /^[\s\S]*?(?=\b(?:MO|DI|MI|DO|FR|SA|SO)\s+\d{2}\.\d{2})/,
    "",
  );

  cleaned = cleaned.replace(/INFOS UND UPDATES[\s\S]*$/i, "");

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  console.log("Lines:", lines);

  const events = [];

  // Zeilenanfang: "FR 04.09" bzw. "FR 04.09.26" – der Rest der Zeile ist
  // "Titel [ - Beschreibung]".
  const dateRegex = /^(?:MO|DI|MI|DO|FR|SA|SO)\s+\d{1,2}\.\d{1,2}\.?(?:\d{2,4})?/i;

  // Das OCR bricht jeden Eintrag auf mehrere Zeilen um. Fortsetzungszeilen
  // (kein Datum am Anfang) an den vorherigen Eintrag anhängen.
  const entries = [];
  for (const line of lines) {
    if (dateRegex.test(line)) entries.push(line);
    else if (entries.length) entries[entries.length - 1] += " " + line;
  }

  for (const entry of entries) {
    const dateMatch = entry.match(dateRegex);
    const date = dateMatch[0].trim();
    const rest = entry.slice(dateMatch[0].length).replace(/\s+/g, " ").trim();

    // Das erste " - " / " – " trennt Titel und Beschreibung; alles Weitere
    // (auch spätere " - ") bleibt Teil der Beschreibung.
    const sep = rest.match(/\s+[–—-]\s+/);
    const title = (sep ? rest.slice(0, sep.index) : rest).trim();
    const excerpt = sep
      ? rest
          .slice(sep.index + sep[0].length)
          .replace(/\s*>\s*/g, " – ") // ">DJ ..." -> " – DJ ..."
          .trim()
      : "";

    events.push({
      date,
      title,
      excerpt,
      doors: "",
      start: CAVE_START,
      link: url,
      image: CAVE_LOGO,
    });
  }
  return {
        site: "Cave",
        url,
        events,
      };
}
