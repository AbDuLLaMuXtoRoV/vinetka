/**
 * Uzbek (Latin) formatting without relying on the runtime's locale data.
 *
 * Chromium-based browsers (Chrome, Android Chrome, Edge, Yandex Browser) ship
 * without Uzbek CLDR data, so Intl falls back to the root locale there:
 * "2026 M11 24", "Tue", "$ 19.99". Node and Safari format correctly, so server
 * and client output also disagreed. These helpers produce the CLDR uz forms
 * ("24-noy, 2026", "Sesh", "19,99 US$") from en-US parts, which every runtime has.
 */

const MONTHS_LONG = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const MONTHS_SHORT = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const WEEKDAYS_LONG = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const WEEKDAYS_SHORT = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"];
const NBSP = " ";

/** "1,999.5" (en-US) → "1 999,5" (uz): non-breaking space groups, decimal comma. */
function toUzDigits(en: string): string {
  return en.replace(/[,.]/g, (c) => (c === "," ? NBSP : ","));
}

export function uzNumber(n: number, opts: Intl.NumberFormatOptions = {}): string {
  return toUzDigits(new Intl.NumberFormat("en-US", opts).format(n));
}

/** 19.99 → "19,99 US$" (USD for now; multi-currency is a later phase). */
export function uzMoney(amount: number, fractionDigits: number): string {
  return `${uzNumber(amount, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })}${NBSP}US$`;
}

/** 0.125 → "12,5%". */
export function uzPercent(fraction: number, maxDigits: number): string {
  return `${uzNumber(fraction * 100, { maximumFractionDigits: maxDigits })}%`;
}

interface Parts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
  tzName: string;
}

function partsOf(date: Date, timeZone?: string, timeZoneName?: Intl.DateTimeFormatOptions["timeZoneName"]): Parts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    ...(timeZoneName ? { timeZoneName } : {}),
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  return {
    year,
    month,
    day,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    hour: Number(get("hour")) % 24,
    minute: Number(get("minute")),
    tzName: get("timeZoneName"),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Date/time in the CLDR uz patterns for the Intl options the app uses. */
export function uzDate(date: Date, opts: Intl.DateTimeFormatOptions): string {
  const p = partsOf(date, opts.timeZone, opts.timeZoneName);
  let datePart = "";

  if (opts.month === "numeric" || opts.month === "2-digit") {
    datePart = [opts.day ? pad(p.day) : null, pad(p.month), opts.year ? String(p.year) : null].filter(Boolean).join(".");
  } else if (opts.month) {
    const name = (opts.month === "long" ? MONTHS_LONG : MONTHS_SHORT)[p.month - 1];
    datePart = opts.day ? `${p.day}-${name}` : name!;
    if (opts.year) datePart += opts.day ? `, ${p.year}` : ` ${p.year}`;
  } else if (opts.year) {
    datePart = String(p.year);
  } else if (opts.day) {
    datePart = String(p.day);
  }

  if (opts.weekday) {
    const wd = (opts.weekday === "long" ? WEEKDAYS_LONG : WEEKDAYS_SHORT)[p.weekday]!;
    datePart = datePart ? `${wd}, ${datePart}` : wd;
  }

  const timePart = opts.hour !== undefined || opts.minute !== undefined ? `${pad(p.hour)}:${pad(p.minute)}` : "";
  const out = [datePart, timePart].filter(Boolean).join(", ");
  return opts.timeZoneName && p.tzName ? `${out} ${p.tzName}` : out;
}

const UNIT_WORDS = { minute: "daqiqa", hour: "soat", day: "kun", month: "oy" } as const;

/** "3 kundan keyin", "2 soat oldin", "ertaga", "kecha", "bugun". */
export function uzRelative(value: number, unit: keyof typeof UNIT_WORDS): string {
  if (unit === "day") {
    if (value === 0) return "bugun";
    if (value === 1) return "ertaga";
    if (value === -1) return "kecha";
  }
  if (value === 0) return "hozir";
  const n = uzNumber(Math.abs(value));
  return value > 0 ? `${n} ${UNIT_WORDS[unit]}dan keyin` : `${n} ${UNIT_WORDS[unit]} oldin`;
}
