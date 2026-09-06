import { loadPage } from "../scraperBase.js";
import { parseTimes } from "../../utils/parseTimes.js";

export async function scrapeHafen2() {
  const url = "https://www.hafen2.net/1-0-Programm.html?show=page&type=art_kat_1";
  const $ = await loadPage(url);

  const events = [];

  $(".contentBox").each((_, el) => {
    // --- Datum ---
    const dayName = $(el).find(".date .left").text().trim();   // SA
    const dayNumber = $(el).find(".date .right").text().trim(); // 29

    // location enthält Datum + Uhrzeit + Preis
    const locationText = $(el).find(".location").text().trim(); // "29.08., 19:00 Uhr, 10 Euro"

    // Datum aus location extrahieren (z.B. "29.08.")
    const dateMatch = locationText.match(/(\d{1,2}\.\d{1,2}\.)/);
    const date = dateMatch ? dateMatch[1] : `${dayNumber}.??.`;

    // --- Titel ---
    const title = $(el).find(".head").text().trim();

    // --- Ticket-Link ---
    let link = $(el).find("a.ticket").attr("href") || null;
    link = link ? new URL(link, url).href : null;

    // --- Bild extrahieren ---
    // Der eigentliche Inhalt steht als HTML-Kommentar in <span class="hidden">,
    // daher gibt es kein echtes <img>-Element – wir parsen die Kommentar-Strings.
    const hiddenHtml = $(el)
      .find("span.hidden")
      .map((_, s) => $(s).html() || "")
      .get()
      .join("\n");
    const imgMatch = hiddenHtml.match(
      /tinymceimg=([^"'&\s\\]+\.(?:jpe?g|png|gif|webp))/i
    );
    const image = imgMatch
      ? new URL("index.php?tinymceimg=" + imgMatch[1], url).href
      : null;

    // "29.08., 19:00 Uhr, 10 Euro" – eine Uhrzeit, als Start gewertet
    const { doors, start } = parseTimes(locationText);

    // --- Excerpt (Kurzbeschreibung) ---
    // Hafen2 hat keinen echten Untertitel → location-Zeile ohne jegliches
    // "DD.MM., HH:MM Uhr" (steht schon in Datum/Zeit oben; taucht auch mitten
    // im Text auf, z.B. "Halle, 10.10., 20:00 Uhr, 15 Euro").
    const excerpt = locationText
      .replace(
        /\d{1,2}\.\d{1,2}\.(?:\d{2,4})?\s*,?\s*\d{1,2}[:.]\d{2}\s*uhr\s*,?/gi,
        " ",
      )
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s,]+|[\s,]+$/g, "")
      .trim();

    events.push({
      date,
      dayName,
      title,
      excerpt,
      doors,
      start,
      link,
      image
    });
  });

  return {
    site: "Hafen 2",
    url,
    events
  };
}
