import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Zwischenspeicher, damit der Server ohne erneutes Scrapen starten kann.
const CACHE_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "results.json",
);

// Schreibt die aktuellen Scraper-Ergebnisse nach results.json.
export function saveResultsCache(results) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("results.json konnte nicht gespeichert werden:", err.message);
  }
}

// Lädt results.json in das übergebene results-Array (in place).
// Rückgabe: Anzahl geladener Einträge (0 wenn keine Datei vorhanden).
export function loadResultsCache(results) {
  try {
    const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    if (Array.isArray(data)) {
      results.length = 0;
      results.push(...data);
      return results.length;
    }
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("results.json konnte nicht gelesen werden:", err.message);
    }
  }
  return 0;
}
