/* ==========================================================
   Config
   ========================================================== */

const COFFEE_LINK = "https://www.buymeacoffee.com/yourname";

const STORAGE_LANG_KEY = "preferredLang_v1";
const STORAGE_THEME_KEY = "preferredTheme_v1";

const UPDATE_INTERVAL_MS = 60_000;      // progresso
const CLOCK_INTERVAL_MS = 1_000;        // relógio ao vivo
const STALE_AFTER_MS = 75 * 60_000;     // watchdog

/* ==========================================================
   Monthly & Yearly rules
   ========================================================== */

const MONTHLY_CHECKPOINTS = [
  { h: 0,  m: 0 },  // update (no increment)
  { h: 8,  m: 0 },  // + 1/4
  { h: 10, m: 0 },  // + 2/4
  { h: 13, m: 0 },  // update (no increment)
  { h: 16, m: 0 },  // + 3/4
  { h: 20, m: 0 },  // + 4/4
];
const MONTHLY_INCREMENT_AT = new Set([1, 2, 4, 5]);

const YEARLY_CHECKPOINTS = [
  { h: 0,  m: 0 },  // 0/6
  { h: 8,  m: 0 },  // 2/6
  { h: 12, m: 0 },  // 4/6
  { h: 18, m: 0 },  // 6/6
];
const YEARLY_CUM_PARTS = [0, 2, 4, 6];

/* ==========================================================
   Weekly: fixed checkpoint table
   ========================================================== */

const WEEKLY_CHECKPOINTS = [
  // Monday
  { dow: 1, h: 9,  pct: 0.0 },
  { dow: 1, h: 10, pct: 2.5 },
  { dow: 1, h: 11, pct: 5.0 },
  { dow: 1, h: 12, pct: 7.5 },
  { dow: 1, h: 13, pct: 10.0 },
  { dow: 1, h: 15, pct: 12.5 },
  { dow: 1, h: 16, pct: 15.0 },
  { dow: 1, h: 17, pct: 17.5 },
  { dow: 1, h: 18, pct: 20.0 },

  // Tuesday
  { dow: 2, h: 9,  pct: 20.0 },
  { dow: 2, h: 10, pct: 22.5 },
  { dow: 2, h: 11, pct: 25.0 },
  { dow: 2, h: 12, pct: 27.5 },
  { dow: 2, h: 13, pct: 30.0 },
  { dow: 2, h: 15, pct: 32.5 },
  { dow: 2, h: 16, pct: 35.0 },
  { dow: 2, h: 17, pct: 37.5 },
  { dow: 2, h: 18, pct: 40.0 },

  // Wednesday
  { dow: 3, h: 9,  pct: 40.0 },
  { dow: 3, h: 10, pct: 42.5 },
  { dow: 3, h: 11, pct: 45.0 },
  { dow: 3, h: 12, pct: 47.5 },
  { dow: 3, h: 13, pct: 50.0 },
  { dow: 3, h: 15, pct: 52.5 },
  { dow: 3, h: 16, pct: 55.0 },
  { dow: 3, h: 17, pct: 57.5 },
  { dow: 3, h: 18, pct: 60.0 },

  // Thursday
  { dow: 4, h: 9,  pct: 60.0 },
  { dow: 4, h: 10, pct: 62.5 },
  { dow: 4, h: 11, pct: 65.0 },
  { dow: 4, h: 12, pct: 67.5 },
  { dow: 4, h: 13, pct: 70.0 },
  { dow: 4, h: 15, pct: 72.5 },
  { dow: 4, h: 16, pct: 75.0 },
  { dow: 4, h: 17, pct: 77.5 },
  { dow: 4, h: 18, pct: 80.0 },

  // Friday
  { dow: 5, h: 9,  pct: 80.0 },
  { dow: 5, h: 10, pct: 82.5 },
  { dow: 5, h: 11, pct: 85.0 },
  { dow: 5, h: 12, pct: 87.5 },
  { dow: 5, h: 13, pct: 90.0 },
  { dow: 5, h: 15, pct: 92.5 },
  { dow: 5, h: 16, pct: 95.0 },
  { dow: 5, h: 17, pct: 97.5 },
  { dow: 5, h: 18, pct: 100.0 },
];

/* ==========================================================
   State
   ========================================================== */

let currentLang = "en";
let currentTheme = "dark";
let lastSuccessfulUpdateAt = 0;
let updateTimer = null;
let clockTimer = null;

/* ==========================================================
   DOM
   ========================================================== */

const $ = (sel) => document.querySelector(sel);

const statusEl = $("#status");

const weeklyPercentEl = $("#weeklyPercent");
const monthlyPercentEl = $("#monthlyPercent");
const yearlyPercentEl = $("#yearlyPercent");

