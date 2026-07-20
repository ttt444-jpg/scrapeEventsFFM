import { results } from "../data.js";

import { scrapeBettClub } from "./sites/bettClub.js";
import { scrapeBatschkapp } from "./sites/batschkapp.js";
import { scrapeNachtleben } from "./sites/nachtleben.js";
import { scrapeZoom } from "./sites/zoom.js";
import { scrapeHafen2 } from "./sites/hafen2.js";
import { scrapeKlapperfeld } from "./sites/klapperfeld.js";
import { scrapeSchonSchoen } from "./sites/schonSchoen.js";
import { scrapeSchlachthof } from "./sites/schlachthof.js";
import { scrapeDreikoenigskeller } from "./sites/dreikoenigskeller.js";
import { scrapeCave } from "./sites/cave.js";
import { scrapeElferClub } from "./sites/elferClub.js";
import { scrapeInDerAu } from "./sites/inDerAu.js";
import { scrapeStadthalleOffenbach } from "./sites/stadthalleOffenbach.js";
import { scrapeMousonturm } from "./sites/mousonturm.js";
import { scrapeHfgKapelle } from "./sites/hfgKapelle.js";
import { scrapeYachtclub } from "./sites/yachtclub.js";
// weitere Scraper hier importieren

export async function runScraper() {
  const scrapers = [
    scrapeBettClub,
    scrapeBatschkapp,
    scrapeNachtleben,
    scrapeZoom,
    scrapeKlapperfeld,
    scrapeSchonSchoen,
    scrapeSchlachthof,
    scrapeDreikoenigskeller,
    scrapeCave,
    scrapeElferClub,
    scrapeInDerAu,
    scrapeStadthalleOffenbach,
    scrapeMousonturm,
    scrapeHfgKapelle,
    scrapeYachtclub,
    scrapeHafen2
  ];

  for (const scraper of scrapers) {
    try {
      const siteData = await scraper();
      results.push(siteData);
    } catch (err) {
      console.error(`Fehler beim Scrapen mit ${scraper.name}:`, err.message);
      results.push({ site: scraper.name, error: err.message });
      continue;
    }
  }

  // ⭐ Alphabetisch sortieren
  results.sort((a, b) => a.site.localeCompare(b.site));

  console.log("Scraping abgeschlossen");
}