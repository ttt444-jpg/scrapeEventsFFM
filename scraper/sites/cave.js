import { loadPage } from "../scraperBase.js";
import { ocrFromUrl } from "../../utils/ocr.js";

export async function scrapeCave() {
  const today = new Date();
  const monat = String(today.getMonth() + 1).padStart(2, "0");
  const url = "https://www.the-cave.de/Flyer/PL-" + monat + "-26-A21000.gif";
  const $ = await loadPage(url);

  const events = [];

  const ocrResult = await ocrFromUrl(url);

    let cleaned = ocrResult.replace(
    /^[\s\S]*?(?=\b(?:MO|DI|MI|DO|FR|SA|SO)\s+\d{2}\.\d{2})/,
    "",
  );

  cleaned = cleaned.replace(/INFOS UND UPDATES[\s\S]*$/i, "");

  console.log("OCR Result:", cleaned);

  // events.push({
  //   date,
  //   title,
  //   excerpt,
  //   time,
  //   link
  // });

  // return {
  //   site: "The Cave",
  //   url,
  //   events
  // };
}
