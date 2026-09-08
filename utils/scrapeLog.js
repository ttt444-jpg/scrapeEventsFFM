import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Protokoll der Scrape-Läufe – eine Zeile pro Lauf:
//   <ISO-Zeit>\t<n> Quellen\t<n> Termine[\tFehler: a, b]
export const SCRAPE_LOG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "scrape.log",
);

const MAX_LINES = 500;

// Hängt den aktuellen Lauf ans Protokoll an (behält die letzten MAX_LINES).
export function appendScrapeLog(results) {
  try {
    const ok = (results || []).filter((s) => s && !s.error);
    const failed = (results || [])
      .filter((s) => s && s.error)
      .map((s) => s.site || "?");
    const events = ok.reduce(
      (n, s) => n + (Array.isArray(s.events) ? s.events.length : 0),
      0,
    );

    let line = `${new Date().toISOString()}\t${ok.length} Quellen\t${events} Termine`;
    if (failed.length) line += `\tFehler: ${failed.join(", ")}`;

    let prev = "";
    try {
      prev = fs.readFileSync(SCRAPE_LOG, "utf8");
    } catch {
      /* Datei existiert noch nicht */
    }
    let all = (prev + line + "\n").split("\n").filter(Boolean);
    if (all.length > MAX_LINES) all = all.slice(-MAX_LINES);
    fs.writeFileSync(SCRAPE_LOG, all.join("\n") + "\n");
  } catch (err) {
    console.error("scrape.log konnte nicht geschrieben werden:", err.message);
  }
}

// Letzten Lauf auslesen: { iso, date, summary } oder null.
export function readLastScrape() {
  try {
    const all = fs.readFileSync(SCRAPE_LOG, "utf8").split("\n").filter(Boolean);
    const last = all[all.length - 1];
    if (!last) return null;
    const [iso, ...rest] = last.split("\t");
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return { iso, date, summary: rest.join(" · ") };
  } catch {
    return null;
  }
}
