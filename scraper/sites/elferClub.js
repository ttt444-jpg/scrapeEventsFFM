import { loadPage } from "../scraperBase.js";
import pLimit from "p-limit";
import { parseTimes } from "../../utils/parseTimes.js";

export async function scrapeElferClub() {
  const url = "https://elferclub.de/events";
  const $ = await loadPage(url);

  const stubs = [];

  $("article").each((_, el) => {
    const root = $(el);

    // Datum (deutsche Version)
    const date = root.find(".mb-3 span[x-show=\"language === 'de'\"]").text().trim();
    const title = root.find("h3").text().trim();

    let link = root.find("a[href^='/events/']").attr("href") || null;
    if (link) link = new URL(link, url).href;

    // Konzert oder Party
    const type = root.find("span[x-show=\"language === 'de'\"]").first().text().trim();

    let image = root.find("img[data-src]").attr("data-src") || null;
    if (image) image = new URL(image, url).href;

    if (type === "Konzert") {
      stubs.push({ date, title, link, image, excerpt: "" });
    }
  });

  // Uhrzeit steht nur auf der Detailseite ("Uhrzeit: 19:00 - 22:00 Uhr")
  const limit = pLimit(8);
  const events = await Promise.all(
    stubs.map((s) =>
      limit(async () => {
        let doors = "";
        let start = "";
        if (s.link) {
          try {
            const d = await loadPage(s.link);
            const deText = d("[x-show=\"language === 'de'\"]")
              .map((_, e) => d(e).text())
              .get()
              .join(" ");
            ({ doors, start } = parseTimes(deText));
          } catch {
            /* Zeiten sind optional */
          }
        }
        return { ...s, doors, start };
      }),
    ),
  );

  return {
    site: "Elferclub",
    url,
    events,
  };
}
