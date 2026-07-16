import { loadPage } from "../scraperBase.js";

export async function scrapeMousonturm() {
  const url = "https://www.mousonturm.de/en/programm/spielplan/";
  const $ = await loadPage(url);

  const events = [];

  $(".calendar-group").each((_, group) => {
    const root = $(group);

    const weekday = root.find(".calendar-group__weekday").text().trim();
    const dateText = root.find(".calendar-group__date").text().trim();
    const fullDate = `${weekday} ${dateText}`;

    root.find(".calendar-entry").each((_, el) => {
      const entry = $(el);

      const title = entry.find(".calendar-entry__title a").text().trim();

      let link = entry.find(".calendar-entry__title a").attr("href") || null;
      if (link) link = new URL(link, url).href;

      const excerpt = entry.find(".calendar-entry__location").text().trim();

      const categories = entry.find(".entry-tag--category")
        .map((_, el) => $(el).text().trim())
        .get();


      if (categories.includes("Concert")) {
        events.push({
          date: fullDate,
          title,
          excerpt,
          link,
        });
      }
    });
  });

  // 🔥 Jetzt Bilder nachladen
  for (const event of events) {
    if (!event.link) continue;

    try {
      const detail$ = await loadPage(event.link);

      const img = detail$(".article-media-item__image img");

      let imgUrl =
        img.attr("data-src") ||
        img.attr("src") ||
        null;

      if (imgUrl) {
        imgUrl = new URL(imgUrl, event.link).href;
      }

      event.image = imgUrl || null;

    } catch (err) {
      console.error("Fehler beim Laden der Detailseite:", event.link, err);
      event.image = null;
    }
  }

  return {
    site: "Mousonturm",
    url,
    events
  };
}