const weeklyLabelEl = $("#weeklyLabel");
const monthlyLabelEl = $("#monthlyLabel");
const yearlyLabelEl = $("#yearlyLabel");

const langBtn = $("#langBtn");
const langBtnLabel = $("#langBtnLabel");
const langMenu = $("#langMenu");

const themeBtn = $("#themeBtn");
const themeLabelEl = $("#themeLabel");
const themeIconEl = $("#themeIcon");

const liveClockEl = $("#liveClock");
const coffeeBtn = $("#coffeeBtn");

/* ==========================================================
   Helpers
   ========================================================== */

function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }

function safeNow(){ return new Date(); }

function getLocaleForLang(lang){
  const map = {
    pt: "pt-BR",
    es: "es-ES",
    en: "en-US",
    fr: "fr-FR",
    de: "de-DE",
    it: "it-IT",
    zh: "zh-CN",
    ja: "ja-JP",
  };
  return map[lang] || "en-US";
}

function t(path){
  const parts = path.split(".");
  let obj = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  for (const p of parts) obj = obj?.[p];
  return obj ?? path;
}

function tTpl(path, vars){
  let s = t(path);
  for (const [k,v] of Object.entries(vars || {})){
    s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

function formatPercent(value){
  const locale = getLocaleForLang(currentLang);
  const nf = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  return `${nf.format(value)}%`;
}

function monthName(now){
  const locale = getLocaleForLang(currentLang);
  const fmt = new Intl.DateTimeFormat(locale, { month: "long" });
  return fmt.format(now); // sem capitalizar
}

function applyI18n(){
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    // monthly label é template, vamos renderizar via updateLabels()
    if (el === monthlyLabelEl) return;
    el.textContent = t(key);
  });

  langBtnLabel.textContent = t("ui.language");

  // <html lang="">
  document.documentElement.lang = currentLang;

  // Atualiza labels dependentes de data
  updateLabels();
}

function updateLabels(){
  const now = safeNow();
  const mName = monthName(now);
  monthlyLabelEl.textContent = tTpl("labels.monthlyDoneTpl", { month: mName });

  // Theme label também depende do tema atual
  updateThemeUI();
}

function showStatus(show){
  statusEl.hidden = !show;
}

/* ==========================================================
   Theme (Light/Dark)
   ========================================================== */

function getPreferredThemeFromSystem(){
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme){
  currentTheme = (theme === "light") ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeUI();
}

function updateThemeUI(){
  const isDark = currentTheme === "dark";
  themeLabelEl.textContent = isDark ? t("ui.dark") : t("ui.light");
  themeIconEl.textContent = isDark ? "🌙" : "☀️";
}

function initTheme(){
  const saved = localStorage.getItem(STORAGE_THEME_KEY);
  if (saved === "light" || saved === "dark"){
    applyTheme(saved);
    return;
  }
  applyTheme(getPreferredThemeFromSystem());
}

function toggleTheme(){
  const next = (currentTheme === "dark") ? "light" : "dark";
  localStorage.setItem(STORAGE_THEME_KEY, next);
  applyTheme(next);
}

/* ==========================================================
   Language detection (same strategy as before)
   ========================================================== */

async function detectLanguageAuto(){
  const ipLang = await detectByIPGeo().catch(() => null);
  if (ipLang) return ipLang;

  const navLang = detectByNavigator();
  if (navLang) return navLang;

  const tzLang = detectByTimeZone();
  if (tzLang) return tzLang;

  return "en";
}

function detectByNavigator(){
  const candidates = []
    .concat(navigator.languages || [])
    .concat(navigator.language ? [navigator.language] : [])
    .filter(Boolean);

  for (const c of candidates){
    const base = String(c).toLowerCase().split("-")[0];
    if (SUPPORTED_LANGS.includes(base)) return base;
  }
  return null;
}

function detectByTimeZone(){
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (tz.startsWith("America/Sao_Paulo")) return "pt";
  if (tz.startsWith("America/") || tz.startsWith("Europe/London")) return "en";
  if (tz.startsWith("Europe/Madrid") || tz.startsWith("America/Mexico_City")) return "es";
  if (tz.startsWith("Europe/Paris")) return "fr";
  if (tz.startsWith("Europe/Berlin")) return "de";
  if (tz.startsWith("Europe/Rome")) return "it";
  if (tz.startsWith("Asia/Shanghai") || tz.startsWith("Asia/Hong_Kong")) return "zh";
  if (tz.startsWith("Asia/Tokyo")) return "ja";
  return null;
}

