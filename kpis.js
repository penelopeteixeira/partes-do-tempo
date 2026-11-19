/* =========================================================
   kpis.js — Lógica pura dos KPIs de tempo (extraída de script.js)
   Sem CSS, sem i18n, sem tema, sem canvas. Só cálculo + render.
   ========================================================= */

/* 1) Constantes (idênticas às do script.js) */
const WORK_START_H = 9;
const LUNCH_START_H = 12;
const LUNCH_END_H = 13;
const WORK_END_H = 18;

/* 2) Helpers (idênticos aos do script.js) */
function clamp(n, min, max){ return Math.min(max, Math.max(min, n)); }
function safeNow(){ return new Date(); }

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

/* 3) Formatação auxiliar (apenas para exibição) */
function fmtPct(v){ return Math.round(clamp(v, 0, 100)) + "%"; }

function fmtDuration(min){
  const m = Math.floor(min);
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h + "h" + String(r).padStart(2, "0");
}

function fmtHM(date){
  return String(date.getHours()).padStart(2, "0") + "h" +
         String(date.getMinutes()).padStart(2, "0");
}

/* 4) Cálculos dos KPIs — mesmas fórmulas do script.js */
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

    const dayRangeStart = new Date(day); dayRangeStart.setHours(0, 0, 0, 0);
    const dayRangeEnd = new Date(day); dayRangeEnd.setHours(23, 59, 59, 999);

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

/* 5) Modelo de dados: cada KPI retorna valor + detalhe + fórmula */
function buildKpis(now){
  // Dia
  const dStart = startOfDay(now);
  const dMins = minutesBetween(dStart, now);

  // Semana
  const wStart = startOfWeekMonday(now);
  const wMins = minutesBetween(wStart, now);
  const wTotal = 7 * 24 * 60;

  // Semana útil (recálculo dos minutos úteis só para exibição)
  const TOTAL_USEFUL_MIN = 5 * 8 * 60;
  let useful = 0;
  const uwStart = startOfWeekMonday(now);
  const monWorkStart = new Date(uwStart); monWorkStart.setHours(WORK_START_H, 0, 0, 0);
  if (now >= monWorkStart){
    for (let i = 0; i < 5; i++){
      const day = new Date(uwStart);
      day.setDate(uwStart.getDate() + i);
      const aStart = new Date(day); aStart.setHours(WORK_START_H, 0, 0, 0);
      const aEnd   = new Date(day); aEnd.setHours(LUNCH_START_H, 0, 0, 0);
      const bStart = new Date(day); bStart.setHours(LUNCH_END_H, 0, 0, 0);
      const bEnd   = new Date(day); bEnd.setHours(WORK_END_H, 0, 0, 0);
      const dayRangeStart = new Date(day); dayRangeStart.setHours(0, 0, 0, 0);
      const dayRangeEnd = new Date(day); dayRangeEnd.setHours(23, 59, 59, 999);
      if (day > now) break;
      const countEnd = (day.toDateString() === now.toDateString()) ? now : dayRangeEnd;
      useful += overlapsMinutes(dayRangeStart, countEnd, aStart, aEnd);
      useful += overlapsMinutes(dayRangeStart, countEnd, bStart, bEnd);
    }
  }

  // Mês
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);
  const mTotal = minutesBetween(mStart, mEnd);
  const mPassed = minutesBetween(mStart, now);

  // Ano
  const yStart = startOfYear(now);
  const yEnd = endOfYear(now);
  const yTotal = minutesBetween(yStart, yEnd);
  const yPassed = minutesBetween(yStart, now);

  return [
    {
      id: "dia",
      nome: "Dia",
      pct: dailyProgress(now),
      detalhe: fmtHM(now) + " de 24h — " + fmtDuration(dMins) + " decorridos",
      formula: "⌊" + Math.floor(dMins) + " min ÷ 5⌋ × (100 ÷ 288) = " + fmtPct(dailyProgress(now))
    },
    {
      id: "semana-util",
      nome: "Semana útil",
      pct: workweekProgress(now),
      detalhe: fmtDuration(useful) + " de " + fmtDuration(TOTAL_USEFUL_MIN) + " (seg–sex, 09–12 e 13–18, almoço fora)",
      formula: "⌊" + Math.floor(useful) + " min úteis ÷ 5⌋ × (100 ÷ 240) = " + fmtPct(workweekProgress(now))
    },
    {
      id: "semana",
      nome: "Semana",
      pct: weeklyProgress(now),
      detalhe: fmtDuration(wMins) + " de " + fmtDuration(wTotal) + " (seg–dom, 24h/dia)",
      formula: "⌊" + Math.floor(wMins) + " min ÷ 5⌋ × (100 ÷ " + (wTotal / 5) + ") = " + fmtPct(weeklyProgress(now))
    },
    {
      id: "mes",
      nome: "Mês",
      pct: monthlyProgress(now),
      detalhe: fmtDuration(mPassed) + " de " + fmtDuration(mTotal),
      formula: "⌊" + Math.floor(mPassed) + " min ÷ 5⌋ × (100 ÷ " + Math.round(mTotal / 5) + ") = " + fmtPct(monthlyProgress(now))
    },
    {
      id: "ano",
      nome: "Ano",
      pct: yearlyProgress(now),
      detalhe: fmtDuration(yPassed) + " de " + fmtDuration(yTotal),
      formula: "⌊" + Math.floor(yPassed) + " min ÷ 5⌋ × (100 ÷ " + Math.round(yTotal / 5) + ") = " + fmtPct(yearlyProgress(now))
    }
  ];
}

/* 6) Render simples no HTML */
function renderKpis(){
  const now = safeNow();
  const lista = buildKpis(now);
  const ul = document.getElementById("kpi-lista");
  if (!ul) return;

  ul.innerHTML = "";

  for (const kpi of lista){
    const li = document.createElement("li");
    li.id = "kpi-" + kpi.id;

    const nome = document.createElement("strong");
    nome.textContent = kpi.nome;

    const pct = document.createElement("span");
    pct.className = "kpi-pct";
    pct.textContent = " " + fmtPct(kpi.pct);

    const det = document.createElement("div");
    det.className = "kpi-detalhe";
    det.textContent = kpi.detalhe;

    const form = document.createElement("div");
    form.className = "kpi-formula";
    form.textContent = kpi.formula;

    li.appendChild(nome);
    li.appendChild(pct);
    li.appendChild(det);
    li.appendChild(form);
    ul.appendChild(li);
  }

  const clock = document.getElementById("agora");
  if (clock) clock.textContent = now.toLocaleString("pt-BR");
}

/* 7) Inicialização */
(function initKpis(){
  renderKpis();
  setInterval(renderKpis, 1000);
})();
