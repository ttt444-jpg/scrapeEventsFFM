import "./server.js";
import { results } from "./data.js";
import { runScraper } from "./scraper/scrapeRunner.js";
import { loadResultsCache } from "./utils/resultsCache.js";

// --no-scrape (oder SCRAPE=0): Server nur mit den zwischengespeicherten
// Ergebnissen aus results.json starten, ohne die Scraper laufen zu lassen.
const noScrape =
  process.argv.includes("--no-scrape") || process.env.SCRAPE === "0";

if (noScrape) {
  const count = loadResultsCache(results);
  console.log(
    count
      ? `Kein Scraping – ${count} Einträge aus results.json geladen`
      : "Kein Scraping – results.json fehlt, bitte einmal ohne --no-scrape starten",
  );
} else {
  setTimeout(() => {
    runScraper();
  }, 1000);
}
