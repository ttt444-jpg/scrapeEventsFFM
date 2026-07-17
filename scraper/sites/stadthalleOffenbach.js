import { loadPage } from "../scraperBase.js";
import * as cheerio from "cheerio";
import { utils_truncate } from "../../utils/utils.js";


export async function scrapeStadthalleOffenbach() {
  const url =
    "https://www.offenbach.de/stadtwerke/microsite/stadthalle/besucher/veranstaltungen/veranstaltungkalender.php?form=eventSearch-1.form&sp%3Afulltext%5B%5D=&sp%3AdateRange%5B%5D=empty&sp%3AdateRange%5B%5D=__last__&sp%3AdateFrom%5B%5D=&sp%3AdateTo%5B%5D=&action=submit";
  const $ = await loadPage(url);

  const events = [];

  $("li.SP-TeaserList__item").each((_, el) => {
    const root = $(el);

    // Kategorie (z.B. Ausstellung, Konzert, Theater)
    const category = root.find(".SP-Kicker__text").text().trim();

    // Titel
    const title = root.find(".SP-Teaser__headline__text").text().trim();

    // Link
    let link = root.find(".SP-Teaser__headline__text").attr("href") || null;
    if (link) link = new URL(link, url).href;

    // Datum + Zeit
    const date = root.find(".SP-Scheduling__date").text().trim();

    // Beschreibung
    const excerpt = utils_truncate(root.find(".SP-Teaser__abstract").text().trim(), 100);

    // Bild
    let image = null;

    // 1. normale Bilder
    image =
      root.find(".SP-FixedSize__content").attr("src") ||
      root.find(".SP-Teaser__figure img").attr("src");

    if (!image) {
      // 2. noscript Bilder manuell parsen
      const noscriptHtml = root.find("noscript").html();
      if (noscriptHtml) {
        const $$ = cheerio.load(noscriptHtml);
        image = $$("img").attr("src") || null;
      }
    }

    if (image) image = new URL(image, url).href;

    if (category == "Konzert")
      events.push({
        title,
        date,
        excerpt,
        link,
        image,
      });
  });

  return {
    site: "Stadthalle Offenbach",
    url,
    events,
  };
}
