import { loadPage } from "../scraperBase.js";
import pLimit from "p-limit";

export async function scrapeSchlachthof() {
  const url = "https://schlachthof-wiesbaden.de/";
  const $ = await loadPage(url);

  const events = [];

  const items = $("a.border-t.block.group");

  // Maximal 10 Requests gleichzeitig
  const limit = pLimit(10);

  const tasks = [];

  for (const el of items) {
    const item = $(el);

    const link = item.attr("href");
    const date = item.find("div").filter((_, div) => {
      const text = $(div).text().trim();
      return /^\d{1,2}$/.test(text);
    }).text().trim();

    const title = item.find("h2").text().trim();
    const excerpt = item.find("div.mt\\[10px\\]").text().trim();

    // Detailseite als Task
    const task = limit(async () => {
      let image = null;

      if (link) {
        const detailUrl = link.startsWith("http")
          ? link
          : url + link.replace(/^\//, "");

        const $$ = await loadPage(detailUrl);

        image = $$("div.aspect-video img").attr("src") || null;

        if (image && !image.startsWith("http")) {
          image = url + image.replace(/^\//, "");
        }
      }

      return {
        date,
        title,
        excerpt,
        link,
        image,
      };
    });

    tasks.push(task);
  }

  const results = await Promise.all(tasks);

  return {
    site: "Schlachthof Wiesbaden",
    url,
    events: results,
  };
}
