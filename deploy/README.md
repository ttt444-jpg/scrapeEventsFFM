# Production-Deployment

Betrieb auf dem Server als systemd-Dienst hinter Nginx Proxy Manager.

## Komponenten

| Datei | Zweck |
| --- | --- |
| `systemd/scrapeeventsffm.service` | Dauerlauf des Servers: `node index.js --no-scrape` auf `0.0.0.0:3000`, Neustart bei Absturz und Boot. |
| `systemd/scrapeeventsffm-scrape.service` | Oneshot: `node scrape-once.js` (nur Scrapen, kein Server), schreibt `results.json` neu und startet danach `scrapeeventsffm.service` neu. |
| `systemd/scrapeeventsffm-scrape.timer` | Ruft den Scrape taeglich 05:00 UTC auf (`Persistent=true` holt verpasste Laeufe nach). |

## Installation

```bash
sudo cp deploy/systemd/scrapeeventsffm*.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now scrapeeventsffm.service
sudo systemctl enable --now scrapeeventsffm-scrape.timer
```

Voraussetzung: Repo liegt unter `/opt/scrapeEventsFFM`, `node` unter `/usr/bin/node`,
einmal `npm install` und `npm start` gelaufen (damit `results.json` existiert).

## Reverse Proxy (Nginx Proxy Manager)

NPM laeuft als Docker-Container `npm-app-1` (Ports 80/81/443). Proxy Host:

- Domain: `concerts.the-doblers.com`
- Scheme `http`, Forward Host `172.19.0.1` (npm_default-Gateway = Host), Port `3000`
- Block Common Exploits: an
- SSL: neues Let's-Encrypt-Zertifikat, Force SSL + HTTP/2

DNS: A-Record `concerts.the-doblers.com` -> Server-IP.

## Firewall

Port 3000 ist nicht oeffentlich, nur aus Docker-Netzen erreichbar:

```bash
sudo ufw allow from 172.16.0.0/12 to any port 3000 proto tcp
```

## Betrieb

```bash
systemctl status scrapeeventsffm.service
journalctl -u scrapeeventsffm.service -f
systemctl start scrapeeventsffm-scrape.service   # Scrape sofort ausloesen
```
