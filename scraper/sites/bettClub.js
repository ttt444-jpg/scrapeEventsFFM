import { loadPage } from "../scraperBase.js";
import pLimit from "p-limit";
import { parseTimes } from "../../utils/parseTimes.js";

export async function scrapeBettClub() {
  const url = "https://bett-club.de";
  const $ = await loadPage(url);

  const stubs = [];

  $(".event-item").each((_, el) => {
    const date = $(el).find(".event-date").text().trim();
    const title = $(el).find(".event-title h2").text().trim();
    const excerpt = $(el).find(".event-title .event-excerpt").text().trim();
    const link = $(el).closest("a").attr("href") || $(el).find("a").attr("href") || null;

    const img = $(el).find("img");
    let image = img.attr("src") || null;

    // Lazy-load Varianten
    const lazySrc = img.attr("data-src") || img.attr("data-lazy-src");
    const srcset = img.attr("srcset");
    if (lazySrc) {
      image = lazySrc;
    } else if (srcset) {
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

    stubs.push({ date, title, excerpt, link, image });
  });

  // Einlass/Beginn stehen nur auf der Event-Detailseite (.frontbox_meta)
  const limit = pLimit(10);
  const events = await Promise.all(
    stubs.map((s) =>
      limit(async () => {
        let doors = "";
        let start = "";
        if (s.link) {
          try {
            const d = await loadPage(s.link);
            const meta = d(".frontbox_meta p")
              .map((_, p) => d(p).text())
              .get()
              .join(" ");
            ({ doors, start } = parseTimes(meta));
          } catch {
            /* Zeiten sind optional */
          }
        }
        return { ...s, doors, start };
      }),
    ),
  );

  return {
    site: "Bett Club",
    url,
    events,
  };
}
