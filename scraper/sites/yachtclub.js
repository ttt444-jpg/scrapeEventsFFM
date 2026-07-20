import { loadPage } from "../scraperBase.js";

export async function scrapeYachtclub() {
  const url = "https://www.instagram.com/yachtklub_ffm/";
  const $ = await loadPage(url);

  const events = [];

  const link = url;
  const title = "Yachtclub";
  const date = "";
  const excerpt = "";
  
  const image = new URL("https://yachtklub.de/wp-content/uploads/2022/03/yk_signet.svg").href;

  events.push({
    date,
    title,
    excerpt,
    link,
    image,
  });

  return {
    site: "Yachtclub",
    url,
    events,
  };
}
