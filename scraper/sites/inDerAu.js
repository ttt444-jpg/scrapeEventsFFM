import { loadPage } from "../scraperBase.js";

export async function scrapeInDerAu() {
  const url = "https://www.au-frankfurt.org/dates.html";
  const $ = await loadPage(url);

  const events = [];

  // Jede Event-Zeile hat: <td>WOCHENTAG</td> <td>DATUM</td> <td colspan="3">EVENTBLOCK</td>
  $("tr").each((_, tr) => {
    const tds = $(tr).find("td");

    if (tds.length < 3) return;

    const date = $(tds[1]).text().trim();

    // Nur Zeilen mit echten Events haben ein Datum wie "24.07."
    if (!/^\d{2}\.\d{2}\.$/.test(date)) return;

    const eventCell = $(tds[2]);

    // Titel = gesamter Text des ersten <p>
    const title = eventCell.find("p").first().text().trim();

    // Bild (optional)
    const img = eventCell.find("img").attr("src") || null;
    const imgFull = img ? new URL(img, url).href : null;

    // Alle <p>-Texte sammeln
    const paragraphs = eventCell.find("p").map((_, p) => $(p).text().trim()).get();

    // Beschreibung = alle Absätze außer dem ersten (Titel)
    const excerpt = paragraphs.slice(1).join("\n\n");

    // Links extrahieren
    const link = url;

    events.push({
      date,
      title,
      excerpt,
      img: imgFull,
      link
    });
  });

  return {
    site: "AU Frankfurt",
    url: url,
    events
  };
}
