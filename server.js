import express from "express";
import { results } from "./data.js";

const app = express();

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Scraper Ergebnisse – Dark Mode</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #121212;
            color: #ffffff;
            margin: 0;
            padding: 20px;
          }

          h1 {
            text-align: center;
            margin-bottom: 30px;
            color: #ffffff;
          }

          h2 {
            color: #ffffff;
          }

          a {
            color: #ffffff;
            text-decoration: none;
          }

          a:hover {
            text-decoration: underline;
          }

          .site-block {
            margin-bottom: 50px;
          }

          /* 25% smaller tiles */
          .tiles {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            gap: 20px;
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

          .tile img {
            width: 100%;
            border-radius: 8px;
            margin-bottom: 12px;
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
        </style>
      </head>

      <body>
        <h1>Scraper Ergebnisse</h1>

        ${results.map(site => `
          <div class="site-block">
            <a href="${site.url}" target="_blank">
              <h2>${site.site}</h2>
            </a>

            <div class="tiles">
              ${site.events.slice(0, 10).map(ev => `
                <div class="tile">
                  
                  ${ev.image ? `
                    <img src="${ev.image}" alt="${ev.title}">
                  ` : ""}

                  <div class="tile-title">${ev.title}</div>
                  <div class="tile-date">${ev.date}</div>
                  <div class="tile-excerpt">${ev.excerpt}</div>

                  <a href="${ev.link}" target="_blank">Mehr erfahren →</a>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
      </body>
    </html>
  `);
});




app.listen(3000, () =>
  console.log("Server läuft auf http://localhost:3000")
);
