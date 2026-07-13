import { loadPage } from "../scraperBase.js";

export async function scrapeSchlachthof() {
  const url = "https://schlachthof-wiesbaden.de/";
  const $ = await loadPage(url);

  const events = [];

  $("a.border-t.block.group").each((_, el) => {
    const item = $(el);

    // Link
    const link = item.attr("href");

    // Datum (1–2-stellige Zahl)
    const date = item.find("div").filter((_, div) => {
      const text = $(div).text().trim();
      return /^\d{1,2}$/.test(text);
    }).text().trim();

    // Titel
    const title = item.find("h2").text().trim();

    // Beschreibung / Excerpt
    const excerpt = item.find("div.mt\\[10px\\]").text().trim();

    events.push({
      date,
      title,
      excerpt,
      link,
    });
  });

  return {
    site: "Schlachthof Wiesbaden",
    url,
    events,
  };
}