async function detectByIPGeo(){
  const r1 = await fetchWithTimeout("https://ipapi.co/json/", 1500).catch(() => null);
  const lang1 = mapGeoToLang(r1);
  if (lang1) return lang1;

  const r2 = await fetchWithTimeout("https://ipwho.is/?fields=success,country_code,languages", 1500).catch(() => null);
  const lang2 = mapGeoToLang(r2);
  if (lang2) return lang2;

  return null;
}

function mapGeoToLang(data){
  if (!data) return null;
  if (typeof data.success === "boolean" && data.success === false) return null;

  const country = (data.country_code || data.country || "").toString().toUpperCase();

  const langsRaw = data.languages;
  if (langsRaw){
    const first = String(langsRaw).split(",")[0].trim().toLowerCase();
    const base = first.split("-")[0];
    if (SUPPORTED_LANGS.includes(base)) return base;
  }

  const PT = new Set(["BR","PT","AO","MZ","CV","GW","ST","TL"]);
  const ES = new Set(["ES","MX","AR","CO","CL","PE","VE","EC","GT","CU","BO","DO","HN","PY","SV","NI","CR","PA","UY"]);
  const FR = new Set(["FR","BE","CH","CA","LU","MC"]);
  const DE = new Set(["DE","AT","CH","LU"]);
  const IT = new Set(["IT","SM","VA","CH"]);
  const ZH = new Set(["CN","TW","HK","MO"]);
  const JA = new Set(["JP"]);

  if (PT.has(country)) return "pt";
  if (ES.has(country)) return "es";
  if (FR.has(country)) return "fr";
  if (DE.has(country)) return "de";
  if (IT.has(country)) return "it";
  if (ZH.has(country)) return "zh";
  if (JA.has(country)) return "ja";

  return "en";
}

async function fetchWithTimeout(url, timeoutMs){
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);

  try{
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: ctrl.signal,
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(id);
  }
}

async function initLanguage(){
  const saved = localStorage.getItem(STORAGE_LANG_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)){
    currentLang = saved;
    applyI18n();
    return;
  }

  const auto = await detectLanguageAuto().catch(() => "en");
  currentLang = SUPPORTED_LANGS.includes(auto) ? auto : "en";
  applyI18n();
}

/* ==========================================================
   Language menu UI
   ========================================================== */

function buildLangMenu(){
  langMenu.innerHTML = "";

  for (const code of SUPPORTED_LANGS){
    const meta = LANG_META[code];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "menu__item";
    btn.setAttribute("role", "menuitemradio");
    btn.setAttribute("aria-checked", String(code === currentLang));
    btn.dataset.lang = code;

    const left = document.createElement("span");
    left.textContent = meta?.native || code;

    const right = document.createElement("span");
    right.className = "menu__code";
    right.textContent = code.toUpperCase();

    btn.append(left, right);

    btn.addEventListener("click", () => {
      setLanguage(code, { manual: true });
      closeLangMenu();
    });

    langMenu.appendChild(btn);
  }
}

function openLangMenu(){
  buildLangMenu();
  langMenu.hidden = false;
  langBtn.setAttribute("aria-expanded", "true");
}

function closeLangMenu(){
  langMenu.hidden = true;
  langBtn.setAttribute("aria-expanded", "false");
}

function toggleLangMenu(){
  if (langMenu.hidden) openLangMenu();
  else closeLangMenu();
}

function setLanguage(lang, { manual }){
  if (!SUPPORTED_LANGS.includes(lang)) lang = "en";
  currentLang = lang;

  if (manual){
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  }

  applyI18n();
  updateAllProgress({ force: true });
  updateClock(); // reflete locale no relógio imediatamente
}

/* ==========================================================
   Progress logic
   ========================================================== */

function startOfWeekMonday(date){
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diffToMonday = (day === 0) ? -6 : (1 - day);
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0,0,0,0);
  return d;
}

function weeklyProgress(now){
  const dow = now.getDay();
  if (dow === 6) return 100; // sábado
  if (dow === 0) return 0;   // domingo reset

  const weekStart = startOfWeekMonday(now);
  const dated = WEEKLY_CHECKPOINTS.map(cp => {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + (cp.dow - 1));
    dt.setHours(cp.h, 0, 0, 0);
    return { t: dt.getTime(), pct: cp.pct };
  });

  const nowT = now.getTime();
  if (nowT < dated[0].t) return 0;

  let last = 0;
  for (const p of dated){
    if (p.t <= nowT) last = p.pct;
    else break;
  }
  return clamp(last, 0, 100);
}

function daysInMonth(y, mIndex){
  return new Date(y, mIndex + 1, 0).getDate();
}

