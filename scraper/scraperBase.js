import axios from "axios";
import * as cheerio from "cheerio";

export async function loadPage(url) {
  const { data: html } = await axios.get(url);
  return cheerio.load(html);
}
