import ollama from "ollama";
import sharp from "sharp";

const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "qwen2.5vl:3b";

// Verkleinert das Flyer-Bild vor der OCR: weniger Vision-Tokens -> deutlich
// schnellere Inferenz auf schwacher Hardware, ohne dass Text unlesbar wird.
async function shrink(imageBuffer) {
  try {
    return await sharp(imageBuffer)
      .rotate()
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    return imageBuffer; // im Zweifel Originalbild schicken
  }
}

// Liest den kompletten Text eines Veranstaltungsflyers per Vision-Modell aus.
// Erwartet einen Buffer oder einen bereits base64-kodierten String.
export async function ocrFlyer(imageBuffer) {
  const imageBase64 = Buffer.isBuffer(imageBuffer)
    ? (await shrink(imageBuffer)).toString("base64")
    : imageBuffer;

  // stream: true -> Antwort-Header kommen sofort; sonst killt undici die
  // Verbindung nach 300s (headersTimeout), wenn die Generierung laenger braucht.
  const stream = await ollama.chat({
    model: VISION_MODEL,
    stream: true,
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

  let text = "";
  for await (const part of stream) {
    text += part?.message?.content || "";
  }
  text = text.trim();

  return /^KEIN_TEXT\b/i.test(text) ? "" : text;
}
