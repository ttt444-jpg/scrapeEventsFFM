import { results } from "../data.js";

import { scrapeBettClub } from "./sites/bettClub.js";
import { scrapeBatschkapp } from "./sites/batschkapp.js";
import { scrapeNachtleben } from "./sites/nachtleben.js";
import { scrapeZoom } from "./sites/zoom.js";
//import { scrapeHafen2 } from "./sites/hafen2.js"; NOT WORKING YET
import { scrapeKlapperfeld } from "./sites/klapperfeld.js";
import { scrapeSchonSchoen } from "./sites/schonSchoen.js";
import { scrapeSchlachthof } from "./sites/schlachthof.js";
import { scrapeDreikoenigskeller } from "./sites/dreikoenigskeller.js";
import { scrapeCave } from "./sites/cave.js";
import { scrapeElferClub } from "./sites/elferClub.js"; // NOT WORKING YET
// weitere Scraper hier importieren

export async function runScraper() {
  const scrapers = [
    scrapeBettClub,
    scrapeBatschkapp,
    scrapeNachtleben,
    scrapeZoom,
    //scrapeHafen2,
    scrapeKlapperfeld,
    scrapeSchonSchoen,
    scrapeSchlachthof,
    scrapeDreikoenigskeller,
    scrapeCave,
    scrapeElferClub,
    // weitere Scraper hier eintragen
  ];

  for (const scraper of scrapers) {
    try {
      const siteData = await scraper();
      results.push(siteData);
    } catch (err) {
      console.error(`Fehler beim Scrapen mit ${scraper.name || "unnamed"}:`, err && err.message ? err.message : err);
      results.push({ site: scraper.name || null, error: err && err.message ? err.message : String(err) });
      // weiter mit dem nächsten Scraper
      continue;
    }
  }

  console.log("Scraping abgeschlossen");
}
