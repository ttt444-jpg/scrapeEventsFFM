import fs from "fs";
import express from "express";
import { results } from "./data.js";
import { venueAddress } from "./utils/venues.js";
import { loadResultsCache, CACHE_FILE } from "./utils/resultsCache.js";
import { readLastScrape } from "./utils/scrapeLog.js";

// results.json bei jeder Anfrage neu laden, wenn sich die Datei geändert hat –
// so wirkt ein erneuter Scrape sofort, ohne Server-Neustart.
let _cacheMtime = 0;
function refreshResults() {
  try {
    const m = fs.statSync(CACHE_FILE).mtimeMs;
    if (m !== _cacheMtime) {
      loadResultsCache(results);
      _cacheMtime = m;
    }
  } catch {
    /* keine Datei -> vorhandene In-Memory-Ergebnisse behalten */
  }
}

const app = express();
app.use(express.static("public"));

// "So, 13.09.26" -> "2026-09-13"  (leer, wenn nicht parsebar)
function toISO(dateStr) {
  const m = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(dateStr || "");
  if (!m) return "";
  const yy = m[3].length === 2 ? "20" + m[3] : m[3];
  return `${yy}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// Heutiges Datum als "YYYY-MM-DD" (lokale Zeit)
function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(
    n.getDate(),
  ).padStart(2, "0")}`;
}

// Minimales HTML-Escaping fuer Text- und Attributkontext
const esc = (s = "") =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );

