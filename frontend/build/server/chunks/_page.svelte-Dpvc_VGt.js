import { c as create_ssr_component, d as escape, f as add_attribute } from './ssr-CnIX4tEz.js';
import { f as formatInr } from './format-BOhbCv64.js';

function labelForMonth(key) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}
function linePoints(series, width, height, key) {
  if (!series.length) return "";
  const values = series.map((d) => Number(d[key]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return series.map((d, i) => {
    const x = i / Math.max(series.length - 1, 1) * width;
    const y = height - ((Number(d[key]) || 0) - min) / range * height;
    return `${x},${y}`;
  }).join(" ");
}
function donutDash(pct) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = pct / 100 * circumference;
  return `${dash} ${circumference - dash}`;
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let lastSavings;
  let networthLatest;
  let networthDelta;
  let incomeLatest;
  let expenseLatest;
  let netSavingsLatest;
  let netSavingsPct;
  let networthMonthly = [];
  let savings = [];
  lastSavings = savings.length ? savings[savings.length - 1] : null;
  networthLatest = networthMonthly.length ? networthMonthly[networthMonthly.length - 1].networth : null;
  networthDelta = networthMonthly.length ? networthMonthly[networthMonthly.length - 1].delta : null;
  incomeLatest = lastSavings?.income || 0;
  expenseLatest = lastSavings?.expense || 0;
  netSavingsLatest = lastSavings?.net_savings || 0;
  netSavingsPct = lastSavings?.net_savings_pct || 0;
  return `<h1 class="page-title" data-svelte-h="svelte-1pxx86r">Dashboard</h1> <p class="page-subtitle" data-svelte-h="svelte-1wdnvr2">Net worth, cash flow, spending, and investments.</p> ${``} <div class="dash-grid"><section class="dash-card"><div class="dash-header"><div><div class="dash-title" data-svelte-h="svelte-zm0o3r">Net Worth</div> <div class="dash-value">${escape(networthLatest ? formatInr(networthLatest) : "--")}</div></div> <div class="dash-meta">${escape(networthDelta !== null ? `${networthDelta >= 0 ? "+" : ""}${formatInr(networthDelta)}` : "--")}</div></div> <div class="dash-mini"><svg viewBox="0 0 280 90" preserveAspectRatio="none"><polyline fill="none" stroke="#1d4ed8" stroke-width="2"${add_attribute("points", linePoints(networthMonthly.slice(-18), 280, 80, "networth"), 0)}></polyline></svg></div> <div class="dash-sub">${escape(networthMonthly.length ? labelForMonth(networthMonthly[networthMonthly.length - 1].month) : "")}</div></section> <section class="dash-card"><div class="dash-header" data-svelte-h="svelte-sizwtb"><div><div class="dash-title">Cash Flow Visualization</div> <div class="dash-sub">Last month income vs expense</div></div></div> <div class="flow-bars"><div class="flow-row"><span data-svelte-h="svelte-l2bpkp">Income</span> <div class="flow-bar"><span${add_attribute("style", `width:${incomeLatest && incomeLatest > 0 ? 100 : 0}%`, 0)}></span></div> <span class="num">${escape(formatInr(incomeLatest))}</span></div> <div class="flow-row"><span data-svelte-h="svelte-1yjp7we">Expense</span> <div class="flow-bar flow-expense"><span${add_attribute(
    "style",
    `width:${incomeLatest ? Math.min(100, expenseLatest / incomeLatest * 100) : 0}%`,
    0
  )}></span></div> <span class="num">${escape(formatInr(expenseLatest))}</span></div> <div class="flow-row"><span data-svelte-h="svelte-15d3swj">Net</span> <div class="flow-bar flow-net"><span${add_attribute(
    "style",
    `width:${incomeLatest ? Math.min(100, Math.abs(netSavingsLatest) / incomeLatest * 100) : 0}%`,
    0
  )}></span></div> <span class="num">${escape(formatInr(netSavingsLatest))}</span></div></div></section> <section class="dash-card"><div class="dash-header"><div data-svelte-h="svelte-1u7endm"><div class="dash-title">Net Spending</div> <div class="dash-sub">Spending as % of income</div></div> <div class="dash-meta">${escape(incomeLatest ? `${(100 - netSavingsPct).toFixed(1)}%` : "--")}</div></div> <div class="donut-wrap"><svg width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="44" stroke="#e5e7eb" stroke-width="12" fill="none"></circle><circle cx="60" cy="60" r="44" stroke="#16a34a" stroke-width="12" fill="none"${add_attribute("stroke-dasharray", donutDash(netSavingsPct), 0)} transform="rotate(-90 60 60)"></circle></svg> <div class="donut-label"><div class="donut-value">${escape(incomeLatest ? `${netSavingsPct.toFixed(1)}%` : "--")}</div> <div class="donut-sub" data-svelte-h="svelte-1oo4anl">Saved</div></div></div> <div class="dash-sub">Income: ${escape(formatInr(incomeLatest))} � Expense: ${escape(formatInr(expenseLatest))}</div></section> <section class="dash-card"><div class="dash-header"><div data-svelte-h="svelte-1dmhwvb"><div class="dash-title">Investment Performance</div> <div class="dash-sub">Net worth trend proxy</div></div> <div class="dash-meta">${escape(networthLatest ? formatInr(networthLatest) : "--")}</div></div> <div class="dash-mini"><svg viewBox="0 0 280 90" preserveAspectRatio="none"><polyline fill="none" stroke="#0f172a" stroke-width="2"${add_attribute("points", linePoints(networthMonthly.slice(-18), 280, 80, "networth"), 0)}></polyline></svg></div> <div class="dash-sub">${escape(networthMonthly.length ? labelForMonth(networthMonthly[networthMonthly.length - 1].month) : "")}</div></section></div>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-Dpvc_VGt.js.map
