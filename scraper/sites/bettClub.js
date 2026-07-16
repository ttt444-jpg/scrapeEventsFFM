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

    events.push({
      date,
      title,
      excerpt,
      link
    });
  });

  return {
    site: "Bett Club",
    url,
    events
  };
}