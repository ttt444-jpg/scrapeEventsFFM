import Tesseract from "tesseract.js";
import fetch from "node-fetch";
import fs from "fs";
import sharp from "sharp";

export async function ocrFromUrl(imageUrl) {
  // Bild herunterladen
  const buffer = await fetch(imageUrl).then(r => r.arrayBuffer());

  // Bild preprocessen (Graustufen + Kontrast)
  const processed = await sharp(Buffer.from(buffer))
    .grayscale()           // Farben entfernen → besseres OCR
    .normalize()           // Kontrast erhöhen
    .toFormat("png")       // PNG ist besser als JPG
    .toBuffer();

  const filePath = "temp_ocr.png";
  fs.writeFileSync(filePath, processed);

  // OCR ausführen
  const { data: { text } } = await Tesseract.recognize(filePath, "deu", {
    logger: m => console.log(m) // optional
  });

  return text;
}
