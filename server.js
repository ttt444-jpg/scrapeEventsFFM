import express from "express";
import { results } from "./data.js";

const app = express();

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

  res.send(`
    <!doctype html>
    <html lang="de">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>FFM Events – Was läuft in Frankfurt</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap" rel="stylesheet">
        <script>
          try {
            var t = localStorage.getItem('theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          } catch (e) {}
        </script>
        <style>
          *, *::before, *::after { box-sizing: border-box; }

          :root {
            --theme-bg: 255 255 255;
            --theme-fg: 35 35 35;
            --mint: #a1ffcb;

            --bg: rgb(var(--theme-bg));
            --fg: rgb(var(--theme-fg));
            --fg-dim: rgb(var(--theme-fg) / 0.58);
            --fg-faint: rgb(var(--theme-fg) / 0.34);
            --line: rgb(var(--theme-fg) / 0.14);
            --line-strong: rgb(var(--theme-fg) / 0.32);
            --card: rgb(var(--theme-fg) / 0.028);

            --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            --font-mono: "Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

            --ease-out: cubic-bezier(.16, 1, .3, 1);

            --maxw: 1600px;
            --pad: clamp(16px, 5vw, 72px);
            --header-h: 74px;
            --radius: 14px;

            color-scheme: light;
          }

          :root[data-theme="dark"] {
            --theme-bg: 18 18 18;
            --theme-fg: 244 244 244;
            color-scheme: dark;
          }
          @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
              --theme-bg: 18 18 18;
              --theme-fg: 244 244 244;
              color-scheme: dark;
            }
          }

          html { -webkit-text-size-adjust: 100%; }

          body {
            margin: 0;
            padding: 0 var(--pad) 120px;
            background: var(--bg);
            color: var(--fg);
            font-family: var(--font-sans);
            font-size: 15px;
            line-height: 1.5;
            letter-spacing: -0.011em;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }

          @media (prefers-reduced-motion: no-preference) {
            body, .site-header, .calendar, .tile, .cal-nav,
            .cal-actions button, .theme-toggle, .sources a, .vf-chip {
              transition:
                background-color .4s var(--ease-out),
                border-color .4s var(--ease-out),
                color .4s var(--ease-out),
                transform .4s var(--ease-out);
            }
          }

          a { color: inherit; text-decoration: none; }

          .wrap { max-width: var(--maxw); margin: 0 auto; }

          /* ---- Header ---- */
          .site-header {
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 20px 0;
            border-bottom: 1px solid var(--line);
            background: var(--bg);
            background: color-mix(in srgb, var(--bg) 82%, transparent);
            -webkit-backdrop-filter: blur(12px);
            backdrop-filter: blur(12px);
          }

          .wordmark {
            font-family: var(--font-mono);
            font-size: 12px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            white-space: nowrap;
          }
          .wordmark i { font-style: normal; color: var(--fg-dim); }

          .theme-toggle {
            font-family: var(--font-mono);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            border: 1px solid var(--line-strong);
            border-radius: 999px;
            padding: 8px 15px;
            background: transparent;
            color: inherit;
            cursor: pointer;
          }
          .theme-toggle:hover {
            background: var(--fg);
            color: var(--bg);
            border-color: var(--fg);
          }

          /* ---- Hero ---- */
          .hero { padding: clamp(36px, 6vw, 68px) 0 clamp(24px, 4vw, 40px); }
          .hero .eyebrow {
            font-family: var(--font-mono);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: var(--fg-dim);
            margin-bottom: 20px;
          }
          .hero h1 {
            margin: 0;
            font-size: clamp(40px, 8vw, 92px);
            line-height: 0.94;
            letter-spacing: -0.04em;
            font-weight: 600;
            text-wrap: balance;
          }
          .hero .sub {
            margin-top: 26px;
            font-family: var(--font-mono);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--fg-dim);
          }
          .hero .sub b { color: var(--fg); font-weight: 500; }

          /* ---- Layout ---- */
          .layout {
            display: grid;
            gap: clamp(28px, 5vw, 64px);
            align-items: start;
          }
          @media (min-width: 1024px) {
            .layout { grid-template-columns: 336px minmax(0, 1fr); }
            .cal-col { position: sticky; top: calc(var(--header-h) + 22px); }
          }

          /* ---- Kalender ---- */
          .calendar {
            border: 1px solid var(--line);
            border-radius: var(--radius);
            background: var(--card);
            padding: 18px;
          }
          .cal-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .cal-title {
            font-family: var(--font-mono);
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .cal-nav {
            width: 34px;
            height: 34px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--line-strong);
            border-radius: 999px;
            background: transparent;
            color: inherit;
            font-size: 15px;
            cursor: pointer;
          }
          .cal-nav:hover {
            background: var(--fg);
            color: var(--bg);
            border-color: var(--fg);
          }

          .cal-weekdays,
          .cal-grid {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
          }
          .cal-grid { gap: 2px; grid-auto-rows: 38px; }
          .cal-wd {
            text-align: center;
            font-family: var(--font-mono);
            font-size: 10px;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: var(--fg-faint);
            padding-bottom: 10px;
          }
          .cal-cell {
            min-width: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            border: 0;
            border-radius: 9px;
            background: transparent;
            color: var(--fg-faint);
            font-family: var(--font-mono);
            font-size: 13px;
            cursor: pointer;
          }
          .cal-cell.empty { visibility: hidden; }
          .cal-cell:disabled { cursor: default; }
          .cal-cell.has-events { color: var(--fg); }
          .cal-cell.has-events:not(:disabled):hover { background: rgb(var(--theme-fg) / 0.09); }
          .cal-cell.today { box-shadow: inset 0 0 0 1px var(--line-strong); }
          .cal-cell.selected {
            background: var(--mint);
            color: #101410;
            font-weight: 600;
            box-shadow: none;
          }
          .cal-dot {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: var(--fg-dim);
          }
          .cal-cell.selected .cal-dot { background: #101410; }

          .cal-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
          .cal-actions button {
            font-family: var(--font-mono);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            border: 1px solid var(--line-strong);
            border-radius: 999px;
            padding: 8px 14px;
            background: transparent;
            color: inherit;
            cursor: pointer;
          }
          .cal-actions button:hover {
            background: var(--fg);
            color: var(--bg);
            border-color: var(--fg);
          }
          .cal-actions button.active {
            background: var(--mint);
            color: #101410;
            border-color: var(--mint);
          }

          .cal-hint {
            font-family: var(--font-mono);
            font-size: 12px;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: var(--fg-dim);
            margin: 20px 2px 0;
          }

          /* ---- Location-Schnellfilter ---- */
          .venue-filter { margin-top: 20px; }
          .vf-label {
            font-family: var(--font-mono);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: var(--fg-faint);
            margin-bottom: 12px;
          }
          .vf-list { display: flex; flex-wrap: wrap; gap: 6px; }
          .vf-chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-family: var(--font-mono);
            font-size: 10.5px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--fg-dim);
            background: transparent;
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 6px 10px;
            cursor: pointer;
          }
          .vf-chip:hover { color: var(--fg); border-color: var(--line-strong); }
          .vf-chip.active {
            background: var(--mint);
            color: #101410;
            border-color: var(--mint);
          }
          .vf-count { color: var(--fg-faint); }
          .vf-chip.active .vf-count { color: #101410; opacity: 0.55; }

          /* ---- Suchfeld ---- */
          .search-box { margin-top: 20px; }
          .search-input {
            width: 100%;
            font-family: var(--font-mono);
            font-size: 12px;
            letter-spacing: 0.04em;
            color: var(--fg);
            background: var(--card);
            border: 1px solid var(--line-strong);
            border-radius: 999px;
            padding: 10px 16px;
            outline: none;
          }
          .search-input::placeholder {
            color: var(--fg-faint);
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .search-input:focus { border-color: var(--mint); }

          /* ---- Tiles ---- */
          .tiles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(258px, 100%), 1fr));
            gap: 14px;
            align-items: start;
          }
          .tile {
            display: flex;
            flex-direction: column;
            border: 1px solid var(--line);
            border-radius: var(--radius);
            padding: 16px;
            background: var(--bg);
            overflow: hidden;
          }
          .tile:hover { border-color: var(--fg); }
          @media (prefers-reduced-motion: no-preference) {
            .tile { opacity: 0; animation: tile-in .5s var(--ease-out) forwards; }
            @keyframes tile-in { to { opacity: 1; } }
            .tile:hover { transform: translateY(-4px); }
          }

          .tile-eyebrow {
            display: flex;
            flex-wrap: wrap;
            align-items: baseline;
            gap: 5px 10px;
            font-family: var(--font-mono);
            font-size: 10.5px;
            letter-spacing: 0.07em;
            text-transform: uppercase;
            color: var(--fg-dim);
            margin-bottom: 12px;
          }
          .tile-eyebrow a { display: inline-flex; flex-wrap: wrap; align-items: baseline; gap: 5px 10px; }
          .tile-eyebrow .venue { color: var(--fg); }

          .tile-media {
            display: block;
            margin: 0 -16px 14px;
            border-top: 1px solid var(--line);
            border-bottom: 1px solid var(--line);
            background: var(--card);
          }
          .tile-media img {
            width: 100%;
            display: block;
            aspect-ratio: 16 / 10;
            object-fit: cover;
          }

          .tile-title {
            font-size: 18px;
            font-weight: 600;
            letter-spacing: -0.02em;
            line-height: 1.22;
            margin: 0 0 6px;
          }
          .tile-title a:hover { text-decoration: underline; text-underline-offset: 3px; }

          .tile-excerpt { font-size: 13px; line-height: 1.45; color: var(--fg-dim); }

          /* ---- Empty state ---- */
          .empty {
            border: 1px dashed var(--line-strong);
            border-radius: var(--radius);
            padding: 48px 24px;
            text-align: center;
            font-family: var(--font-mono);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--fg-dim);
          }

          /* ---- Footer ---- */
          .site-footer {
            margin-top: 96px;
            padding-top: 28px;
            border-top: 1px solid var(--line);
          }
          .foot-label {
            font-family: var(--font-mono);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.14em;
            color: var(--fg-faint);
            margin-bottom: 16px;
          }
          .sources { display: flex; flex-wrap: wrap; gap: 8px; }
          .sources a {
            font-family: var(--font-mono);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--fg-dim);
            border: 1px solid var(--line);
            border-radius: 999px;
            padding: 6px 12px;
          }
          .sources a:hover {
            color: var(--bg);
            background: var(--fg);
            border-color: var(--fg);
          }

          @media (max-width: 600px) {
            body { padding: 0 16px 80px; }
            .hero { padding-top: 56px; }
          }
        </style>
      </head>

      <body>
        <div class="wrap">
          <header class="site-header">
            <span class="wordmark">FFM Events <i>/ Frankfurt</i></span>
            <button type="button" class="theme-toggle" id="theme-toggle">Dark</button>
          </header>

          <section class="hero">
            <div class="eyebrow">Live Musik &amp; Clubs · Rhein-Main</div>
            <h1>Was läuft in Frankfurt.</h1>
            <div class="sub"><b>${eventCount}</b> Termine — <b>${venueCount}</b> Locations</div>
          </section>

          <div class="layout">
            <div class="cal-col">
              <div id="calendar" class="calendar"></div>
              <div id="cal-hint" class="cal-hint"></div>

              <div class="venue-filter">
                <div class="vf-label">Locations</div>
                <div class="vf-list" id="venue-filter">
                  <button type="button" class="vf-chip active" data-venue="">Alle</button>
                  ${venues
                    .map(
                      (v) =>
                        `<button type="button" class="vf-chip" data-venue="${esc(v)}">${esc(v)}<span class="vf-count">${venueCounts[v]}</span></button>`,
                    )
                    .join("")}
                </div>
              </div>

              <div class="search-box">
                <div class="vf-label">Suche</div>
                <input type="search" id="search" class="search-input" placeholder="Act, Titel, Genre …" autocomplete="off" spellcheck="false">
              </div>
            </div>

            <div class="results-col">
              <div id="results" class="tiles">
                ${allEvents
                  .map(
                    (ev, i) => `
                  <article class="tile" data-date="${ev._iso}" data-site="${esc(ev._site)}" style="animation-delay:${Math.min(i * 35, 420)}ms">
                    <div class="tile-eyebrow">
                      <a href="${esc(ev._siteUrl)}" target="_blank" rel="noopener">
                        ${ev.date ? `<span class="tile-date">${esc(ev.date)}</span>` : ""}
                        <span class="venue">${esc(ev._site)}</span>
                      </a>
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
                      ${
                        ev.link
                          ? `<a href="${esc(ev.link)}" target="_blank" rel="noopener">${esc(ev.title)}</a>`
                          : esc(ev.title)
                      }
                    </h2>
                    ${ev.excerpt ? `<p class="tile-excerpt">${esc(ev.excerpt)}</p>` : ""}
                  </article>
                `,
                  )
                  .join("")}
              </div>
              <div id="empty" class="empty" hidden>Keine Termine an diesem Tag</div>
            </div>
          </div>

          <footer class="site-footer">
            <div class="foot-label">Quellen</div>
            <nav class="sources">
              ${sources
                .map(
                  (s) =>
                    `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`,
                )
                .join("")}
            </nav>
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
            t._text = parts.join(' ').toLowerCase().replace(/\s+/g, ' ');
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

          var MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
          var WD = ['Mo','Di','Mi','Do','Fr','Sa','So'];

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
            h += '<button type="button" id="cal-today" class="' + (selected === todayIso ? 'active' : '') + '">Heute</button>';
            h += '<button type="button" id="cal-all" class="' + (selected ? '' : 'active') + '">Alle Termine</button>';
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
            var scope = selected ? human(selected) : 'Alle Termine';
            if (selectedVenue) scope += ' · ' + selectedVenue;
            if (query) scope += ' · "' + searchEl.value.trim() + '"';
            hintEl.textContent = scope + ' – ' + total + (total === 1 ? ' Termin' : ' Termine');
            if (emptyEl) {
              emptyEl.hidden = total !== 0;
              emptyEl.textContent = query ? 'Nichts gefunden' : 'Keine Termine an diesem Tag';
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
              query = searchEl.value.trim().toLowerCase().replace(/\s+/g, ' ');
              counts = tileCounts();
              render();
              apply();
            });
          }

          render();
          apply();
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




app.listen(3000, '0.0.0.0', () =>
  console.log("Server läuft auf http://0.0.0.0:3000")
);
