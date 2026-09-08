import { Ollama } from "ollama";
import sharp from "sharp";

const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || "qwen2.5vl:3b";
// Ohne Timeout kann ein einzelner Flyer auf dem RAM-schwachen Server 30-50 min
// dauern und den Scrape ins systemd-Timeout laufen lassen. Nach OCR_TIMEOUT_MS
// brechen wir den Aufruf ab; der Aufrufer (instagramEvents.js) schaltet Vision-
// OCR danach fuer den Rest des Laufs ab und faellt auf den Alt-Text zurueck.
const OCR_TIMEOUT_MS = Number(process.env.OLLAMA_OCR_TIMEOUT_MS || 90_000);
// Not-Aus: Vision-OCR auf diesem Host komplett ueberspringen.
const SKIP_VISION_OCR = /^(1|true|yes)$/i.test(process.env.SKIP_VISION_OCR || "");

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
  if (SKIP_VISION_OCR) return "";

  const imageBase64 = Buffer.isBuffer(imageBuffer)
    ? (await shrink(imageBuffer)).toString("base64")
    : imageBuffer;

  // Eine harte Deadline fuer den GESAMTEN Aufruf. ollama.abort() reicht nicht:
  // solange chat() noch auf die Antwort-Header wartet (Modell-Load + Bild-
  // Prefill dauern auf diesem Server zig Minuten), ist der Request intern noch
  // gar nicht als "laufend" registriert. Wir geben dem Client daher ein eigenes
  // fetch mit AbortSignal, das sowohl den Header-Wait als auch das Stream-Lesen
  // abbricht.
  const deadline = new AbortController();
  const timer = setTimeout(() => {
    deadline.abort(new Error(`Vision-OCR nach ${OCR_TIMEOUT_MS} ms abgebrochen`));
  }, OCR_TIMEOUT_MS);

  const client = new Ollama({
    fetch: (url, init = {}) => {
      const signal = init.signal
        ? AbortSignal.any([init.signal, deadline.signal])
        : deadline.signal;
      return fetch(url, { ...init, signal });
    },
  });

  try {
    // stream: true -> Header kommen frueh; sonst killt undici die Verbindung
    // nach 300s (headersTimeout), wenn die Generierung laenger braucht.
    const stream = await client.chat({
      model: VISION_MODEL,
      stream: true,
      messages: [
        {
          role: "user",
          content:
            "Transkribiere den kompletten sichtbaren Text auf diesem Veranstaltungsflyer " +
            "wortwörtlich, Zeile für Zeile (inklusive Datum, Wochentag, Acts sowie allen " +
            "Uhrzeiten – besonders Einlass und Beginn). " +
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
  } catch (err) {
    if (deadline.signal.aborted) {
      throw deadline.signal.reason instanceof Error
        ? deadline.signal.reason
        : new Error(`Vision-OCR nach ${OCR_TIMEOUT_MS} ms abgebrochen`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
