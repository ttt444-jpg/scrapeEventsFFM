import { loadPage } from "../scraperBase.js";

export async function scrapeBettClub() {
  const url = "https://bett-club.de";
  const $ = await loadPage(url);

  const events = [];

  $(".event-item").each((_, el) => {
    const date = $(el).find(".event-date").text().trim();
    const title = $(el).find(".event-title h2").text().trim();
    const excerpt = $(el).find(".event-title .event-excerpt").text().trim();
    const link = $(el).closest("a").attr("href") || null;

    const img = $(el).find("img");

    let image = img.attr("src") || null;

    // Lazy-load Varianten
    const lazySrc = img.attr("data-src") || img.attr("data-lazy-src");
    const srcset = img.attr("srcset");

    // Falls lazy-src existiert → echtes Bild
    if (lazySrc) {
      image = lazySrc;
    }

    // Falls srcset existiert → erstes Bild nehmen
    else if (srcset) {
      image = srcset.split(" ")[0];
    }

    // Fallbacks rausfiltern
    if (
      image &&
      (image.includes("placeholder") ||
        image.includes("fallback") ||
        image.includes("default"))
    ) {
      image = null;
    }

    events.push({
      date,
      title,
      excerpt,
      link,
      image,
    });
  });

  return {
    site: "Bett Club",
    url,
    events,
  };
}
