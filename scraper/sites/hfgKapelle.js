import { loadPage } from "../scraperBase.js";

export async function scrapeHfgKapelle() {
  const url = "https://www.instagram.com/the_kapelle/";
  const $ = await loadPage(url);

  const events = [];

  const link = url;
  const title = "HFG Kapelle";
  const date = "";
  const excerpt = "";
  const image = new URL("https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8Ka62aRTyjSQHPOa4_p4W6XhTkaFmg3yeZjFWn-dIgg&s=10").href;

  events.push({
    date,
    title,
    excerpt,
    link,
    image,
  });

  return {
    site: "HFG Kapelle",
    url,
    events,
  };
}
