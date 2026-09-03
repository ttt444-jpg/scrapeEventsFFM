import { scrapeInstagramEvents } from "../../utils/instagramEvents.js";

// Die (HfG / Echte) Kapelle veröffentlicht ihr Programm nur als Instagram-Posts.
export function scrapeHfgKapelle() {
  return scrapeInstagramEvents({
    handle: "the_kapelle",
    site: "HFG Kapelle",
    fallbackImage:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8Ka62aRTyjSQHPOa4_p4W6XhTkaFmg3yeZjFWn-dIgg&s=10",
  });
}
