import { loadPage } from "../scraperBase.js";

export async function scrapeSchonSchoen() {
  const url = "https://www.schon-schoen.de/programm/konzerte.html";
  const $ = await loadPage(url);

  const events = [];

  // Alle Tageszellen mit Events
  $("td.days").each((_, dayCell) => {
    const cell = $(dayCell);

    // Eventtitel vorhanden?
    const titleSpan = cell.find(".eventtitel");
    if (!titleSpan.length) return;

    const title = titleSpan.text().trim();

    // Datum aus dem Header
    const header = cell.find(".header").text().trim(); // z.B. "24 FREITAG"
    const date = header.split(" ")[0]; // "24"

    // ID der Zelle -> e24
    const id = cell.attr("id"); // "e24"
    if (!id) return;

    // Detailinfo steht im nächsten <tr>
    const detailRow = cell.closest("tr").next("tr");
    const detail = detailRow.find("td.detailinfo .event");

    let excerpt = "";
    let description = "";
    let image = null;
    let link = url;

    if (detail.length) {
      // Titel aus Detail (falls besser)
      const h1 = detail.find("h1").text().trim();
      const finalTitle = h1 || title;

      // Bild
      const img = detail.find("img").attr("src");
      if (img) {
        image = img.startsWith("/")
          ? "https://www.schon-schoen.de" + img
          : img;
      }

      // Beschreibung
      const paragraphs = detail.find("p")
        .map((i, el) => $(el).text().trim())
        .get();

      excerpt = paragraphs[0] || "";
      description = paragraphs.join("\n\n");

      // Externer Link (Facebook, Tickets, etc.)
      const externalLink = detail.find("a").attr("href");
      if (externalLink) link = externalLink;

      events.push({
        date,
        title: finalTitle,
        excerpt,
        description,
        image,
        link
      });
    }
  });

  return {
    site: "Schon Schön",
    url,
    events
  };
}
