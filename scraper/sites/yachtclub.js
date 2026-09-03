import { scrapeInstagramEvents } from "../../utils/instagramEvents.js";

// Yachtklub veröffentlicht sein Programm nur als Instagram-Posts.
export function scrapeYachtclub() {
  return scrapeInstagramEvents({
    handle: "yachtklub_ffm",
    site: "Yachtclub",
    fallbackImage: "https://yachtklub.de/wp-content/uploads/2022/03/yk_signet.svg",
  });
}
