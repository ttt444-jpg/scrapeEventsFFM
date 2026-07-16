import { loadPage } from "../scraperBase.js";

export async function scrapeDreikoenigskeller() {
  const baseUrl = "https://www.dreikoenigskeller.eu";
  const $ = await loadPage(baseUrl);

  const events = [];

  const articles = $("article.group");

  for (const el of articles) {
    const item = $(el);

    // Link
    let link = item.find("a").attr("href");
    link = new URL(link, baseUrl).href;

    // Datum
    const date = item.find("div.text-xl").text().trim();

    // Titel
    const title = item.find("h3").text().trim();

    // Excerpt
    const excerpt = item.find("p").text().trim();

    // Detailseite laden
    const detailPage = await loadPage(link);

    // Erstes Bild im Artikel holen
    let image = detailPage("article img").first().attr("src") || null;

    if (image) {
      image = new URL(image, baseUrl).href;
    }

    if (!title.toUpperCase().includes("HOFKNEIPE") && !title.toUpperCase().includes("HOFFEST"))
    {
    events.push({
      date,
      title,
      excerpt,
      link,
      image,
    });
  }}

  return {
    site: "Dreikönigskeller",
    url: baseUrl,
    events,
  };
}
