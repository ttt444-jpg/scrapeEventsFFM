import { loadPage } from "../scraperBase.js";

export async function scrapeElferClub() {
  const url = "https://elferclub.de/events";
  const $ = await loadPage(url);

  const events = [];

  $("article").each((_, el) => {
    const root = $(el);

    // Datum (deutsche Version)
    const date = root.find(".mb-3 span[x-show=\"language === 'de'\"]").text().trim();

    // Titel
    const title = root.find("h3").text().trim();

    // Link
    let link = root.find("a[href^='/events/']").attr("href") || null;
    if (link) {
      link = new URL(link, url).href;
    }

    // Konzert oder Party 
    const type = root.find("span[x-show=\"language === 'de'\"]").first().text().trim();

    // Bild holen (data-src ist immer vorhanden)
    let image = root.find("img[data-src]").attr("data-src") || null;
    if (image) {
      image = new URL(image, url).href;
    }

    const excerpt = "";

    if (type === "Konzert") {
      events.push({
        date,
        title,
        link,
        image,
        excerpt
      });
    }
  });

  return {
    site: "Elferclub",
    url,
    events
  };
}
