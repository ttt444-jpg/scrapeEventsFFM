import { results } from "../data.js";
import { formatEventDate, eventDateISO } from "../utils/formatDate.js";
import { saveResultsCache } from "../utils/resultsCache.js";

// Heutiges Datum als "YYYY-MM-DD"
function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate(),
  ).padStart(2, "0")}`;
}

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

  const today = todayISO();

  for (const scraper of scrapers) {
    try {
      const siteData = await scraper();
      if (siteData && Array.isArray(siteData.events)) {
        for (const ev of siteData.events) {
          ev.date = formatEventDate(ev.date);
        }
        // Vergangene Termine gar nicht erst speichern (ohne Datum bleibt)
        siteData.events = siteData.events.filter((ev) => {
          const iso = eventDateISO(ev.date);
          return !iso || iso >= today;
        });
      }
      results.push(siteData);
    } catch (err) {
      console.error(`Fehler beim Scrapen mit ${scraper.name}:`, err.message);
      results.push({ site: scraper.name, error: err.message });
      continue;
    }
  }

  // ⭐ Alphabetisch sortieren
  results.sort((a, b) => a.site.localeCompare(b.site));

  // Für Starts ohne Scraping (--no-scrape) zwischenspeichern
  saveResultsCache(results);

  console.log("Scraping abgeschlossen");
}