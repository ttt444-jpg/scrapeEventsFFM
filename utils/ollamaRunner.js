import ollama from "ollama";

// Liest den kompletten Text eines Veranstaltungsflyers per Vision-Modell aus.
// Erwartet einen Buffer oder einen bereits base64-kodierten String.
export async function ocrFlyer(imageBuffer) {
  const imageBase64 = Buffer.isBuffer(imageBuffer)
    ? imageBuffer.toString("base64")
    : imageBuffer;

  const response = await ollama.chat({
    model: "qwen2.5vl:7b",
    messages: [
      {
        role: "user",
        content:
          "Transkribiere den kompletten sichtbaren Text auf diesem Veranstaltungsflyer " +
          "wortwörtlich, Zeile für Zeile (inklusive Datum, Wochentag, Uhrzeit und Acts). " +
          "Gib ausschließlich den Text zurück, keine Beschreibung. Kein Text im Bild: KEIN_TEXT",
        images: [imageBase64],
      },
    ],
  });

  const text = response?.message?.content?.trim() || "";
  return /^KEIN_TEXT\b/i.test(text) ? "" : text;
}
