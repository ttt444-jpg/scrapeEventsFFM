import fetch from "node-fetch";
import * as cheerio from "cheerio";

export async function scrapeHafen2() {
  const url = "https://www.hafen2.net/ajax/programm";

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
      "Referer": "https://www.hafen2.net/1-0-Programm.html?show=page",
      "Cookie": "cookieconsent_status=dismiss"
    }
  });

  const html = await response.text();

  console.log("DEBUG HTML:", html.substring(0, 300));

  const $ = cheerio.load(html);

  const events = [];

  $(".eventlistitem").each((_, el) => {
    const date = $(el).find(".location").text().trim();
    const title = $(el).find(".head").text().trim();
    const excerpt = $(el).find(".eventlistitemsubheading").text().trim();
    const link = $(el).find("a").attr("href") || null;

    events.push({ date, title, excerpt, link });
  });

  return {
    site: "hafen2",
    url,
    events
  };
}