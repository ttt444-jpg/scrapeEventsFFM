import { loadPage } from "../scraperBase.js";

export async function scrapeKlapperfeld() {
  const baseUrl = "https://www.faitesvotrejeu.org";

  // 1. Hauptseite laden
  const $main = await loadPage(baseUrl);

  // 2. Monatsprogramm-Link aus dem Menü extrahieren
  const monatsUrl = $main("a")
    .filter((_, el) => $main(el).text().trim() === "Monatsprogramm")
    .attr("href");

  if (!monatsUrl) {
    throw new Error("Monatsprogramm-Link nicht gefunden");
  }

  // 3. Monatsseite laden
  const $ = await loadPage(monatsUrl);

  const events = [];

  // 4. Alle H2/H3 als Event-Startpunkte sammeln
  const dateHeaders = $("h2, h3").filter((_, el) => {
    const text = $(el).text().trim();
    return /\d{2}\.\d{2}\.\d{4}/.test(text); // Datum erkennen
  });

  dateHeaders.each((i, el) => {
    const date = $(el).text().trim();

    // Titel = nächstes H4
    const titleEl = $(el).nextAll("h4").first();
    const title = titleEl.text().trim();

    // Beschreibung = alle <p> bis zum nächsten Datum
    const descriptionParts = [];
    let next = titleEl.next();

    while (next.length) {
      if (next.is("h2") || next.is("h3")) break; // nächstes Event beginnt
      if (next.is("p")) descriptionParts.push(next.text().trim());
      next = next.next();
    }
  
    let excerpt = descriptionParts[0] || "";
    excerpt = excerpt.length > 200 ? excerpt.substring(0, 200) + "..." : excerpt;
    const fullText = descriptionParts.join("\n\n");

    events.push({
      date,
      title,
      excerpt,
      description: fullText,
      link: monatsUrl
    });
  });

  return {
    site: "Klapperfeld",
    url: monatsUrl,
    events
  };
}
