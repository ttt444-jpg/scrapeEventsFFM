import "./server.js";
import { runScraper } from "./scraper/scrapeRunner.js";
import { ocrFromUrl } from "./utils/ocr.js";
import { llava } from "./utils/ollamaRunner.js";
import { llama32 } from "./utils/ollamaRunner.js";

 runScraper();
// ocrFromUrl("https://berlin.ccc.de/img/logo.png");
//llava();
//llama32();