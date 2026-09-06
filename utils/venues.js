// Adressen der Locations – für den Kalender-Export (LOCATION im .ics).
// Schlüssel = exakter `site`-Name aus dem jeweiligen Scraper.
// Einige Werte sind Best-Effort – bei Bedarf hier korrigieren.
export const VENUE_ADDRESSES = {
  Batschkapp: "Gwinnerstraße 5, 60388 Frankfurt am Main",
  Nachtleben: "Kurt-Schumacher-Straße 45, 60313 Frankfurt am Main",
  Zoom: "Brönnerstraße 5-9, 60313 Frankfurt am Main",
  "Bett Club": "Schmidtstraße 12, 60326 Frankfurt am Main",
  "Dreikönigskeller": "Färberstraße 71, 60594 Frankfurt am Main",
  Elferclub: "Klappergasse 11, 60594 Frankfurt am Main",
  Cave: "Am Tiergarten 50, 60316 Frankfurt am Main",
  Klapperfeld: "Klapperfeldstraße 5, 60313 Frankfurt am Main",
  "Schon Schön": "Kaiserstraße 55, 60329 Frankfurt am Main",
  Mousonturm: "Waldschmidtstraße 4, 60316 Frankfurt am Main",
  "In der AU": "Hügelstraße 142, 60431 Frankfurt am Main",
  Yachtclub: "Mayfarthstraße 4, 60314 Frankfurt am Main",
  "HFG Kapelle": "Schloßstraße 31, 63065 Offenbach am Main",
  "Hafen 2": "Nordring 129, 63067 Offenbach am Main",
  "Stadthalle Offenbach": "Waldstraße 312, 63071 Offenbach am Main",
  "Schlachthof Wiesbaden": "Murnaustraße 1, 65189 Wiesbaden",
};

export function venueAddress(site) {
  return VENUE_ADDRESSES[site] || "";
}
