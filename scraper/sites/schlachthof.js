import { loadPage } from "../scraperBase.js";

export async function scrapeSchlachthof() {
  const url = "https://schlachthof-wiesbaden.de/";
  const $ = await loadPage(url);

  const events = [];

  $(".event-item").each((_, el) => {
    const datecontainer = $(".sm\\:flex");

    // Wochentag
    const weekday = datecontainer
      .find(".uppercase.hidden.sm\\:inline")
      .text()
      .trim();

    // Tag (Zahl)
    const day = datecontainer.find("div").eq(2).text().trim();

    // Ergebnis
    const date = `${weekday} ${day}`;
    console.log("test");
    console.log("Date:", date);

    const title = $(el).find("tracking-wider text-[25px] sm:text-[50px] xl:text-[60px] 2xl:text-[70px] 3xl:text-[80px] leading-[1.2]sm:leading-[1.15] 2xl:leading-[1.1] w-full font-headline uppercase").text().trim();
    const excerpt = $(el).find(".eventlistitemsubheading").text().trim();
    const link = $(el).closest("a").attr("href") || null;

    events.push({
      date,
      title,
      excerpt,
      link,
    });
  });

  return {
    site: "schlachthof",
    url,
    events,
  };
}
