import Tesseract from "tesseract.js";
import fetch from "node-fetch";
import fs from "fs";

export async function ocrFromUrl(imageUrl) {
  // Bild herunterladen
  const buffer = await fetch(imageUrl).then(r => r.arrayBuffer());
  const filePath = "temp_ocr.jpg";
  fs.writeFileSync(filePath, Buffer.from(buffer));

  // OCR direkt ausführen – kein Worker nötig
  const { data: { text } } = await Tesseract.recognize(filePath, "deu");

  return text;
}