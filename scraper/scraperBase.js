import axios from "axios";
import * as cheerio from "cheerio";
import https from "https";

export async function loadPage(url, { rejectUnauthorized = true, timeout = 10000 } = {}) {
  try {
    const httpsAgent = new https.Agent({ rejectUnauthorized });
    const { data: html } = await axios.get(url, { httpsAgent, timeout });
    return cheerio.load(html);
  } catch (err) {
    err.message = `loadPage(${url}) fehlgeschlagen: ${err.message}`;
    throw err;
  }
}
