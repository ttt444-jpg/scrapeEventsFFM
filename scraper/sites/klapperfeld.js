import { loadPage } from "../scraperBase.js";

export async function scrapeKlapperfeld() {
  const year = new Date().getFullYear();
  const baseUrl = `https://www.faitesvotrejeu.org/${year}/`;

  const $ = await loadPage(baseUrl);
  const events = [];

  $("div.td_module_wrap").each((_, el) => {
    const $el = $(el);

    // Titel + Link
    const linkEl = $el.find("h3.entry-title a");
    const link = linkEl.attr("href");
    const title = linkEl.attr("title")?.trim() || linkEl.text().trim();

    // Datum aus Titel extrahieren
    const dateMatch = title.match(/(\d{1,2}\.\d{1,2}(?:\.\d{2,4})?)/);
    const date = dateMatch ? dateMatch[1] : "";

    // Bild-URL extrahieren
    const imgEl = $el.find("img.entry-thumb");
    const image = imgEl.attr("src") || "";

    events.push({
      date,
      title,
      link,
      image,
      excerpt: ""
    });
  });

  return {
    site: "Klapperfeld",
    url: baseUrl,
    events
  };
}
