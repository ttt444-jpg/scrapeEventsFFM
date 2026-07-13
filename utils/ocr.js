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

// Test
// ocrFromUrl("https://loveyourartist.imgix.net/public/49ac3a92-bea8-43ff-9d17-02c3d7945fdd/1783119326358/bildschirmfoto-2026-07-04-um-005125.png")
//   .then(console.log);
