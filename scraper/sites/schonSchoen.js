import { loadPage } from "../scraperBase.js";
import { utils_truncate } from "../../utils/utils.js";

const BASE = "https://www.schon-schoen.de/";

// Absätze, die keine Beschreibung sind (Einlass-Zeile, Ticket-Hinweise, Trenner …)
const NOISE = /^(einlass|beginn|abendkasse|tageskasse|vvk|special guest|präsentiert|[-–—\s]*$)/i;

export async function scrapeSchonSchoen() {
  const url = "https://www.schon-schoen.de/programm/konzerte.html";
  const $ = await loadPage(url);

  const events = [];

  // Zuerst alle Tage mit Event einsammeln (Titel, Datum, Content-ID)
  const stubs = [];

  $("td.days").each((_, dayCell) => {
    const cell = $(dayCell);

    const titleSpan = cell.find(".eventtitel");
    if (!titleSpan.length) return;

    const id = cell.attr("id"); // z.B. "e5"
    if (!id) return;

    const fallbackTitle = titleSpan.text().trim();
    const date = cell.find(".header").text().trim().split(" ")[0]; // "05"

    // Zur Tageszelle "e5" gehört der Detail-Container "ce5" mit data-content
    const contentId = $(`#c${id}`).attr("data-content") || null;

    stubs.push({ id, date, fallbackTitle, contentId });
  });

  for (const stub of stubs) {
    // Ohne Content-ID kein Detail -> nur Basisdaten mit Kalender-Link
    if (!stub.contentId) {
      events.push({
        date: stub.date,
        title: stub.fallbackTitle,
        excerpt: "",
        description: "",
        image: null,
        link: url,
      });
      continue;
    }

    // Eigene Event-Seite auf schon-schoen.de (wird auch vom Kalender per AJAX geladen)
    const eventLink = new URL(`eventreader.html?events=${stub.contentId}`, BASE).href;

    let title = stub.fallbackTitle;
    let excerpt = "";
    let description = "";
    let image = null;

    try {
      const detail$ = await loadPage(eventLink);

      title = detail$("h1").first().text().trim() || stub.fallbackTitle;

      // Event-Foto: erstes echtes Bild aus dem Foto-Ordner (Logos ausklammern)
      const photo = detail$("img")
        .filter((_, img) => (detail$(img).attr("src") || "").includes("files/fotos"))
        .first()
        .attr("src");
      if (photo) image = new URL(photo, BASE).href;

      const paragraphs = detail$(".ce_text p, .ce_text div p")
        .map((_, p) => detail$(p).text().replace(/\s+/g, " ").trim())
        .get()
        .filter((t) => t && !NOISE.test(t) && !/facebook/i.test(t));

      excerpt = utils_truncate(paragraphs[0] || "", 140);
      description = paragraphs.join("\n\n");
    } catch (err) {
      console.error("Schon Schön Detailseite fehlgeschlagen:", eventLink, err.message);
    }

    events.push({
      date: stub.date,
      title,
      excerpt,
      description,
      image,
      link: eventLink,
    });
  }

  return {
    site: "Schon Schön",
    url,
    events,
  };
}
