/* 1) Config */
const COFFEE_LINK = "https://apoia.se/partesdotempo";
const STORAGE_THEME_KEY = "preferredTheme_v1";
const STORAGE_LANG_KEY = "preferredLang_v1";

const CLOCK_INTERVAL_MS = 1000;
const STALE_AFTER_MS = 75 * 60_000;

const WORK_START_H = 9;
const LUNCH_START_H = 12;
const LUNCH_END_H = 13;
const WORK_END_H = 18;

const FIVE_MIN_MS = 5 * 60 * 1000;

/* 2) State */
let currentTheme = "dark";
let currentLang = "pt";
let lastSuccessfulUpdateAt = 0;
let clockTimer = null;
let lastFiveBucket = null;

/* 3) DOM */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const statusEl = $("#status");
const statusTextEl = $("#statusText");

const dailyPercentEl = $("#dailyPercent");
const workweekPercentEl = $("#workweekPercent");
const weeklyPercentEl = $("#weeklyPercent");
const monthlyPercentEl = $("#monthlyPercent");
const yearlyPercentEl = $("#yearlyPercent");

const themeBtn = $("#themeBtn");
const themeLabelEl = $("#themeLabel");
const themeIconEl = $("#themeIcon");

const liveClockEl = $("#liveClock");
const coffeeBtn = $("#coffeeBtn");

const langBtn = $("#langBtn");
const langBtnLabelEl = $("#langBtnLabel");
const langMenuEl = $("#langMenu");

const dailyLabelEl = $("#dailyLabel");
const workweekLabelEl = $("#workweekLabel");
const weeklyLabelEl = $("#weeklyLabel");
const monthlyLabelEl = $("#monthlyLabel");
const yearlyLabelEl = $("#yearlyLabel");

const holidaysTitleEl = $("#holidaysTitle");
const holidaysListEl = $("#holidaysList");
const coffeeLabelEl = $("#coffeeLabel");

/* 4) Helpers */
function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }
function safeNow(){ return new Date(); }
function showStatus(show){ statusEl.hidden = !show; }

function formatPercentInt(value){
  const v = Math.round(value);
  return `${clamp(v, 0, 100)}%`;
}

function formatClock(now){
  const df = new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const tf = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  return `${df.format(now)} - ${tf.format(now)}`;
}

