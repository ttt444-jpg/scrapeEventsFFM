// Zieht Doors- (Einlass) und Start- (Beginn) Uhrzeit aus einem Freitext
// (Flyer-OCR, Detailseite, Terminzeile …). Rückgabe immer { doors, start }
// mit "HH:MM" oder "".

function norm(h, m) {
  h = Number(h);
  m = m ? Number(m) : 0;
  if (!Number.isFinite(h) || h > 23 || m > 59) return "";
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

// z. B. "Einlass: 19:00 Uhr", "Beginn 20 Uhr", "Doors 19.30", "Show um 21 Uhr",
// "Doors 7 pm". Kein führendes \b: gerendertes HTML klebt Labels oft zusammen
// ("kaufenEinlass:").
function labelled(text, labels) {
  const re = new RegExp(
    `(?:${labels})\\b\\s*[:.]?\\s*(?:um|ab)?\\s*(\\d{1,2})(?:[:.](\\d{2}))?\\s*(uhr|h\\b|[ap]\\.?\\s*m\\.?)?`,
    "i",
  );
  const m = text.match(re);
  if (!m) return "";
  let h = Number(m[1]);
  const suf = (m[3] || "").toLowerCase();
  if (/^p/.test(suf)) h = (h % 12) + 12;
  else if (/^a/.test(suf)) h = h % 12;
  return norm(h, m[2]);
}

// Englische Zeitangabe ohne Label: "3 pm", "7:30 PM", "11 am" -> "HH:MM"
function ampm(text) {
  const m = text.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*([ap])\.?\s*m\.?\b/i);
  if (!m) return "";
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === "p") h += 12;
  return norm(h, m[2]);
}

export function parseTimes(text) {
  const out = { doors: "", start: "" };
  if (!text) return out;
  const t = String(text).replace(/\s+/g, " ");

  out.doors = labelled(t, "einlass|doors?|einlass\\s*ab");
  out.start = labelled(t, "beginn|start|showtime|show|konzertbeginn");

  // Zeitspanne "19:00 - 22:00 Uhr" -> Start = erste Zeit
  if (!out.start) {
    const range = t.match(
      /\b(\d{1,2})[:.](\d{2})\s*(?:uhr)?\s*[-–—]\s*\d{1,2}[:.]\d{2}\s*uhr\b/i,
    );
    if (range) out.start = norm(range[1], range[2]);
  }

  // Kein gelabelter Start, aber eine eindeutige "HH:MM Uhr"-Angabe -> Start
  if (!out.start) {
    const solo =
      t.match(/\b(\d{1,2})[:.](\d{2})\s*uhr\b/i) ||
      t.match(/\bum\s+(\d{1,2})(?:[:.](\d{2}))?\s*uhr\b/i);
    const val = solo ? norm(solo[1], solo[2]) : "";
    if (val && val !== out.doors) out.start = val;
  }

  // Englische Uhrzeit ("3 pm") als letzter Fallback für den Start
  if (!out.start) {
    const val = ampm(t);
    if (val && val !== out.doors) out.start = val;
  }

  // Ist nur eine einzige Zeit bekannt (oder doors == start), gilt sie als
  // Start – doors wird nur gesetzt, wenn es sich vom Start unterscheidet.
  if (out.doors && (!out.start || out.doors === out.start)) {
    out.start = out.doors;
    out.doors = "";
  }

  return out;
}

// "2026-09-13T20:00:00+02:00" / "20:00" -> "20:00"
export function isoTime(value) {
  const m = /(?:T|^|\s)(\d{1,2}):(\d{2})/.exec(String(value || ""));
  return m ? String(m[1]).padStart(2, "0") + ":" + m[2] : "";
}
