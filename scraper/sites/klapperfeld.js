import { loadPage } from "../scraperBase.js";

export async function scrapeKlapperfeld() {
  const year = new Date().getFullYear();
  const baseUrl = `https://www.faitesvotrejeu.org/${year}/`;

  const $ = await loadPage(baseUrl);
  const events = [];

  $("h3.entry-title a").each((_, el) => {
    const $el = $(el);

    const link = $el.attr("href");
    const title = $el.attr("title")?.trim() || $el.text().trim();

    // Datum & Uhrzeit aus dem Titel extrahieren
    const dateMatch = title.match(/(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?)/);

    const date = dateMatch ? dateMatch[1] : "";

    const excerpt = "";

    events.push({
      date,
      title,
      link,
      excerpt
    });
  });

  return {
    site: "Klapperfeld",
    url: baseUrl,
    events
  };
}