function startOfDay(date){
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date){
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(date){
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfYear(date){
  const d = new Date(date.getFullYear(), 0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfYear(date){
  const d = new Date(date.getFullYear() + 1, 0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeekMonday(date){
  const d = startOfDay(date);
  const day = d.getDay();
  const diffToMonday = (day === 0) ? -6 : (1 - day);
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function minutesBetween(a, b){
  return Math.max(0, (b.getTime() - a.getTime()) / 60000);
}

function overlapsMinutes(rangeStart, rangeEnd, windowStart, windowEnd){
  const s = Math.max(rangeStart.getTime(), windowStart.getTime());
  const e = Math.min(rangeEnd.getTime(), windowEnd.getTime());
  return Math.max(0, (e - s) / 60000);
}

function parseMmDd(mmdd, year){
  if (!mmdd) return null;
  const [mm, dd] = String(mmdd).split("-").map(Number);
  if (!mm || !dd) return null;

  const d = new Date(year, mm - 1, dd);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* 4.1) i18n */
function normalizeLang(code){
  if (!code) return "pt";
  const base = String(code).toLowerCase().split("-")[0];
  return SUPPORTED_LANGS.includes(base) ? base : "pt";
}

function localeFor(lang){
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
  return map[lang] || "pt-BR";
}

function t(path, vars){
  const dict = (TRANSLATIONS && TRANSLATIONS[currentLang]) ? TRANSLATIONS[currentLang] : TRANSLATIONS.pt;
  const parts = path.split(".");
  let val = dict;

  for (const p of parts){
    val = val && Object.prototype.hasOwnProperty.call(val, p) ? val[p] : undefined;
  }

  if (typeof val !== "string"){
    let v2 = TRANSLATIONS.pt;
    for (const p of parts){
      v2 = v2 && Object.prototype.hasOwnProperty.call(v2, p) ? v2[p] : undefined;
    }
    val = (typeof v2 === "string") ? v2 : path;
  }

  if (vars && typeof val === "string"){
    for (const k of Object.keys(vars)){
      val = val.replaceAll(`{${k}}`, String(vars[k]));
    }
  }

  return val;
}

function getMonthName(now){
  const fmt = new Intl.DateTimeFormat(localeFor(currentLang), { month: "long" });
  return fmt.format(now);
}

function setLabelKeepingEmoji(containerEl, newText){
  if (!containerEl) return;

  const textNode = Array.from(containerEl.childNodes).find(n => n.nodeType === Node.TEXT_NODE);

  if (textNode){
    textNode.nodeValue = newText;
    return;
  }

  containerEl.insertBefore(document.createTextNode(newText), containerEl.firstChild);
}

function updateTexts(){
  if (langBtnLabelEl) langBtnLabelEl.textContent = t("ui.language");
  updateThemeUI();

  setLabelKeepingEmoji(dailyLabelEl, t("labels.dailyDone"));
  setLabelKeepingEmoji(workweekLabelEl, t("labels.workweekDone"));
  setLabelKeepingEmoji(weeklyLabelEl, t("labels.weeklyDone"));

  const month = getMonthName(safeNow());
  setLabelKeepingEmoji(monthlyLabelEl, t("labels.monthlyDoneTpl", { month }));
  setLabelKeepingEmoji(yearlyLabelEl, t("labels.yearlyDone"));

  if (holidaysTitleEl) holidaysTitleEl.textContent = t("labels.holidaysTitle");
  if (coffeeLabelEl) coffeeLabelEl.textContent = t("labels.coffee");
  if (statusTextEl) statusTextEl.textContent = t("errors.paused");

  if (langBtn){
    langBtn.setAttribute("aria-label", t("ui.language"));
    langBtn.title = t("ui.language");
  }
}

function applyLang(lang){
  currentLang = normalizeLang(lang);
  document.documentElement.setAttribute("lang", currentLang);
  updateTexts();
}

function initLang(){
  const saved = localStorage.getItem(STORAGE_LANG_KEY);
  if (saved){
    applyLang(saved);
    return;
  }

  const fromNav = normalizeLang(navigator.language || navigator.userLanguage || "pt-BR");
  applyLang(fromNav);
}

function setLang(lang){
  const next = normalizeLang(lang);
  localStorage.setItem(STORAGE_LANG_KEY, next);
  applyLang(next);
  closeLangMenu();
}

function toggleLangMenu(){
  const open = !langMenuEl.hidden;
  if (open) closeLangMenu();
  else openLangMenu();
}

function openLangMenu(){
  langMenuEl.hidden = false;
  langBtn.setAttribute("aria-expanded", "true");
}

function closeLangMenu(){
  langMenuEl.hidden = true;
  langBtn.setAttribute("aria-expanded", "false");
}

function buildLangMenu(){
  if (!langMenuEl) return;

  langMenuEl.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gap = "8px";
  wrap.style.padding = "10px";
  wrap.style.position = "absolute";
  wrap.style.right = "14px";
  wrap.style.top = "72px";
  wrap.style.zIndex = "999";
  wrap.style.border = "1px solid var(--border)";
  wrap.style.borderRadius = "12px";
  wrap.style.background = "rgba(0,0,0,.55)";
  wrap.style.backdropFilter = "blur(10px)";
  wrap.style.webkitBackdropFilter = "blur(10px)";

  if (document.documentElement.getAttribute("data-theme") === "light"){
    wrap.style.background = "rgba(255,255,255,.88)";
  }

  for (const code of SUPPORTED_LANGS){
    const meta = LANG_META[code] || { native: code.toUpperCase() };
    const btn = document.createElement("button");

    btn.type = "button";
    btn.setAttribute("role", "menuitemradio");
    btn.setAttribute("aria-checked", code === currentLang ? "true" : "false");
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "space-between";
    btn.style.gap = "10px";
    btn.style.padding = "10px 12px";
    btn.style.borderRadius = "10px";
    btn.style.border = "1px solid var(--border2)";
    btn.style.background = "transparent";
    btn.style.color = "var(--text)";
    btn.style.cursor = "pointer";
    btn.style.font = "inherit";
    btn.style.fontWeight = "700";

    const left = document.createElement("span");
    left.textContent = meta.native;

    const right = document.createElement("span");
    right.textContent = code === currentLang ? "✓" : "";

    btn.addEventListener("click", () => setLang(code));
    btn.addEventListener("mouseenter", () => { btn.style.borderColor = "rgba(255,255,255,.26)"; });
    btn.addEventListener("mouseleave", () => { btn.style.borderColor = "var(--border2)"; });

    btn.appendChild(left);
    btn.appendChild(right);
    wrap.appendChild(btn);
  }

  langMenuEl.appendChild(wrap);

  setTimeout(() => {
    const onDocClick = (e) => {
      if (!langMenuEl.contains(e.target) && e.target !== langBtn && !langBtn.contains(e.target)){
        closeLangMenu();
        document.removeEventListener("click", onDocClick, true);
      }
    };
    document.addEventListener("click", onDocClick, true);
  }, 0);
}

/* 4.2) Holidays */
function updateHolidayVisibility(now = safeNow()){
  if (!holidaysListEl) return;

  const today = startOfDay(now);
  const year = today.getFullYear();
  const holidayItems = $$("#holidaysList .holiday-item");

  let nextItem = null;

  for (const item of holidayItems){
    item.classList.remove("holiday-item--next");

    const mmdd = item.dataset.mmdd;
    const holidayDate = parseMmDd(mmdd, year);

    if (!holidayDate){
      item.hidden = false;
      continue;
    }

    const hasPassed = holidayDate.getTime() < today.getTime();

    item.hidden = hasPassed;

    if (!hasPassed && !nextItem){
      nextItem = item;
    }
  }

  if (nextItem){
    nextItem.classList.add("holiday-item--next");
  }
}

/* 5) Progress */
function dailyProgress(now){
  const dayStart = startOfDay(now);
  const mins = minutesBetween(dayStart, now);
  const buckets = Math.floor(mins / 5);
  const val = buckets * (100 / 288);
  return clamp(val, 0, 100);
}

function weeklyProgress(now){
  const weekStart = startOfWeekMonday(now);
  const mins = minutesBetween(weekStart, now);
  const total = 7 * 24 * 60;
  const buckets = Math.floor(mins / 5);
  const val = buckets * (100 / (total / 5));
  return clamp(val, 0, 100);
}

function workweekProgress(now){
  const weekStart = startOfWeekMonday(now);
  const TOTAL_USEFUL_MIN = 5 * 8 * 60;

  let useful = 0;

  const monWorkStart = new Date(weekStart);
  monWorkStart.setHours(WORK_START_H, 0, 0, 0);
  if (now < monWorkStart) return 0;

  for (let i = 0; i < 5; i++){
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);

    const aStart = new Date(day); aStart.setHours(WORK_START_H, 0, 0, 0);
    const aEnd   = new Date(day); aEnd.setHours(LUNCH_START_H, 0, 0, 0);

    const bStart = new Date(day); bStart.setHours(LUNCH_END_H, 0, 0, 0);
    const bEnd   = new Date(day); bEnd.setHours(WORK_END_H, 0, 0, 0);

    const dayRangeStart = new Date(day); dayRangeStart.setHours(0,0,0,0);
    const dayRangeEnd = new Date(day); dayRangeEnd.setHours(23,59,59,999);

    if (day > now) break;

    const countEnd = (day.toDateString() === now.toDateString()) ? now : dayRangeEnd;

    useful += overlapsMinutes(dayRangeStart, countEnd, aStart, aEnd);
    useful += overlapsMinutes(dayRangeStart, countEnd, bStart, bEnd);
  }

  const buckets = Math.floor(useful / 5);
  const val = buckets * (100 / (TOTAL_USEFUL_MIN / 5));
  return clamp(val, 0, 100);
}

function monthlyProgress(now){
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  const totalMin = minutesBetween(start, end);
  const passedMin = minutesBetween(start, now);
  const buckets = Math.floor(passedMin / 5);
  const val = buckets * (100 / (totalMin / 5));
  return clamp(val, 0, 100);
}

function yearlyProgress(now){
  const start = startOfYear(now);
  const end = endOfYear(now);
  const totalMin = minutesBetween(start, end);
  const passedMin = minutesBetween(start, now);
  const buckets = Math.floor(passedMin / 5);
  const val = buckets * (100 / (totalMin / 5));
  return clamp(val, 0, 100);
}

/* 6) Render + watchdog */
function updateAllProgress(){
  try{
    const now = safeNow();

    dailyPercentEl.textContent = formatPercentInt(dailyProgress(now));
    workweekPercentEl.textContent = formatPercentInt(workweekProgress(now));
    weeklyPercentEl.textContent = formatPercentInt(weeklyProgress(now));
    monthlyPercentEl.textContent = formatPercentInt(monthlyProgress(now));
    yearlyPercentEl.textContent = formatPercentInt(yearlyProgress(now));

    updateTexts();
    updateHolidayVisibility(now);

    lastSuccessfulUpdateAt = Date.now();
    showStatus(false);
  } catch (e) {}
}

function checkStale(){
  const stale = (Date.now() - lastSuccessfulUpdateAt) > STALE_AFTER_MS;
  showStatus(stale);
}

/* 7) Theme */
function getPreferredThemeFromSystem(){
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme){
  currentTheme = (theme === "light") ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);

  buildLangMenu();
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

/* 8) Clock (gatilho 5min) */
function updateClock(){
  const now = safeNow();
  liveClockEl.textContent = formatClock(now);

  const bucket = Math.floor(now.getTime() / FIVE_MIN_MS);

  if (lastFiveBucket === null){
    lastFiveBucket = bucket;
    updateAllProgress();
    checkStale();
    return;
  }

  if (bucket !== lastFiveBucket){
    lastFiveBucket = bucket;
    updateAllProgress();
    checkStale();
  }
}

function startClock(){
  if (clockTimer) clearInterval(clockTimer);
  updateClock();
  clockTimer = setInterval(updateClock, CLOCK_INTERVAL_MS);
}

/* 9) Pixel Rain */
function initPixelRainBackground(){
  const canvas = document.getElementById("bg");
  if (!canvas) return;

  const ctx = canvas.getContext("2d", { alpha: false });
  const BLUE = { r: 13, g: 34, b: 99 };

  const CONFIG = {
    speedMin: 45,
    speedMax: 180,
    pixelMin: 1,
    pixelMax: 4,
    columnGapMin: 6,
    columnGapMax: 22,
    trailAlpha: 0.12,
    dprCap: 2,
    hazeStrength: 0.08,
    burstMin: 2,
    burstMax: 7
  };

  let W = 0, H = 0, dpr = 1;
  let columns = [];
  let lastT = performance.now();

  const rand = (min, max) => Math.random() * (max - min) + min;
  const irand = (min, max) => Math.floor(rand(min, max + 1));

  function isLightTheme(){
    return document.documentElement.getAttribute("data-theme") === "light";
  }

  function resize(){
    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);
    W = Math.floor(window.innerWidth);
    H = Math.floor(window.innerHeight);

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    buildColumns();
    clearInstant();
  }

  function buildColumns(){
    columns = [];
    let x = 0;

    while (x < W){
      const gap = rand(CONFIG.columnGapMin, CONFIG.columnGapMax);

      columns.push({
        x,
        y: rand(-H, H),
        speed: rand(CONFIG.speedMin, CONFIG.speedMax),
        size: rand(CONFIG.pixelMin, CONFIG.pixelMax),
        burst: {
          count: irand(CONFIG.burstMin, CONFIG.burstMax),
          spread: rand(12, 80),
          jitter: rand(0.2, 1.2),
        }
      });

      x += gap;
    }
  }

  function clearInstant(){
    const g = ctx.createLinearGradient(0, 0, 0, H);

    if (isLightTheme()){
      g.addColorStop(0, "rgb(245, 247, 255)");
      g.addColorStop(0.6, "rgb(236, 240, 252)");
      g.addColorStop(1, "rgb(225, 232, 248)");
    } else {
      g.addColorStop(0, "rgb(3, 5, 16)");
      g.addColorStop(0.6, "rgb(2, 4, 14)");
      g.addColorStop(1, "rgb(1, 2, 10)");
    }

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function fadeFrame(){
    const a = CONFIG.trailAlpha;
    ctx.fillStyle = isLightTheme() ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  function pixelColor(alpha, boost = 1){
    const r = Math.min(255, Math.floor(BLUE.r * boost));
    const g = Math.min(255, Math.floor(BLUE.g * boost));
    const b = Math.min(255, Math.floor(BLUE.b * boost));
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawPixel(x, y, size, a){
    ctx.fillStyle = isLightTheme() ? pixelColor(a * 0.68, 1.10) : pixelColor(a, 1.75);
    ctx.fillRect((x | 0), (y | 0), size, size);
  }

  function step(t){
    const dt = Math.min(0.033, (t - lastT) / 1000);
    lastT = t;

    fadeFrame();

    if (CONFIG.hazeStrength > 0){
      const haze = ctx.createRadialGradient(
        W * 0.5, H * 0.35, 80,
        W * 0.5, H * 0.35, Math.max(W, H) * 0.9
      );

      if (isLightTheme()){
        haze.addColorStop(0, `rgba(13,34,99,${CONFIG.hazeStrength * 0.35})`);
        haze.addColorStop(1, "rgba(255,255,255,0)");
      } else {
        haze.addColorStop(0, `rgba(13,34,99,${CONFIG.hazeStrength})`);
        haze.addColorStop(1, "rgba(0,0,0,0)");
      }

      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H);
    }

    for (const c of columns){
      c.y += c.speed * dt;

      const { count, spread, jitter } = c.burst;

      for (let i = 0; i < count; i++){
        const yy = c.y - i * rand(8, spread) + rand(-jitter, jitter);
        if (yy < -30 || yy > H + 30) continue;

        const a = isLightTheme() ? rand(0.05, 0.14) : rand(0.10, 0.35);
        const sz = c.size;
        const xoff = rand(-0.6, 0.6);

        drawPixel(c.x + xoff, yy, sz, a);
      }

      if (c.y - 140 > H){
        c.y = rand(-H * 0.45, -60);
        c.speed = rand(CONFIG.speedMin, CONFIG.speedMax);
        c.size = rand(CONFIG.pixelMin, CONFIG.pixelMax);
        c.burst.count = irand(CONFIG.burstMin, CONFIG.burstMax);
        c.burst.spread = rand(12, 90);
        c.burst.jitter = rand(0.2, 1.4);
      }
    }

    if (!document.hidden) requestAnimationFrame(step);
  }

  const themeObserver = new MutationObserver(() => clearInstant());
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden){
      lastT = performance.now();
      requestAnimationFrame(step);
    }
  });

  window.addEventListener("resize", resize, { passive: true });

  resize();
  requestAnimationFrame(step);
}

/* 10) Events + init */
function bindEvents(){
  themeBtn.addEventListener("click", toggleTheme);

  if (langBtn){
    langBtn.addEventListener("click", () => {
      buildLangMenu();
      toggleLangMenu();
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible"){
      updateAllProgress();
      lastSuccessfulUpdateAt = Date.now();
      checkStale();
    }
  });

  window.addEventListener("focus", () => {
    updateAllProgress();
    lastSuccessfulUpdateAt = Date.now();
    checkStale();
  });

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

(function init(){
  coffeeBtn.href = COFFEE_LINK;

  initLang();
  initTheme();

  buildLangMenu();
  initPixelRainBackground();
  bindEvents();
  startClock();
  updateHolidayVisibility();
  lastSuccessfulUpdateAt = Date.now();
})();
