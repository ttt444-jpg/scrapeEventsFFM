import "./server.js";
import { runScraper } from "./scraper/scrapeRunner.js";
import { ocrFromUrl } from "./ocr/ocr.js";
import { llava } from "./ollamaRunner.js";
import { llama32 } from "./ollamaRunner.js";

 runScraper();
// ocrFromUrl("https://berlin.ccc.de/img/logo.png");
//llava();
//llama32();