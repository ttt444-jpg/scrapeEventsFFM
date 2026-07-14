import { loadPage } from "../scraperBase.js";
import { ocrFromUrl } from "../../utils/ocr.js";

export async function scrapeCave() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const url = "https://www.the-cave.de/Flyer/PL-" + month + "-26-A21000.gif";
  const $ = await loadPage(url);

  const ocrResult = await ocrFromUrl(url);

  let cleaned = ocrResult.replace(
    /^[\s\S]*?(?=\b(?:MO|DI|MI|DO|FR|SA|SO)\s+\d{2}\.\d{2})/,
    "",
  );

  cleaned = cleaned.replace(/INFOS UND UPDATES[\s\S]*$/i, "");

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  console.log("Lines:", lines);

  const events = [];

  const dateRegex = /^(MO|DI|MI|DO|FR|SA|SO)\s+\d{2}\.\d{2}/i;

  for (const line of lines) {
    if (dateRegex.test(line)) {
      const [date, rest] = line.split(/\s+(?=[A-ZÄÖÜ])/);
      const [title, excerptStart] = rest.split(" - ");
      events.push({
        date: date.trim(),
        title: title.trim(),
        excerpt: excerptStart ? excerptStart.trim() : "",
        link: url,
      });
    }
  }
  return {
        site: "The Cave",
        url,
        events,
      };
}
