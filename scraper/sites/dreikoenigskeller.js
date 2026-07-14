import { loadPage } from "../scraperBase.js";

export async function scrapeDreikoenigskeller() {
  const url = "https://www.dreikoenigskeller.eu";
  const $ = await loadPage(url);

  const events = [];

  $("article.group").each((_, el) => {
    const item = $(el);

    // Link
    let link = item.find("a").attr("href");

    link = new URL(link, url).href;

    // Datum (z.B. "Di 14.07.2026")
    const date = item.find("div.text-xl").text().trim();

    // Titel
    const title = item.find("h3").text().trim();

    // Excerpt
    const excerpt = item.find("p").text().trim();

    events.push({
      date,
      title,
      excerpt,
      link,
    });
  });

  return {
    site: "Dreikönigskeller",
    url,
    events,
  };
}
