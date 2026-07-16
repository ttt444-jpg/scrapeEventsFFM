import { loadPage } from "../scraperBase.js";

export async function scrapeInDerAu() {
  const url = "https://www.au-frankfurt.org/dates.html";
  const $ = await loadPage(url);

  const events = [];

  $("tr").each((_, tr) => {
    const tds = $(tr).find("td");
    if (tds.length < 3) return;

    const date = $(tds[1]).text().trim();

    // Nur echte Event-Zeilen wie "24.07."
    if (!/^\d{2}\.\d{2}\.$/.test(date)) return;

    const eventCell = $(tds[2]);

    // Titel = Text des ersten <p>
    const title = eventCell.find("p").first().text().trim();

    // Bild: steht IMMER im ersten <p> rechts
    let image = eventCell.find("p").first().find("img").attr("src") || null;
    const imgFull = image ? new URL(image, url).href : null;

    // Alle Absätze sammeln
    const paragraphs = eventCell.find("p").map((_, p) => $(p).text().trim()).get();

    // Beschreibung = alle Absätze außer dem ersten
    const excerpt = paragraphs.slice(1).join("\n\n");

    // Link = Seite selbst (AU hat keine Event-Unterseiten)
    const link = url;

    events.push({
      date,
      title,
      excerpt,
      image: imgFull,
      link
    });
  });

  return {
    site: "In der AU",
    url,
    events
  };
}
