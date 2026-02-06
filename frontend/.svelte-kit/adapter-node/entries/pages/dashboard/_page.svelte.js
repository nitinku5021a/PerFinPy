import { c as create_ssr_component, d as add_attribute, g as escape, v as validate_component } from "../../../chunks/ssr.js";
import { f as formatInr } from "../../../chunks/format.js";
function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
function getMonthlyNetWorth(months, count = 13) {
  const safeSeries = (months || []).map((point) => ({
    ...point,
    networth: toNumber(point.networth)
  }));
  const series = safeSeries.slice(-count);
  const latest = series.length ? series[series.length - 1] : null;
  const prev = series.length > 1 ? series[series.length - 2] : null;
  let annualizedGrowthPct = null;
  if (latest && prev && Math.abs(prev.networth) > 1e-5) {
    const monthlyGrowth = (latest.networth - prev.networth) / prev.networth;
    annualizedGrowthPct = (Math.pow(1 + monthlyGrowth, 12) - 1) * 100;
  }
  return {
    series,
    latest,
    annualizedGrowthPct
  };
}
function getMonthlySavings(months) {
  const safeSeries = (months || []).map((point) => ({
    ...point,
    income: toNumber(point.income),
    expense: toNumber(point.expense)
  }));
  const current = safeSeries.length ? safeSeries[safeSeries.length - 1] : null;
  let currentSaving = null;
  let savingPctOfIncome = null;
  if (current) {
    currentSaving = current.income - current.expense;
    if (current.income > 1e-5) {
      savingPctOfIncome = currentSaving / current.income * 100;
    }
  }
  const previous12 = safeSeries.slice(0, -1).slice(-12);
  let avgPrev12Saving = null;
  if (previous12.length) {
    const total = previous12.reduce((acc, point) => acc + (point.income - point.expense), 0);
    avgPrev12Saving = total / previous12.length;
  }
  return {
    current,
    currentSaving,
    avgPrev12Saving,
    savingPctOfIncome,
    previous12
  };
}
const DashboardCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title = "" } = $$props;
  let { iconBg = "bg-slate-100" } = $$props;
  let { iconColor = "text-slate-600" } = $$props;
  let { variant = "standard" } = $$props;
  let { valueClass = "text-4xl font-semibold text-gray-900 sm:text-5xl" } = $$props;
  let { bodyClass = "" } = $$props;
  let { sparklineClass = "h-20 w-52 sm:w-64" } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0) $$bindings.title(title);
  if ($$props.iconBg === void 0 && $$bindings.iconBg && iconBg !== void 0) $$bindings.iconBg(iconBg);
  if ($$props.iconColor === void 0 && $$bindings.iconColor && iconColor !== void 0) $$bindings.iconColor(iconColor);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0) $$bindings.variant(variant);
  if ($$props.valueClass === void 0 && $$bindings.valueClass && valueClass !== void 0) $$bindings.valueClass(valueClass);
  if ($$props.bodyClass === void 0 && $$bindings.bodyClass && bodyClass !== void 0) $$bindings.bodyClass(bodyClass);
  if ($$props.sparklineClass === void 0 && $$bindings.sparklineClass && sparklineClass !== void 0) $$bindings.sparklineClass(sparklineClass);
  return `<section class="rounded-2xl bg-white p-6 shadow-lg">${variant === "center" ? `<div class="flex items-start justify-between gap-4"><div${add_attribute("class", `flex h-12 w-12 items-center justify-center rounded-full ${iconBg} ${iconColor}`, 0)}>${slots.icon ? slots.icon({}) : ``}</div> <div class="text-right"><div class="text-xs font-semibold uppercase tracking-widest text-gray-500">${escape(title)}</div> <div${add_attribute("class", `mt-2 ${valueClass}`, 0)}>${slots.value ? slots.value({}) : ``}</div> <div${add_attribute("class", `mt-2 ${bodyClass}`, 0)}>${slots.body ? slots.body({}) : ``}</div></div></div> <div${add_attribute("class", `mt-6 flex w-full justify-center ${sparklineClass}`, 0)}>${slots.sparkline ? slots.sparkline({}) : ``}</div>` : `<div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div class="space-y-3"><div class="text-xs font-semibold uppercase tracking-widest text-gray-500">${escape(title)}</div> <div${add_attribute("class", valueClass, 0)}>${slots.value ? slots.value({}) : ``}</div> <div${add_attribute("class", bodyClass, 0)}>${slots.body ? slots.body({}) : ``}</div></div> <div class="flex flex-col items-end gap-4"><div${add_attribute("class", `flex h-12 w-12 items-center justify-center rounded-full ${iconBg} ${iconColor}`, 0)}>${slots.icon ? slots.icon({}) : ``}</div> <div${add_attribute("class", sparklineClass, 0)}>${slots.sparkline ? slots.sparkline({}) : ``}</div></div></div>`}</section>`;
});
function sparklinePath$1(data, width, height) {
  if (!data.length) return "";
  const values = data.map((d2) => Number(d2.networth) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = data.map((d2, i) => {
    const x = i / Math.max(data.length - 1, 1) * width;
    const y = height - ((Number(d2.networth) || 0) - min) / range * height;
    return { x, y };
  });
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last.x} ${last.y}`;
  return d;
}
const NetWorthGrowthPanel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let metrics;
  let liquidSeries;
  let liquidMetrics;
  let sparklineSeries;
  let growthLabel;
  let growthClass;
  let liquidNetworthValue;
  let { series = [] } = $$props;
  if ($$props.series === void 0 && $$bindings.series && series !== void 0) $$bindings.series(series);
  metrics = getMonthlyNetWorth(series);
  liquidSeries = (series || []).map((point) => {
    const realEstate = point.real_estate !== void 0 && point.real_estate !== null ? Number(point.real_estate) || 0 : null;
    const liquid = point.liquid_networth !== void 0 && point.liquid_networth !== null ? Number(point.liquid_networth) || 0 : realEstate === null ? null : (Number(point.networth) || 0) - realEstate;
    return {
      ...point,
      networth: liquid === null ? Number(point.networth) || 0 : liquid
    };
  });
  liquidMetrics = getMonthlyNetWorth(liquidSeries);
  sparklineSeries = liquidMetrics.series.slice(-12);
  growthLabel = liquidMetrics.annualizedGrowthPct === null ? "--" : `${liquidMetrics.annualizedGrowthPct >= 0 ? "↑" : "↓"} ${Math.abs(liquidMetrics.annualizedGrowthPct).toFixed(1)}% p.a. (monthly annualized)`;
  growthClass = liquidMetrics.annualizedGrowthPct === null ? "text-gray-400" : liquidMetrics.annualizedGrowthPct >= 0 ? "text-emerald-600" : "text-rose-600";
  liquidNetworthValue = liquidMetrics.latest ? liquidMetrics.latest.networth : null;
  return `${validate_component(DashboardCard, "DashboardCard").$$render(
    $$result,
    {
      title: "Net Worth",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600"
    },
    {},
    {
      sparkline: () => {
        return `<svg slot="sparkline" viewBox="0 0 260 90" class="h-full w-full" preserveAspectRatio="none"><path${add_attribute("d", sparklinePath$1(sparklineSeries, 260, 80), 0)} fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
      },
      icon: () => {
        return `<svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-6 w-6" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 7.5h19.5m-16.5 6h3.75m3 0h3.75m3 0h1.5M3 6.75h18A1.5 1.5 0 0122.5 8.25v7.5A1.5 1.5 0 0121 17.25H3A1.5 1.5 0 011.5 15.75v-7.5A1.5 1.5 0 013 6.75z"></path></svg>`;
      },
      body: () => {
        return `<div slot="body" class="mt-2 space-y-1"><div${add_attribute("class", `flex items-center gap-2 text-sm font-semibold ${growthClass}`, 0)}><span>${escape(growthLabel)}</span></div> <div class="text-xs font-semibold text-gray-500">Net Worth: ${escape(metrics.latest ? formatInr(metrics.latest.networth) : "--")}</div></div>`;
      },
      value: () => {
        return `<span slot="value">${escape(liquidNetworthValue === null ? "--" : formatInr(liquidNetworthValue))}</span>`;
      }
    }
  )}`;
});
function sparklinePath(values, width, height) {
  if (!values.length) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = i / Math.max(values.length - 1, 1) * width;
    const y = height - (v - min) / range * height;
    return { x, y };
  });
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` T ${last.x} ${last.y}`;
  return d;
}
const MonthlySavingPanel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let metrics;
  let savingValue;
  let avgValue;
  let savingPct;
  let savingDelta;
  let savingClass;
  let savingBadgeBg;
  let savingSeries;
  let { series = [] } = $$props;
  if ($$props.series === void 0 && $$bindings.series && series !== void 0) $$bindings.series(series);
  metrics = getMonthlySavings(series);
  savingValue = metrics.currentSaving;
  avgValue = metrics.avgPrev12Saving;
  savingPct = metrics.savingPctOfIncome;
  savingDelta = savingValue !== null && avgValue !== null ? savingValue - avgValue : null;
  savingClass = savingDelta === null ? "text-gray-400" : savingDelta >= 0 ? "text-emerald-600" : "text-rose-600";
  savingBadgeBg = savingDelta === null ? "bg-slate-100 text-slate-500" : savingDelta >= 0 ? "bg-emerald-50" : "bg-rose-50";
  savingSeries = (series || []).slice(-12).map((point) => Number(point.income || 0) - Number(point.expense || 0));
  return `${validate_component(DashboardCard, "DashboardCard").$$render(
    $$result,
    {
      title: "This Month Saving",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600"
    },
    {},
    {
      sparkline: () => {
        return `<svg slot="sparkline" viewBox="0 0 260 90" class="h-full w-full" preserveAspectRatio="none"><path${add_attribute("d", sparklinePath(savingSeries, 260, 80), 0)} fill="none" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
      },
      icon: () => {
        return `<svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-6 w-6" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 17.25l6-6 4 4 7-7M21 7.5V14.25M21 7.5h-6.75"></path></svg>`;
      },
      body: () => {
        return `<div slot="body" class="mt-4 flex flex-wrap gap-2"><span${add_attribute("class", `rounded-full px-3 py-1 text-xs font-semibold ${savingClass} ${savingBadgeBg}`, 0)}>${escape(savingDelta !== null ? `vs 12m avg ${savingDelta >= 0 ? "↑" : "↓"} ${formatInr(savingDelta)}` : "vs 12m avg --")}</span> <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">${escape(savingPct !== null ? `${savingPct.toFixed(1)}% of income` : "% of income --")}</span></div>`;
      },
      value: () => {
        return `<span slot="value">${escape(savingValue !== null ? formatInr(savingValue) : "--")}</span>`;
      }
    }
  )}`;
});
const CashFlowFlowDiagram = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${validate_component(DashboardCard, "DashboardCard").$$render(
    $$result,
    {
      title: "Cash Flow Visualization",
      iconBg: "bg-sky-50",
      iconColor: "text-sky-600",
      variant: "center",
      valueClass: "text-sm font-semibold text-gray-600",
      bodyClass: "text-xs text-gray-500",
      sparklineClass: "h-72 w-full"
    },
    {},
    {
      sparkline: () => {
        return `<div slot="sparkline" class="h-full w-full">${`${`<p class="text-xs text-gray-400" data-svelte-h="svelte-1ulww9j">Loading diagram...</p>`}`}</div>`;
      },
      icon: () => {
        return `<svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-6 w-6" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12h15m-7.5-7.5v15"></path></svg>`;
      },
      body: () => {
        return `<div slot="body" data-svelte-h="svelte-16rao59">Current month cash movement across income sources and spending categories.</div>`;
      },
      value: () => {
        return `<span slot="value">${escape("--")}</span>`;
      }
    }
  )}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let networthMonthly = [];
  let savingsMonthly = [];
  return `<div class="space-y-8"><div class="space-y-2" data-svelte-h="svelte-1l9o3dg"><h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1> <p class="text-sm text-gray-500">Financial intelligence from your ledger activity.</p></div> ${``} <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">${validate_component(NetWorthGrowthPanel, "NetWorthGrowthPanel").$$render($$result, { series: networthMonthly }, {}, {})} ${validate_component(MonthlySavingPanel, "MonthlySavingPanel").$$render($$result, { series: savingsMonthly }, {}, {})} <div class="lg:col-span-2">${validate_component(CashFlowFlowDiagram, "CashFlowFlowDiagram").$$render($$result, {}, {}, {})}</div></div></div>`;
});
export {
  Page as default
};
