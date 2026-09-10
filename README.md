# scrapeEventsFFM

Scrapt Veranstaltungen (v.a. Konzerte) von Clubs und Locations in
Frankfurt / Offenbach / Wiesbaden und zeigt sie gebündelt als **069 Events**
auf einer Seite unter [http://localhost:3000](http://localhost:3000).

Zusätzlich werden Shows des Veranstalters **ichi ichi** übernommen – aber nur,
wenn sie nicht ohnehin schon über einen Venue-Scraper erfasst sind (Details
unten).

## Setup

```bash
npm install
```

Optional, nur für die Instagram-Locations (Yachtclub, HFG Kapelle):

- **puppeteer** lädt sein Chromium beim `npm install` selbst herunter.
- **Instagram-Session** – ohne Login liefert Instagram Server-IPs nichts aus.
  Entweder `ig-session.json` im Projektwurzelverzeichnis:

  ```json
  { "sessionid": "…", "ds_user_id": "…", "csrftoken": "…" }
  ```

  (`sessionid` reicht; Werte aus den Browser-DevTools eines eingeloggten
  Instagram-Tabs: Application → Cookies → instagram.com), oder per Umgebung
  `IG_SESSIONID` / `IG_DS_USER_ID` / `IG_CSRFTOKEN`.
- **Ollama** mit einem Vision-Modell für die Flyer-OCR:

  ```bash
  ollama pull qwen2.5vl:3b
  ```

  Modell wählbar über `OLLAMA_VISION_MODEL` (Standard `qwen2.5vl:3b`). Läuft
  Ollama nicht, wird nur der von Instagram mitgelieferte Alt-Text ausgewertet –
  die Scraper brechen nicht ab.
  - `OLLAMA_OCR_TIMEOUT_MS` (Standard `90000`) – bricht einen einzelnen
    Flyer-OCR-Aufruf ab, statt den täglichen Scrape auf schwacher Hardware
    ins systemd-Timeout laufen zu lassen; fällt danach für den Rest des
    Laufs auf den Alt-Text zurück.
  - `SKIP_VISION_OCR=1` – Vision-OCR komplett überspringen (Not-Aus).

## Nutzung

| Befehl | Wirkung |
| --- | --- |
| `npm start` | Alle Scraper + ichi-ichi-Merge, danach Server. Ergebnis wird nach `results.json` geschrieben, ein Log-Eintrag nach `scrape.log`. |
| `npm run serve` | **Ohne Scraping.** Lädt `results.json` und startet nur den Server. |
| `node index.js --no-scrape` | Wie `serve`, ohne nodemon. |
| `SCRAPE=0 node index.js` | Variante über Umgebungsvariable. |
| `node scrape-once.js` | Nur scrapen, kein Server (für den systemd-Timer). |

Beim ersten Mal muss einmal `npm start` laufen, damit `results.json` existiert.
Der Server liest `results.json` bei jeder Anfrage neu, sobald sich die Datei
geändert hat – nach einem Scrape ist **kein Neustart** nötig.

## Frontend

- **Kalender** – Klick auf einen Tag filtert die Kacheln; „Today" / „All events".
- **Location-Schnellfilter** – ein Chip pro Location (mit Anzahl).
- **Suche** – Freitext über Titel, Beschreibung und Location.
- **Zeiten** – `Doors` / `Start` pro Event, sofern aus der Quelle ableitbar.
- **Kalender-Export** – Klick auf das Datum in der Kachel lädt eine `.ics`
  (Titel „Act // Location", Beginn = `start`, Ende +3 h, `LOCATION` = Adresse
  der Location aus `utils/venues.js`).
- **Footer** – Quellen-Liste und Zeitpunkt des letzten Scrapes (aus `scrape.log`).
- Hell/Dunkel-Umschalter, folgt sonst der System-Einstellung.

## Struktur

| Pfad | Zweck |
| --- | --- |
| `index.js` | Einstiegspunkt: scrapen vs. Cache laden. |
| `scrape-once.js` | Scrape-Lauf ohne Server (systemd-Timer). |
| `server.js` | Express-Server, rendert die Seite + Route `/event.ics`. |
| `data.js` | Geteiltes `results`-Array (leer bis zum Laden). |
| `scraper/scrapeRunner.js` | Ruft alle Site-Scraper auf, dann den ichi-ichi-Merge. |
| `scraper/sites/*.js` | Ein Scraper pro Location. |
| `scraper/promoters/ichiIchi.js` | Übernimmt nicht-doppelte ichi-ichi-Shows. |
| `scraper/scraperBase.js` | `loadPage()` – Seite laden + cheerio. |
| `utils/formatDate.js` | Datumsformate vereinheitlichen → `So, 13.09.26`. |
| `utils/parseTimes.js` | `Einlass/Beginn/Doors/Start/music …` → `{ doors, start }`. |
| `utils/venues.js` | Adress-Map der Locations für den Kalender-Export. |
| `utils/instagramEvents.js` | Instagram-Profil rendern, Flyer-Text auswerten. |
| `utils/ollamaRunner.js` | Flyer-OCR per Ollama-Vision-Modell. |
| `utils/ocr.js` | Tesseract-OCR (Cave-Monatsflyer). |
| `utils/resultsCache.js` | `results.json` lesen/schreiben. |
| `utils/scrapeLog.js` | `scrape.log` fortschreiben / letzten Lauf lesen. |

## Datenmodell

Jeder Scraper liefert `{ site, url, events: [...] }`. Ein Event:

```jsonc
{
  "date":   "Di, 08.09.26",          // einheitliches Format
  "title":  "28. Frankfurter Rudelsingen",
  "excerpt":"mit Jörg Siewert …",
  "doors":  "18:30",                 // "" wenn unbekannt
  "start":  "19:30",                 // "" wenn unbekannt
  "link":   "https://…",
  "image":  "https://…",             // null wenn keins
  "address":"Cafe Koz, Frankfurt",   // optional, nur bei ichi-ichi-Locations
  "promoter":"ichi ichi"             // optional, Quelle des Eintrags
}
```

Vergangene Termine werden beim Scrapen und nochmal beim Rendern aussortiert.

## Locations

Batschkapp · Nachtleben · Zoom · Bett Club · Dreikönigskeller · Elferclub ·
Cave · Klapperfeld · Schon Schön · Mousonturm · In der AU · Yachtclub ·
HFG Kapelle · Hafen 2 · Stadthalle Offenbach · Schlachthof Wiesbaden

Über den ichi-ichi-Merge können weitere Orte dazukommen (z. B. Schirn
Kunsthalle, Café KoZ).

### ichi-ichi-Merge

`scraper/promoters/ichiIchi.js` liest <https://ichiichi.de/shows/>. Eine Show
wird nur übernommen, wenn kein bereits gescrapter Event am selben Tag einen
überlappenden Titel hat. Passt die Location zu einem vorhandenen Venue-Scraper,
wird der Event dort einsortiert, sonst wird eine neue Location angelegt.
Abweichende Ortsbezeichnungen lassen sich in `VENUE_ALIASES` abbilden
(z. B. „2 OG. Dondorf" → „Schirn Kunsthalle").

## Deployment

Betrieb auf dem Server als systemd-Dienst hinter Nginx Proxy Manager – siehe
[`deploy/README.md`](deploy/README.md).
