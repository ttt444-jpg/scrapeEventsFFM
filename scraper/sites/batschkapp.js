import { loadPage } from "../scraperBase.js";

export async function scrapeBatschkapp() {
  const url = "https://www.batschkapp.net/batschkapp";
  const $ = await loadPage(url);

  const events = [];

  $(".eventlistitem").each((_, el) => {
    const date = $(el).find(".datum").text().trim();
    const title = $(el).find(".eventlistitemheading").text().trim();
    const excerpt = $(el).find(".eventlistitemsubheading").text().trim();

    let link = $(el).closest("a").attr("href") || null;
    link = new URL(link, url).href;

    const img = $(el).find(".eventlistimage-container img").attr("src") || null;
    const image = img ? new URL(img, url).href : null;

    const rubrik = $(el).find(".rubrik").text().trim();

    if (rubrik === "Konzert") {
      events.push({
        date,
        title,
        excerpt,
        link,
        image
      });
    }
  });

  return {
    site: "Batschkapp",
    url,
    events
  };
}