function monthlyProgress(now){
  const y = now.getFullYear();
  const m = now.getMonth();
  const dim = daysInMonth(y, m);
  const perDay = 100 / dim;

  const dayIndex = now.getDate(); // 1..dim
  const base = (dayIndex - 1) * perDay;

  const incPer = perDay / 4;

  let incCount = 0;
  for (let i = 0; i < MONTHLY_CHECKPOINTS.length; i++){
    const { h, m: mm } = MONTHLY_CHECKPOINTS[i];
    const cp = new Date(y, m, dayIndex, h, mm, 0, 0);
    if (now >= cp && MONTHLY_INCREMENT_AT.has(i)) incCount++;
  }

  const val = base + (incCount * incPer);
  return clamp(val, 0, 100);
}

function isLeapYear(y){
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

function dayOfYear(date){
  const start = new Date(date.getFullYear(), 0, 1);
  start.setHours(0,0,0,0);
  const d = new Date(date);
  d.setHours(0,0,0,0);
  const diff = d - start;
  return Math.floor(diff / 86400000) + 1;
}

function yearlyProgress(now){
  const y = now.getFullYear();
  const totalDays = isLeapYear(y) ? 366 : 365;
  const perDay = 100 / totalDays;

  const doy = dayOfYear(now);
  const base = (doy - 1) * perDay;

  let parts = 0;
  for (let i = 0; i < YEARLY_CHECKPOINTS.length; i++){
    const { h, m } = YEARLY_CHECKPOINTS[i];
    const cp = new Date(y, now.getMonth(), now.getDate(), h, m, 0, 0);
    if (now >= cp) parts = YEARLY_CUM_PARTS[i];
  }
  parts = clamp(parts, 0, 6);

  const val = base + (perDay * (parts / 6));
  return clamp(val, 0, 100);
}

/* ==========================================================
   Update loop
   ========================================================== */

function updateAllProgress({ force } = { force: false }){
  try{
    const now = safeNow();

    const w = weeklyProgress(now);
    const m = monthlyProgress(now);
    const y = yearlyProgress(now);

    weeklyPercentEl.textContent = formatPercent(w);
    monthlyPercentEl.textContent = formatPercent(m);
    yearlyPercentEl.textContent = formatPercent(y);

    // labels depend on month name
    updateLabels();

    lastSuccessfulUpdateAt = Date.now();
    showStatus(false);
  } catch (err){
    // fail silent; watchdog can show status if needed
  } finally {
    if (force) checkStale();
  }
}

function checkStale(){
  const stale = (Date.now() - lastSuccessfulUpdateAt) > STALE_AFTER_MS;
  showStatus(stale);
}

function startAutoUpdate(){
  if (updateTimer) clearInterval(updateTimer);

  updateAllProgress({ force: true });

  updateTimer = setInterval(() => {
    updateAllProgress();
    checkStale();
  }, UPDATE_INTERVAL_MS);
}

/* ==========================================================
   Live clock
   ========================================================== */

function formatClock(now){
  const locale = getLocaleForLang(currentLang);
  // Date + Time with seconds; locale controls ordering
  const df = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
  const tf = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  // Keep " - " like the print
  return `${df.format(now)} - ${tf.format(now)}`;
}

function updateClock(){
  liveClockEl.textContent = formatClock(safeNow());
}

function startClock(){
  if (clockTimer) clearInterval(clockTimer);
  updateClock();
  clockTimer = setInterval(updateClock, CLOCK_INTERVAL_MS);
}

/* ==========================================================
   Events
   ========================================================== */

function bindEvents(){
  // Theme toggle
  themeBtn.addEventListener("click", toggleTheme);

  // Language dropdown
  langBtn.addEventListener("click", toggleLangMenu);

  document.addEventListener("click", (e) => {
    if (!langMenu.hidden){
      const within = e.target.closest(".lang");
      if (!within) closeLangMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !langMenu.hidden) closeLangMenu();
  });

  // Update when returning to tab
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible"){
      updateAllProgress({ force: true });
      updateClock();
    }
  });

  window.addEventListener("focus", () => {
    updateAllProgress({ force: true });
    updateClock();
  });

  // If system theme changes and user never manually chose, follow system
  if (window.matchMedia){
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener?.("change", () => {
      const saved = localStorage.getItem(STORAGE_THEME_KEY);
      if (saved !== "light" && saved !== "dark"){
        applyTheme(getPreferredThemeFromSystem());
      }
    });
  }
}

/* ==========================================================
   Init
   ========================================================== */

(async function init(){
  coffeeBtn.href = COFFEE_LINK;

  initTheme();

  await initLanguage();
  buildLangMenu();

  bindEvents();
  startAutoUpdate();
  startClock();

  lastSuccessfulUpdateAt = Date.now();
})();