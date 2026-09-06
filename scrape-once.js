// Einmaliger Scrape-Lauf ohne Server: fuellt results.json neu und beendet sich.
// Wird vom systemd-Timer (scrapeeventsffm-scrape.timer) aufgerufen; danach
// startet die Unit den laufenden Server neu, damit er die frischen Daten laedt.
import { results } from "./data.js";
import { runScraper } from "./scraper/scrapeRunner.js";

try {
  await runScraper();
  console.log(`Scrape fertig – ${results.length} Locations in results.json`);
  process.exit(0);
} catch (err) {
  console.error("Scrape fehlgeschlagen:", err);
  process.exit(1);
}
