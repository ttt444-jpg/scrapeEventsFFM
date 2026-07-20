import { loadPage } from "../scraperBase.js";

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
    // Bild liegt im versteckten <span class="hidden"> als <img src="index.php?tinymceimg=...">
    let img = $(el).find("span.hidden img").attr("src") || null;
    const image = img ? new URL(img, url).href : null;

    // --- Excerpt (Kurzbeschreibung) ---
    // Hafen2 hat keinen echten Untertitel → wir nehmen die location-Zeile
    const excerpt = locationText;

    events.push({
      date,
      dayName,
      title,
      excerpt,
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
