import { results } from "../data.js";
import { formatEventDate, eventDateISO } from "../utils/formatDate.js";
import { saveResultsCache } from "../utils/resultsCache.js";
import { appendScrapeLog } from "../utils/scrapeLog.js";
import { mergeIchiIchiShows } from "./promoters/ichiIchi.js";

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

  // In ein lokales Array sammeln statt direkt in `results` zu schreiben:
  // `results` wird parallel vom Server gelesen (server.js -> refreshResults
  // laedt bei geaenderter results.json per loadResultsCache neu in dasselbe
  // Array). Wuerden wir hier schon waehrend des Scrapens in `results`
  // pushen, koennte so ein Reload mittendrin dazwischenfunken und Eintraege
  // doppelt hinterlassen. Erst am Ende wird `results` in einem Rutsch ersetzt.
  const collected = [];

  for (const scraper of scrapers) {
    try {
      const siteData = await scraper();
      if (siteData && Array.isArray(siteData.events)) {
        for (const ev of siteData.events) {
          ev.date = formatEventDate(ev.date);
          // Zeitfelder vereinheitlichen, damit das Frontend sich darauf verlassen kann
          ev.doors = ev.doors || "";
          ev.start = ev.start || "";
        }
        // Vergangene Termine gar nicht erst speichern (ohne Datum bleibt)
        siteData.events = siteData.events.filter((ev) => {
          const iso = eventDateISO(ev.date);
          return !iso || iso >= today;
        });
      }
      collected.push(siteData);
    } catch (err) {
      console.error(`Fehler beim Scrapen mit ${scraper.name}:`, err.message);
      collected.push({ site: scraper.name, error: err.message });
      continue;
    }
  }

  // Veranstalter ichi ichi: Shows an wechselnden Orten, aber nur wenn sie
  // nicht schon über einen Venue-Scraper erfasst sind.
  try {
    await mergeIchiIchiShows(collected, today);
  } catch (err) {
    console.error("ichi ichi merge fehlgeschlagen:", err.message);
  }

  // ⭐ Alphabetisch sortieren
  collected.sort((a, b) => (a.site || "").localeCompare(b.site || ""));

  // Erst jetzt, synchron und ohne await dazwischen, `results` ersetzen.
  results.length = 0;
  results.push(...collected);

  // Für Starts ohne Scraping (--no-scrape) zwischenspeichern
  saveResultsCache(results);
  appendScrapeLog(results);

  console.log("Scraping abgeschlossen");
}