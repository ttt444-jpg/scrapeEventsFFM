import express from "express";
import { results } from "./data.js";

const app = express();

app.get("/", (req, res) => {
  res.send(`
    <h1>Scraper Ergebnisse</h1>
    <ul>
      ${results.map(site => `
        <li>
          <a href="${site.url}" target="_blank"><h2>${site.site}</h2></a>
          <ul>
            ${site.events.map(ev => `
              <li>
                <a href="${ev.link}" target="_blank">
                  <strong>${ev.date}</strong> – ${ev.title}
                </a>
                <br>${ev.excerpt}

                ${ev.image ? `
                  <br>
                  <img 
                    src="${ev.image}" 
                    alt="${ev.title}" 
                    style="margin-top:8px; max-width:300px; border-radius:6px;"
                  >
                ` : ""}

              </li>
            `).join("")}
          </ul>
        </li>
      `).join("")}
    </ul>
  `);
});

app.listen(3000, () =>
  console.log("Server läuft auf http://localhost:3000")
);
