import { loadPage } from "../scraperBase.js";

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
        const time = json.doorTime || "";

        events.push({
          date,
          title,
          excerpt,
          time,
          link
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