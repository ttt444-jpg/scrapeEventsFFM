import "./server.js";
import { runScraper } from "./scraper/scrapeRunner.js";

setTimeout(() => {
  runScraper();
}, 1000);
