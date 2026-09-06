import { loadPage } from "../scraperBase.js";
import { isoTime } from "../../utils/parseTimes.js";

export async function scrapeZoom() {
  const url = "https://zoomfrankfurt.com/programm";
  const $ = await loadPage(url);

  const events = [];

  // JSON-LD Event-Daten extrahieren
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());

      // Nur Event-Objekte verwenden
      if (json["@type"] === "Event") {
        const date = json.startDate || "";
        const title = json.name || "";
        const excerpt = json.description || "";
        const link = json.url || "";
        let doors = isoTime(json.doorTime);
        let start = isoTime(json.startDate);
        // Nur eine Zeit bekannt -> gilt als Start
        if (doors && (!start || start === doors)) {
          start = doors;
          doors = "";
        }

        // image kann String, Array oder ImageObject sein
        let rawImg = Array.isArray(json.image) ? json.image[0] : json.image;
        if (rawImg && typeof rawImg === "object") rawImg = rawImg.url;
        const image = rawImg ? new URL(rawImg, url).href : null;

        events.push({
          date,
          title,
          excerpt,
          doors,
          start,
          link,
          image
        });
      }
    } catch (e) {
      // Ungültige JSON-LD Blöcke ignorieren
    }
  });

  return {
    site: "Zoom",
    url,
    events
  };
}