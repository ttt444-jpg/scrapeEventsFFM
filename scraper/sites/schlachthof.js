import { loadPage } from "../scraperBase.js";

export async function scrapeSchlachthof() {
  const baseUrl = "https://schlachthof-wiesbaden.de/";
  const $ = await loadPage(baseUrl);

  const events = [];

  const items = $("a.border-t.block.group").toArray();

  for (const el of items) {
    const item = $(el);

    const link = item.attr("href");
    const fullLink = link.startsWith("http") ? link : baseUrl + link;

    const date = item.find("div").filter((_, div) => {
      const text = $(div).text().trim();
      return /^\d{1,2}$/.test(text);
    }).text().trim();

    const title = item.find("h2").text().trim();
    const excerpt = item.find("div.mt\\[10px\\]").text().trim();

    // Detailseite laden (jetzt funktioniert await!)
    const detail$ = await loadPage(fullLink);

    const imgSrc = detail$("div.aspect-video img").attr("src");

    const image = imgSrc
      ? (imgSrc.startsWith("http") ? imgSrc : baseUrl + imgSrc)
      : null;

    events.push({
      date,
      title,
      excerpt,
      link: fullLink,
      image,
    });
  }

  return {
    site: "Schlachthof Wiesbaden",
    url: baseUrl,
    events,
  };
}
