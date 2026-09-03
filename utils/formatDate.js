// Bringt die unterschiedlichen Datumsformate der Scraper auf ein einheitliches
// Format: "So, 13.09.26"  ->  <Wochentag kurz>, <TT>.<MM>.<JJ>

const WEEKDAYS_DE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

const MONTHS = {
  jan: 1, januar: 1, january: 1, "jän": 1, "jänner": 1,
  feb: 2, februar: 2, february: 2,
  mar: 3, "mär": 3, "märz": 3, mrz: 3, march: 3,
  apr: 4, april: 4,
  mai: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, november: 11,
  dez: 12, dec: 12, dezember: 12, december: 12,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeYear(y) {
  if (y == null || y === "") return null;
  const n = Number(y);
  if (Number.isNaN(n)) return null;
  return n < 100 ? 2000 + n : n;
}

// Kein Jahr im String -> Jahr so wählen, dass das Event in der Zukunft liegt.
// Ist das Datum mehr als ~1 Monat in der Vergangenheit, gehört es ins nächste Jahr.
function inferYear(day, month) {
  const now = new Date();
  const year = now.getFullYear();
  const candidate = new Date(year, month - 1, day);
  if (candidate.getTime() < now.getTime() - 31 * MS_PER_DAY) return year + 1;
  return year;
}

function render(day, month, year) {
  const d = new Date(year, month - 1, day);
  const wd = WEEKDAYS_DE[d.getDay()];
  const dd = String(day).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const yy = String(year % 100).padStart(2, "0");
  return `${wd}, ${dd}.${mm}.${yy}`;
}

// ISO: "2026-09-04" / "2026-09-04T20:00:00+02:00"
function parseIso(str) {
  const m = str.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { day, month, year };
}

// Numerisch: "05.09.", "10.10.", "8.8.2026", "Fr, 04.09.26",
// "Fr 04.09.2026", "FR 04.09", "Freitag, 04.09.2026VVK*:..."
function parseNumeric(str) {
  const m = str.match(/(\d{1,2})\s*\.\s*(\d{1,2})\s*(?:\.\s*(\d{2,4}))?/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = normalizeYear(m[3]) ?? inferYear(day, month);
  return { day, month, year };
}

// Monatsname: "16. Sep 2026", "03. Okt 2026", "Sunday 13. September"
function parseMonthName(str) {
  const m = str.match(/(\d{1,2})\s*\.?\s*([A-Za-zäöüÄÖÜ]+)\.?\s*(\d{4})?/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[m[2].toLowerCase()];
  if (!month || day < 1 || day > 31) return null;
  const year = normalizeYear(m[3]) ?? inferYear(day, month);
  return { day, month, year };
}

// Nur Tag: "01", "13" (Monatskalender -> aktueller bzw. nächster Monat)
function parseDayOnly(str) {
  const m = str.match(/^\s*(\d{1,2})\s*$/);
  if (!m) return null;
  const day = Number(m[1]);
  if (day < 1 || day > 31) return null;
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  const candidate = new Date(year, month - 1, day);
  if (candidate.getTime() < now.getTime() - 5 * MS_PER_DAY) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return { day, month, year };
}

export function formatEventDate(raw) {
  if (raw == null) return "";
  const str = String(raw).trim();
  if (!str) return "";

  const parsed =
    parseIso(str) ||
    parseNumeric(str) ||
    parseMonthName(str) ||
    parseDayOnly(str);

  if (!parsed) {
    console.warn(`formatEventDate: konnte Datum nicht parsen: "${str}"`);
    return str;
  }

  return render(parsed.day, parsed.month, parsed.year);
}
