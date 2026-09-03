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

app.get("/", (req, res) => {
  // Alle Events zu einer flachen, nach Datum sortierten Liste zusammenführen
  // (vergangene Termine werden bereits beim Scrapen aussortiert)
  const allEvents = results
    .flatMap((site) =>
      (site.events || []).map((ev) => ({
        ...ev,
        _site: site.site,
        _siteUrl: site.url,
        _iso: toISO(ev.date),
      })),
    )
    .sort((a, b) => {
      if (!a._iso) return 1; // ohne Datum ans Ende
      if (!b._iso) return -1;
      return a._iso.localeCompare(b._iso);
    });

  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Scraper Ergebnisse – Dark Mode</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; }

          body {
            font-family: Arial, sans-serif;
            background: #121212;
            color: #ffffff;
            margin: 0;
            padding: 20px;
          }

          h1 {
            text-align: center;
            margin-bottom: 20px;
            color: #ffffff;
          }

          a {
            color: #ffffff;
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }

          /* ---- Kalender ---- */
          #calendar {
            width: 100%;
            max-width: 340px;
            margin: 0 auto;
            background: #1e1e1e;
            border: 1px solid #2c2c2c;
            border-radius: 12px;
            padding: 14px;
          }

          .cal-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }

          .cal-title { font-weight: bold; font-size: 15px; }

          .cal-nav {
            background: #2a2a2a;
            color: #fff;
            border: 0;
            border-radius: 8px;
            width: 30px;
            height: 30px;
            font-size: 16px;
            cursor: pointer;
          }
          .cal-nav:hover { background: #3a3a3a; }

          .cal-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
            gap: 4px;
          }

          .cal-wd {
            text-align: center;
            font-size: 11px;
            color: #888;
            padding-bottom: 4px;
          }

          .cal-cell {
            position: relative;
            min-height: 34px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: 0;
            border-radius: 8px;
            color: #dddddd;
            font-size: 13px;
            cursor: pointer;
          }
          .cal-cell.empty { visibility: hidden; }
          .cal-cell:disabled { color: #555555; cursor: default; }
          .cal-cell.has-events:not(:disabled):hover { background: #2f2f2f; }
          .cal-cell.today { box-shadow: inset 0 0 0 1px #6ea8fe; }
          .cal-cell.selected { background: #6ea8fe; color: #0a0a0a; font-weight: bold; }

          .cal-dot {
            position: absolute;
            bottom: 5px;
            left: 50%;
            transform: translateX(-50%);
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #6ea8fe;
          }
          .cal-cell.selected .cal-dot { background: #0a0a0a; }

          .cal-actions {
            margin-top: 10px;
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            justify-content: center;
          }

          .cal-actions button {
            background: #2a2a2a;
            color: #fff;
            border: 0;
            border-radius: 8px;
            padding: 6px 14px;
            cursor: pointer;
            font-size: 13px;
          }
          .cal-actions button:hover { background: #3a3a3a; }
          #cal-all.active { background: #6ea8fe; color: #0a0a0a; }

          #cal-hint {
            text-align: center;
            color: #aaaaaa;
            font-size: 13px;
            margin: 8px 0 26px;
          }

          /* Alle Kacheln in einem Raster, nach Datum sortiert */
          .tiles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(min(210px, 100%), 1fr));
            gap: 20px;
            align-items: start;
          }

          .tile {
            background: #1e1e1e;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.6);
            padding: 15px;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border: 1px solid #2c2c2c;
            color: #ffffff;
          }

          .tile:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0,0,0,0.7);
          }

          .tile > a {
            display: block;
          }

          .tile img {
            width: 100%;
            border-radius: 8px;
            margin-bottom: 12px;
            display: block;
          }

          .tile-site {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #8ab4f8;
            margin-bottom: 10px;
          }
          .tile .tile-site a {
            color: #8ab4f8;
            font-weight: normal;
          }

          .tile-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 6px;
            color: #ffffff;
          }

          .tile-date {
            color: #cccccc;
            font-size: 13px;
            margin-bottom: 10px;
          }

          .tile-excerpt {
            font-size: 13px;
            color: #dddddd;
            margin-bottom: 12px;
          }

          .tile a {
            color: #ffffff;
            font-weight: bold;
          }

          .tile a:hover {
            color: #e0e0e0;
          }

          /* ---- Mobil ---- */
          @media (max-width: 600px) {
            body { padding: 12px; }

            h1 { font-size: 1.5em; margin-bottom: 14px; }

            #cal-hint { margin-bottom: 18px; }

            .tiles {
              grid-template-columns: 1fr;
              gap: 14px;
            }

            .tile { padding: 12px; }
          }
        </style>
      </head>

      <body>
        <h1>Scraper Ergebnisse</h1>

        <div id="calendar"></div>
        <div id="cal-hint"></div>

        <div id="results" class="tiles">
          ${allEvents.map(ev => `
            <div class="tile" data-date="${ev._iso}">

              <div class="tile-site">
                <a href="${ev._siteUrl}" target="_blank">${ev._site}</a>
              </div>

              ${ev.image ? `
                <a href="${ev.link}" target="_blank">
                  <img src="${ev.image}" alt="${ev.title}">
                </a>
              ` : ""}

              <div class="tile-title">
                ${ev.link && !ev.image
                  ? `<a href="${ev.link}" target="_blank">${ev.title}</a>`
                  : ev.title}
              </div>
              <div class="tile-date">${ev.date}</div>
              <div class="tile-excerpt">${ev.excerpt}</div>
            </div>
          `).join("")}
        </div>

        <script>
        (function () {
          var tiles = [].slice.call(document.querySelectorAll('.tile'));
          var calEl = document.getElementById('calendar');
          var hintEl = document.getElementById('cal-hint');

          var counts = {};
          tiles.forEach(function (t) {
            var d = t.getAttribute('data-date');
            if (d) counts[d] = (counts[d] || 0) + 1;
          });

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
            h += '</div><div class="cal-grid">';
            for (var i = 0; i < 7; i++) h += '<div class="cal-wd">' + WD[i] + '</div>';
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
            h += '<button type="button" id="cal-today">Heute</button>';
            h += '<button type="button" id="cal-all" class="' + (selected ? '' : 'active') + '">Alle Termine</button>';
            h += '</div>';
            calEl.innerHTML = h;
          }

          function apply() {
            var total = 0;
            tiles.forEach(function (t) {
              var d = t.getAttribute('data-date');
              var show = !selected || d === selected;
              t.style.display = show ? '' : 'none';
              if (show) total++;
            });
            hintEl.textContent = selected
              ? human(selected) + ' – ' + total + (total === 1 ? ' Termin' : ' Termine')
              : 'Alle Termine – ' + total;
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

          render();
          apply();
        })();
        </script>
      </body>
    </html>
  `);
});




app.listen(3000, '0.0.0.0', () =>
  console.log("Server läuft auf http://0.0.0.0:3000")
);
