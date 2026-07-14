import { loadPage } from "../scraperBase.js";

export async function scrapeBatschkapp() {
  const url = "https://www.batschkapp.net/batschkapp";
  const $ = await loadPage(url);

  const events = [];

  $(".eventlistitem").each((_, el) => {
    const date = $(el).find(".datum").text().trim();
    const title = $(el).find(".eventlistitemheading").text().trim();
    const excerpt = $(el).find(".eventlistitemsubheading").text().trim();

    // Link steht IMMER im <a> um das eventlistitem herum
    let link = $(el).closest("a").attr("href") || null;
    link = new URL(link, url).href;

    events.push({
      date,
      title,
      excerpt,
      link
    });
  });

  return {
    site: "Batschkapp",
    url,
    events
  };
}
