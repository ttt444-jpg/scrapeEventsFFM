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

      const time = entry.find(".calendar-entry__time").text().trim();
      const excerpt = entry.find(".calendar-entry__location").text().trim();

      // Festival
      const festival = entry.find(".entry-tag--festival").text().trim() || null;

      // Alle Kategorien sammeln
      const categories = entry.find(".entry-tag--category")
        .map((_, el) => $(el).text().trim())
        .get();

      // Ticket
      let ticket = entry.find(".calendar-entry__tickt-button").attr("href") || null;
      if (ticket) ticket = new URL(ticket, url).href;

      // Prüfen ob mindestens eine Kategorie "Concert" ist
      if (categories.includes("Concert")) {
        events.push({
          date: fullDate,
          time,
          title,
          categories,
          festival,
          excerpt,
          link,
          ticket
        });
      }
    });
  });

  return {
    site: "Mousonturm Frankfurt",
    url,
    events
  };
}