app.get("/", (req, res) => {
  refreshResults();

  // Alle Events zu einer flachen, nach Datum sortierten Liste zusammenführen.
  // Vergangene Termine werden zusaetzlich hier herausgefiltert, falls die
  // results.json noch veraltete Eintraege enthaelt (z. B. Cave-Monatsflyer).
  const today = todayISO();
  const allEvents = results
    .flatMap((site) =>
      (site.events || []).map((ev) => ({
        ...ev,
        _site: site.site,
        _siteUrl: site.url,
        _iso: toISO(ev.date),
      })),
    )
    .filter((ev) => !ev._iso || ev._iso >= today) // ohne Datum bleibt drin
    .sort((a, b) => {
      if (!a._iso) return 1; // ohne Datum ans Ende
      if (!b._iso) return -1;
      return a._iso.localeCompare(b._iso);
    });

  const sources = [...new Map(results.map((s) => [s.site, s.url]))]
    .map(([name, url]) => ({ name, url }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  // Locations mit (kommenden) Terminen – Basis fuer den Schnellfilter
  const venueCounts = allEvents.reduce((m, ev) => {
    m[ev._site] = (m[ev._site] || 0) + 1;
    return m;
  }, {});
  const venues = Object.keys(venueCounts).sort((a, b) => a.localeCompare(b, "de"));

  const eventCount = allEvents.length;
  const venueCount = venues.length;

  // Letzter Scrape aus dem Protokoll (scrape.log)
  const lastScrape = readLastScrape();
  const lastScrapeStr = lastScrape
    ? lastScrape.date.toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  res.send(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>069 EVENTS</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
        <script>
          try {
            var t = localStorage.getItem('theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          } catch (e) {}
        </script>
        <link rel="stylesheet" href="/styles.css">
      </head>

      <body>
        <div class="wrap">
          <header class="site-header">
            <button type="button" class="wordmark" id="brand">069 Events <i><span class="wm-sep" aria-hidden="true"><span class="wm-slash">/</span><span class="wm-arrow">↑</span></span> Frankfurt</i></button>
            <button type="button" class="theme-toggle" id="theme-toggle">Dark</button>
          </header>

          <section class="hero">
            <div class="eyebrow">Live Music &amp; Clubs · Rhein-Main</div>
            <h1>Was läuft in Frankfurt.</h1>
            <div class="sub"><b>${eventCount}</b> Events — <b>${venueCount}</b> Locations</div>
          </section>

          <div class="layout">
            <div class="cal-col">
              <div id="calendar" class="calendar"></div>
              <div id="cal-hint" class="cal-hint"></div>

              <div class="venue-filter">
                <div class="vf-label">Locations</div>
                <div class="vf-list" id="venue-filter">
                  <button type="button" class="vf-chip active" data-venue="">All</button>
                  ${venues
                    .map(
                      (v) =>
                        `<button type="button" class="vf-chip" data-venue="${esc(v)}">${esc(v)}<span class="vf-count">${venueCounts[v]}</span></button>`,
                    )
                    .join("")}
                </div>
              </div>

              <div class="search-box">
                <div class="vf-label">Search</div>
                <input type="search" id="search" class="search-input" placeholder="Act, Title, Genre …" autocomplete="off" spellcheck="false">
              </div>
            </div>

            <div class="results-col">
              <div id="results" class="tiles">
                ${allEvents
                  .map(
                    (ev, i) => `
                  <article class="tile" data-date="${ev._iso}" data-site="${esc(ev._site)}" style="animation-delay:${Math.min(i * 35, 420)}ms">
                    <div class="tile-eyebrow">
                      ${
                        ev.date
                          ? `<a class="tile-date" href="/event.ics?${esc(
                              new URLSearchParams({
                                title: [ev.title, ev._site]
                                  .filter(Boolean)
                                  .join(" // "),
                                date: ev._iso,
                                start: ev.start || "",
                                loc: ev.address || venueAddress(ev._site),
                              }).toString(),
                            )}" title="Als Kalendertermin speichern">${esc(ev.date)}</a>`
                          : ""
                      }
                      <a class="venue" href="${esc(ev._siteUrl)}" target="_blank" rel="noopener">${esc(ev._site)}</a>
                    </div>

                    ${
                      ev.image
                        ? `
                      <a class="tile-media" href="${esc(ev.link || ev._siteUrl)}" target="_blank" rel="noopener">
                        <img src="${esc(ev.image)}" alt="${esc(ev.title)}" loading="lazy">
                      </a>
                    `
                        : ""
                    }

                    <h2 class="tile-title">
                      <a href="${esc(ev.link || ev._siteUrl)}" target="_blank" rel="noopener">${esc(ev.title)}</a>
                    </h2>
                    ${
                      ev.doors || ev.start
                        ? `<div class="tile-time">${[
                            ev.doors ? `Doors ${esc(ev.doors)}` : "",
                            ev.start ? `Start ${esc(ev.start)}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")}</div>`
                        : ""
                    }
                    ${ev.excerpt ? `<p class="tile-excerpt">${esc(ev.excerpt)}</p>` : ""}
                  </article>
                `,
                  )
                  .join("")}
              </div>
              <div id="empty" class="empty" hidden>No events on this day</div>
            </div>
          </div>

          <footer class="site-footer">
            <div class="foot-label">Sources</div>
            <nav class="sources">
              ${sources
                .map(
                  (s) =>
                    `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`,
                )
                .join("")}
            </nav>
            ${
              lastScrapeStr
                ? `<div class="foot-meta">Last update: ${esc(lastScrapeStr)}</div>`
                : ""
            }
          </footer>
        </div>

        <script>
        // Kaputte Event-Bilder ausblenden statt Platzhalter zu zeigen
        document.addEventListener('error', function (e) {
          var img = e.target;
          if (img && img.tagName === 'IMG') {
            var media = img.closest('.tile-media');
            if (media) media.remove();
          }
        }, true);

        (function () {
          var tiles = [].slice.call(document.querySelectorAll('.tile'));
          var calEl = document.getElementById('calendar');
          var hintEl = document.getElementById('cal-hint');
          var emptyEl = document.getElementById('empty');
          var resultsEl = document.getElementById('results');
          var venueFilterEl = document.getElementById('venue-filter');
          var searchEl = document.getElementById('search');

          var selectedVenue = '';
          var query = '';

          // Durchsuchbaren Text pro Kachel einmalig vorberechnen
          tiles.forEach(function (t) {
            var parts = [];
            ['.tile-title', '.tile-excerpt', '.venue'].forEach(function (sel) {
              var el = t.querySelector(sel);
              if (el) parts.push(el.textContent);
            });
            t._text = parts.join(' ').toLowerCase().replace(/\\s+/g, ' ');
          });

          function matchesFilter(t) {
            if (selectedVenue && t.getAttribute('data-site') !== selectedVenue) return false;
            if (query && t._text.indexOf(query) === -1) return false;
            return true;
          }

          // Termine pro Tag zaehlen – eingeschraenkt auf Location + Suche
          function tileCounts() {
            var c = {};
            tiles.forEach(function (t) {
              if (!matchesFilter(t)) return;
              var d = t.getAttribute('data-date');
              if (d) c[d] = (c[d] || 0) + 1;
            });
            return c;
          }
          var counts = tileCounts();

          var MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          var WD = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

          function pad(n) { return (n < 10 ? '0' : '') + n; }
          function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
          function human(s) {
            var p = s.split('-');
            var dt = new Date(+p[0], +p[1] - 1, +p[2]);
            return WD[(dt.getDay() + 6) % 7] + ', ' + pad(dt.getDate()) + '.' + pad(dt.getMonth() + 1) + '.' + String(dt.getFullYear()).slice(2);
          }

          var now = new Date();
          var todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
          var view = { y: now.getFullYear(), m: now.getMonth() };
          var selected = todayIso;

          function render() {
            var first = new Date(view.y, view.m, 1);
            var lead = (first.getDay() + 6) % 7;
            var dim = new Date(view.y, view.m + 1, 0).getDate();

            var h = '';
            h += '<div class="cal-head">';
            h += '<button type="button" class="cal-nav" data-nav="-1">‹</button>';
            h += '<span class="cal-title">' + MONTHS[view.m] + ' ' + view.y + '</span>';
            h += '<button type="button" class="cal-nav" data-nav="1">›</button>';
            h += '</div><div class="cal-weekdays">';
            for (var i = 0; i < 7; i++) h += '<div class="cal-wd">' + WD[i] + '</div>';
            h += '</div><div class="cal-grid">';
            for (var e = 0; e < lead; e++) h += '<span class="cal-cell empty"></span>';
            for (var d = 1; d <= dim; d++) {
              var ci = iso(view.y, view.m, d);
              var n = counts[ci] || 0;
              var cls = 'cal-cell';
              if (n) cls += ' has-events';
              if (ci === todayIso) cls += ' today';
              if (ci === selected) cls += ' selected';
              h += '<button type="button" class="' + cls + '" data-date="' + ci + '"' + (n ? '' : ' disabled') + '>' + d + (n ? '<span class="cal-dot"></span>' : '') + '</button>';
            }
            h += '</div><div class="cal-actions">';
            h += '<button type="button" id="cal-today" class="' + (selected === todayIso ? 'active' : '') + '">Today</button>';
            h += '<button type="button" id="cal-all" class="' + (selected ? '' : 'active') + '">All events</button>';
            h += '</div>';
            calEl.innerHTML = h;
          }

          function apply() {
            var total = 0;
            tiles.forEach(function (t) {
              var okDate = !selected || t.getAttribute('data-date') === selected;
              var show = okDate && matchesFilter(t);
              t.style.display = show ? '' : 'none';
              if (show) total++;
            });
            var scope = selected ? human(selected) : 'All events';
            if (selectedVenue) scope += ' · ' + selectedVenue;
            if (query) scope += ' · "' + searchEl.value.trim() + '"';
            hintEl.textContent = scope + ' – ' + total + (total === 1 ? ' event' : ' events');
            if (emptyEl) {
              emptyEl.hidden = total !== 0;
              emptyEl.textContent = query ? 'Nichts gefunden' : 'No events on this day';
            }
            if (resultsEl) resultsEl.style.display = total === 0 ? 'none' : '';
          }

          calEl.addEventListener('click', function (evt) {
            var nav = evt.target.closest('[data-nav]');
            if (nav) {
              view.m += +nav.getAttribute('data-nav');
              if (view.m < 0) { view.m = 11; view.y--; }
              if (view.m > 11) { view.m = 0; view.y++; }
              render();
              return;
            }
            if (evt.target.id === 'cal-all') { selected = null; render(); apply(); return; }
            if (evt.target.id === 'cal-today') {
              view.y = now.getFullYear();
              view.m = now.getMonth();
              selected = todayIso;
              render();
              apply();
              return;
            }
            var cell = evt.target.closest('.cal-cell[data-date]');
            if (cell && !cell.disabled) { selected = cell.getAttribute('data-date'); render(); apply(); }
          });

          if (venueFilterEl) {
            venueFilterEl.addEventListener('click', function (evt) {
              var chip = evt.target.closest('.vf-chip');
              if (!chip) return;
              var v = chip.getAttribute('data-venue') || '';
              selectedVenue = v === selectedVenue ? '' : v;
              [].forEach.call(venueFilterEl.querySelectorAll('.vf-chip'), function (c) {
                c.classList.toggle('active', (c.getAttribute('data-venue') || '') === selectedVenue);
              });
              counts = tileCounts();
              render();
              apply();
            });
          }

          if (searchEl) {
            searchEl.addEventListener('input', function () {
              query = searchEl.value.trim().toLowerCase().replace(/\\s+/g, ' ');
              counts = tileCounts();
              render();
              apply();
            });
          }

          render();
          apply();
        })();

        (function () {
          var brand = document.getElementById('brand');
          if (!brand) return;
          brand.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          function onScroll() {
            brand.classList.toggle('scrolled', window.scrollY > 24);
          }
          window.addEventListener('scroll', onScroll, { passive: true });
          onScroll();
        })();

        (function () {
          var tt = document.getElementById('theme-toggle');
          if (!tt) return;
          var mq = window.matchMedia('(prefers-color-scheme: dark)');
          function current() {
            return document.documentElement.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light');
          }
          function label() { tt.textContent = current() === 'dark' ? 'Light' : 'Dark'; }
          tt.addEventListener('click', function () {
            var next = current() === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('theme', next); } catch (e) {}
            label();
          });
          label();
        })();
        </script>
      </body>
    </html>
  `);
});

// Kalendertermin (.ics) fuer einen Event – Klick auf das Datum in der Kachel.
// Beginn = ?start (HH:MM), Ende = +3h; ohne Zeit ein ganztaegiger Termin.
app.get("/event.ics", (req, res) => {
  const title = String(req.query.title || "").slice(0, 300) || "Termin";
  const loc = String(req.query.loc || "").slice(0, 300);
  const date = String(req.query.date || "");
  const start = String(req.query.start || "");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).send("bad date");

  const pad = (n) => String(n).padStart(2, "0");
  const stamp = (d) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours(),
    )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const local = (d) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
      d.getHours(),
    )}${pad(d.getMinutes())}00`;
  const icsEsc = (s) =>
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/[;,]/g, "\\$&")
      .replace(/\r?\n/g, "\\n");

  const [Y, M, D] = date.split("-").map(Number);
  const hm = /^(\d{1,2}):(\d{2})$/.exec(start);

  let dtStart;
  let dtEnd;
  if (hm) {
    const s = new Date(Y, M - 1, D, Number(hm[1]), Number(hm[2]));
    const e = new Date(s.getTime() + 3 * 60 * 60 * 1000);
    dtStart = `DTSTART:${local(s)}`;
    dtEnd = `DTEND:${local(e)}`;
  } else {
    const e = new Date(Y, M - 1, D + 1);
    dtStart = `DTSTART;VALUE=DATE:${Y}${pad(M)}${pad(D)}`;
    dtEnd = `DTEND;VALUE=DATE:${e.getFullYear()}${pad(e.getMonth() + 1)}${pad(e.getDate())}`;
  }

  const uid = `${date}-${Buffer.from(title).toString("hex").slice(0, 24)}-${Date.now()}@ffm-events`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FFM Events//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    dtStart,
    dtEnd,
    `SUMMARY:${icsEsc(title)}`,
  ];
  if (loc) lines.push(`LOCATION:${icsEsc(loc)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");

  // Zeilen auf 75 Oktett falten (RFC 5545)
  const fold = (l) => {
    if (Buffer.byteLength(l) <= 75) return l;
    const parts = [];
    let cur = "";
    for (const ch of l) {
      if (Buffer.byteLength(cur + ch) > 74) {
        parts.push(cur);
        cur = " " + ch;
      } else {
        cur += ch;
      }
    }
    parts.push(cur);
    return parts.join("\r\n");
  };

  // Dateiname bewusst ASCII (Header-Encoding); der Termin-Inhalt bleibt UTF-8.
  const fileName =
    (title.replace(/[^\w \-]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) ||
      "termin") + ".ics";

  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
  res.send(lines.map(fold).join("\r\n") + "\r\n");
});

app.listen(3000, '0.0.0.0', () =>
  console.log("Server läuft auf http://0.0.0.0:3000")
);
