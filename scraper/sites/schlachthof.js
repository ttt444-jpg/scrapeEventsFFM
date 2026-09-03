import { loadPage } from "../scraperBase.js";
import pLimit from "p-limit";

export async function scrapeSchlachthof() {
  const url = "https://schlachthof-wiesbaden.de/";
  const $ = await loadPage(url);

  // Nur echte Event-Links, dedupliziert, in Dokumentreihenfolge (= chronologisch)
  const seen = new Set();
  const items = $("a.border-t.block.group")
    .toArray()
    .filter((el) => {
      const href = $(el).attr("href");
      const title = $(el).find("h2").text().trim();
      if (!href || !title || seen.has(href)) return false;
      seen.add(href);
      return true;
    });

  // Auf der Startseite steht pro Event nur der Tag. Der Monat ergibt sich aus
  // der Reihenfolge: sinkt die Tageszahl gegenüber dem Vorgänger, ist ein
  // Monatswechsel passiert.
  const now = new Date();
  let month = now.getMonth() + 1;
  let year = now.getFullYear();
  let prevDay = 0;

  const limit = pLimit(10);
  const tasks = [];

  for (const el of items) {
    const item = $(el);

    const link = item.attr("href");
    const dayText = item
      .find("div")
      .filter((_, div) => /^\d{1,2}$/.test($(div).text().trim()))
      .first()
      .text()
      .trim();
    const day = Number(dayText);
    if (!day) continue;

    if (day < prevDay) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    prevDay = day;

    const date = `${String(day).padStart(2, "0")}.${String(month).padStart(2, "0")}.${year}`;
    const title = item.find("h2").text().trim();
    const excerpt = item.find("div.mt\\[10px\\]").text().trim();

    tasks.push(
      limit(async () => {
        let image = null;

        if (link) {
          const detailUrl = link.startsWith("http")
            ? link
            : url + link.replace(/^\//, "");
          try {
            const $$ = await loadPage(detailUrl);
            image = $$("div.aspect-video img").attr("src") || null;
            if (image && !image.startsWith("http")) {
              image = url + image.replace(/^\//, "");
            }
          } catch {
            /* Bild ist optional */
          }
        }

        return { date, title, excerpt, link, image };
      }),
    );
  }

  const events = await Promise.all(tasks);

  return {
    site: "Schlachthof Wiesbaden",
    url,
    events,
  };
}
