# scrapeEventsFFM

Scrapt Veranstaltungen (v.a. Konzerte) von Frankfurter/Offenbacher Clubs und
Locations und zeigt sie gebündelt auf einer Seite unter
[http://localhost:3000](http://localhost:3000).

Alle Scraper liefern Events im einheitlichen Datumsformat `So, 13.09.26`.

## Setup

```bash
npm install
```

Optional, nur für die Instagram-Locations (Yachtclub, HFG Kapelle):

- **puppeteer** lädt sein Chromium beim `npm install` selbst herunter.
- **Ollama** mit dem Vision-Modell für die Flyer-OCR:

  ```bash
  ollama pull qwen2.5vl:7b
  ```

  Läuft Ollama nicht, wird nur der von Instagram mitgelieferte Alt-Text
  ausgewertet – die Scraper brechen nicht ab.

## Nutzung

| Befehl | Wirkung |
| --- | --- |
| `npm start` | Alle Scraper laufen lassen, danach Server starten. Das Ergebnis wird nach `results.json` zwischengespeichert. |
| `npm run serve` | **Ohne Scraping.** Lädt `results.json` und startet nur den Server. |
| `node index.js --no-scrape` | Wie `serve`, ohne nodemon. |
| `SCRAPE=0 node index.js` | Variante über Umgebungsvariable. |

Beim ersten Mal muss einmal `npm start` laufen, damit `results.json` existiert.
Danach reicht für reine Layout-/Server-Änderungen `npm run serve`.

## Struktur

- `index.js` – Einstiegspunkt, entscheidet scrapen vs. Cache laden.
- `server.js` – Express-Server, rendert die Ergebnisseite.
- `scraper/scrapeRunner.js` – ruft alle Scraper der Reihe nach auf.
- `scraper/sites/*.js` – ein Scraper pro Location.
- `utils/` – Datumsformat, Instagram-Helper, Flyer-OCR, Ergebnis-Cache.
