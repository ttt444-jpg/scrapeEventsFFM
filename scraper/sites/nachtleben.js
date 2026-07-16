import { loadPage } from "../scraperBase.js";

export async function scrapeNachtleben() {
  const url = "https://www.batschkapp.net/nachtleben";
  const $ = await loadPage(url);

  const events = [];

  $(".eventlistitem").each((_, el) => {
    const date = $(el).find(".datum").text().trim();
    const title = $(el).find(".eventlistitemheading").text().trim();
    const excerpt = $(el).find(".eventlistitemsubheading").text().trim();

    // Link steht IMMER im <a> um das eventlistitem herum
    let link = $(el).closest("a").attr("href") || null;
    link = new URL(link, url).href;

     // Bild holen
    const img = $(el)
      .find(".eventlistimage-container img")
      .attr("src") || null;

    // Absolute URL bauen
    const image = img ? new URL(img, url).href : null;

    events.push({
      date,
      title,
      excerpt,
      image,
      link
    });
  });

  return {
    site: "Nachtleben",
    url,
    events
  };
}
