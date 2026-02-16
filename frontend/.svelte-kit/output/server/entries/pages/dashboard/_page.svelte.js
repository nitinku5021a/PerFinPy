import { n as noop, g as set_current_component, h as current_component, r as run_all, c as create_ssr_component, b as add_attribute, f as escape, v as validate_component, a as subscribe, i as set_store_value, s as setContext, j as add_styles, k as assign, l as identity$1, o as getContext, p as compute_rest_props, q as compute_slots, t as spread, u as escape_attribute_value, w as escape_object, x as onDestroy, e as each, m as missing_component } from "../../../chunks/ssr.js";
import { f as formatInr } from "../../../chunks/format.js";
import { curveLinearClosed, lineRadial, line, pointRadial, areaRadial, area, curveBumpX, curveBumpY, link, stack, stackOffsetExpand, stackOffsetDiverging, stackOffsetNone, curveMonotoneX } from "d3-shape";
import { scaleLinear, scaleSqrt, scaleOrdinal, scaleBand, scaleTime } from "d3-scale";
import { InternSet, ascending, extent, max, min, bisector, range, quantile, sum } from "d3-array";
import { unique, uniqueId, Logger, localPoint, sortFunc, isLiteralObject, format, greatestAbs, notNull, formatDate, PeriodType } from "@layerstack/utils";
import { cls } from "@layerstack/tailwind";
import { enablePatches, setAutoFreeze } from "immer";
import { browser } from "@layerstack/utils/env";
import { objectId } from "@layerstack/utils/object";
import { w as writable, d as derived, r as readable } from "../../../chunks/index.js";
import "@layerstack/utils/serialize";
import "@layerstack/utils/rollup";
import { interpolatePath } from "d3-interpolate-path";
import { get, memoize, merge } from "lodash-es";
import { rgb } from "d3-color";
import { quadtree } from "d3-quadtree";
import { Delaunay } from "d3-delaunay";
import { geoVoronoi } from "d3-geo-voronoi";
import { geoPath, geoTransform } from "d3-geo";
import { path } from "d3-path";
import { quantize, interpolate, interpolateRound } from "d3-interpolate";
import "@dagrejs/dagre";
import "d3-tile";
import "d3-sankey";
import { timeYear, timeMonth, timeDay, timeHour, timeMinute, timeSecond, timeMillisecond, timeWeek } from "d3-time";
import { format as format$1 } from "date-fns";
const is_client = typeof window !== "undefined";
let now = is_client ? () => window.performance.now() : () => Date.now();
let raf = is_client ? (cb) => requestAnimationFrame(cb) : noop;
const tasks = /* @__PURE__ */ new Set();
function run_tasks(now2) {
  tasks.forEach((task) => {
    if (!task.c(now2)) {
      tasks.delete(task);
      task.f();
    }
  });
  if (tasks.size !== 0) raf(run_tasks);
}
function loop(callback) {
  let task;
  if (tasks.size === 0) raf(run_tasks);
  return {
    promise: new Promise((fulfill) => {
      tasks.add(task = { c: callback, f: fulfill });
    }),
    abort() {
      tasks.delete(task);
    }
  };
}
const dirty_components = [];
const binding_callbacks = [];
let render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = /* @__PURE__ */ Promise.resolve();
let update_scheduled = false;
function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    resolved_promise.then(flush);
  }
}
function tick() {
  schedule_update();
  return resolved_promise;
}
function add_render_callback(fn) {
  render_callbacks.push(fn);
}
const seen_callbacks = /* @__PURE__ */ new Set();
let flushidx = 0;
function flush() {
  if (flushidx !== 0) {
    return;
  }
  const saved_component = current_component;
  do {
    try {
      while (flushidx < dirty_components.length) {
        const component = dirty_components[flushidx];
        flushidx++;
        set_current_component(component);
        update(component.$$);
      }
    } catch (e) {
      dirty_components.length = 0;
      flushidx = 0;
      throw e;
    }
    set_current_component(null);
    dirty_components.length = 0;
    flushidx = 0;
    while (binding_callbacks.length) binding_callbacks.pop()();
    for (let i = 0; i < render_callbacks.length; i += 1) {
      const callback = render_callbacks[i];
      if (!seen_callbacks.has(callback)) {
        seen_callbacks.add(callback);
        callback();
      }
    }
    render_callbacks.length = 0;
  } while (dirty_components.length);
  while (flush_callbacks.length) {
    flush_callbacks.pop()();
  }
  update_scheduled = false;
  seen_callbacks.clear();
  set_current_component(saved_component);
}
function update($$) {
  if ($$.fragment !== null) {
    $$.update();
    run_all($$.before_update);
    const dirty = $$.dirty;
    $$.dirty = [-1];
    $$.fragment && $$.fragment.p($$.ctx, dirty);
    $$.after_update.forEach(add_render_callback);
  }
}
function toNumber$1(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
function getMonthlyNetWorth(months, count = 13) {
  const safeSeries = (months || []).map((point) => ({
    ...point,
    networth: toNumber$1(point.networth)
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
    income: toNumber$1(point.income),
    expense: toNumber$1(point.expense)
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
  const min2 = Math.min(...values);
  const max2 = Math.max(...values);
  const range2 = max2 - min2 || 1;
  const points = data.map((d2, i) => {
    const x = i / Math.max(data.length - 1, 1) * width;
    const y = height - ((Number(d2.networth) || 0) - min2) / range2 * height;
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
function canBeZero(val) {
  if (val === 0) {
    return true;
  }
  return val;
}
function makeAccessor(acc) {
  if (!canBeZero(acc)) return null;
  if (Array.isArray(acc)) {
    return (d) => acc.map((k) => {
      return typeof k !== "function" ? d[k] : k(d);
    });
  } else if (typeof acc !== "function") {
    return (d) => d[acc];
  }
  return acc;
}
function filterObject(obj, comparisonObj = {}) {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => {
      return value !== void 0 && comparisonObj[key] === void 0;
    })
  );
}
function debounce(func, timeout = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}
function calcUniques(data, fields, sortOptions = {}) {
  if (!Array.isArray(data)) {
    throw new TypeError(
      `The first argument of calcUniques() must be an array. You passed in a ${typeof data}. If you got this error using the <LayerCake> component, consider passing a flat array to the \`flatData\` prop. More info: https://layercake.graphics/guide/#flatdata`
    );
  }
  if (Array.isArray(fields) || fields === void 0 || fields === null) {
    throw new TypeError(
      "The second argument of calcUniques() must be an object with field names as keys as accessor functions as values."
    );
  }
  const uniques = {};
  const keys = Object.keys(fields);
  const kl = keys.length;
  let i;
  let j;
  let k;
  let s;
  let acc;
  let val;
  let set;
  const dl = data.length;
  for (i = 0; i < kl; i += 1) {
    set = new InternSet();
    s = keys[i];
    acc = fields[s];
    for (j = 0; j < dl; j += 1) {
      val = acc(data[j]);
      if (Array.isArray(val)) {
        const vl = val.length;
        for (k = 0; k < vl; k += 1) {
          set.add(val[k]);
        }
      } else {
        set.add(val);
      }
    }
    const results = Array.from(set);
    if (sortOptions.sort === true || sortOptions[s] === true) {
      results.sort(ascending);
    }
    uniques[s] = results;
  }
  return uniques;
}
function calcExtents(data, fields) {
  if (!Array.isArray(data)) {
    throw new TypeError(
      `The first argument of calcExtents() must be an array. You passed in a ${typeof data}. If you got this error using the <LayerCake> component, consider passing a flat array to the \`flatData\` prop. More info: https://layercake.graphics/guide/#flatdata`
    );
  }
  if (Array.isArray(fields) || fields === void 0 || fields === null) {
    throw new TypeError(
      "The second argument of calcExtents() must be an object with field names as keys as accessor functions as values."
    );
  }
  const extents = {};
  const keys = Object.keys(fields);
  const kl = keys.length;
  let i;
  let j;
  let k;
  let s;
  let min2;
  let max2;
  let acc;
  let val;
  const dl = data.length;
  for (i = 0; i < kl; i += 1) {
    s = keys[i];
    acc = fields[s];
    min2 = null;
    max2 = null;
    for (j = 0; j < dl; j += 1) {
      val = acc(data[j], j);
      if (Array.isArray(val)) {
        const vl = val.length;
        for (k = 0; k < vl; k += 1) {
          if (val[k] !== false && val[k] !== void 0 && val[k] !== null && Number.isNaN(val[k]) === false) {
            if (min2 === null || val[k] < min2) {
              min2 = val[k];
            }
            if (max2 === null || val[k] > max2) {
              max2 = val[k];
            }
          }
        }
      } else if (val !== false && val !== void 0 && val !== null && Number.isNaN(val) === false) {
        if (min2 === null || val < min2) {
          min2 = val;
        }
        if (max2 === null || val > max2) {
          max2 = val;
        }
      }
    }
    extents[s] = [min2, max2];
  }
  return extents;
}
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((k) => {
    return arr2.includes(k);
  });
}
function isOrdinalDomain(scale) {
  if (typeof scale.bandwidth === "function") {
    return true;
  }
  if (arraysEqual(Object.keys(scale), ["domain", "range", "unknown", "copy"])) {
    return true;
  }
  return false;
}
function calcScaleExtents(flatData, getters, activeScales) {
  const scaleGroups = Object.entries(activeScales).reduce(
    (groups, [k, scaleInfo]) => {
      const domainType = isOrdinalDomain(scaleInfo.scale) === true ? "ordinal" : "other";
      if (!groups[domainType]) groups[domainType] = {};
      groups[domainType][k] = getters[k];
      return groups;
    },
    { ordinal: false, other: false }
  );
  let extents = {};
  if (scaleGroups.ordinal) {
    const sortOptions = Object.fromEntries(
      Object.entries(activeScales).map(([k, scaleInfo]) => {
        return [k, scaleInfo.sort];
      })
    );
    extents = calcUniques(flatData, scaleGroups.ordinal, sortOptions);
  }
  if (scaleGroups.other) {
    extents = { ...extents, ...calcExtents(flatData, scaleGroups.other) };
  }
  return extents;
}
function partialDomain(domain = [], directive) {
  if (Array.isArray(directive) === true) {
    return directive.map((d, i) => {
      if (d === null) {
        return domain[i];
      }
      return d;
    });
  }
  return domain;
}
function calcDomain(s) {
  return function domainCalc([$extents, $domain]) {
    if (typeof $domain === "function") {
      $domain = $domain($extents[s]);
    }
    return $extents ? partialDomain($extents[s], $domain) : $domain;
  };
}
const defaultScales = {
  x: scaleLinear,
  y: scaleLinear,
  z: scaleLinear,
  r: scaleSqrt
};
function findScaleType(scale) {
  if (scale.constant) {
    return "symlog";
  }
  if (scale.base) {
    return "log";
  }
  if (scale.exponent) {
    if (scale.exponent() === 0.5) {
      return "sqrt";
    }
    return "pow";
  }
  return "other";
}
function identity(d) {
  return d;
}
function log(sign) {
  return (x) => Math.log(sign * x);
}
function exp(sign) {
  return (x) => sign * Math.exp(x);
}
function symlog(c) {
  return (x) => Math.sign(x) * Math.log1p(Math.abs(x / c));
}
function symexp(c) {
  return (x) => Math.sign(x) * Math.expm1(Math.abs(x)) * c;
}
function pow(exponent) {
  return function powFn(x) {
    return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
  };
}
function getPadFunctions(scale) {
  const scaleType = findScaleType(scale);
  if (scaleType === "log") {
    const sign = Math.sign(scale.domain()[0]);
    return { lift: log(sign), ground: exp(sign), scaleType };
  }
  if (scaleType === "pow") {
    const exponent = 1;
    return { lift: pow(exponent), ground: pow(1 / exponent), scaleType };
  }
  if (scaleType === "sqrt") {
    const exponent = 0.5;
    return { lift: pow(exponent), ground: pow(1 / exponent), scaleType };
  }
  if (scaleType === "symlog") {
    const constant = 1;
    return { lift: symlog(constant), ground: symexp(constant), scaleType };
  }
  return { lift: identity, ground: identity, scaleType };
}
function toTitleCase(str) {
  return str.replace(/^\w/, (d) => d.toUpperCase());
}
function f(name, modifier = "") {
  return `scale${toTitleCase(modifier)}${toTitleCase(name)}`;
}
function findScaleName(scale) {
  if (typeof scale.bandwidth === "function") {
    if (typeof scale.paddingInner === "function") {
      return f("band");
    }
    return f("point");
  }
  if (arraysEqual(Object.keys(scale), ["domain", "range", "unknown", "copy"])) {
    return f("ordinal");
  }
  let modifier = "";
  if (scale.interpolator) {
    if (scale.domain().length === 3) {
      modifier = "diverging";
    } else {
      modifier = "sequential";
    }
  }
  if (scale.quantiles) {
    return f("quantile", modifier);
  }
  if (scale.thresholds) {
    return f("quantize", modifier);
  }
  if (scale.constant) {
    return f("symlog", modifier);
  }
  if (scale.base) {
    return f("log", modifier);
  }
  if (scale.exponent) {
    if (scale.exponent() === 0.5) {
      return f("sqrt", modifier);
    }
    return f("pow", modifier);
  }
  if (arraysEqual(Object.keys(scale), ["domain", "range", "invertExtent", "unknown", "copy"])) {
    return f("threshold");
  }
  if (arraysEqual(Object.keys(scale), [
    "invert",
    "range",
    "domain",
    "unknown",
    "copy",
    "ticks",
    "tickFormat",
    "nice"
  ])) {
    return f("identity");
  }
  if (arraysEqual(Object.keys(scale), [
    "invert",
    "domain",
    "range",
    "rangeRound",
    "round",
    "clamp",
    "unknown",
    "copy",
    "ticks",
    "tickFormat",
    "nice"
  ])) {
    return f("radial");
  }
  if (modifier) {
    return f(modifier);
  }
  if (scale.domain()[0] instanceof Date) {
    const d = /* @__PURE__ */ new Date();
    let s;
    d.getDay = () => s = "time";
    d.getUTCDay = () => s = "utc";
    scale.tickFormat(0, "%a")(d);
    return f(s);
  }
  return f("linear");
}
const unpaddable = ["scaleThreshold", "scaleQuantile", "scaleQuantize", "scaleSequentialQuantile"];
function padScale(scale, padding) {
  if (typeof scale.range !== "function") {
    throw new Error("Scale method `range` must be a function");
  }
  if (typeof scale.domain !== "function") {
    throw new Error("Scale method `domain` must be a function");
  }
  if (!Array.isArray(padding) || unpaddable.includes(findScaleName(scale))) {
    return scale.domain();
  }
  if (isOrdinalDomain(scale) === true) {
    return scale.domain();
  }
  const { lift, ground } = getPadFunctions(scale);
  const d0 = scale.domain()[0];
  const isTime = Object.prototype.toString.call(d0) === "[object Date]";
  const [d1, d2] = scale.domain().map((d) => {
    return isTime ? lift(d.getTime()) : lift(d);
  });
  const [r1, r2] = scale.range();
  const paddingLeft = padding[0] || 0;
  const paddingRight = padding[1] || 0;
  const step = (d2 - d1) / (Math.abs(r2 - r1) - paddingLeft - paddingRight);
  return [d1 - paddingLeft * step, paddingRight * step + d2].map((d) => {
    return isTime ? ground(new Date(d)) : ground(d);
  });
}
function calcBaseRange(s, width, height, reverse, percentRange) {
  let min2;
  let max2;
  if (percentRange === true) {
    min2 = 0;
    max2 = 100;
  } else {
    min2 = s === "r" ? 1 : 0;
    max2 = s === "y" ? height : s === "r" ? 25 : width;
  }
  return reverse === true ? [max2, min2] : [min2, max2];
}
function getDefaultRange(s, width, height, reverse, range2, percentRange) {
  return !range2 ? calcBaseRange(s, width, height, reverse, percentRange) : typeof range2 === "function" ? range2({ width, height }) : range2;
}
function createScale$1(s) {
  return function scaleCreator([
    $scale,
    $extents,
    $domain,
    $padding,
    $nice,
    $reverse,
    $width,
    $height,
    $range,
    $percentScale
  ]) {
    if ($extents === null) {
      return null;
    }
    const defaultRange = getDefaultRange(s, $width, $height, $reverse, $range, $percentScale);
    const scale = $scale === defaultScales[s] ? $scale() : $scale.copy();
    scale.domain($domain);
    if (!scale.interpolator || typeof scale.interpolator === "function" && scale.interpolator().name.startsWith("identity")) {
      scale.range(defaultRange);
    }
    if ($padding) {
      scale.domain(padScale(scale, $padding));
    }
    if ($nice === true || typeof $nice === "number") {
      if (typeof scale.nice === "function") {
        scale.nice(typeof $nice === "number" ? $nice : void 0);
      } else {
        console.error(
          `[Layer Cake] You set \`${s}Nice: true\` but the ${s}Scale does not have a \`.nice\` method. Ignoring...`
        );
      }
    }
    return scale;
  };
}
function createGetter([$acc, $scale]) {
  return (d, i) => {
    const val = $acc(d, i);
    if (Array.isArray(val)) {
      return val.map((v) => $scale(v));
    }
    return $scale(val);
  };
}
function getRange([$scale]) {
  if (typeof $scale === "function") {
    if (typeof $scale.range === "function") {
      return $scale.range();
    }
    console.error("[LayerCake] Your scale doesn't have a `.range` method?");
  }
  return null;
}
const indent = "    ";
function getRgb(clr) {
  const { r, g, b, opacity: o } = rgb(clr);
  if (![r, g, b].every((c) => c >= 0 && c <= 255)) {
    return false;
  }
  return { r, g, b, o };
}
function contrast({ r, g, b }) {
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.6 ? "black" : "white";
}
function printDebug(obj) {
  console.log("/********* LayerCake Debug ************/");
  console.log("Bounding box:");
  printObject(obj.boundingBox);
  console.log("Data:");
  console.log(indent, obj.data);
  if (obj.flatData) {
    console.log("flatData:");
    console.log(indent, obj.flatData);
  }
  console.log("Scales:");
  Object.keys(obj.activeGetters).forEach((g) => {
    printScale(g, obj[`${g}Scale`], obj[g]);
  });
  console.log("/************ End LayerCake Debug ***************/\n");
}
function printObject(obj) {
  Object.entries(obj).forEach(([key, value]) => {
    console.log(`${indent}${key}:`, value);
  });
}
function printScale(s, scale, acc) {
  const scaleName = findScaleName(scale);
  console.log(`${indent}${s}:`);
  console.log(`${indent}${indent}Accessor: "${acc.toString()}"`);
  console.log(`${indent}${indent}Type: ${scaleName}`);
  printValues(scale, "domain");
  printValues(scale, "range", " ");
}
function printValues(scale, method, extraSpace = "") {
  const values = scale[method]();
  const colorValues = colorizeArray(values);
  if (colorValues) {
    printColorArray(colorValues, method, values);
  } else {
    console.log(`${indent}${indent}${toTitleCase(method)}:${extraSpace}`, values);
  }
}
function printColorArray(colorValues, method, values) {
  console.log(
    `${indent}${indent}${toTitleCase(method)}:    %cArray%c(${values.length}) ` + colorValues[0] + "%c ]",
    "color: #1377e4",
    "color: #737373",
    "color: #1478e4",
    ...colorValues[1],
    "color: #1478e4"
  );
}
function colorizeArray(arr) {
  const colors = [];
  const a = arr.map((d, i) => {
    const rgbo = getRgb(d);
    if (rgbo !== false) {
      colors.push(rgbo);
      const space = i === arr.length - 1 ? " " : "";
      return `%c ${d}${space}`;
    }
    return d;
  });
  if (colors.length) {
    return [
      `%c[ ${a.join(", ")}`,
      colors.map(
        (d) => `background-color: rgba(${d.r}, ${d.g}, ${d.b}, ${d.o}); color:${contrast(d)};`
      )
    ];
  }
  return null;
}
const css = {
  code: ".layercake-container.svelte-vhzpsp,.layercake-container.svelte-vhzpsp *{box-sizing:border-box}.layercake-container.svelte-vhzpsp{width:100%;height:100%}",
  map: "{\"version\":3,\"file\":\"LayerCake.svelte\",\"sources\":[\"LayerCake.svelte\"],\"sourcesContent\":[\"<!--\\n\\t@component\\n\\tLayer Cake component\\n -->\\n<script>\\n\\timport { setContext, onMount } from 'svelte';\\n\\timport { writable, derived } from 'svelte/store';\\n\\n\\timport makeAccessor from './utils/makeAccessor.js';\\n\\timport filterObject from './utils/filterObject.js';\\n\\timport debounce from './utils/debounce.js';\\n\\n\\timport calcScaleExtents from './helpers/calcScaleExtents.js';\\n\\timport calcDomain from './helpers/calcDomain.js';\\n\\timport createScale from './helpers/createScale.js';\\n\\timport createGetter from './helpers/createGetter.js';\\n\\timport getRange from './helpers/getRange.js';\\n\\timport printDebug from './helpers/printDebug.js';\\n\\n\\timport defaultScales from './settings/defaultScales.js';\\n\\n\\tconst printDebug_debounced = debounce(printDebug, 200);\\n\\n\\t/** @type {boolean} [ssr=false] Whether this chart should be rendered server side. */\\n\\texport let ssr = false;\\n\\t/** @type {boolean} [pointerEvents=true] Whether to allow pointer events via CSS. Set this to `false` to set `pointer-events: none;` on all components, disabling all mouse interaction. */\\n\\texport let pointerEvents = true;\\n\\t/** @type {String} [position='relative'] Determine the positioning of the wrapper div. Set this to `'absolute'` when you want to stack cakes. */\\n\\texport let position = 'relative';\\n\\t/** @type {boolean} [percentRange=false] If `true`, set all scale ranges to `[0, 100]`. Ranges reversed via `xReverse`, `yReverse`, `zReverse` or `rReverse` props will continue to be reversed as usual. */\\n\\texport let percentRange = false;\\n\\n\\t/** @type {Number} [width=containerWidth] Override the automated width. */\\n\\texport let width = undefined;\\n\\t/** @type {Number} [height=containerHeight] Override the automated height. */\\n\\texport let height = undefined;\\n\\n\\t/** @type {Number} [containerWidth=100] The bound container width. */\\n\\texport let containerWidth = width || 100;\\n\\t/** @type {Number} [containerHeight=100] The bound container height. */\\n\\texport let containerHeight = height || 100;\\n\\n\\t/**\\t@type {Element|undefined} [element] The .layercake-container `<div>` tag. Useful for bindings. */\\n\\texport let element = undefined;\\n\\n\\t/* --------------------------------------------\\n\\t * Parameters\\n\\t * Values that computed properties are based on and that\\n\\t * can be easily extended from config values\\n\\t *\\n\\t */\\n\\n\\t/** @type {String|Function|Number|Array<String|Function|Number>|undefined} x The x accessor. The key in each row of data that corresponds to the x-field. This can be a string, an accessor function, a number or an array of any combination of those types. This property gets converted to a function when you access it through the context. */\\n\\texport let x = undefined;\\n\\t/** @type {String|Function|Number|Array<String|Function|Number>|undefined} y The y accessor. The key in each row of data that corresponds to the y-field. This can be a string, an accessor function, a number or an array of any combination of those types. This property gets converted to a function when you access it through the context. */\\n\\texport let y = undefined;\\n\\t/** @type {String|Function|Number|Array<String|Function|Number>|undefined} z The z accessor. The key in each row of data that corresponds to the z-field. This can be a string, an accessor function, a number or an array of any combination of those types. This property gets converted to a function when you access it through the context. */\\n\\texport let z = undefined;\\n\\t/** @type {String|Function|Number|Array<String|Function|Number>|undefined} r The r accessor. The key in each row of data that corresponds to the r-field. This can be a string, an accessor function, a number or an array of any combination of those types. This property gets converted to a function when you access it through the context. */\\n\\texport let r = undefined;\\n\\n\\t/** @type {Array<Object>|Object} [data=[]] If `data` is not a flat array of objects and you want to use any of the scales, set a flat version of the data via the `flatData` prop. */\\n\\texport let data = [];\\n\\n\\t/** @type {[min: Number|null, max: Number|null]|Array<String|Number>|Function|undefined} [xDomain] Set a min or max. For linear scales, if you want to inherit the value from the data's extent, set that value to `null`. This value can also be an array because sometimes your scales are [piecewise](https://github.com/d3/d3-scale#continuous_domain) or are a list of discrete values such as in [ordinal scales](https://github.com/d3/d3-scale#ordinal-scales), useful for color series. Set it to a function that receives the computed domain and lets you return a modified domain, useful for sorting values. */\\n\\texport let xDomain = undefined;\\n\\t/** @type {[min: Number|null, max: Number|null]|Array<String|Number>|Function|undefined} [yDomain] Set a min or max. For linear scales, if you want to inherit the value from the data's extent, set that value to `null`.  Set it to a function that receives the computed domain and lets you return a modified domain, useful for sorting values. */\\n\\texport let yDomain = undefined;\\n\\t/** @type {[min: Number|null, max: Number|null]|Array<String|Number>|Function|undefined} [zDomain] Set a min or max. For linear scales, if you want to inherit the value from the data's extent, set that value to `null`. This value can also be an array because sometimes your scales are [piecewise](https://github.com/d3/d3-scale#continuous_domain) or are a list of discrete values such as in [ordinal scales](https://github.com/d3/d3-scale#ordinal-scales), useful for color series. Set it to a function that receives the computed domain and lets you return a modified domain, useful for sorting values. */\\n\\texport let zDomain = undefined;\\n\\t/** @type {[min: Number|null, max: Number|null]|Array<String|Number>|Function|undefined} [rDomain] Set a min or max. For linear scales, if you want to inherit the value from the data's extent, set that value to `null`. This value can also be an array because sometimes your scales are [piecewise](https://github.com/d3/d3-scale#continuous_domain) or are a list of discrete values such as in [ordinal scales](https://github.com/d3/d3-scale#ordinal-scales), useful for color series. Set it to a function that receives the computed domain and lets you return a modified domain, useful for sorting values. */\\n\\texport let rDomain = undefined;\\n\\t/** @type {boolean|Number} [xNice=false] Applies D3's [scale.nice()](https://github.com/d3/d3-scale#continuous_nice) to the x domain. */\\n\\texport let xNice = false;\\n\\t/** @type {boolean|Number} [yNice=false] Applies D3's [scale.nice()](https://github.com/d3/d3-scale#continuous_nice) to the y domain. */\\n\\texport let yNice = false;\\n\\t/** @type {boolean|Number} [zNice=false] Applies D3's [scale.nice()](https://github.com/d3/d3-scale#continuous_nice) to the z domain. */\\n\\texport let zNice = false;\\n\\t/** @type {boolean} [rNice=false] Applies D3's [scale.nice()](https://github.com/d3/d3-scale#continuous_nice) to the r domain. */\\n\\texport let rNice = false;\\n\\t/** @type {[leftPixels: Number, rightPixels: Number]|undefined} [xPadding] Assign a pixel value to add to the min or max of the scale. This will increase the scales domain by the scale unit equivalent of the provided pixels. */\\n\\texport let xPadding = undefined;\\n\\t/** @type {[leftPixels: Number, rightPixels: Number]|undefined} [yPadding] Assign a pixel value to add to the min or max of the scale. This will increase the scales domain by the scale unit equivalent of the provided pixels. */\\n\\texport let yPadding = undefined;\\n\\t/** @type {[leftPixels: Number, rightPixels: Number]|undefined} [zPadding] Assign a pixel value to add to the min or max of the scale. This will increase the scales domain by the scale unit equivalent of the provided pixels. */\\n\\texport let zPadding = undefined;\\n\\t/** @type {[leftPixels: Number, rightPixels: Number]|undefined} [rPadding] Assign a pixel value to add to the min or max of the scale. This will increase the scales domain by the scale unit equivalent of the provided pixels. */\\n\\texport let rPadding = undefined;\\n\\t/** @type {Function} [xScale=d3.scaleLinear] The D3 scale that should be used for the x-dimension. Pass in an instantiated D3 scale if you want to override the default or you want to extra options. */\\n\\texport let xScale = defaultScales.x;\\n\\t/** @type {Function} [yScale=d3.scaleLinear] The D3 scale that should be used for the x-dimension. Pass in an instantiated D3 scale if you want to override the default or you want to extra options. */\\n\\texport let yScale = defaultScales.y;\\n\\t/** @type {Function} [zScale=d3.scaleLinear] The D3 scale that should be used for the x-dimension. Pass in an instantiated D3 scale if you want to override the default or you want to extra options. */\\n\\texport let zScale = defaultScales.z;\\n\\t/** @type {Function} [rScale=d3.scaleSqrt] The D3 scale that should be used for the x-dimension. Pass in an instantiated D3 scale if you want to override the default or you want to extra options. */\\n\\texport let rScale = defaultScales.r;\\n\\t/** @type {[min: Number, max: Number]|Function|Array<String|Number>|undefined} [xRange] Override the default x range of `[0, width]` by setting an array or function with argument `({ width, height})` that returns an array. Setting this prop overrides `xReverse`. This can also be a list of numbers or strings for scales with discrete ranges like [scaleThreshhold](https://github.com/d3/d3-scale#threshold-scales) or [scaleQuantize](https://github.com/d3/d3-scale#quantize-scales). */\\n\\texport let xRange = undefined;\\n\\t/** @type {[min: Number, max: Number]|Function|Array<String|Number>|undefined} [xRange] Override the default y range of `[0, height]` by setting an array or function with argument `({ width, height})` that returns an array. Setting this prop overrides `yReverse`. This can also be a list of numbers or strings for scales with discrete ranges like [scaleThreshhold](https://github.com/d3/d3-scale#threshold-scales) or [scaleQuantize](https://github.com/d3/d3-scale#quantize-scales). */\\n\\texport let yRange = undefined;\\n\\t/** @type {[min: Number, max: Number]|Function|Array<String|Number>|undefined} [zRange] Override the default z range of `[0, width]` by setting an array or function with argument `({ width, height})` that returns an array. Setting this prop overrides `zReverse`. This can also be a list of numbers or strings for scales with discrete ranges like [scaleThreshhold](https://github.com/d3/d3-scale#threshold-scales) or [scaleQuantize](https://github.com/d3/d3-scale#quantize-scales). */\\n\\texport let zRange = undefined;\\n\\t/** @type {[min: Number, max: Number]|Function|Array<String|Number>|undefined} [rRange] Override the default r range of `[1, 25]` by setting an array or function with argument `({ width, height})` that returns an array. Setting this prop overrides `rReverse`. This can also be a list of numbers or strings for scales with discrete ranges like [scaleThreshhold](https://github.com/d3/d3-scale#threshold-scales) or [scaleQuantize](https://github.com/d3/d3-scale#quantize-scales). */\\n\\texport let rRange = undefined;\\n\\t/** @type {boolean} [xReverse=false] Reverse the default x range. By default this is `false` and the range is `[0, width]`. Ignored if you set the xRange prop. */\\n\\texport let xReverse = false;\\n\\t/** @type {boolean|undefined} [yReverse=true] Reverse the default y range. By default this is set dynamically and will be `true` – setting the range to `[height, 0]` – unless the `yScale` has a `.bandwidth` method. Dynamic behavior is overridden if the user sets the prop. Ignored if you set the `yRange` prop. */\\n\\texport let yReverse = undefined;\\n\\t/** @type {boolean} [zReverse=false] Reverse the default z range. By default this is `false` and the range is `[0, width]`. Ignored if you set the zRange prop. */\\n\\texport let zReverse = false;\\n\\t/** @type {boolean} [rReverse=false] Reverse the default r range. By default this is `false` and the range is `[1, 25]`. Ignored if you set the rRange prop. */\\n\\texport let rReverse = false;\\n\\t/** @type {boolean} [xDomainSort=true] Only used when scale is ordinal. Set whether the calculated unique items come back sorted. */\\n\\texport let xDomainSort = true;\\n\\t/** @type {boolean} [yDomainSort=true] Only used when scale is ordinal. Set whether the calculated unique items come back sorted. */\\n\\texport let yDomainSort = true;\\n\\t/** @type {boolean} [zDomainSort=true] Only used when scale is ordinal. Set whether the calculated unique items come back sorted. */\\n\\texport let zDomainSort = true;\\n\\t/** @type {boolean} [rDomainSort=true] Only used when scale is ordinal. Set whether the calculated unique items come back sorted. */\\n\\texport let rDomainSort = true;\\n\\t/** @type {{top?: Number, right?: Number, bottom?: Number, left?: Number}} [padding={}] The amount of padding to put around your chart. It operates like CSS box-sizing: border-box; where values are subtracted from the parent container's width and height, the same as a [D3 margin convention](https://bl.ocks.org/mbostock/3019563). */\\n\\texport let padding = {};\\n\\t/** @type {{ x?: [min: Number, max: Number], y?: [min: Number, max: Number], r?: [min: Number, max: Number], z?: [min: Number, max: Number] }} [extents] Manually set the extents of the x, y or r scale as a two-dimensional array of the min and max you want. Setting values here will skip any dynamic extent calculation of the data for that dimension. */\\n\\texport let extents = {};\\n\\n\\t/** @type {Array<Object|Array<any>>|undefined} [flatData=data] A flat version of data. */\\n\\texport let flatData = undefined;\\n\\n\\t/** @type {Object} custom Any extra configuration values you want available on the LayerCake context. This could be useful for color lookups or additional constants. */\\n\\texport let custom = {};\\n\\n\\t/** @type {boolean} debug Enable debug printing to the console. Useful to inspect your scales and dimensions. */\\n\\texport let debug = false;\\n\\t/** @type {boolean} [verbose=true] Show warnings in the console. */\\n\\texport let verbose = true;\\n\\n\\t/**\\n\\t * Make this reactive\\n\\t */\\n\\t$: yReverseValue =\\n\\t\\ttypeof yReverse === 'undefined'\\n\\t\\t\\t? typeof yScale.bandwidth === 'function'\\n\\t\\t\\t\\t? false\\n\\t\\t\\t\\t: true\\n\\t\\t\\t: yReverse;\\n\\n\\t/* --------------------------------------------\\n\\t * Keep track of whether the component has mounted\\n\\t * This is used to emit warnings once we have measured\\n\\t * the container object and it doesn't have proper dimensions\\n\\t */\\n\\tlet isMounted = false;\\n\\tonMount(() => {\\n\\t\\tisMounted = true;\\n\\t});\\n\\n\\t/* --------------------------------------------\\n\\t * Preserve a copy of our passed in settings before we modify them\\n\\t * Return this to the user's context so they can reference things if need be\\n\\t * Add the active keys since those aren't on our settings object.\\n\\t * This is mostly an escape-hatch\\n\\t */\\n\\tconst config = {};\\n\\t$: if (x) config.x = x;\\n\\t$: if (y) config.y = y;\\n\\t$: if (z) config.z = z;\\n\\t$: if (r) config.r = r;\\n\\t$: if (xDomain) config.xDomain = xDomain;\\n\\t$: if (yDomain) config.yDomain = yDomain;\\n\\t$: if (zDomain) config.zDomain = zDomain;\\n\\t$: if (rDomain) config.rDomain = rDomain;\\n\\t$: if (xRange) config.xRange = xRange;\\n\\t$: if (yRange) config.yRange = yRange;\\n\\t$: if (zRange) config.zRange = zRange;\\n\\t$: if (rRange) config.rRange = rRange;\\n\\n\\t/* --------------------------------------------\\n\\t * Make store versions of each parameter\\n\\t * Prefix these with `_` to keep things organized\\n\\t */\\n\\tconst _percentRange = writable(percentRange);\\n\\tconst _containerWidth = writable(containerWidth);\\n\\tconst _containerHeight = writable(containerHeight);\\n\\tconst _extents = writable(filterObject(extents));\\n\\tconst _data = writable(data);\\n\\tconst _flatData = writable(flatData || data);\\n\\tconst _padding = writable(padding);\\n\\tconst _x = writable(makeAccessor(x));\\n\\tconst _y = writable(makeAccessor(y));\\n\\tconst _z = writable(makeAccessor(z));\\n\\tconst _r = writable(makeAccessor(r));\\n\\tconst _xDomain = writable(xDomain);\\n\\tconst _yDomain = writable(yDomain);\\n\\tconst _zDomain = writable(zDomain);\\n\\tconst _rDomain = writable(rDomain);\\n\\tconst _xNice = writable(xNice);\\n\\tconst _yNice = writable(yNice);\\n\\tconst _zNice = writable(zNice);\\n\\tconst _rNice = writable(rNice);\\n\\tconst _xReverse = writable(xReverse);\\n\\tconst _yReverse = writable(yReverseValue);\\n\\tconst _zReverse = writable(zReverse);\\n\\tconst _rReverse = writable(rReverse);\\n\\tconst _xPadding = writable(xPadding);\\n\\tconst _yPadding = writable(yPadding);\\n\\tconst _zPadding = writable(zPadding);\\n\\tconst _rPadding = writable(rPadding);\\n\\tconst _xRange = writable(xRange);\\n\\tconst _yRange = writable(yRange);\\n\\tconst _zRange = writable(zRange);\\n\\tconst _rRange = writable(rRange);\\n\\tconst _xScale = writable(xScale);\\n\\tconst _yScale = writable(yScale);\\n\\tconst _zScale = writable(zScale);\\n\\tconst _rScale = writable(rScale);\\n\\tconst _xDomainSort = writable(xDomainSort);\\n\\tconst _yDomainSort = writable(yDomainSort);\\n\\tconst _zDomainSort = writable(zDomainSort);\\n\\tconst _rDomainSort = writable(rDomainSort);\\n\\tconst _config = writable(config);\\n\\tconst _custom = writable(custom);\\n\\n\\t$: $_percentRange = percentRange;\\n\\t$: $_containerWidth = containerWidth;\\n\\t$: $_containerHeight = containerHeight;\\n\\t$: $_extents = filterObject(extents);\\n\\t$: $_data = data;\\n\\t$: $_flatData = flatData || data;\\n\\t$: $_padding = padding;\\n\\t$: $_x = makeAccessor(x);\\n\\t$: $_y = makeAccessor(y);\\n\\t$: $_z = makeAccessor(z);\\n\\t$: $_r = makeAccessor(r);\\n\\t$: $_xDomain = xDomain;\\n\\t$: $_yDomain = yDomain;\\n\\t$: $_zDomain = zDomain;\\n\\t$: $_rDomain = rDomain;\\n\\t$: $_xNice = xNice;\\n\\t$: $_yNice = yNice;\\n\\t$: $_zNice = zNice;\\n\\t$: $_rNice = rNice;\\n\\t$: $_xReverse = xReverse;\\n\\t$: $_yReverse = yReverseValue;\\n\\t$: $_zReverse = zReverse;\\n\\t$: $_rReverse = rReverse;\\n\\t$: $_xPadding = xPadding;\\n\\t$: $_yPadding = yPadding;\\n\\t$: $_zPadding = zPadding;\\n\\t$: $_rPadding = rPadding;\\n\\t$: $_xRange = xRange;\\n\\t$: $_yRange = yRange;\\n\\t$: $_zRange = zRange;\\n\\t$: $_rRange = rRange;\\n\\t$: $_xScale = xScale;\\n\\t$: $_yScale = yScale;\\n\\t$: $_zScale = zScale;\\n\\t$: $_rScale = rScale;\\n\\t$: $_custom = custom;\\n\\t$: $_config = config;\\n\\n\\t/* --------------------------------------------\\n\\t * Create derived values\\n\\t * Suffix these with `_d`\\n\\t */\\n\\tconst activeGetters_d = derived([_x, _y, _z, _r], ([$x, $y, $z, $r]) => {\\n\\t\\tconst obj = {};\\n\\t\\tif ($x) {\\n\\t\\t\\tobj.x = $x;\\n\\t\\t}\\n\\t\\tif ($y) {\\n\\t\\t\\tobj.y = $y;\\n\\t\\t}\\n\\t\\tif ($z) {\\n\\t\\t\\tobj.z = $z;\\n\\t\\t}\\n\\t\\tif ($r) {\\n\\t\\t\\tobj.r = $r;\\n\\t\\t}\\n\\t\\treturn obj;\\n\\t});\\n\\n\\tconst padding_d = derived([_padding, _containerWidth, _containerHeight], ([$padding]) => {\\n\\t\\tconst defaultPadding = { top: 0, right: 0, bottom: 0, left: 0 };\\n\\t\\treturn Object.assign(defaultPadding, $padding);\\n\\t});\\n\\n\\tconst box_d = derived(\\n\\t\\t[_containerWidth, _containerHeight, padding_d],\\n\\t\\t([$containerWidth, $containerHeight, $padding]) => {\\n\\t\\t\\tconst b = {};\\n\\t\\t\\tb.top = $padding.top;\\n\\t\\t\\tb.right = $containerWidth - $padding.right;\\n\\t\\t\\tb.bottom = $containerHeight - $padding.bottom;\\n\\t\\t\\tb.left = $padding.left;\\n\\t\\t\\tb.width = b.right - b.left;\\n\\t\\t\\tb.height = b.bottom - b.top;\\n\\t\\t\\tif (verbose === true) {\\n\\t\\t\\t\\tif (b.width <= 0 && isMounted === true) {\\n\\t\\t\\t\\t\\tconsole.warn(\\n\\t\\t\\t\\t\\t\\t'[LayerCake] Target div has zero or negative width. Did you forget to set an explicit width in CSS on the container?'\\n\\t\\t\\t\\t\\t);\\n\\t\\t\\t\\t}\\n\\t\\t\\t\\tif (b.height <= 0 && isMounted === true) {\\n\\t\\t\\t\\t\\tconsole.warn(\\n\\t\\t\\t\\t\\t\\t'[LayerCake] Target div has zero or negative height. Did you forget to set an explicit height in CSS on the container?'\\n\\t\\t\\t\\t\\t);\\n\\t\\t\\t\\t}\\n\\t\\t\\t}\\n\\t\\t\\treturn b;\\n\\t\\t}\\n\\t);\\n\\n\\tconst width_d = derived([box_d], ([$box]) => {\\n\\t\\treturn $box.width;\\n\\t});\\n\\n\\tconst height_d = derived([box_d], ([$box]) => {\\n\\t\\treturn $box.height;\\n\\t});\\n\\n\\t/* --------------------------------------------\\n\\t * Calculate extents by taking the extent of the data\\n\\t * and filling that in with anything set by the user\\n\\t * Note that this is different from an \\\"extent\\\" passed\\n\\t * in as a domain, which can be a partial domain\\n\\t */\\n\\tconst extents_d = derived(\\n\\t\\t[\\n\\t\\t\\t_flatData,\\n\\t\\t\\tactiveGetters_d,\\n\\t\\t\\t_extents,\\n\\t\\t\\t_xScale,\\n\\t\\t\\t_yScale,\\n\\t\\t\\t_rScale,\\n\\t\\t\\t_zScale,\\n\\t\\t\\t_xDomainSort,\\n\\t\\t\\t_yDomainSort,\\n\\t\\t\\t_zDomainSort,\\n\\t\\t\\t_rDomainSort\\n\\t\\t],\\n\\t\\t([\\n\\t\\t\\t$flatData,\\n\\t\\t\\t$activeGetters,\\n\\t\\t\\t$extents,\\n\\t\\t\\t$_xScale,\\n\\t\\t\\t$_yScale,\\n\\t\\t\\t$_rScale,\\n\\t\\t\\t$_zScale,\\n\\t\\t\\t$_xDomainSort,\\n\\t\\t\\t$_yDomainSort,\\n\\t\\t\\t$_zDomainSort,\\n\\t\\t\\t$_rDomainSort\\n\\t\\t]) => {\\n\\t\\t\\tconst scaleLookup = {\\n\\t\\t\\t\\tx: { scale: $_xScale, sort: $_xDomainSort },\\n\\t\\t\\t\\ty: { scale: $_yScale, sort: $_yDomainSort },\\n\\t\\t\\t\\tr: { scale: $_rScale, sort: $_rDomainSort },\\n\\t\\t\\t\\tz: { scale: $_zScale, sort: $_zDomainSort }\\n\\t\\t\\t};\\n\\t\\t\\tconst getters = filterObject($activeGetters, $extents);\\n\\t\\t\\tconst activeScales = Object.fromEntries(Object.keys(getters).map(k => [k, scaleLookup[k]]));\\n\\n\\t\\t\\tif (Object.keys(getters).length > 0) {\\n\\t\\t\\t\\tconst calculatedExtents = calcScaleExtents($flatData, getters, activeScales);\\n\\t\\t\\t\\treturn { ...calculatedExtents, ...$extents };\\n\\t\\t\\t} else {\\n\\t\\t\\t\\treturn {};\\n\\t\\t\\t}\\n\\t\\t}\\n\\t);\\n\\n\\tconst xDomain_d = derived([extents_d, _xDomain], calcDomain('x'));\\n\\tconst yDomain_d = derived([extents_d, _yDomain], calcDomain('y'));\\n\\tconst zDomain_d = derived([extents_d, _zDomain], calcDomain('z'));\\n\\tconst rDomain_d = derived([extents_d, _rDomain], calcDomain('r'));\\n\\n\\tconst xScale_d = derived(\\n\\t\\t[\\n\\t\\t\\t_xScale,\\n\\t\\t\\textents_d,\\n\\t\\t\\txDomain_d,\\n\\t\\t\\t_xPadding,\\n\\t\\t\\t_xNice,\\n\\t\\t\\t_xReverse,\\n\\t\\t\\twidth_d,\\n\\t\\t\\theight_d,\\n\\t\\t\\t_xRange,\\n\\t\\t\\t_percentRange\\n\\t\\t],\\n\\t\\tcreateScale('x')\\n\\t);\\n\\tconst xGet_d = derived([_x, xScale_d], createGetter);\\n\\n\\tconst yScale_d = derived(\\n\\t\\t[\\n\\t\\t\\t_yScale,\\n\\t\\t\\textents_d,\\n\\t\\t\\tyDomain_d,\\n\\t\\t\\t_yPadding,\\n\\t\\t\\t_yNice,\\n\\t\\t\\t_yReverse,\\n\\t\\t\\twidth_d,\\n\\t\\t\\theight_d,\\n\\t\\t\\t_yRange,\\n\\t\\t\\t_percentRange\\n\\t\\t],\\n\\t\\tcreateScale('y')\\n\\t);\\n\\tconst yGet_d = derived([_y, yScale_d], createGetter);\\n\\n\\tconst zScale_d = derived(\\n\\t\\t[\\n\\t\\t\\t_zScale,\\n\\t\\t\\textents_d,\\n\\t\\t\\tzDomain_d,\\n\\t\\t\\t_zPadding,\\n\\t\\t\\t_zNice,\\n\\t\\t\\t_zReverse,\\n\\t\\t\\twidth_d,\\n\\t\\t\\theight_d,\\n\\t\\t\\t_zRange,\\n\\t\\t\\t_percentRange\\n\\t\\t],\\n\\t\\tcreateScale('z')\\n\\t);\\n\\tconst zGet_d = derived([_z, zScale_d], createGetter);\\n\\n\\tconst rScale_d = derived(\\n\\t\\t[\\n\\t\\t\\t_rScale,\\n\\t\\t\\textents_d,\\n\\t\\t\\trDomain_d,\\n\\t\\t\\t_rPadding,\\n\\t\\t\\t_rNice,\\n\\t\\t\\t_rReverse,\\n\\t\\t\\twidth_d,\\n\\t\\t\\theight_d,\\n\\t\\t\\t_rRange,\\n\\t\\t\\t_percentRange\\n\\t\\t],\\n\\t\\tcreateScale('r')\\n\\t);\\n\\tconst rGet_d = derived([_r, rScale_d], createGetter);\\n\\n\\t// Create new _Domains in case we ran `.nice()` over our domain on scale initialization\\n\\tconst xDomain_d_possibly_nice = derived(xScale_d, $xScale_d => $xScale_d.domain());\\n\\tconst yDomain_d_possibly_nice = derived(yScale_d, $yScale_d => $yScale_d.domain());\\n\\tconst zDomain_d_possibly_nice = derived(zScale_d, $zScale_d => $zScale_d.domain());\\n\\tconst rDomain_d_possibly_nice = derived(rScale_d, $rScale_d => $rScale_d.domain());\\n\\n\\tconst xRange_d = derived([xScale_d], getRange);\\n\\tconst yRange_d = derived([yScale_d], getRange);\\n\\tconst zRange_d = derived([zScale_d], getRange);\\n\\tconst rRange_d = derived([rScale_d], getRange);\\n\\n\\tconst aspectRatio_d = derived([width_d, height_d], ([$width, $height]) => {\\n\\t\\treturn $width / $height;\\n\\t});\\n\\n\\t$: context = {\\n\\t\\tactiveGetters: activeGetters_d,\\n\\t\\twidth: width_d,\\n\\t\\theight: height_d,\\n\\t\\tpercentRange: _percentRange,\\n\\t\\taspectRatio: aspectRatio_d,\\n\\t\\tcontainerWidth: _containerWidth,\\n\\t\\tcontainerHeight: _containerHeight,\\n\\t\\tx: _x,\\n\\t\\ty: _y,\\n\\t\\tz: _z,\\n\\t\\tr: _r,\\n\\t\\tcustom: _custom,\\n\\t\\tdata: _data,\\n\\t\\txNice: _xNice,\\n\\t\\tyNice: _yNice,\\n\\t\\tzNice: _zNice,\\n\\t\\trNice: _rNice,\\n\\t\\txDomainSort: _xDomainSort,\\n\\t\\tyDomainSort: _yDomainSort,\\n\\t\\tzDomainSort: _zDomainSort,\\n\\t\\trDomainSort: _rDomainSort,\\n\\t\\txReverse: _xReverse,\\n\\t\\tyReverse: _yReverse,\\n\\t\\tzReverse: _zReverse,\\n\\t\\trReverse: _rReverse,\\n\\t\\txPadding: _xPadding,\\n\\t\\tyPadding: _yPadding,\\n\\t\\tzPadding: _zPadding,\\n\\t\\trPadding: _rPadding,\\n\\t\\tpadding: padding_d,\\n\\t\\tflatData: _flatData,\\n\\t\\textents: extents_d,\\n\\t\\txDomain: xDomain_d_possibly_nice,\\n\\t\\tyDomain: yDomain_d_possibly_nice,\\n\\t\\tzDomain: zDomain_d_possibly_nice,\\n\\t\\trDomain: rDomain_d_possibly_nice,\\n\\t\\txRange: xRange_d,\\n\\t\\tyRange: yRange_d,\\n\\t\\tzRange: zRange_d,\\n\\t\\trRange: rRange_d,\\n\\t\\tconfig: _config,\\n\\t\\txScale: xScale_d,\\n\\t\\txGet: xGet_d,\\n\\t\\tyScale: yScale_d,\\n\\t\\tyGet: yGet_d,\\n\\t\\tzScale: zScale_d,\\n\\t\\tzGet: zGet_d,\\n\\t\\trScale: rScale_d,\\n\\t\\trGet: rGet_d\\n\\t};\\n\\n\\t$: setContext('LayerCake', context);\\n\\n\\t$: if ($box_d && debug === true && (ssr === true || typeof window !== 'undefined')) {\\n\\t\\t// Call this as a debounce so that it doesn't get called multiple times as these vars get filled in\\n\\t\\tprintDebug_debounced({\\n\\t\\t\\tdata: $_data,\\n\\t\\t\\tflatData: typeof flatData !== 'undefined' ? $_flatData : null,\\n\\t\\t\\tboundingBox: $box_d,\\n\\t\\t\\tactiveGetters: $activeGetters_d,\\n\\t\\t\\tx: config.x,\\n\\t\\t\\ty: config.y,\\n\\t\\t\\tz: config.z,\\n\\t\\t\\tr: config.r,\\n\\t\\t\\txScale: $xScale_d,\\n\\t\\t\\tyScale: $yScale_d,\\n\\t\\t\\tzScale: $zScale_d,\\n\\t\\t\\trScale: $rScale_d\\n\\t\\t});\\n\\t}\\n<\/script>\\n\\n{#if ssr === true || typeof window !== 'undefined'}\\n\\t<div\\n\\t\\tbind:this={element}\\n\\t\\tclass=\\\"layercake-container\\\"\\n\\t\\tstyle:position\\n\\t\\tstyle:top={position === 'absolute' ? '0' : null}\\n\\t\\tstyle:right={position === 'absolute' ? '0' : null}\\n\\t\\tstyle:bottom={position === 'absolute' ? '0' : null}\\n\\t\\tstyle:left={position === 'absolute' ? '0' : null}\\n\\t\\tstyle:pointer-events={pointerEvents === false ? 'none' : null}\\n\\t\\tbind:clientWidth={containerWidth}\\n\\t\\tbind:clientHeight={containerHeight}\\n\\t>\\n\\t\\t<slot\\n\\t\\t\\t{element}\\n\\t\\t\\twidth={$width_d}\\n\\t\\t\\theight={$height_d}\\n\\t\\t\\taspectRatio={$aspectRatio_d}\\n\\t\\t\\tcontainerWidth={$_containerWidth}\\n\\t\\t\\tcontainerHeight={$_containerHeight}\\n\\t\\t\\tactiveGetters={$activeGetters_d}\\n\\t\\t\\tpercentRange={$_percentRange}\\n\\t\\t\\tx={$_x}\\n\\t\\t\\ty={$_y}\\n\\t\\t\\tz={$_z}\\n\\t\\t\\tr={$_r}\\n\\t\\t\\tcustom={$_custom}\\n\\t\\t\\tdata={$_data}\\n\\t\\t\\txNice={$_xNice}\\n\\t\\t\\tyNice={$_yNice}\\n\\t\\t\\tzNice={$_zNice}\\n\\t\\t\\trNice={$_rNice}\\n\\t\\t\\txDomainSort={$_xDomainSort}\\n\\t\\t\\tyDomainSort={$_yDomainSort}\\n\\t\\t\\tzDomainSort={$_zDomainSort}\\n\\t\\t\\trDomainSort={$_rDomainSort}\\n\\t\\t\\txReverse={$_xReverse}\\n\\t\\t\\tyReverse={$_yReverse}\\n\\t\\t\\tzReverse={$_zReverse}\\n\\t\\t\\trReverse={$_rReverse}\\n\\t\\t\\txPadding={$_xPadding}\\n\\t\\t\\tyPadding={$_yPadding}\\n\\t\\t\\tzPadding={$_zPadding}\\n\\t\\t\\trPadding={$_rPadding}\\n\\t\\t\\tpadding={$padding_d}\\n\\t\\t\\tflatData={$_flatData}\\n\\t\\t\\textents={$extents_d}\\n\\t\\t\\txDomain={$xDomain_d}\\n\\t\\t\\tyDomain={$yDomain_d}\\n\\t\\t\\tzDomain={$zDomain_d}\\n\\t\\t\\trDomain={$rDomain_d}\\n\\t\\t\\txRange={$xRange_d}\\n\\t\\t\\tyRange={$yRange_d}\\n\\t\\t\\tzRange={$zRange_d}\\n\\t\\t\\trRange={$rRange_d}\\n\\t\\t\\tconfig={$_config}\\n\\t\\t\\txScale={$xScale_d}\\n\\t\\t\\txGet={$xGet_d}\\n\\t\\t\\tyScale={$yScale_d}\\n\\t\\t\\tyGet={$yGet_d}\\n\\t\\t\\tzScale={$zScale_d}\\n\\t\\t\\tzGet={$zGet_d}\\n\\t\\t\\trScale={$rScale_d}\\n\\t\\t\\trGet={$rGet_d}\\n\\t\\t/>\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t.layercake-container,\\n\\t.layercake-container :global(*) {\\n\\t\\tbox-sizing: border-box;\\n\\t}\\n\\t.layercake-container {\\n\\t\\twidth: 100%;\\n\\t\\theight: 100%;\\n\\t}\\n</style>\\n\"],\"names\":[],\"mappings\":\"AAylBC,kCAAoB,CACpB,kCAAoB,CAAS,CAAG,CAC/B,UAAU,CAAE,UACb,CACA,kCAAqB,CACpB,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IACT\"}"
};
const LayerCake = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let yReverseValue;
  let context;
  let $rScale_d, $$unsubscribe_rScale_d;
  let $zScale_d, $$unsubscribe_zScale_d;
  let $yScale_d, $$unsubscribe_yScale_d;
  let $xScale_d, $$unsubscribe_xScale_d;
  let $activeGetters_d, $$unsubscribe_activeGetters_d;
  let $box_d, $$unsubscribe_box_d;
  let $_flatData, $$unsubscribe__flatData;
  let $_data, $$unsubscribe__data;
  let $_config, $$unsubscribe__config;
  let $_custom, $$unsubscribe__custom;
  let $_rScale, $$unsubscribe__rScale;
  let $_zScale, $$unsubscribe__zScale;
  let $_yScale, $$unsubscribe__yScale;
  let $_xScale, $$unsubscribe__xScale;
  let $_rRange, $$unsubscribe__rRange;
  let $_zRange, $$unsubscribe__zRange;
  let $_yRange, $$unsubscribe__yRange;
  let $_xRange, $$unsubscribe__xRange;
  let $_rPadding, $$unsubscribe__rPadding;
  let $_zPadding, $$unsubscribe__zPadding;
  let $_yPadding, $$unsubscribe__yPadding;
  let $_xPadding, $$unsubscribe__xPadding;
  let $_rReverse, $$unsubscribe__rReverse;
  let $_zReverse, $$unsubscribe__zReverse;
  let $_yReverse, $$unsubscribe__yReverse;
  let $_xReverse, $$unsubscribe__xReverse;
  let $_rNice, $$unsubscribe__rNice;
  let $_zNice, $$unsubscribe__zNice;
  let $_yNice, $$unsubscribe__yNice;
  let $_xNice, $$unsubscribe__xNice;
  let $_rDomain, $$unsubscribe__rDomain;
  let $_zDomain, $$unsubscribe__zDomain;
  let $_yDomain, $$unsubscribe__yDomain;
  let $_xDomain, $$unsubscribe__xDomain;
  let $_r, $$unsubscribe__r;
  let $_z, $$unsubscribe__z;
  let $_y, $$unsubscribe__y;
  let $_x, $$unsubscribe__x;
  let $_padding, $$unsubscribe__padding;
  let $_extents, $$unsubscribe__extents;
  let $_containerHeight, $$unsubscribe__containerHeight;
  let $_containerWidth, $$unsubscribe__containerWidth;
  let $_percentRange, $$unsubscribe__percentRange;
  let $width_d, $$unsubscribe_width_d;
  let $height_d, $$unsubscribe_height_d;
  let $aspectRatio_d, $$unsubscribe_aspectRatio_d;
  let $_xDomainSort, $$unsubscribe__xDomainSort;
  let $_yDomainSort, $$unsubscribe__yDomainSort;
  let $_zDomainSort, $$unsubscribe__zDomainSort;
  let $_rDomainSort, $$unsubscribe__rDomainSort;
  let $padding_d, $$unsubscribe_padding_d;
  let $extents_d, $$unsubscribe_extents_d;
  let $xDomain_d, $$unsubscribe_xDomain_d;
  let $yDomain_d, $$unsubscribe_yDomain_d;
  let $zDomain_d, $$unsubscribe_zDomain_d;
  let $rDomain_d, $$unsubscribe_rDomain_d;
  let $xRange_d, $$unsubscribe_xRange_d;
  let $yRange_d, $$unsubscribe_yRange_d;
  let $zRange_d, $$unsubscribe_zRange_d;
  let $rRange_d, $$unsubscribe_rRange_d;
  let $xGet_d, $$unsubscribe_xGet_d;
  let $yGet_d, $$unsubscribe_yGet_d;
  let $zGet_d, $$unsubscribe_zGet_d;
  let $rGet_d, $$unsubscribe_rGet_d;
  const printDebug_debounced = debounce(printDebug, 200);
  let { ssr = false } = $$props;
  let { pointerEvents = true } = $$props;
  let { position = "relative" } = $$props;
  let { percentRange = false } = $$props;
  let { width = void 0 } = $$props;
  let { height = void 0 } = $$props;
  let { containerWidth = width || 100 } = $$props;
  let { containerHeight = height || 100 } = $$props;
  let { element = void 0 } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { z = void 0 } = $$props;
  let { r = void 0 } = $$props;
  let { data = [] } = $$props;
  let { xDomain = void 0 } = $$props;
  let { yDomain = void 0 } = $$props;
  let { zDomain = void 0 } = $$props;
  let { rDomain = void 0 } = $$props;
  let { xNice = false } = $$props;
  let { yNice = false } = $$props;
  let { zNice = false } = $$props;
  let { rNice = false } = $$props;
  let { xPadding = void 0 } = $$props;
  let { yPadding = void 0 } = $$props;
  let { zPadding = void 0 } = $$props;
  let { rPadding = void 0 } = $$props;
  let { xScale = defaultScales.x } = $$props;
  let { yScale = defaultScales.y } = $$props;
  let { zScale = defaultScales.z } = $$props;
  let { rScale = defaultScales.r } = $$props;
  let { xRange = void 0 } = $$props;
  let { yRange = void 0 } = $$props;
  let { zRange = void 0 } = $$props;
  let { rRange = void 0 } = $$props;
  let { xReverse = false } = $$props;
  let { yReverse = void 0 } = $$props;
  let { zReverse = false } = $$props;
  let { rReverse = false } = $$props;
  let { xDomainSort = true } = $$props;
  let { yDomainSort = true } = $$props;
  let { zDomainSort = true } = $$props;
  let { rDomainSort = true } = $$props;
  let { padding = {} } = $$props;
  let { extents = {} } = $$props;
  let { flatData = void 0 } = $$props;
  let { custom = {} } = $$props;
  let { debug = false } = $$props;
  let { verbose = true } = $$props;
  let isMounted = false;
  const config = {};
  const _percentRange = writable(percentRange);
  $$unsubscribe__percentRange = subscribe(_percentRange, (value) => $_percentRange = value);
  const _containerWidth = writable(containerWidth);
  $$unsubscribe__containerWidth = subscribe(_containerWidth, (value) => $_containerWidth = value);
  const _containerHeight = writable(containerHeight);
  $$unsubscribe__containerHeight = subscribe(_containerHeight, (value) => $_containerHeight = value);
  const _extents = writable(filterObject(extents));
  $$unsubscribe__extents = subscribe(_extents, (value) => $_extents = value);
  const _data = writable(data);
  $$unsubscribe__data = subscribe(_data, (value) => $_data = value);
  const _flatData = writable(flatData || data);
  $$unsubscribe__flatData = subscribe(_flatData, (value) => $_flatData = value);
  const _padding = writable(padding);
  $$unsubscribe__padding = subscribe(_padding, (value) => $_padding = value);
  const _x = writable(makeAccessor(x));
  $$unsubscribe__x = subscribe(_x, (value) => $_x = value);
  const _y = writable(makeAccessor(y));
  $$unsubscribe__y = subscribe(_y, (value) => $_y = value);
  const _z = writable(makeAccessor(z));
  $$unsubscribe__z = subscribe(_z, (value) => $_z = value);
  const _r = writable(makeAccessor(r));
  $$unsubscribe__r = subscribe(_r, (value) => $_r = value);
  const _xDomain = writable(xDomain);
  $$unsubscribe__xDomain = subscribe(_xDomain, (value) => $_xDomain = value);
  const _yDomain = writable(yDomain);
  $$unsubscribe__yDomain = subscribe(_yDomain, (value) => $_yDomain = value);
  const _zDomain = writable(zDomain);
  $$unsubscribe__zDomain = subscribe(_zDomain, (value) => $_zDomain = value);
  const _rDomain = writable(rDomain);
  $$unsubscribe__rDomain = subscribe(_rDomain, (value) => $_rDomain = value);
  const _xNice = writable(xNice);
  $$unsubscribe__xNice = subscribe(_xNice, (value) => $_xNice = value);
  const _yNice = writable(yNice);
  $$unsubscribe__yNice = subscribe(_yNice, (value) => $_yNice = value);
  const _zNice = writable(zNice);
  $$unsubscribe__zNice = subscribe(_zNice, (value) => $_zNice = value);
  const _rNice = writable(rNice);
  $$unsubscribe__rNice = subscribe(_rNice, (value) => $_rNice = value);
  const _xReverse = writable(xReverse);
  $$unsubscribe__xReverse = subscribe(_xReverse, (value) => $_xReverse = value);
  const _yReverse = writable(yReverseValue);
  $$unsubscribe__yReverse = subscribe(_yReverse, (value) => $_yReverse = value);
  const _zReverse = writable(zReverse);
  $$unsubscribe__zReverse = subscribe(_zReverse, (value) => $_zReverse = value);
  const _rReverse = writable(rReverse);
  $$unsubscribe__rReverse = subscribe(_rReverse, (value) => $_rReverse = value);
  const _xPadding = writable(xPadding);
  $$unsubscribe__xPadding = subscribe(_xPadding, (value) => $_xPadding = value);
  const _yPadding = writable(yPadding);
  $$unsubscribe__yPadding = subscribe(_yPadding, (value) => $_yPadding = value);
  const _zPadding = writable(zPadding);
  $$unsubscribe__zPadding = subscribe(_zPadding, (value) => $_zPadding = value);
  const _rPadding = writable(rPadding);
  $$unsubscribe__rPadding = subscribe(_rPadding, (value) => $_rPadding = value);
  const _xRange = writable(xRange);
  $$unsubscribe__xRange = subscribe(_xRange, (value) => $_xRange = value);
  const _yRange = writable(yRange);
  $$unsubscribe__yRange = subscribe(_yRange, (value) => $_yRange = value);
  const _zRange = writable(zRange);
  $$unsubscribe__zRange = subscribe(_zRange, (value) => $_zRange = value);
  const _rRange = writable(rRange);
  $$unsubscribe__rRange = subscribe(_rRange, (value) => $_rRange = value);
  const _xScale = writable(xScale);
  $$unsubscribe__xScale = subscribe(_xScale, (value) => $_xScale = value);
  const _yScale = writable(yScale);
  $$unsubscribe__yScale = subscribe(_yScale, (value) => $_yScale = value);
  const _zScale = writable(zScale);
  $$unsubscribe__zScale = subscribe(_zScale, (value) => $_zScale = value);
  const _rScale = writable(rScale);
  $$unsubscribe__rScale = subscribe(_rScale, (value) => $_rScale = value);
  const _xDomainSort = writable(xDomainSort);
  $$unsubscribe__xDomainSort = subscribe(_xDomainSort, (value) => $_xDomainSort = value);
  const _yDomainSort = writable(yDomainSort);
  $$unsubscribe__yDomainSort = subscribe(_yDomainSort, (value) => $_yDomainSort = value);
  const _zDomainSort = writable(zDomainSort);
  $$unsubscribe__zDomainSort = subscribe(_zDomainSort, (value) => $_zDomainSort = value);
  const _rDomainSort = writable(rDomainSort);
  $$unsubscribe__rDomainSort = subscribe(_rDomainSort, (value) => $_rDomainSort = value);
  const _config = writable(config);
  $$unsubscribe__config = subscribe(_config, (value) => $_config = value);
  const _custom = writable(custom);
  $$unsubscribe__custom = subscribe(_custom, (value) => $_custom = value);
  const activeGetters_d = derived([_x, _y, _z, _r], ([$x, $y, $z, $r]) => {
    const obj = {};
    if ($x) {
      obj.x = $x;
    }
    if ($y) {
      obj.y = $y;
    }
    if ($z) {
      obj.z = $z;
    }
    if ($r) {
      obj.r = $r;
    }
    return obj;
  });
  $$unsubscribe_activeGetters_d = subscribe(activeGetters_d, (value) => $activeGetters_d = value);
  const padding_d = derived([_padding, _containerWidth, _containerHeight], ([$padding]) => {
    const defaultPadding = { top: 0, right: 0, bottom: 0, left: 0 };
    return Object.assign(defaultPadding, $padding);
  });
  $$unsubscribe_padding_d = subscribe(padding_d, (value) => $padding_d = value);
  const box_d = derived([_containerWidth, _containerHeight, padding_d], ([$containerWidth, $containerHeight, $padding]) => {
    const b = {};
    b.top = $padding.top;
    b.right = $containerWidth - $padding.right;
    b.bottom = $containerHeight - $padding.bottom;
    b.left = $padding.left;
    b.width = b.right - b.left;
    b.height = b.bottom - b.top;
    if (verbose === true) {
      if (b.width <= 0 && isMounted === true) ;
      if (b.height <= 0 && isMounted === true) ;
    }
    return b;
  });
  $$unsubscribe_box_d = subscribe(box_d, (value) => $box_d = value);
  const width_d = derived([box_d], ([$box]) => {
    return $box.width;
  });
  $$unsubscribe_width_d = subscribe(width_d, (value) => $width_d = value);
  const height_d = derived([box_d], ([$box]) => {
    return $box.height;
  });
  $$unsubscribe_height_d = subscribe(height_d, (value) => $height_d = value);
  const extents_d = derived(
    [
      _flatData,
      activeGetters_d,
      _extents,
      _xScale,
      _yScale,
      _rScale,
      _zScale,
      _xDomainSort,
      _yDomainSort,
      _zDomainSort,
      _rDomainSort
    ],
    ([
      $flatData,
      $activeGetters,
      $extents,
      $_xScale2,
      $_yScale2,
      $_rScale2,
      $_zScale2,
      $_xDomainSort2,
      $_yDomainSort2,
      $_zDomainSort2,
      $_rDomainSort2
    ]) => {
      const scaleLookup = {
        x: { scale: $_xScale2, sort: $_xDomainSort2 },
        y: { scale: $_yScale2, sort: $_yDomainSort2 },
        r: { scale: $_rScale2, sort: $_rDomainSort2 },
        z: { scale: $_zScale2, sort: $_zDomainSort2 }
      };
      const getters = filterObject($activeGetters, $extents);
      const activeScales = Object.fromEntries(Object.keys(getters).map((k) => [k, scaleLookup[k]]));
      if (Object.keys(getters).length > 0) {
        const calculatedExtents = calcScaleExtents($flatData, getters, activeScales);
        return { ...calculatedExtents, ...$extents };
      } else {
        return {};
      }
    }
  );
  $$unsubscribe_extents_d = subscribe(extents_d, (value) => $extents_d = value);
  const xDomain_d = derived([extents_d, _xDomain], calcDomain("x"));
  $$unsubscribe_xDomain_d = subscribe(xDomain_d, (value) => $xDomain_d = value);
  const yDomain_d = derived([extents_d, _yDomain], calcDomain("y"));
  $$unsubscribe_yDomain_d = subscribe(yDomain_d, (value) => $yDomain_d = value);
  const zDomain_d = derived([extents_d, _zDomain], calcDomain("z"));
  $$unsubscribe_zDomain_d = subscribe(zDomain_d, (value) => $zDomain_d = value);
  const rDomain_d = derived([extents_d, _rDomain], calcDomain("r"));
  $$unsubscribe_rDomain_d = subscribe(rDomain_d, (value) => $rDomain_d = value);
  const xScale_d = derived(
    [
      _xScale,
      extents_d,
      xDomain_d,
      _xPadding,
      _xNice,
      _xReverse,
      width_d,
      height_d,
      _xRange,
      _percentRange
    ],
    createScale$1("x")
  );
  $$unsubscribe_xScale_d = subscribe(xScale_d, (value) => $xScale_d = value);
  const xGet_d = derived([_x, xScale_d], createGetter);
  $$unsubscribe_xGet_d = subscribe(xGet_d, (value) => $xGet_d = value);
  const yScale_d = derived(
    [
      _yScale,
      extents_d,
      yDomain_d,
      _yPadding,
      _yNice,
      _yReverse,
      width_d,
      height_d,
      _yRange,
      _percentRange
    ],
    createScale$1("y")
  );
  $$unsubscribe_yScale_d = subscribe(yScale_d, (value) => $yScale_d = value);
  const yGet_d = derived([_y, yScale_d], createGetter);
  $$unsubscribe_yGet_d = subscribe(yGet_d, (value) => $yGet_d = value);
  const zScale_d = derived(
    [
      _zScale,
      extents_d,
      zDomain_d,
      _zPadding,
      _zNice,
      _zReverse,
      width_d,
      height_d,
      _zRange,
      _percentRange
    ],
    createScale$1("z")
  );
  $$unsubscribe_zScale_d = subscribe(zScale_d, (value) => $zScale_d = value);
  const zGet_d = derived([_z, zScale_d], createGetter);
  $$unsubscribe_zGet_d = subscribe(zGet_d, (value) => $zGet_d = value);
  const rScale_d = derived(
    [
      _rScale,
      extents_d,
      rDomain_d,
      _rPadding,
      _rNice,
      _rReverse,
      width_d,
      height_d,
      _rRange,
      _percentRange
    ],
    createScale$1("r")
  );
  $$unsubscribe_rScale_d = subscribe(rScale_d, (value) => $rScale_d = value);
  const rGet_d = derived([_r, rScale_d], createGetter);
  $$unsubscribe_rGet_d = subscribe(rGet_d, (value) => $rGet_d = value);
  const xDomain_d_possibly_nice = derived(xScale_d, ($xScale_d2) => $xScale_d2.domain());
  const yDomain_d_possibly_nice = derived(yScale_d, ($yScale_d2) => $yScale_d2.domain());
  const zDomain_d_possibly_nice = derived(zScale_d, ($zScale_d2) => $zScale_d2.domain());
  const rDomain_d_possibly_nice = derived(rScale_d, ($rScale_d2) => $rScale_d2.domain());
  const xRange_d = derived([xScale_d], getRange);
  $$unsubscribe_xRange_d = subscribe(xRange_d, (value) => $xRange_d = value);
  const yRange_d = derived([yScale_d], getRange);
  $$unsubscribe_yRange_d = subscribe(yRange_d, (value) => $yRange_d = value);
  const zRange_d = derived([zScale_d], getRange);
  $$unsubscribe_zRange_d = subscribe(zRange_d, (value) => $zRange_d = value);
  const rRange_d = derived([rScale_d], getRange);
  $$unsubscribe_rRange_d = subscribe(rRange_d, (value) => $rRange_d = value);
  const aspectRatio_d = derived([width_d, height_d], ([$width, $height]) => {
    return $width / $height;
  });
  $$unsubscribe_aspectRatio_d = subscribe(aspectRatio_d, (value) => $aspectRatio_d = value);
  if ($$props.ssr === void 0 && $$bindings.ssr && ssr !== void 0) $$bindings.ssr(ssr);
  if ($$props.pointerEvents === void 0 && $$bindings.pointerEvents && pointerEvents !== void 0) $$bindings.pointerEvents(pointerEvents);
  if ($$props.position === void 0 && $$bindings.position && position !== void 0) $$bindings.position(position);
  if ($$props.percentRange === void 0 && $$bindings.percentRange && percentRange !== void 0) $$bindings.percentRange(percentRange);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0) $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0) $$bindings.height(height);
  if ($$props.containerWidth === void 0 && $$bindings.containerWidth && containerWidth !== void 0) $$bindings.containerWidth(containerWidth);
  if ($$props.containerHeight === void 0 && $$bindings.containerHeight && containerHeight !== void 0) $$bindings.containerHeight(containerHeight);
  if ($$props.element === void 0 && $$bindings.element && element !== void 0) $$bindings.element(element);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.z === void 0 && $$bindings.z && z !== void 0) $$bindings.z(z);
  if ($$props.r === void 0 && $$bindings.r && r !== void 0) $$bindings.r(r);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.xDomain === void 0 && $$bindings.xDomain && xDomain !== void 0) $$bindings.xDomain(xDomain);
  if ($$props.yDomain === void 0 && $$bindings.yDomain && yDomain !== void 0) $$bindings.yDomain(yDomain);
  if ($$props.zDomain === void 0 && $$bindings.zDomain && zDomain !== void 0) $$bindings.zDomain(zDomain);
  if ($$props.rDomain === void 0 && $$bindings.rDomain && rDomain !== void 0) $$bindings.rDomain(rDomain);
  if ($$props.xNice === void 0 && $$bindings.xNice && xNice !== void 0) $$bindings.xNice(xNice);
  if ($$props.yNice === void 0 && $$bindings.yNice && yNice !== void 0) $$bindings.yNice(yNice);
  if ($$props.zNice === void 0 && $$bindings.zNice && zNice !== void 0) $$bindings.zNice(zNice);
  if ($$props.rNice === void 0 && $$bindings.rNice && rNice !== void 0) $$bindings.rNice(rNice);
  if ($$props.xPadding === void 0 && $$bindings.xPadding && xPadding !== void 0) $$bindings.xPadding(xPadding);
  if ($$props.yPadding === void 0 && $$bindings.yPadding && yPadding !== void 0) $$bindings.yPadding(yPadding);
  if ($$props.zPadding === void 0 && $$bindings.zPadding && zPadding !== void 0) $$bindings.zPadding(zPadding);
  if ($$props.rPadding === void 0 && $$bindings.rPadding && rPadding !== void 0) $$bindings.rPadding(rPadding);
  if ($$props.xScale === void 0 && $$bindings.xScale && xScale !== void 0) $$bindings.xScale(xScale);
  if ($$props.yScale === void 0 && $$bindings.yScale && yScale !== void 0) $$bindings.yScale(yScale);
  if ($$props.zScale === void 0 && $$bindings.zScale && zScale !== void 0) $$bindings.zScale(zScale);
  if ($$props.rScale === void 0 && $$bindings.rScale && rScale !== void 0) $$bindings.rScale(rScale);
  if ($$props.xRange === void 0 && $$bindings.xRange && xRange !== void 0) $$bindings.xRange(xRange);
  if ($$props.yRange === void 0 && $$bindings.yRange && yRange !== void 0) $$bindings.yRange(yRange);
  if ($$props.zRange === void 0 && $$bindings.zRange && zRange !== void 0) $$bindings.zRange(zRange);
  if ($$props.rRange === void 0 && $$bindings.rRange && rRange !== void 0) $$bindings.rRange(rRange);
  if ($$props.xReverse === void 0 && $$bindings.xReverse && xReverse !== void 0) $$bindings.xReverse(xReverse);
  if ($$props.yReverse === void 0 && $$bindings.yReverse && yReverse !== void 0) $$bindings.yReverse(yReverse);
  if ($$props.zReverse === void 0 && $$bindings.zReverse && zReverse !== void 0) $$bindings.zReverse(zReverse);
  if ($$props.rReverse === void 0 && $$bindings.rReverse && rReverse !== void 0) $$bindings.rReverse(rReverse);
  if ($$props.xDomainSort === void 0 && $$bindings.xDomainSort && xDomainSort !== void 0) $$bindings.xDomainSort(xDomainSort);
  if ($$props.yDomainSort === void 0 && $$bindings.yDomainSort && yDomainSort !== void 0) $$bindings.yDomainSort(yDomainSort);
  if ($$props.zDomainSort === void 0 && $$bindings.zDomainSort && zDomainSort !== void 0) $$bindings.zDomainSort(zDomainSort);
  if ($$props.rDomainSort === void 0 && $$bindings.rDomainSort && rDomainSort !== void 0) $$bindings.rDomainSort(rDomainSort);
  if ($$props.padding === void 0 && $$bindings.padding && padding !== void 0) $$bindings.padding(padding);
  if ($$props.extents === void 0 && $$bindings.extents && extents !== void 0) $$bindings.extents(extents);
  if ($$props.flatData === void 0 && $$bindings.flatData && flatData !== void 0) $$bindings.flatData(flatData);
  if ($$props.custom === void 0 && $$bindings.custom && custom !== void 0) $$bindings.custom(custom);
  if ($$props.debug === void 0 && $$bindings.debug && debug !== void 0) $$bindings.debug(debug);
  if ($$props.verbose === void 0 && $$bindings.verbose && verbose !== void 0) $$bindings.verbose(verbose);
  $$result.css.add(css);
  yReverseValue = typeof yReverse === "undefined" ? typeof yScale.bandwidth === "function" ? false : true : yReverse;
  {
    if (x) config.x = x;
  }
  {
    if (y) config.y = y;
  }
  {
    if (z) config.z = z;
  }
  {
    if (r) config.r = r;
  }
  {
    if (xDomain) config.xDomain = xDomain;
  }
  {
    if (yDomain) config.yDomain = yDomain;
  }
  {
    if (zDomain) config.zDomain = zDomain;
  }
  {
    if (rDomain) config.rDomain = rDomain;
  }
  {
    if (xRange) config.xRange = xRange;
  }
  {
    if (yRange) config.yRange = yRange;
  }
  {
    if (zRange) config.zRange = zRange;
  }
  {
    if (rRange) config.rRange = rRange;
  }
  set_store_value(_percentRange, $_percentRange = percentRange, $_percentRange);
  set_store_value(_containerWidth, $_containerWidth = containerWidth, $_containerWidth);
  set_store_value(_containerHeight, $_containerHeight = containerHeight, $_containerHeight);
  set_store_value(_extents, $_extents = filterObject(extents), $_extents);
  set_store_value(_data, $_data = data, $_data);
  set_store_value(_flatData, $_flatData = flatData || data, $_flatData);
  set_store_value(_padding, $_padding = padding, $_padding);
  set_store_value(_x, $_x = makeAccessor(x), $_x);
  set_store_value(_y, $_y = makeAccessor(y), $_y);
  set_store_value(_z, $_z = makeAccessor(z), $_z);
  set_store_value(_r, $_r = makeAccessor(r), $_r);
  set_store_value(_xDomain, $_xDomain = xDomain, $_xDomain);
  set_store_value(_yDomain, $_yDomain = yDomain, $_yDomain);
  set_store_value(_zDomain, $_zDomain = zDomain, $_zDomain);
  set_store_value(_rDomain, $_rDomain = rDomain, $_rDomain);
  set_store_value(_xNice, $_xNice = xNice, $_xNice);
  set_store_value(_yNice, $_yNice = yNice, $_yNice);
  set_store_value(_zNice, $_zNice = zNice, $_zNice);
  set_store_value(_rNice, $_rNice = rNice, $_rNice);
  set_store_value(_xReverse, $_xReverse = xReverse, $_xReverse);
  set_store_value(_yReverse, $_yReverse = yReverseValue, $_yReverse);
  set_store_value(_zReverse, $_zReverse = zReverse, $_zReverse);
  set_store_value(_rReverse, $_rReverse = rReverse, $_rReverse);
  set_store_value(_xPadding, $_xPadding = xPadding, $_xPadding);
  set_store_value(_yPadding, $_yPadding = yPadding, $_yPadding);
  set_store_value(_zPadding, $_zPadding = zPadding, $_zPadding);
  set_store_value(_rPadding, $_rPadding = rPadding, $_rPadding);
  set_store_value(_xRange, $_xRange = xRange, $_xRange);
  set_store_value(_yRange, $_yRange = yRange, $_yRange);
  set_store_value(_zRange, $_zRange = zRange, $_zRange);
  set_store_value(_rRange, $_rRange = rRange, $_rRange);
  set_store_value(_xScale, $_xScale = xScale, $_xScale);
  set_store_value(_yScale, $_yScale = yScale, $_yScale);
  set_store_value(_zScale, $_zScale = zScale, $_zScale);
  set_store_value(_rScale, $_rScale = rScale, $_rScale);
  set_store_value(_custom, $_custom = custom, $_custom);
  set_store_value(_config, $_config = config, $_config);
  context = {
    activeGetters: activeGetters_d,
    width: width_d,
    height: height_d,
    percentRange: _percentRange,
    aspectRatio: aspectRatio_d,
    containerWidth: _containerWidth,
    containerHeight: _containerHeight,
    x: _x,
    y: _y,
    z: _z,
    r: _r,
    custom: _custom,
    data: _data,
    xNice: _xNice,
    yNice: _yNice,
    zNice: _zNice,
    rNice: _rNice,
    xDomainSort: _xDomainSort,
    yDomainSort: _yDomainSort,
    zDomainSort: _zDomainSort,
    rDomainSort: _rDomainSort,
    xReverse: _xReverse,
    yReverse: _yReverse,
    zReverse: _zReverse,
    rReverse: _rReverse,
    xPadding: _xPadding,
    yPadding: _yPadding,
    zPadding: _zPadding,
    rPadding: _rPadding,
    padding: padding_d,
    flatData: _flatData,
    extents: extents_d,
    xDomain: xDomain_d_possibly_nice,
    yDomain: yDomain_d_possibly_nice,
    zDomain: zDomain_d_possibly_nice,
    rDomain: rDomain_d_possibly_nice,
    xRange: xRange_d,
    yRange: yRange_d,
    zRange: zRange_d,
    rRange: rRange_d,
    config: _config,
    xScale: xScale_d,
    xGet: xGet_d,
    yScale: yScale_d,
    yGet: yGet_d,
    zScale: zScale_d,
    zGet: zGet_d,
    rScale: rScale_d,
    rGet: rGet_d
  };
  {
    setContext("LayerCake", context);
  }
  {
    if ($box_d && debug === true && (ssr === true || typeof window !== "undefined")) {
      printDebug_debounced({
        data: $_data,
        flatData: typeof flatData !== "undefined" ? $_flatData : null,
        boundingBox: $box_d,
        activeGetters: $activeGetters_d,
        x: config.x,
        y: config.y,
        z: config.z,
        r: config.r,
        xScale: $xScale_d,
        yScale: $yScale_d,
        zScale: $zScale_d,
        rScale: $rScale_d
      });
    }
  }
  $$unsubscribe_rScale_d();
  $$unsubscribe_zScale_d();
  $$unsubscribe_yScale_d();
  $$unsubscribe_xScale_d();
  $$unsubscribe_activeGetters_d();
  $$unsubscribe_box_d();
  $$unsubscribe__flatData();
  $$unsubscribe__data();
  $$unsubscribe__config();
  $$unsubscribe__custom();
  $$unsubscribe__rScale();
  $$unsubscribe__zScale();
  $$unsubscribe__yScale();
  $$unsubscribe__xScale();
  $$unsubscribe__rRange();
  $$unsubscribe__zRange();
  $$unsubscribe__yRange();
  $$unsubscribe__xRange();
  $$unsubscribe__rPadding();
  $$unsubscribe__zPadding();
  $$unsubscribe__yPadding();
  $$unsubscribe__xPadding();
  $$unsubscribe__rReverse();
  $$unsubscribe__zReverse();
  $$unsubscribe__yReverse();
  $$unsubscribe__xReverse();
  $$unsubscribe__rNice();
  $$unsubscribe__zNice();
  $$unsubscribe__yNice();
  $$unsubscribe__xNice();
  $$unsubscribe__rDomain();
  $$unsubscribe__zDomain();
  $$unsubscribe__yDomain();
  $$unsubscribe__xDomain();
  $$unsubscribe__r();
  $$unsubscribe__z();
  $$unsubscribe__y();
  $$unsubscribe__x();
  $$unsubscribe__padding();
  $$unsubscribe__extents();
  $$unsubscribe__containerHeight();
  $$unsubscribe__containerWidth();
  $$unsubscribe__percentRange();
  $$unsubscribe_width_d();
  $$unsubscribe_height_d();
  $$unsubscribe_aspectRatio_d();
  $$unsubscribe__xDomainSort();
  $$unsubscribe__yDomainSort();
  $$unsubscribe__zDomainSort();
  $$unsubscribe__rDomainSort();
  $$unsubscribe_padding_d();
  $$unsubscribe_extents_d();
  $$unsubscribe_xDomain_d();
  $$unsubscribe_yDomain_d();
  $$unsubscribe_zDomain_d();
  $$unsubscribe_rDomain_d();
  $$unsubscribe_xRange_d();
  $$unsubscribe_yRange_d();
  $$unsubscribe_zRange_d();
  $$unsubscribe_rRange_d();
  $$unsubscribe_xGet_d();
  $$unsubscribe_yGet_d();
  $$unsubscribe_zGet_d();
  $$unsubscribe_rGet_d();
  return `  ${ssr === true || typeof window !== "undefined" ? `<div class="layercake-container svelte-vhzpsp"${add_styles({
    position,
    "top": position === "absolute" ? "0" : null,
    "right": position === "absolute" ? "0" : null,
    "bottom": position === "absolute" ? "0" : null,
    "left": position === "absolute" ? "0" : null,
    "pointer-events": pointerEvents === false ? "none" : null
  })}${add_attribute("this", element, 0)}>${slots.default ? slots.default({
    element,
    width: $width_d,
    height: $height_d,
    aspectRatio: $aspectRatio_d,
    containerWidth: $_containerWidth,
    containerHeight: $_containerHeight,
    activeGetters: $activeGetters_d,
    percentRange: $_percentRange,
    x: $_x,
    y: $_y,
    z: $_z,
    r: $_r,
    custom: $_custom,
    data: $_data,
    xNice: $_xNice,
    yNice: $_yNice,
    zNice: $_zNice,
    rNice: $_rNice,
    xDomainSort: $_xDomainSort,
    yDomainSort: $_yDomainSort,
    zDomainSort: $_zDomainSort,
    rDomainSort: $_rDomainSort,
    xReverse: $_xReverse,
    yReverse: $_yReverse,
    zReverse: $_zReverse,
    rReverse: $_rReverse,
    xPadding: $_xPadding,
    yPadding: $_yPadding,
    zPadding: $_zPadding,
    rPadding: $_rPadding,
    padding: $padding_d,
    flatData: $_flatData,
    extents: $extents_d,
    xDomain: $xDomain_d,
    yDomain: $yDomain_d,
    zDomain: $zDomain_d,
    rDomain: $rDomain_d,
    xRange: $xRange_d,
    yRange: $yRange_d,
    zRange: $zRange_d,
    rRange: $rRange_d,
    config: $_config,
    xScale: $xScale_d,
    xGet: $xGet_d,
    yScale: $yScale_d,
    yGet: $yGet_d,
    zScale: $zScale_d,
    zGet: $zGet_d,
    rScale: $rScale_d,
    rGet: $rGet_d
  }) : ``}</div>` : ``}`;
});
function raise(el) {
  if (el.nextSibling) el.parentNode.appendChild(el);
}
enablePatches();
setAutoFreeze(false);
function matchMedia(queryString) {
  if (browser) {
    const query = window.matchMedia(queryString);
    return readable(query.matches, (set) => {
      const listener = (e) => set(e.matches);
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    });
  } else {
    return writable(true);
  }
}
const matchMediaWidth = (width) => matchMedia(`(min-width: ${width}px)`);
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536
};
matchMediaWidth(breakpoints.sm);
matchMediaWidth(breakpoints.md);
matchMediaWidth(breakpoints.lg);
matchMediaWidth(breakpoints.xl);
matchMediaWidth(breakpoints.xxl);
matchMedia(`screen`);
matchMedia(`print`);
matchMedia(`(prefers-color-scheme: dark)`);
matchMedia(`(prefers-color-scheme: light)`);
matchMedia(`(prefers-reduced-motion: reduce)`);
matchMedia(`(orientation: landscape)`);
matchMedia(`(orientation: portrait)`);
function uniqueStore(initialValues) {
  const store = writable(new Set(initialValues ?? []));
  return {
    ...store,
    add(value) {
      store.update((set) => {
        set.add(value);
        return set;
      });
    },
    addEach(values) {
      store.update((set) => {
        values.forEach((value) => set.add(value));
        return set;
      });
    },
    delete(value) {
      store.update((set) => {
        set.delete(value);
        return set;
      });
    },
    toggle(value) {
      store.update((set) => {
        if (set.has(value)) {
          set.delete(value);
        } else {
          set.add(value);
        }
        return set;
      });
    }
  };
}
function selectionStore(props = {}) {
  const selected = uniqueStore(props.initial ?? []);
  const all = writable(props.all ?? []);
  const single = props.single ?? false;
  const max2 = props.max;
  return derived([selected, all], ([$selected, $all]) => {
    function setSelected(values) {
      selected.update(($selected2) => {
        if (max2 == null || values.length < max2) {
          return new Set(values);
        } else {
          return $selected2;
        }
      });
    }
    function toggleSelected(value) {
      selected.update(($selected2) => {
        if ($selected2.has(value)) {
          return new Set([...$selected2].filter((v) => v != value));
        } else if (single) {
          return /* @__PURE__ */ new Set([value]);
        } else {
          if (max2 == null || $selected2.size < max2) {
            return $selected2.add(value);
          } else {
            return $selected2;
          }
        }
      });
    }
    function toggleAll() {
      let values;
      if (isAllSelected()) {
        values = [...$selected].filter((v) => !$all.includes(v));
      } else {
        values = [...$selected, ...$all];
      }
      selected.set(new Set(values));
    }
    function isSelected(value) {
      return $selected.has(value);
    }
    function isAllSelected() {
      return $all.every((v) => $selected.has(v));
    }
    function isAnySelected() {
      return $all.some((v) => $selected.has(v));
    }
    function isMaxSelected() {
      return max2 != null ? $selected.size >= max2 : false;
    }
    function isDisabled(value) {
      return !isSelected(value) && isMaxSelected();
    }
    function clear() {
      selected.set(/* @__PURE__ */ new Set());
    }
    function reset() {
      selected.set(new Set(props.initial ?? []));
    }
    const selectedArr = [...$selected.values()];
    return {
      selected: single ? selectedArr[0] ?? null : selectedArr,
      setSelected,
      toggleSelected,
      isSelected,
      isDisabled,
      toggleAll,
      isAllSelected,
      isAnySelected,
      isMaxSelected,
      clear,
      reset,
      all
    };
  });
}
function is_date(obj) {
  return Object.prototype.toString.call(obj) === "[object Date]";
}
function tick_spring(ctx, last_value, current_value, target_value) {
  if (typeof current_value === "number" || is_date(current_value)) {
    const delta = target_value - current_value;
    const velocity = (current_value - last_value) / (ctx.dt || 1 / 60);
    const spring2 = ctx.opts.stiffness * delta;
    const damper = ctx.opts.damping * velocity;
    const acceleration = (spring2 - damper) * ctx.inv_mass;
    const d = (velocity + acceleration) * ctx.dt;
    if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
      return target_value;
    } else {
      ctx.settled = false;
      return is_date(current_value) ? new Date(current_value.getTime() + d) : current_value + d;
    }
  } else if (Array.isArray(current_value)) {
    return current_value.map(
      (_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i])
    );
  } else if (typeof current_value === "object") {
    const next_value = {};
    for (const k in current_value) {
      next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
    }
    return next_value;
  } else {
    throw new Error(`Cannot spring ${typeof current_value} values`);
  }
}
function spring(value, opts = {}) {
  const store = writable(value);
  const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
  let last_time;
  let task;
  let current_token;
  let last_value = value;
  let target_value = value;
  let inv_mass = 1;
  let inv_mass_recovery_rate = 0;
  let cancel_task = false;
  function set(new_value, opts2 = {}) {
    target_value = new_value;
    const token = current_token = {};
    if (value == null || opts2.hard || spring2.stiffness >= 1 && spring2.damping >= 1) {
      cancel_task = true;
      last_time = now();
      last_value = new_value;
      store.set(value = target_value);
      return Promise.resolve();
    } else if (opts2.soft) {
      const rate = opts2.soft === true ? 0.5 : +opts2.soft;
      inv_mass_recovery_rate = 1 / (rate * 60);
      inv_mass = 0;
    }
    if (!task) {
      last_time = now();
      cancel_task = false;
      task = loop((now2) => {
        if (cancel_task) {
          cancel_task = false;
          task = null;
          return false;
        }
        inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
        const ctx = {
          inv_mass,
          opts: spring2,
          settled: true,
          dt: (now2 - last_time) * 60 / 1e3
        };
        const next_value = tick_spring(ctx, last_value, value, target_value);
        last_time = now2;
        last_value = value;
        store.set(value = next_value);
        if (ctx.settled) {
          task = null;
        }
        return !ctx.settled;
      });
    }
    return new Promise((fulfil) => {
      task.promise.then(() => {
        if (token === current_token) fulfil();
      });
    });
  }
  const spring2 = {
    set,
    update: (fn, opts2) => set(fn(target_value, value), opts2),
    subscribe: store.subscribe,
    stiffness,
    damping,
    precision
  };
  return spring2;
}
function cubicInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 0.5 * Math.pow(2 * t - 2, 3) + 1;
}
function cubicIn(t) {
  return t * t * t;
}
function get_interpolator(a, b) {
  if (a === b || a !== a) return () => a;
  const type = typeof a;
  if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
    throw new Error("Cannot interpolate values of different type");
  }
  if (Array.isArray(a)) {
    const arr = b.map((bi, i) => {
      return get_interpolator(a[i], bi);
    });
    return (t) => arr.map((fn) => fn(t));
  }
  if (type === "object") {
    if (!a || !b) throw new Error("Object cannot be null");
    if (is_date(a) && is_date(b)) {
      a = a.getTime();
      b = b.getTime();
      const delta = b - a;
      return (t) => new Date(a + t * delta);
    }
    const keys = Object.keys(b);
    const interpolators = {};
    keys.forEach((key) => {
      interpolators[key] = get_interpolator(a[key], b[key]);
    });
    return (t) => {
      const result = {};
      keys.forEach((key) => {
        result[key] = interpolators[key](t);
      });
      return result;
    };
  }
  if (type === "number") {
    const delta = b - a;
    return (t) => a + t * delta;
  }
  throw new Error(`Cannot interpolate ${type} values`);
}
function tweened(value, defaults = {}) {
  const store = writable(value);
  let task;
  let target_value = value;
  function set(new_value, opts) {
    if (value == null) {
      store.set(value = new_value);
      return Promise.resolve();
    }
    target_value = new_value;
    let previous_task = task;
    let started = false;
    let {
      delay = 0,
      duration = 400,
      easing = identity$1,
      interpolate: interpolate2 = get_interpolator
    } = assign(assign({}, defaults), opts);
    if (duration === 0) {
      if (previous_task) {
        previous_task.abort();
        previous_task = null;
      }
      store.set(value = target_value);
      return Promise.resolve();
    }
    const start = now() + delay;
    let fn;
    task = loop((now2) => {
      if (now2 < start) return true;
      if (!started) {
        fn = interpolate2(value, new_value);
        if (typeof duration === "function") duration = duration(value, new_value);
        started = true;
      }
      if (previous_task) {
        previous_task.abort();
        previous_task = null;
      }
      const elapsed = now2 - start;
      if (elapsed > /** @type {number} */
      duration) {
        store.set(value = new_value);
        return false;
      }
      store.set(value = fn(easing(elapsed / duration)));
      return true;
    });
    return task.promise;
  }
  return {
    set,
    update: (fn, opts) => set(fn(target_value, value), opts),
    subscribe: store.subscribe
  };
}
function motionStore(value, options) {
  if (options.spring) {
    return spring(value, options.spring === true ? void 0 : options.spring);
  } else if (options.tweened) {
    return tweened(value, options.tweened === true ? void 0 : options.tweened);
  } else {
    return writable(value);
  }
}
function resolveOptions(prop, options) {
  return {
    spring: typeof options.spring === "boolean" || options.spring == null ? options.spring : prop in options.spring ? (
      //@ts-expect-error
      options.spring[prop]
    ) : Object.keys(options.spring).some((key) => ["precision", "damping", "stiffness"].includes(key)) ? options.tweened : false,
    tweened: typeof options.tweened === "boolean" || options.tweened == null ? options.tweened : prop in options.tweened ? (
      //@ts-expect-error
      options.tweened[prop]
    ) : Object.keys(options.tweened).some((key) => ["delay", "duration", "easing"].includes(key)) ? options.tweened : false
  };
}
function motionFinishHandler() {
  let latestIndex = 0;
  const moving = writable(false);
  const handle = function(promise) {
    latestIndex += 1;
    if (!promise) {
      moving.set(false);
      return;
    }
    let thisIndex = latestIndex;
    moving.set(true);
    promise.then(() => {
      if (thisIndex === latestIndex) {
        moving.set(false);
      }
    });
  };
  return {
    subscribe: moving.subscribe,
    handle
  };
}
function scaleBandInvert(scale) {
  const domain = scale.domain();
  const eachBand = scale.step();
  const paddingOuter = eachBand * (scale.paddingOuter?.() ?? scale.padding());
  return function(value) {
    const index = Math.floor((value - paddingOuter / 2) / eachBand);
    return domain[Math.max(0, Math.min(index, domain.length - 1))];
  };
}
function isScaleBand(scale) {
  return typeof scale.bandwidth === "function";
}
function scaleInvert(scale, value) {
  if (isScaleBand(scale)) {
    return scaleBandInvert(scale)(value);
  } else {
    return scale.invert?.(value);
  }
}
function createScale(scale, domain, range2, context) {
  const scaleCopy = scale.copy();
  if (domain) {
    scaleCopy.domain(domain);
  }
  if (typeof range2 === "function") {
    scaleCopy.range(range2(context));
  } else {
    scaleCopy.range(range2);
  }
  return scaleCopy;
}
function accessor(prop) {
  if (Array.isArray(prop)) {
    return (d) => prop.map((p) => accessor(p)(d));
  } else if (typeof prop === "function") {
    return prop;
  } else if (typeof prop === "string" || typeof prop === "number") {
    return (d) => get(d, prop);
  } else {
    return (d) => d;
  }
}
function chartDataArray(data) {
  if (data == null) {
    return [];
  } else if (Array.isArray(data)) {
    return data;
  } else if ("nodes" in data) {
    return data.nodes;
  } else {
    return data.descendants();
  }
}
function defaultChartPadding(axis, legend) {
  if (axis === false) {
    return void 0;
  } else {
    return {
      top: axis === true || axis === "y" ? 4 : 0,
      left: axis === true || axis === "y" ? 20 : 0,
      bottom: (axis === true || axis === "x" ? 20 : 0) + (legend === true ? 32 : 0),
      right: axis === true || axis === "x" ? 4 : 0
    };
  }
}
function findRelatedData(data, original, accessor2) {
  return data.find((d) => {
    return accessor2(d)?.valueOf() === accessor2(original)?.valueOf();
  });
}
const chartContextKey = Symbol();
function chartContext() {
  return getContext(chartContextKey);
}
function setChartContext(context) {
  setContext(chartContextKey, context);
}
const ChartContext = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let addtConfig;
  let $$unsubscribe_containerHeight;
  let $$unsubscribe_containerWidth;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $_addtConfig, $$unsubscribe__addtConfig;
  let $_radial, $$unsubscribe__radial;
  let $_c, $$unsubscribe__c;
  let $_cScale, $$unsubscribe__cScale;
  let $_cGet, $$unsubscribe__cGet;
  let $_cDomain, $$unsubscribe__cDomain;
  let $_cRange, $$unsubscribe__cRange;
  let $contextData, $$unsubscribe_contextData;
  let $_y1, $$unsubscribe__y1;
  let $_y1Scale, $$unsubscribe__y1Scale;
  let $_y1Get, $$unsubscribe__y1Get;
  let $yScale, $$unsubscribe_yScale;
  let $_y1Domain, $$unsubscribe__y1Domain;
  let $_y1Range, $$unsubscribe__y1Range;
  let $_x1, $$unsubscribe__x1;
  let $_x1Scale, $$unsubscribe__x1Scale;
  let $_x1Get, $$unsubscribe__x1Get;
  let $_x1Range, $$unsubscribe__x1Range;
  let $xScale, $$unsubscribe_xScale;
  let $_x1Domain, $$unsubscribe__x1Domain;
  let $config, $$unsubscribe_config;
  let { x1 = void 0 } = $$props;
  let { x1Scale = void 0 } = $$props;
  let { x1Domain = void 0 } = $$props;
  let { x1Range = void 0 } = $$props;
  let { y1 = void 0 } = $$props;
  let { y1Scale = void 0 } = $$props;
  let { y1Domain = void 0 } = $$props;
  let { y1Range = void 0 } = $$props;
  let { c = void 0 } = $$props;
  let { cScale = void 0 } = $$props;
  let { cDomain = void 0 } = $$props;
  let { cRange = void 0 } = $$props;
  const layerCakeContext = getContext("LayerCake");
  const { data: contextData, width, height, containerWidth, containerHeight, xScale, yScale } = layerCakeContext;
  $$unsubscribe_contextData = subscribe(contextData, (value) => $contextData = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_containerWidth = subscribe(containerWidth, (value) => value);
  $$unsubscribe_containerHeight = subscribe(containerHeight, (value) => value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  const _x1 = writable(accessor(x1));
  $$unsubscribe__x1 = subscribe(_x1, (value) => $_x1 = value);
  const _x1Scale = writable(null);
  $$unsubscribe__x1Scale = subscribe(_x1Scale, (value) => $_x1Scale = value);
  const _x1Domain = writable(x1Domain);
  $$unsubscribe__x1Domain = subscribe(_x1Domain, (value) => $_x1Domain = value);
  const _x1Range = writable(x1Range);
  $$unsubscribe__x1Range = subscribe(_x1Range, (value) => $_x1Range = value);
  const _x1Get = writable();
  $$unsubscribe__x1Get = subscribe(_x1Get, (value) => $_x1Get = value);
  const _y1 = writable(accessor(y1));
  $$unsubscribe__y1 = subscribe(_y1, (value) => $_y1 = value);
  const _y1Scale = writable(null);
  $$unsubscribe__y1Scale = subscribe(_y1Scale, (value) => $_y1Scale = value);
  const _y1Domain = writable(y1Domain);
  $$unsubscribe__y1Domain = subscribe(_y1Domain, (value) => $_y1Domain = value);
  const _y1Range = writable(y1Range);
  $$unsubscribe__y1Range = subscribe(_y1Range, (value) => $_y1Range = value);
  const _y1Get = writable();
  $$unsubscribe__y1Get = subscribe(_y1Get, (value) => $_y1Get = value);
  const _c = writable(accessor(c));
  $$unsubscribe__c = subscribe(_c, (value) => $_c = value);
  const _cScale = writable(scaleOrdinal());
  $$unsubscribe__cScale = subscribe(_cScale, (value) => $_cScale = value);
  const _cDomain = writable(cDomain);
  $$unsubscribe__cDomain = subscribe(_cDomain, (value) => $_cDomain = value);
  const _cRange = writable(cRange);
  $$unsubscribe__cRange = subscribe(_cRange, (value) => $_cRange = value);
  const _cGet = writable();
  $$unsubscribe__cGet = subscribe(_cGet, (value) => $_cGet = value);
  let { radial = false } = $$props;
  const _radial = writable(radial);
  $$unsubscribe__radial = subscribe(_radial, (value) => $_radial = value);
  const _addtConfig = writable(addtConfig);
  $$unsubscribe__addtConfig = subscribe(_addtConfig, (value) => $_addtConfig = value);
  const config = derived([layerCakeContext.config, _addtConfig], ([$config2, $addtConfig]) => {
    return { ...$config2, ...$addtConfig };
  });
  $$unsubscribe_config = subscribe(config, (value) => $config = value);
  const chartContext2 = {
    ...layerCakeContext,
    x1: _x1,
    x1Domain: _x1Domain,
    x1Range: _x1Range,
    x1Scale: _x1Scale,
    x1Get: _x1Get,
    y1: _y1,
    y1Domain: _y1Domain,
    y1Range: _y1Range,
    y1Scale: _y1Scale,
    y1Get: _y1Get,
    c: _c,
    cDomain: _cDomain,
    cRange: _cRange,
    cScale: _cScale,
    cGet: _cGet,
    config,
    radial: _radial
  };
  setChartContext(chartContext2);
  let { onresize = void 0 } = $$props;
  let { data = [] } = $$props;
  if ($$props.x1 === void 0 && $$bindings.x1 && x1 !== void 0) $$bindings.x1(x1);
  if ($$props.x1Scale === void 0 && $$bindings.x1Scale && x1Scale !== void 0) $$bindings.x1Scale(x1Scale);
  if ($$props.x1Domain === void 0 && $$bindings.x1Domain && x1Domain !== void 0) $$bindings.x1Domain(x1Domain);
  if ($$props.x1Range === void 0 && $$bindings.x1Range && x1Range !== void 0) $$bindings.x1Range(x1Range);
  if ($$props.y1 === void 0 && $$bindings.y1 && y1 !== void 0) $$bindings.y1(y1);
  if ($$props.y1Scale === void 0 && $$bindings.y1Scale && y1Scale !== void 0) $$bindings.y1Scale(y1Scale);
  if ($$props.y1Domain === void 0 && $$bindings.y1Domain && y1Domain !== void 0) $$bindings.y1Domain(y1Domain);
  if ($$props.y1Range === void 0 && $$bindings.y1Range && y1Range !== void 0) $$bindings.y1Range(y1Range);
  if ($$props.c === void 0 && $$bindings.c && c !== void 0) $$bindings.c(c);
  if ($$props.cScale === void 0 && $$bindings.cScale && cScale !== void 0) $$bindings.cScale(cScale);
  if ($$props.cDomain === void 0 && $$bindings.cDomain && cDomain !== void 0) $$bindings.cDomain(cDomain);
  if ($$props.cRange === void 0 && $$bindings.cRange && cRange !== void 0) $$bindings.cRange(cRange);
  if ($$props.radial === void 0 && $$bindings.radial && radial !== void 0) $$bindings.radial(radial);
  if ($$props.onresize === void 0 && $$bindings.onresize && onresize !== void 0) $$bindings.onresize(onresize);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  set_store_value(_x1, $_x1 = accessor(x1), $_x1);
  set_store_value(_x1Domain, $_x1Domain = x1Domain ?? extent(chartDataArray($contextData), $_x1), $_x1Domain);
  set_store_value(
    _x1Scale,
    $_x1Scale = x1Scale && x1Range ? createScale(x1Scale, $_x1Domain, x1Range, { xScale: $xScale, $width, $height }) : null,
    $_x1Scale
  );
  set_store_value(_x1Range, $_x1Range = x1Range, $_x1Range);
  set_store_value(_x1Get, $_x1Get = (d) => $_x1Scale?.($_x1(d)), $_x1Get);
  set_store_value(_y1, $_y1 = accessor(y1), $_y1);
  set_store_value(_y1Domain, $_y1Domain = y1Domain ?? extent(chartDataArray($contextData), $_y1), $_y1Domain);
  set_store_value(_y1Range, $_y1Range = y1Range, $_y1Range);
  set_store_value(
    _y1Scale,
    $_y1Scale = y1Scale && y1Range ? createScale(y1Scale, $_y1Domain, y1Range, { yScale: $yScale, $width, $height }) : null,
    $_y1Scale
  );
  set_store_value(_y1Get, $_y1Get = (d) => $_y1Scale?.($_y1(d)), $_y1Get);
  set_store_value(_c, $_c = accessor(c), $_c);
  set_store_value(_cDomain, $_cDomain = cDomain ?? unique(chartDataArray($contextData).map($_c)), $_cDomain);
  set_store_value(_cRange, $_cRange = cRange, $_cRange);
  set_store_value(
    _cScale,
    $_cScale = cRange ? createScale(cScale ?? scaleOrdinal(), $_cDomain, cRange, { $width, $height }) : null,
    $_cScale
  );
  set_store_value(_cGet, $_cGet = (d) => $_cScale?.($_c(d)), $_cGet);
  set_store_value(_radial, $_radial = radial, $_radial);
  addtConfig = {
    ...x1 && { x1 },
    ...x1Domain && { x1Domain },
    ...x1Range && { x1Range },
    ...x1Scale && { x1Scale },
    ...y1 && { y1 },
    ...y1Domain && { y1Domain },
    ...y1Range && { y1Range },
    ...y1Scale && { y1Scale },
    ...c && { c },
    ...cDomain && { cDomain },
    ...cRange && { cRange },
    ...cScale && { cScale }
  };
  set_store_value(_addtConfig, $_addtConfig = addtConfig, $_addtConfig);
  $$unsubscribe_containerHeight();
  $$unsubscribe_containerWidth();
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe__addtConfig();
  $$unsubscribe__radial();
  $$unsubscribe__c();
  $$unsubscribe__cScale();
  $$unsubscribe__cGet();
  $$unsubscribe__cDomain();
  $$unsubscribe__cRange();
  $$unsubscribe_contextData();
  $$unsubscribe__y1();
  $$unsubscribe__y1Scale();
  $$unsubscribe__y1Get();
  $$unsubscribe_yScale();
  $$unsubscribe__y1Domain();
  $$unsubscribe__y1Range();
  $$unsubscribe__x1();
  $$unsubscribe__x1Scale();
  $$unsubscribe__x1Get();
  $$unsubscribe__x1Range();
  $$unsubscribe_xScale();
  $$unsubscribe__x1Domain();
  $$unsubscribe_config();
  return `   ${slots.default ? slots.default({
    data,
    flatData: chartContext2.data,
    config: $config,
    x1: $_x1,
    x1Scale: $_x1Scale,
    x1Get: $_x1Get,
    y1: $_y1,
    y1Scale: $_y1Scale,
    y1Get: $_y1Get,
    c: $_c,
    cScale: $_cScale,
    cGet: $_cGet
  }) : ``}`;
});
const transformContextKey = Symbol();
const defaultTranslate = writable({ x: 0, y: 0 });
const defaultScale = writable(1);
const defaultContext$1 = {
  mode: "none",
  scale: defaultScale,
  setScale: defaultScale.set,
  translate: defaultTranslate,
  setTranslate: defaultTranslate.set,
  moving: writable(false),
  dragging: writable(false),
  scrollMode: writable("none"),
  setScrollMode: () => {
  },
  reset: () => {
  },
  zoomIn: () => {
  },
  zoomOut: () => {
  },
  translateCenter: () => {
  },
  zoomTo: () => {
  }
};
function transformContext() {
  return getContext(transformContextKey) ?? defaultContext$1;
}
function setTransformContext(transform) {
  setContext(transformContextKey, transform);
}
const DEFAULT_SCALE = 1;
const TransformContext = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let center;
  let $translate, $$unsubscribe_translate;
  let $scale, $$unsubscribe_scale;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $padding, $$unsubscribe_padding;
  let $scrollMode, $$unsubscribe_scrollMode;
  let $$unsubscribe_dragging;
  const { width, height, padding } = chartContext();
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  let { mode = "none" } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let { processTranslate = (x, y, deltaX, deltaY) => {
    return { x: x + deltaX, y: y + deltaY };
  } } = $$props;
  let { disablePointer = false } = $$props;
  let { initialScrollMode = "none" } = $$props;
  let { clickDistance = 10 } = $$props;
  let { ondragstart = void 0 } = $$props;
  let { ondragend = void 0 } = $$props;
  let { ontransform = void 0 } = $$props;
  const dragging = writable(false);
  $$unsubscribe_dragging = subscribe(dragging, (value) => value);
  const scrollMode = writable(initialScrollMode);
  $$unsubscribe_scrollMode = subscribe(scrollMode, (value) => $scrollMode = value);
  const DEFAULT_TRANSLATE = { x: 0, y: 0 };
  let { initialTranslate = void 0 } = $$props;
  const translate = motionStore(initialTranslate ?? DEFAULT_TRANSLATE, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_translate = subscribe(translate, (value) => $translate = value);
  let { initialScale = void 0 } = $$props;
  const scale = motionStore(initialScale ?? DEFAULT_SCALE, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_scale = subscribe(scale, (value) => $scale = value);
  function setScrollMode(mode2) {
    set_store_value(scrollMode, $scrollMode = mode2, $scrollMode);
  }
  function reset() {
    set_store_value(translate, $translate = initialTranslate ?? DEFAULT_TRANSLATE, $translate);
    set_store_value(scale, $scale = initialScale ?? DEFAULT_SCALE, $scale);
  }
  function zoomIn() {
    scaleTo(1.25, {
      x: ($width + $padding.left) / 2,
      y: ($height + $padding.top) / 2
    });
  }
  function zoomOut() {
    scaleTo(0.8, {
      x: ($width + $padding.left) / 2,
      y: ($height + $padding.top) / 2
    });
  }
  function translateCenter() {
    set_store_value(translate, $translate = { x: 0, y: 0 }, $translate);
  }
  function zoomTo(center2, rect) {
    const newScale = rect ? $width < $height ? $width / rect.width : $height / rect.height : 1;
    set_store_value(
      translate,
      $translate = {
        x: $width / 2 - center2.x * newScale,
        y: $height / 2 - center2.y * newScale
      },
      $translate
    );
    if (rect) {
      set_store_value(scale, $scale = newScale, $scale);
    }
  }
  function scaleTo(value, point, options = void 0) {
    const currentScale = $scale;
    const newScale = $scale * value;
    setScale(newScale, options);
    const invertTransformPoint = {
      x: (point.x - $padding.left - $translate.x) / currentScale,
      y: (point.y - $padding.top - $translate.y) / currentScale
    };
    const newTranslate = {
      x: point.x - $padding.left - invertTransformPoint.x * newScale,
      y: point.y - $padding.top - invertTransformPoint.y * newScale
    };
    setTranslate(newTranslate, options);
  }
  const translating = motionFinishHandler();
  const scaling = motionFinishHandler();
  const moving = derived([dragging, translating, scaling], ([dragging2, translating2, scaling2]) => dragging2 || translating2 || scaling2);
  function setTranslate(point, options) {
    translating.handle(translate.set(point, options));
  }
  function setScale(value, options) {
    scaling.handle(scale.set(value, options));
  }
  setTransformContext({
    mode,
    scale,
    setScale,
    translate,
    setTranslate,
    dragging,
    moving,
    reset,
    zoomIn,
    zoomOut,
    translateCenter,
    zoomTo,
    scrollMode,
    setScrollMode
  });
  if ($$props.mode === void 0 && $$bindings.mode && mode !== void 0) $$bindings.mode(mode);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  if ($$props.processTranslate === void 0 && $$bindings.processTranslate && processTranslate !== void 0) $$bindings.processTranslate(processTranslate);
  if ($$props.disablePointer === void 0 && $$bindings.disablePointer && disablePointer !== void 0) $$bindings.disablePointer(disablePointer);
  if ($$props.initialScrollMode === void 0 && $$bindings.initialScrollMode && initialScrollMode !== void 0) $$bindings.initialScrollMode(initialScrollMode);
  if ($$props.clickDistance === void 0 && $$bindings.clickDistance && clickDistance !== void 0) $$bindings.clickDistance(clickDistance);
  if ($$props.ondragstart === void 0 && $$bindings.ondragstart && ondragstart !== void 0) $$bindings.ondragstart(ondragstart);
  if ($$props.ondragend === void 0 && $$bindings.ondragend && ondragend !== void 0) $$bindings.ondragend(ondragend);
  if ($$props.ontransform === void 0 && $$bindings.ontransform && ontransform !== void 0) $$bindings.ontransform(ontransform);
  if ($$props.initialTranslate === void 0 && $$bindings.initialTranslate && initialTranslate !== void 0) $$bindings.initialTranslate(initialTranslate);
  if ($$props.translate === void 0 && $$bindings.translate && translate !== void 0) $$bindings.translate(translate);
  if ($$props.initialScale === void 0 && $$bindings.initialScale && initialScale !== void 0) $$bindings.initialScale(initialScale);
  if ($$props.scale === void 0 && $$bindings.scale && scale !== void 0) $$bindings.scale(scale);
  if ($$props.setScrollMode === void 0 && $$bindings.setScrollMode && setScrollMode !== void 0) $$bindings.setScrollMode(setScrollMode);
  if ($$props.reset === void 0 && $$bindings.reset && reset !== void 0) $$bindings.reset(reset);
  if ($$props.zoomIn === void 0 && $$bindings.zoomIn && zoomIn !== void 0) $$bindings.zoomIn(zoomIn);
  if ($$props.zoomOut === void 0 && $$bindings.zoomOut && zoomOut !== void 0) $$bindings.zoomOut(zoomOut);
  if ($$props.translateCenter === void 0 && $$bindings.translateCenter && translateCenter !== void 0) $$bindings.translateCenter(translateCenter);
  if ($$props.zoomTo === void 0 && $$bindings.zoomTo && zoomTo !== void 0) $$bindings.zoomTo(zoomTo);
  if ($$props.setTranslate === void 0 && $$bindings.setTranslate && setTranslate !== void 0) $$bindings.setTranslate(setTranslate);
  if ($$props.setScale === void 0 && $$bindings.setScale && setScale !== void 0) $$bindings.setScale(setScale);
  center = { x: $width / 2, y: $height / 2 };
  ({
    x: center.x - $translate.x,
    y: center.y - $translate.y
  });
  {
    ontransform?.({ scale: $scale, translate: $translate });
  }
  $$unsubscribe_translate();
  $$unsubscribe_scale();
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_padding();
  $$unsubscribe_scrollMode();
  $$unsubscribe_dragging();
  return ` <div class="h-full">${slots.default ? slots.default({
    transform: {
      scale: $scale,
      setScale,
      translate: $translate,
      setTranslate,
      zoomTo,
      reset
    }
  }) : ``}</div>`;
});
const geoContextKey = Symbol();
function geoContext() {
  return getContext(geoContextKey);
}
function setGeoContext(geo) {
  setContext(geoContextKey, geo);
}
const GeoContext = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let fitSizeRange;
  let $transformTranslate, $$unsubscribe_transformTranslate;
  let $transformScale, $$unsubscribe_transformScale;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $geo, $$unsubscribe_geo;
  const { width, height } = chartContext();
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  let { projection = void 0 } = $$props;
  let { fitGeojson = void 0 } = $$props;
  let { fixedAspectRatio = void 0 } = $$props;
  let { clipAngle = void 0 } = $$props;
  let { clipExtent = void 0 } = $$props;
  let { rotate = void 0 } = $$props;
  let { scale = void 0 } = $$props;
  let { translate = void 0 } = $$props;
  let { center = void 0 } = $$props;
  let { applyTransform = [] } = $$props;
  let { reflectX = void 0 } = $$props;
  let { reflectY = void 0 } = $$props;
  let { geo = writable(projection?.()) } = $$props;
  $$unsubscribe_geo = subscribe(geo, (value) => $geo = value);
  setGeoContext(geo);
  const { scale: transformScale, translate: transformTranslate } = transformContext();
  $$unsubscribe_transformScale = subscribe(transformScale, (value) => $transformScale = value);
  $$unsubscribe_transformTranslate = subscribe(transformTranslate, (value) => $transformTranslate = value);
  if ($$props.projection === void 0 && $$bindings.projection && projection !== void 0) $$bindings.projection(projection);
  if ($$props.fitGeojson === void 0 && $$bindings.fitGeojson && fitGeojson !== void 0) $$bindings.fitGeojson(fitGeojson);
  if ($$props.fixedAspectRatio === void 0 && $$bindings.fixedAspectRatio && fixedAspectRatio !== void 0) $$bindings.fixedAspectRatio(fixedAspectRatio);
  if ($$props.clipAngle === void 0 && $$bindings.clipAngle && clipAngle !== void 0) $$bindings.clipAngle(clipAngle);
  if ($$props.clipExtent === void 0 && $$bindings.clipExtent && clipExtent !== void 0) $$bindings.clipExtent(clipExtent);
  if ($$props.rotate === void 0 && $$bindings.rotate && rotate !== void 0) $$bindings.rotate(rotate);
  if ($$props.scale === void 0 && $$bindings.scale && scale !== void 0) $$bindings.scale(scale);
  if ($$props.translate === void 0 && $$bindings.translate && translate !== void 0) $$bindings.translate(translate);
  if ($$props.center === void 0 && $$bindings.center && center !== void 0) $$bindings.center(center);
  if ($$props.applyTransform === void 0 && $$bindings.applyTransform && applyTransform !== void 0) $$bindings.applyTransform(applyTransform);
  if ($$props.reflectX === void 0 && $$bindings.reflectX && reflectX !== void 0) $$bindings.reflectX(reflectX);
  if ($$props.reflectY === void 0 && $$bindings.reflectY && reflectY !== void 0) $$bindings.reflectY(reflectY);
  if ($$props.geo === void 0 && $$bindings.geo && geo !== void 0) $$bindings.geo(geo);
  fitSizeRange = fixedAspectRatio ? [100, 100 / fixedAspectRatio] : [$width, $height];
  {
    if (projection) {
      const _projection = projection();
      if (fitGeojson && "fitSize" in _projection) {
        _projection.fitSize(fitSizeRange, fitGeojson);
      }
      if ("scale" in _projection) {
        if (scale) {
          _projection.scale(scale);
        }
        if (applyTransform.includes("scale")) {
          _projection.scale($transformScale);
        }
      }
      if ("rotate" in _projection) {
        if (rotate) {
          _projection.rotate([rotate.yaw, rotate.pitch, rotate.roll]);
        }
        if (applyTransform.includes("rotate")) {
          _projection.rotate([
            $transformTranslate.x,
            // yaw
            $transformTranslate.y
          ]);
        }
      }
      if ("translate" in _projection) {
        if (translate) {
          _projection.translate(translate);
        }
        if (applyTransform.includes("translate")) {
          _projection.translate([$transformTranslate.x, $transformTranslate.y]);
        }
      }
      if (center && "center" in _projection) {
        _projection.center(center);
      }
      if (reflectX) {
        _projection.reflectX(reflectX);
      }
      if (reflectY) {
        _projection.reflectY(reflectY);
      }
      if (clipAngle && "clipAngle" in _projection) {
        _projection.clipAngle(clipAngle);
      }
      if (clipExtent && "clipExtent" in _projection) {
        _projection.clipExtent(clipExtent);
      }
      geo.set(_projection);
    }
  }
  $$unsubscribe_transformTranslate();
  $$unsubscribe_transformScale();
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_geo();
  return `${slots.default ? slots.default({ projection: $geo }) : ``}`;
});
const Svg = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $scale, $$unsubscribe_scale;
  let $translate, $$unsubscribe_translate;
  let $containerWidth, $$unsubscribe_containerWidth;
  let $containerHeight, $$unsubscribe_containerHeight;
  let $padding, $$unsubscribe_padding;
  let { element = void 0 } = $$props;
  let { innerElement = void 0 } = $$props;
  let { zIndex = void 0 } = $$props;
  let { pointerEvents = void 0 } = $$props;
  let { viewBox = void 0 } = $$props;
  let { label = void 0 } = $$props;
  let { labelledBy = void 0 } = $$props;
  let { describedBy = void 0 } = $$props;
  let { title = void 0 } = $$props;
  let { center = false } = $$props;
  let { ignoreTransform = false } = $$props;
  const { containerWidth, containerHeight, width, height, padding } = chartContext();
  $$unsubscribe_containerWidth = subscribe(containerWidth, (value) => $containerWidth = value);
  $$unsubscribe_containerHeight = subscribe(containerHeight, (value) => $containerHeight = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  const { mode, scale, translate } = transformContext();
  $$unsubscribe_scale = subscribe(scale, (value) => $scale = value);
  $$unsubscribe_translate = subscribe(translate, (value) => $translate = value);
  let transform = "";
  setRenderContext("svg");
  if ($$props.element === void 0 && $$bindings.element && element !== void 0) $$bindings.element(element);
  if ($$props.innerElement === void 0 && $$bindings.innerElement && innerElement !== void 0) $$bindings.innerElement(innerElement);
  if ($$props.zIndex === void 0 && $$bindings.zIndex && zIndex !== void 0) $$bindings.zIndex(zIndex);
  if ($$props.pointerEvents === void 0 && $$bindings.pointerEvents && pointerEvents !== void 0) $$bindings.pointerEvents(pointerEvents);
  if ($$props.viewBox === void 0 && $$bindings.viewBox && viewBox !== void 0) $$bindings.viewBox(viewBox);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0) $$bindings.label(label);
  if ($$props.labelledBy === void 0 && $$bindings.labelledBy && labelledBy !== void 0) $$bindings.labelledBy(labelledBy);
  if ($$props.describedBy === void 0 && $$bindings.describedBy && describedBy !== void 0) $$bindings.describedBy(describedBy);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0) $$bindings.title(title);
  if ($$props.center === void 0 && $$bindings.center && center !== void 0) $$bindings.center(center);
  if ($$props.ignoreTransform === void 0 && $$bindings.ignoreTransform && ignoreTransform !== void 0) $$bindings.ignoreTransform(ignoreTransform);
  {
    if (mode === "canvas" && !ignoreTransform) {
      transform = `translate(${$translate.x},${$translate.y}) scale(${$scale})`;
    } else if (center) {
      transform = `translate(${center === "x" || center === true ? $width / 2 : 0}, ${center === "y" || center === true ? $height / 2 : 0})`;
    }
  }
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_scale();
  $$unsubscribe_translate();
  $$unsubscribe_containerWidth();
  $$unsubscribe_containerHeight();
  $$unsubscribe_padding();
  return `  <svg${add_attribute("viewBox", viewBox, 0)}${add_attribute("width", $containerWidth, 0)}${add_attribute("height", $containerHeight, 0)}${add_attribute("class", cls("layercake-layout-svg", "absolute top-0 left-0 overflow-visible", pointerEvents === false && "pointer-events-none", $$props.class), 0)}${add_attribute("aria-label", label, 0)}${add_attribute("aria-labelledby", labelledBy, 0)}${add_attribute("aria-describedby", describedBy, 0)} role="figure"${add_styles({ "z-index": zIndex })}${add_attribute("this", element, 0)}>${slots.title ? slots.title({}) : ` ${title ? `<title>${escape(title)}</title>` : ``} `}<defs>${slots.defs ? slots.defs({}) : ``}</defs><g class="layercake-layout-svg_g" transform="${"translate(" + escape($padding.left, true) + ", " + escape($padding.top, true) + ")"}"${add_attribute("this", innerElement, 0)}>${transform ? `<g${add_attribute("transform", transform, 0)}>${slots.default ? slots.default({ element }) : ``}</g>` : `${slots.default ? slots.default({ element }) : ``}`}</g></svg>`;
});
const ClipPath = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["id", "useId", "disabled"]);
  let $$slots = compute_slots(slots);
  let { id = uniqueId("clipPath-") } = $$props;
  let { useId = void 0 } = $$props;
  let { disabled = false } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0) $$bindings.id(id);
  if ($$props.useId === void 0 && $$bindings.useId && useId !== void 0) $$bindings.useId(useId);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0) $$bindings.disabled(disabled);
  return `<defs><clipPath${spread([{ id: escape_attribute_value(id) }, escape_object($$restProps)], {})}>${slots.clip ? slots.clip({ id }) : ``}${useId ? `<use href="${"#" + escape(useId, true)}"></use>` : ``}</clipPath></defs> ${$$slots.default ? `${disabled ? `${slots.default ? slots.default({}) : ``}` : ` <g${add_styles({ "clip-path": `url(#${id})` })}>${slots.default ? slots.default({ id, url: "url(#" + id + ")", useId }) : ``}</g>`}` : ``}`;
});
const DEFAULT_FILL = "rgb(0, 0, 0)";
const CANVAS_STYLES_ELEMENT_ID = "__layerchart_canvas_styles_id";
function getComputedStyles(canvas, { styles, classes } = {}) {
  try {
    let svg = document.getElementById(CANVAS_STYLES_ELEMENT_ID);
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("id", CANVAS_STYLES_ELEMENT_ID);
      svg.style.display = "none";
      canvas.after(svg);
    }
    svg = svg;
    svg.removeAttribute("style");
    svg.removeAttribute("class");
    if (styles) {
      Object.assign(svg.style, styles);
    }
    if (classes) {
      svg.setAttribute("class", cls(classes).split(" ").filter((s) => !s.startsWith("transition-")).join(" "));
    }
    const computedStyles = window.getComputedStyle(svg);
    return computedStyles;
  } catch (e) {
    console.error("Unable to get computed styles", e);
    return {};
  }
}
function render(ctx, render2, styleOptions = {}) {
  const computedStyles = getComputedStyles(ctx.canvas, styleOptions);
  const paintOrder = computedStyles?.paintOrder === "stroke" ? ["stroke", "fill"] : ["fill", "stroke"];
  if (computedStyles?.opacity) {
    ctx.globalAlpha = Number(computedStyles?.opacity);
  }
  ctx.font = `${computedStyles.fontSize} ${computedStyles.fontFamily}`;
  if (computedStyles.textAnchor === "middle") {
    ctx.textAlign = "center";
  } else if (computedStyles.textAnchor === "end") {
    ctx.textAlign = "right";
  } else {
    ctx.textAlign = computedStyles.textAlign;
  }
  if (computedStyles.strokeDasharray.includes(",")) {
    const dashArray = computedStyles.strokeDasharray.split(",").map((s) => Number(s.replace("px", "")));
    ctx.setLineDash(dashArray);
  }
  paintOrder.forEach((attr) => {
    if (attr === "fill") {
      const fill = styleOptions.styles?.fill && (styleOptions.styles?.fill instanceof CanvasGradient || !styleOptions.styles?.fill?.includes("var")) ? styleOptions.styles.fill : computedStyles?.fill;
      if (fill && !["none", DEFAULT_FILL].includes(fill)) {
        const currentGlobalAlpha = ctx.globalAlpha;
        const fillOpacity = Number(computedStyles?.fillOpacity);
        const opacity = Number(computedStyles?.opacity);
        ctx.globalAlpha = fillOpacity * opacity;
        ctx.fillStyle = fill;
        render2.fill(ctx);
        ctx.globalAlpha = currentGlobalAlpha;
      }
    } else if (attr === "stroke") {
      const stroke = styleOptions.styles?.stroke && (styleOptions.styles?.stroke instanceof CanvasGradient || !styleOptions.styles?.stroke?.includes("var")) ? styleOptions.styles?.stroke : computedStyles?.stroke;
      if (stroke && !["none"].includes(stroke)) {
        ctx.lineWidth = typeof computedStyles?.strokeWidth === "string" ? Number(computedStyles?.strokeWidth?.replace("px", "")) : computedStyles?.strokeWidth ?? 1;
        ctx.strokeStyle = stroke;
        render2.stroke(ctx);
      }
    }
  });
}
function renderPathData(ctx, pathData, styleOptions = {}) {
  const path2 = new Path2D(pathData ?? "");
  render(ctx, {
    fill: (ctx2) => ctx2.fill(path2),
    stroke: (ctx2) => ctx2.stroke(path2)
  }, styleOptions);
}
function renderText(ctx, text, coords, styleOptions = {}) {
  if (text) {
    render(ctx, {
      fill: (ctx2) => ctx2.fillText(text.toString(), coords.x, coords.y),
      stroke: (ctx2) => ctx2.strokeText(text.toString(), coords.x, coords.y)
    }, styleOptions);
  }
}
function renderRect(ctx, coords, styleOptions = {}) {
  render(ctx, {
    fill: (ctx2) => ctx2.fillRect(coords.x, coords.y, coords.width, coords.height),
    stroke: (ctx2) => ctx2.strokeRect(coords.x, coords.y, coords.width, coords.height)
  }, styleOptions);
}
function renderCircle(ctx, coords, styleOptions = {}) {
  ctx.beginPath();
  ctx.arc(coords.cx, coords.cy, coords.r, 0, 2 * Math.PI);
  render(ctx, {
    fill: (ctx2) => {
      ctx2.fill();
    },
    stroke: (ctx2) => {
      ctx2.stroke();
    }
  }, styleOptions);
  ctx.closePath();
}
function scaleCanvas(ctx, width, height) {
  const devicePixelRatio = window.devicePixelRatio || 1;
  ctx.canvas.width = width * devicePixelRatio;
  ctx.canvas.height = height * devicePixelRatio;
  ctx.canvas.style.width = `${width}px`;
  ctx.canvas.style.height = `${height}px`;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  return { width: ctx.canvas.width, height: ctx.canvas.height };
}
function _createLinearGradient(ctx, x0, y0, x1, y1, stops) {
  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(({ offset, color }) => {
    gradient.addColorStop(offset, color);
  });
  return gradient;
}
const createLinearGradient = memoize(_createLinearGradient, (ctx, x0, y0, x1, y1, stops) => {
  const key = JSON.stringify({ x0, y0, x1, y1, stops });
  return key;
});
const canvasContextKey = Symbol();
function getCanvasContext() {
  return getContext(canvasContextKey);
}
function setCanvasContext(context) {
  setContext(canvasContextKey, context);
}
const Canvas = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_dragging;
  let $containerHeight, $$unsubscribe_containerHeight;
  let $containerWidth, $$unsubscribe_containerWidth;
  let $$unsubscribe_moving;
  let $scale, $$unsubscribe_scale;
  let $translate, $$unsubscribe_translate;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $padding, $$unsubscribe_padding;
  const { width, height, containerWidth, containerHeight, padding } = chartContext();
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_containerWidth = subscribe(containerWidth, (value) => $containerWidth = value);
  $$unsubscribe_containerHeight = subscribe(containerHeight, (value) => $containerHeight = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  let { element = void 0 } = $$props;
  let { context = void 0 } = $$props;
  let { willReadFrequently = false } = $$props;
  let { zIndex = void 0 } = $$props;
  let { pointerEvents = void 0 } = $$props;
  let { fallback = "" } = $$props;
  let { label = void 0 } = $$props;
  let { labelledBy = void 0 } = $$props;
  let { describedBy = void 0 } = $$props;
  let { center = false } = $$props;
  let { ignoreTransform = false } = $$props;
  let { debug = false } = $$props;
  new Logger("Canvas");
  let components = /* @__PURE__ */ new Map();
  let pendingInvalidation = false;
  let frameId;
  const { mode, scale, translate, dragging, moving } = transformContext();
  $$unsubscribe_scale = subscribe(scale, (value) => $scale = value);
  $$unsubscribe_translate = subscribe(translate, (value) => $translate = value);
  $$unsubscribe_dragging = subscribe(dragging, (value) => value);
  $$unsubscribe_moving = subscribe(moving, (value) => value);
  let hitCanvasElement = void 0;
  onDestroy(() => {
    if (frameId) {
      cancelAnimationFrame(frameId);
    }
  });
  function update2() {
    if (!context) return;
    scaleCanvas(context, $containerWidth, $containerHeight);
    context.clearRect(0, 0, $containerWidth, $containerHeight);
    context.translate($padding.left ?? 0, $padding.top ?? 0);
    if (center) {
      const newTranslate = {
        x: center === "x" || center === true ? $width / 2 : 0,
        y: center === "y" || center === true ? $height / 2 : 0
      };
      context.translate(newTranslate.x, newTranslate.y);
    } else if (mode === "canvas" && !ignoreTransform) {
      context.translate($translate.x, $translate.y);
      context.scale($scale, $scale);
    }
    components.forEach((c) => {
      if (c.retainState) {
        c.render(context);
      } else {
        context.save();
        c.render(context);
        context.restore();
      }
      c.events && Object.values(c.events).filter((d) => d).length > 0;
    });
    pendingInvalidation = false;
  }
  const canvasContext = {
    register(component) {
      const key = Symbol();
      components.set(key, component);
      this.invalidate();
      return () => {
        components.delete(key);
        this.invalidate();
      };
    },
    invalidate() {
      if (pendingInvalidation) return;
      pendingInvalidation = true;
      frameId = requestAnimationFrame(update2);
    }
  };
  setCanvasContext(canvasContext);
  setRenderContext("canvas");
  if ($$props.element === void 0 && $$bindings.element && element !== void 0) $$bindings.element(element);
  if ($$props.context === void 0 && $$bindings.context && context !== void 0) $$bindings.context(context);
  if ($$props.willReadFrequently === void 0 && $$bindings.willReadFrequently && willReadFrequently !== void 0) $$bindings.willReadFrequently(willReadFrequently);
  if ($$props.zIndex === void 0 && $$bindings.zIndex && zIndex !== void 0) $$bindings.zIndex(zIndex);
  if ($$props.pointerEvents === void 0 && $$bindings.pointerEvents && pointerEvents !== void 0) $$bindings.pointerEvents(pointerEvents);
  if ($$props.fallback === void 0 && $$bindings.fallback && fallback !== void 0) $$bindings.fallback(fallback);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0) $$bindings.label(label);
  if ($$props.labelledBy === void 0 && $$bindings.labelledBy && labelledBy !== void 0) $$bindings.labelledBy(labelledBy);
  if ($$props.describedBy === void 0 && $$bindings.describedBy && describedBy !== void 0) $$bindings.describedBy(describedBy);
  if ($$props.center === void 0 && $$bindings.center && center !== void 0) $$bindings.center(center);
  if ($$props.ignoreTransform === void 0 && $$bindings.ignoreTransform && ignoreTransform !== void 0) $$bindings.ignoreTransform(ignoreTransform);
  if ($$props.debug === void 0 && $$bindings.debug && debug !== void 0) $$bindings.debug(debug);
  {
    {
      canvasContext.invalidate();
    }
  }
  $$unsubscribe_dragging();
  $$unsubscribe_containerHeight();
  $$unsubscribe_containerWidth();
  $$unsubscribe_moving();
  $$unsubscribe_scale();
  $$unsubscribe_translate();
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_padding();
  return `<canvas${add_attribute("class", cls("layercake-layout-canvas", "absolute top-0 left-0 w-full h-full", pointerEvents === false && "pointer-events-none", $$props.class), 0)}${add_attribute("aria-label", label, 0)}${add_attribute("aria-labelledby", labelledBy, 0)}${add_attribute("aria-describedby", describedBy, 0)}${add_styles({ "z-index": zIndex })}${add_attribute("this", element, 0)}>${slots.fallback ? slots.fallback({}) : ` ${escape(fallback || "")} `}</canvas>  <canvas${add_attribute(
    "class",
    cls(
      "layerchart-hitcanvas",
      "absolute top-0 left-0 w-full h-full",
      "pointer-events-none",
      // events all handled by main canvas
      // '[image-rendering:pixelated]', // https://developer.mozilla.org/en-US/docs/Web/CSS/image-rendering
      "border border-danger",
      !debug && "opacity-0"
    ),
    0
  )}${add_attribute("this", hitCanvasElement, 0)}></canvas> ${slots.default ? slots.default({ element, context }) : ``}`;
});
const Rect = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "element",
    "x",
    "initialX",
    "y",
    "initialY",
    "width",
    "initialWidth",
    "height",
    "initialHeight",
    "fill",
    "fillOpacity",
    "stroke",
    "strokeWidth",
    "class",
    "onclick",
    "ondblclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave",
    "onpointerover",
    "onpointerout",
    "spring",
    "tweened"
  ]);
  let $tweened_height, $$unsubscribe_tweened_height;
  let $tweened_width, $$unsubscribe_tweened_width;
  let $tweened_y, $$unsubscribe_tweened_y;
  let $tweened_x, $$unsubscribe_tweened_x;
  let { element = void 0 } = $$props;
  let { x = 0 } = $$props;
  let { initialX = x } = $$props;
  let { y = 0 } = $$props;
  let { initialY = y } = $$props;
  let { width } = $$props;
  let { initialWidth = width } = $$props;
  let { height } = $$props;
  let { initialHeight = height } = $$props;
  let { fill = void 0 } = $$props;
  let { fillOpacity = void 0 } = $$props;
  let { stroke = void 0 } = $$props;
  let { strokeWidth = void 0 } = $$props;
  let { class: className = void 0 } = $$props;
  let { onclick = void 0 } = $$props;
  let { ondblclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { onpointerover = void 0 } = $$props;
  let { onpointerout = void 0 } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let tweened_x = motionStore(initialX, resolveOptions("x", { spring: spring2, tweened: tweened2 }));
  $$unsubscribe_tweened_x = subscribe(tweened_x, (value) => $tweened_x = value);
  let tweened_y = motionStore(initialY, resolveOptions("y", { spring: spring2, tweened: tweened2 }));
  $$unsubscribe_tweened_y = subscribe(tweened_y, (value) => $tweened_y = value);
  let tweened_width = motionStore(initialWidth, resolveOptions("width", { spring: spring2, tweened: tweened2 }));
  $$unsubscribe_tweened_width = subscribe(tweened_width, (value) => $tweened_width = value);
  let tweened_height = motionStore(initialHeight, resolveOptions("height", { spring: spring2, tweened: tweened2 }));
  $$unsubscribe_tweened_height = subscribe(tweened_height, (value) => $tweened_height = value);
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  function render2(ctx, styleOverrides) {
    renderRect(
      ctx,
      {
        x: $tweened_x,
        y: $tweened_y,
        width: $tweened_width,
        height: $tweened_height
      },
      styleOverrides ? merge({ styles: { strokeWidth } }, styleOverrides) : {
        styles: { fill, fillOpacity, stroke, strokeWidth },
        classes: className
      }
    );
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  if ($$props.element === void 0 && $$bindings.element && element !== void 0) $$bindings.element(element);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.initialX === void 0 && $$bindings.initialX && initialX !== void 0) $$bindings.initialX(initialX);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.initialY === void 0 && $$bindings.initialY && initialY !== void 0) $$bindings.initialY(initialY);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0) $$bindings.width(width);
  if ($$props.initialWidth === void 0 && $$bindings.initialWidth && initialWidth !== void 0) $$bindings.initialWidth(initialWidth);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0) $$bindings.height(height);
  if ($$props.initialHeight === void 0 && $$bindings.initialHeight && initialHeight !== void 0) $$bindings.initialHeight(initialHeight);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.fillOpacity === void 0 && $$bindings.fillOpacity && fillOpacity !== void 0) $$bindings.fillOpacity(fillOpacity);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.ondblclick === void 0 && $$bindings.ondblclick && ondblclick !== void 0) $$bindings.ondblclick(ondblclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.onpointerover === void 0 && $$bindings.onpointerover && onpointerover !== void 0) $$bindings.onpointerover(onpointerover);
  if ($$props.onpointerout === void 0 && $$bindings.onpointerout && onpointerout !== void 0) $$bindings.onpointerout(onpointerout);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  {
    tick().then(() => {
      tweened_x.set(x);
      tweened_y.set(y);
      tweened_width.set(width);
      tweened_height.set(height);
    });
  }
  fill && typeof fill === "object" ? objectId(fill) : fill;
  stroke && typeof stroke === "object" ? objectId(stroke) : stroke;
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({
        name: "Rect",
        render: render2,
        events: {
          click: onclick,
          dblclick: ondblclick,
          pointerenter: onpointerenter,
          pointermove: onpointermove,
          pointerleave: onpointerleave,
          pointerover: onpointerover,
          pointerout: onpointerout
        }
      });
    }
  }
  $$unsubscribe_tweened_height();
  $$unsubscribe_tweened_width();
  $$unsubscribe_tweened_y();
  $$unsubscribe_tweened_x();
  return `${renderContext === "svg" ? `  <rect${spread(
    [
      { x: escape_attribute_value($tweened_x) },
      { y: escape_attribute_value($tweened_y) },
      {
        width: escape_attribute_value($tweened_width)
      },
      {
        height: escape_attribute_value($tweened_height)
      },
      { fill: escape_attribute_value(fill) },
      {
        "fill-opacity": escape_attribute_value(fillOpacity)
      },
      { stroke: escape_attribute_value(stroke) },
      {
        "stroke-width": escape_attribute_value(strokeWidth)
      },
      {
        class: escape_attribute_value(cls(fill == null && "fill-surface-content", className))
      },
      escape_object($$restProps)
    ],
    {}
  )}${add_attribute("this", element, 0)}></rect>` : ``}`;
});
const RectClipPath = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["id", "x", "y", "width", "height", "spring", "tweened", "disabled"]);
  let { id = uniqueId("clipPath-") } = $$props;
  let { x = 0 } = $$props;
  let { y = 0 } = $$props;
  let { width } = $$props;
  let { height } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let { disabled = false } = $$props;
  if ($$props.id === void 0 && $$bindings.id && id !== void 0) $$bindings.id(id);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0) $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0) $$bindings.height(height);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0) $$bindings.disabled(disabled);
  return `${validate_component(ClipPath, "ClipPath").$$render($$result, { id, disabled }, {}, {
    clip: () => {
      return `${validate_component(Rect, "Rect").$$render($$result, Object.assign({}, { slot: "clip" }, { x }, { y }, { width }, { height }, { spring: spring2 }, { tweened: tweened2 }, $$restProps), {}, {})}`;
    },
    default: ({ url }) => {
      return `${slots.default ? slots.default({ id, url }) : ``}`;
    }
  })}`;
});
const ChartClipPath = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["full", "disabled"]);
  let $padding, $$unsubscribe_padding;
  let $width, $$unsubscribe_width;
  let $height, $$unsubscribe_height;
  const { width, height, padding } = chartContext();
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  let { full = false } = $$props;
  let { disabled = false } = $$props;
  if ($$props.full === void 0 && $$bindings.full && full !== void 0) $$bindings.full(full);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0) $$bindings.disabled(disabled);
  $$unsubscribe_padding();
  $$unsubscribe_width();
  $$unsubscribe_height();
  return `${validate_component(RectClipPath, "RectClipPath").$$render(
    $$result,
    Object.assign(
      {},
      {
        x: full && $padding.left ? -$padding.left : 0
      },
      {
        y: full && $padding.top ? -$padding.top : 0
      },
      {
        width: $width + (full ? ($padding?.left ?? 0) + ($padding?.right ?? 0) : 0)
      },
      {
        height: $height + (full ? ($padding?.top ?? 0) + ($padding?.bottom ?? 0) : 0)
      },
      { disabled },
      $$restProps
    ),
    {},
    {
      default: () => {
        return `${slots.default ? slots.default({}) : ``}`;
      }
    }
  )}`;
});
function geoCurvePath(projection, curve, context) {
  const pathContext = path();
  const geoPath$1 = geoPath(projection, curveContext(curve(pathContext)));
  const fn = (object) => {
    geoPath$1(object);
    return context === void 0 ? pathContext + "" : void 0;
  };
  Object.setPrototypeOf(fn, geoPath$1);
  return fn;
}
function curveContext(curve) {
  return {
    beginPath() {
    },
    moveTo(x, y) {
      curve.lineStart();
      curve.point(x, y);
    },
    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
    },
    lineTo(x, y) {
      curve.point(x, y);
    },
    closePath() {
      curve.lineEnd();
    }
  };
}
function geoFitObjectTransform(projection, size, object) {
  const newProjection = projection.fitSize(size, object);
  const translate = newProjection.translate();
  return { translate: { x: translate[0], y: translate[1] }, scale: newProjection.scale() };
}
const GeoPath = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let _projection;
  let geoPath2;
  let $$restProps = compute_rest_props($$props, [
    "geojson",
    "fill",
    "stroke",
    "strokeWidth",
    "tooltip",
    "onclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave",
    "onpointerdown",
    "ontouchmove",
    "curve",
    "class",
    "geoTransform"
  ]);
  let $geo, $$unsubscribe_geo;
  let { geojson = void 0 } = $$props;
  let { fill = void 0 } = $$props;
  let { stroke = void 0 } = $$props;
  let { strokeWidth = void 0 } = $$props;
  let { tooltip = void 0 } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { onpointerdown = void 0 } = $$props;
  let { ontouchmove = void 0 } = $$props;
  let { curve = curveLinearClosed } = $$props;
  let { class: className = void 0 } = $$props;
  const geo = geoContext();
  $$unsubscribe_geo = subscribe(geo, (value) => $geo = value);
  let { geoTransform: geoTransform$1 = void 0 } = $$props;
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  function render2(ctx, styleOverrides) {
    if (geojson) {
      const pathData = geoPath2(geojson);
      renderPathData(ctx, pathData, styleOverrides ? merge({ styles: { strokeWidth } }, styleOverrides) : {
        styles: { fill, stroke, strokeWidth },
        classes: className
      });
    }
  }
  function _onClick(e) {
    onclick?.(e, geoPath2);
  }
  function _onPointerEnter(e) {
    onpointerenter?.(e);
    tooltip?.show(e, geojson);
  }
  function _onPointerMove(e) {
    onpointermove?.(e);
    tooltip?.show(e, geojson);
  }
  function _onPointerLeave(e) {
    onpointerleave?.(e);
    tooltip?.hide();
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  if ($$props.geojson === void 0 && $$bindings.geojson && geojson !== void 0) $$bindings.geojson(geojson);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.tooltip === void 0 && $$bindings.tooltip && tooltip !== void 0) $$bindings.tooltip(tooltip);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.onpointerdown === void 0 && $$bindings.onpointerdown && onpointerdown !== void 0) $$bindings.onpointerdown(onpointerdown);
  if ($$props.ontouchmove === void 0 && $$bindings.ontouchmove && ontouchmove !== void 0) $$bindings.ontouchmove(ontouchmove);
  if ($$props.curve === void 0 && $$bindings.curve && curve !== void 0) $$bindings.curve(curve);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.geoTransform === void 0 && $$bindings.geoTransform && geoTransform$1 !== void 0) $$bindings.geoTransform(geoTransform$1);
  _projection = geoTransform$1 ? geoTransform(geoTransform$1($geo)) : $geo;
  geoPath2 = geoCurvePath(_projection, curve);
  {
    {
      geoPath2 = geoCurvePath(_projection, curve);
    }
  }
  fill && typeof fill === "object" ? objectId(fill) : fill;
  stroke && typeof stroke === "object" ? objectId(stroke) : stroke;
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({
        name: "GeoPath",
        render: render2,
        events: {
          click: _onClick,
          pointerenter: _onPointerEnter,
          pointermove: _onPointerMove,
          pointerleave: _onPointerLeave,
          pointerdown: onpointerdown,
          touchmove: ontouchmove
        }
      });
    }
  }
  $$unsubscribe_geo();
  return ` ${slots.default ? slots.default({ geoPath: geoPath2 }) : ` ${renderContext === "svg" ? `<path${spread(
    [
      escape_object($$restProps),
      {
        d: escape_attribute_value(geojson ? geoPath2(geojson) : "")
      },
      { fill: escape_attribute_value(fill) },
      { stroke: escape_attribute_value(stroke) },
      {
        "stroke-width": escape_attribute_value(strokeWidth)
      },
      {
        class: escape_attribute_value(cls(fill == null && "fill-transparent", className))
      }
    ],
    {}
  )}></path>` : ``} `}`;
});
function fade(node, { delay = 0, duration = 400, easing = identity$1 } = {}) {
  const o = +getComputedStyle(node).opacity;
  return {
    delay,
    duration,
    easing,
    css: (t) => `opacity: ${t * o}`
  };
}
const Group = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "x",
    "initialX",
    "y",
    "initialY",
    "center",
    "preventTouchMove",
    "onclick",
    "ondblclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave",
    "onpointerdown",
    "spring",
    "tweened"
  ]);
  let $tweened_y, $$unsubscribe_tweened_y;
  let $tweened_x, $$unsubscribe_tweened_x;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  const { width, height } = chartContext();
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  let { x = void 0 } = $$props;
  let { initialX = x } = $$props;
  let { y = void 0 } = $$props;
  let { initialY = y } = $$props;
  let { center = false } = $$props;
  let { preventTouchMove = false } = $$props;
  let { onclick = void 0 } = $$props;
  let { ondblclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { onpointerdown = void 0 } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let tweened_x = motionStore(initialX, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_x = subscribe(tweened_x, (value) => $tweened_x = value);
  let tweened_y = motionStore(initialY, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_y = subscribe(tweened_y, (value) => $tweened_y = value);
  let transform = void 0;
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  function render2(ctx) {
    ctx.translate($tweened_x ?? 0, $tweened_y ?? 0);
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.initialX === void 0 && $$bindings.initialX && initialX !== void 0) $$bindings.initialX(initialX);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.initialY === void 0 && $$bindings.initialY && initialY !== void 0) $$bindings.initialY(initialY);
  if ($$props.center === void 0 && $$bindings.center && center !== void 0) $$bindings.center(center);
  if ($$props.preventTouchMove === void 0 && $$bindings.preventTouchMove && preventTouchMove !== void 0) $$bindings.preventTouchMove(preventTouchMove);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.ondblclick === void 0 && $$bindings.ondblclick && ondblclick !== void 0) $$bindings.ondblclick(ondblclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.onpointerdown === void 0 && $$bindings.onpointerdown && onpointerdown !== void 0) $$bindings.onpointerdown(onpointerdown);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  {
    tick().then(() => {
      tweened_x.set(x ?? (center === "x" || center === true ? $width / 2 : 0));
      tweened_y.set(y ?? (center === "y" || center === true ? $height / 2 : 0));
    });
  }
  {
    if (center || x != null || y != null) {
      transform = `translate(${$tweened_x ?? 0}px, ${$tweened_y ?? 0}px)`;
    }
  }
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({
        name: "Group",
        render: render2,
        retainState: true,
        events: {
          click: onclick,
          dblclick: ondblclick,
          pointerenter: onpointerenter,
          pointermove: onpointermove,
          pointerleave: onpointerleave,
          pointerdown: onpointerdown
        }
      });
    }
  }
  $$unsubscribe_tweened_y();
  $$unsubscribe_tweened_x();
  $$unsubscribe_height();
  $$unsubscribe_width();
  return `${renderContext === "canvas" ? `${slots.default ? slots.default({}) : ``}` : `${renderContext === "svg" ? ` <g${spread([escape_object($$restProps)], { styles: { transform } })}>${slots.default ? slots.default({}) : ``}</g>` : `<div${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls("absolute", $$restProps.class))
      }
    ],
    { styles: { transform } }
  )}>${slots.default ? slots.default({}) : ``}</div>`}`}`;
});
const Marker = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "type",
    "id",
    "size",
    "markerWidth",
    "markerHeight",
    "markerUnits",
    "orient",
    "refX",
    "refY",
    "viewBox"
  ]);
  let { type = void 0 } = $$props;
  let { id = uniqueId("marker-") } = $$props;
  let { size = 10 } = $$props;
  let { markerWidth = size } = $$props;
  let { markerHeight = size } = $$props;
  let { markerUnits = "userSpaceOnUse" } = $$props;
  let { orient = "auto-start-reverse" } = $$props;
  let { refX = ["arrow", "triangle"].includes(type ?? "") ? 9 : 5 } = $$props;
  let { refY = 5 } = $$props;
  let { viewBox = "0 0 10 10" } = $$props;
  if ($$props.type === void 0 && $$bindings.type && type !== void 0) $$bindings.type(type);
  if ($$props.id === void 0 && $$bindings.id && id !== void 0) $$bindings.id(id);
  if ($$props.size === void 0 && $$bindings.size && size !== void 0) $$bindings.size(size);
  if ($$props.markerWidth === void 0 && $$bindings.markerWidth && markerWidth !== void 0) $$bindings.markerWidth(markerWidth);
  if ($$props.markerHeight === void 0 && $$bindings.markerHeight && markerHeight !== void 0) $$bindings.markerHeight(markerHeight);
  if ($$props.markerUnits === void 0 && $$bindings.markerUnits && markerUnits !== void 0) $$bindings.markerUnits(markerUnits);
  if ($$props.orient === void 0 && $$bindings.orient && orient !== void 0) $$bindings.orient(orient);
  if ($$props.refX === void 0 && $$bindings.refX && refX !== void 0) $$bindings.refX(refX);
  if ($$props.refY === void 0 && $$bindings.refY && refY !== void 0) $$bindings.refY(refY);
  if ($$props.viewBox === void 0 && $$bindings.viewBox && viewBox !== void 0) $$bindings.viewBox(viewBox);
  return `<defs><marker${spread(
    [
      { id: escape_attribute_value(id) },
      {
        markerWidth: escape_attribute_value(markerWidth)
      },
      {
        markerHeight: escape_attribute_value(markerHeight)
      },
      {
        markerUnits: escape_attribute_value(markerUnits)
      },
      { orient: escape_attribute_value(orient) },
      { refX: escape_attribute_value(refX) },
      { refY: escape_attribute_value(refY) },
      { viewBox: escape_attribute_value(viewBox) },
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls(
          "overflow-visible",
          // stroke
          $$props.stroke == null && (["arrow", "circle-stroke", "line"].includes(type ?? "") ? "stroke-[context-stroke]" : type === "circle" ? "stroke-surface-100" : "stroke-none"),
          // extra stroke attrs
          "[stroke-linecap:round] [stroke-linejoin:round]",
          //fill
          $$props.fill == null && (["triangle", "dot", "circle"].includes(type ?? "") ? "fill-[context-stroke]" : type === "circle-stroke" ? "fill-surface-100" : "fill-none"),
          $$props.class
        ))
      }
    ],
    {}
  )}>${slots.default ? slots.default({}) : ` ${type === "triangle" ? `<path d="M 0 0 L 10 5 L 0 10 z"></path>` : `${type === "arrow" ? `<polyline points="0 0, 10 5, 0 10"></polyline>` : `${type === "circle" || type === "circle-stroke" || type === "dot" ? `<circle${add_attribute("cx", 5, 0)}${add_attribute("cy", 5, 0)}${add_attribute("r", 5, 0)}></circle>` : `${type === "line" ? `<polyline points="5 0, 5 10"></polyline>` : ``}`}`}`} `}</marker></defs>`;
});
function flattenPathData(pathData, yOverride = 0) {
  let result = pathData;
  result = result.replace(/([MLTQCSAZ])(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (match, command, x, y) => {
    return `${command}${x},${yOverride}`;
  });
  result = result.replace(/([v])(-?\d*\.?\d+)/g, (match, command, l) => {
    return `${command}${0}`;
  });
  return result;
}
const Spline = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let markerStartId;
  let markerMidId;
  let markerEndId;
  let xAccessor;
  let yAccessor;
  let xOffset;
  let yOffset;
  let tweened_d;
  let endPoint;
  let $$restProps = compute_rest_props($$props, [
    "data",
    "pathData",
    "x",
    "y",
    "tweened",
    "draw",
    "curve",
    "defined",
    "fill",
    "stroke",
    "strokeWidth",
    "opacity",
    "class",
    "onclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave",
    "onpointerdown",
    "ontouchmove",
    "onpointerover",
    "onpointerout",
    "marker",
    "markerStart",
    "markerMid",
    "markerEnd"
  ]);
  let $$slots = compute_slots(slots);
  let $tweened_d, $$unsubscribe_tweened_d = noop, $$subscribe_tweened_d = () => ($$unsubscribe_tweened_d(), $$unsubscribe_tweened_d = subscribe(tweened_d, ($$value) => $tweened_d = $$value), tweened_d);
  let $contextData, $$unsubscribe_contextData;
  let $yScale, $$unsubscribe_yScale;
  let $xScale, $$unsubscribe_xScale;
  let $radial, $$unsubscribe_radial;
  let $yRange, $$unsubscribe_yRange;
  let $config, $$unsubscribe_config;
  let $contextY, $$unsubscribe_contextY;
  let $contextX, $$unsubscribe_contextX;
  let $startPoint, $$unsubscribe_startPoint;
  let $endPoint, $$unsubscribe_endPoint = noop, $$subscribe_endPoint = () => ($$unsubscribe_endPoint(), $$unsubscribe_endPoint = subscribe(endPoint, ($$value) => $endPoint = $$value), endPoint);
  const { data: contextData, xScale, yScale, x: contextX, y: contextY, yRange, radial, config } = chartContext();
  $$unsubscribe_contextData = subscribe(contextData, (value) => $contextData = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_contextX = subscribe(contextX, (value) => $contextX = value);
  $$unsubscribe_contextY = subscribe(contextY, (value) => $contextY = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  $$unsubscribe_radial = subscribe(radial, (value) => $radial = value);
  $$unsubscribe_config = subscribe(config, (value) => $config = value);
  let { data = void 0 } = $$props;
  let { pathData = void 0 } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let { draw = void 0 } = $$props;
  let { curve = void 0 } = $$props;
  let { defined = void 0 } = $$props;
  let { fill = void 0 } = $$props;
  let { stroke = void 0 } = $$props;
  let { strokeWidth = void 0 } = $$props;
  let { opacity = void 0 } = $$props;
  let { class: className = void 0 } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { onpointerdown = void 0 } = $$props;
  let { ontouchmove = void 0 } = $$props;
  let { onpointerover = void 0 } = $$props;
  let { onpointerout = void 0 } = $$props;
  let { marker = void 0 } = $$props;
  let { markerStart = marker } = $$props;
  let { markerMid = marker } = $$props;
  let { markerEnd = marker } = $$props;
  function getScaleValue(data2, scale, accessor2) {
    let value = accessor2(data2);
    if (Array.isArray(value)) {
      value = max(value);
    }
    if (scale.domain().length) {
      return scale(value);
    } else {
      return value;
    }
  }
  function defaultPathData() {
    if (!tweenedOptions) {
      return "";
    } else if (pathData) {
      return flattenPathData(pathData, Math.min($yScale(0), $yRange[0]));
    } else if ($config.x) {
      const path2 = $radial ? lineRadial().angle((d2) => $xScale(xAccessor(d2))).radius((d2) => Math.min($yScale(0), $yRange[0])) : line().x((d2) => $xScale(xAccessor(d2)) + xOffset).y((d2) => Math.min($yScale(0), $yRange[0]));
      path2.defined(defined ?? ((d2) => xAccessor(d2) != null && yAccessor(d2) != null));
      if (curve) path2.curve(curve);
      return path2(data ?? $contextData);
    }
  }
  let d = "";
  const tweenedOptions = tweened2 ? {
    interpolate: interpolatePath,
    ...typeof tweened2 === "object" ? tweened2 : null
  } : false;
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  function render2(ctx, styleOverrides) {
    renderPathData(ctx, $tweened_d, styleOverrides ? merge({ styles: { strokeWidth } }, styleOverrides) : {
      styles: { fill, stroke, strokeWidth, opacity },
      classes: className
    });
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  let pathEl = void 0;
  const startPoint = writable(void 0);
  $$unsubscribe_startPoint = subscribe(startPoint, (value) => $startPoint = value);
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.pathData === void 0 && $$bindings.pathData && pathData !== void 0) $$bindings.pathData(pathData);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  if ($$props.draw === void 0 && $$bindings.draw && draw !== void 0) $$bindings.draw(draw);
  if ($$props.curve === void 0 && $$bindings.curve && curve !== void 0) $$bindings.curve(curve);
  if ($$props.defined === void 0 && $$bindings.defined && defined !== void 0) $$bindings.defined(defined);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.opacity === void 0 && $$bindings.opacity && opacity !== void 0) $$bindings.opacity(opacity);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.onpointerdown === void 0 && $$bindings.onpointerdown && onpointerdown !== void 0) $$bindings.onpointerdown(onpointerdown);
  if ($$props.ontouchmove === void 0 && $$bindings.ontouchmove && ontouchmove !== void 0) $$bindings.ontouchmove(ontouchmove);
  if ($$props.onpointerover === void 0 && $$bindings.onpointerover && onpointerover !== void 0) $$bindings.onpointerover(onpointerover);
  if ($$props.onpointerout === void 0 && $$bindings.onpointerout && onpointerout !== void 0) $$bindings.onpointerout(onpointerout);
  if ($$props.marker === void 0 && $$bindings.marker && marker !== void 0) $$bindings.marker(marker);
  if ($$props.markerStart === void 0 && $$bindings.markerStart && markerStart !== void 0) $$bindings.markerStart(markerStart);
  if ($$props.markerMid === void 0 && $$bindings.markerMid && markerMid !== void 0) $$bindings.markerMid(markerMid);
  if ($$props.markerEnd === void 0 && $$bindings.markerEnd && markerEnd !== void 0) $$bindings.markerEnd(markerEnd);
  markerStartId = markerStart || $$slots["markerStart"] ? uniqueId("marker-") : "";
  markerMidId = markerMid || $$slots["markerMid"] ? uniqueId("marker-") : "";
  markerEndId = markerEnd || $$slots["markerEnd"] ? uniqueId("marker-") : "";
  xAccessor = x ? accessor(x) : $contextX;
  yAccessor = y ? accessor(y) : $contextY;
  xOffset = isScaleBand($xScale) ? $xScale.bandwidth() / 2 : 0;
  yOffset = isScaleBand($yScale) ? $yScale.bandwidth() / 2 : 0;
  $$subscribe_tweened_d(tweened_d = motionStore(defaultPathData(), { tweened: tweenedOptions }));
  {
    {
      const path2 = $radial ? lineRadial().angle((d2) => getScaleValue(d2, $xScale, xAccessor)).radius((d2) => getScaleValue(d2, $yScale, yAccessor)) : line().x((d2) => getScaleValue(d2, $xScale, xAccessor) + xOffset).y((d2) => getScaleValue(d2, $yScale, yAccessor) + yOffset);
      path2.defined(defined ?? ((d2) => xAccessor(d2) != null && yAccessor(d2) != null));
      if (curve) path2.curve(curve);
      d = pathData ?? path2(data ?? $contextData) ?? "";
      tweened_d.set(d);
    }
  }
  fill && typeof fill === "object" ? objectId(fill) : fill;
  stroke && typeof stroke === "object" ? objectId(stroke) : stroke;
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({
        name: "Spline",
        render: render2,
        events: {
          click: onclick,
          pointerenter: onpointerenter,
          pointermove: onpointermove,
          pointerleave: onpointerleave,
          pointerdown: onpointerdown,
          pointerover: onpointerover,
          pointerout: onpointerout,
          touchmove: ontouchmove
        }
      });
    }
  }
  $$subscribe_endPoint(endPoint = motionStore(void 0, {
    tweened: draw ? {
      duration: typeof draw === "object" && draw.duration || 800,
      easing: typeof draw === "object" && draw.easing || cubicInOut,
      interpolate(a, b) {
        return (t) => {
          const totalLength = 0;
          const point = pathEl?.getPointAtLength(totalLength * t);
          return point;
        };
      }
    } : false
  }));
  {
    {
      if ($$slots.start || $$slots.end) {
        tick().then(() => {
        });
      }
    }
  }
  $$unsubscribe_tweened_d();
  $$unsubscribe_contextData();
  $$unsubscribe_yScale();
  $$unsubscribe_xScale();
  $$unsubscribe_radial();
  $$unsubscribe_yRange();
  $$unsubscribe_config();
  $$unsubscribe_contextY();
  $$unsubscribe_contextX();
  $$unsubscribe_startPoint();
  $$unsubscribe_endPoint();
  return `${renderContext === "svg" ? ` <path${spread(
    [
      { d: escape_attribute_value($tweened_d) },
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls("path-line", !fill && "fill-none", !stroke && "stroke-surface-content", className))
      },
      { fill: escape_attribute_value(fill) },
      { stroke: escape_attribute_value(stroke) },
      {
        "stroke-width": escape_attribute_value(strokeWidth)
      },
      { opacity: escape_attribute_value(opacity) },
      {
        "marker-start": escape_attribute_value(markerStartId ? `url(#${markerStartId})` : void 0)
      },
      {
        "marker-mid": escape_attribute_value(markerMidId ? `url(#${markerMidId})` : void 0)
      },
      {
        "marker-end": escape_attribute_value(markerEndId ? `url(#${markerEndId})` : void 0)
      }
    ],
    {}
  )}${add_attribute("this", pathEl, 0)}></path> ${slots.markerStart ? slots.markerStart({ id: markerStartId }) : ` ${markerStart ? `${validate_component(Marker, "Marker").$$render(
    $$result,
    Object.assign(
      {},
      { id: markerStartId },
      {
        type: typeof markerStart === "string" ? markerStart : void 0
      },
      typeof markerStart === "object" ? markerStart : null
    ),
    {},
    {}
  )}` : ``} `} ${slots.markerMid ? slots.markerMid({ id: markerMidId }) : ` ${markerMid ? `${validate_component(Marker, "Marker").$$render(
    $$result,
    Object.assign(
      {},
      { id: markerMidId },
      {
        type: typeof markerMid === "string" ? markerMid : void 0
      },
      typeof markerMid === "object" ? markerMid : null
    ),
    {},
    {}
  )}` : ``} `} ${slots.markerEnd ? slots.markerEnd({ id: markerEndId }) : ` ${markerEnd ? `${validate_component(Marker, "Marker").$$render(
    $$result,
    Object.assign(
      {},
      { id: markerEndId },
      {
        type: typeof markerEnd === "string" ? markerEnd : void 0
      },
      typeof markerEnd === "object" ? markerEnd : null
    ),
    {},
    {}
  )}` : ``} `} ${$$slots.start && $startPoint ? `${validate_component(Group, "Group").$$render($$result, { x: $startPoint.x, y: $startPoint.y }, {}, {
    default: () => {
      return `${slots.start ? slots.start({ point: $startPoint }) : ``}`;
    }
  })}` : ``} ${$$slots.end && $endPoint ? `${validate_component(Group, "Group").$$render($$result, { x: $endPoint.x, y: $endPoint.y }, {}, {
    default: () => {
      return `${slots.end ? slots.end({ point: $endPoint }) : ``}`;
    }
  })}` : ``}` : ``}`;
});
const Voronoi = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let points;
  let boundWidth;
  let boundHeight;
  let $$restProps = compute_rest_props($$props, [
    "data",
    "classes",
    "onclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave",
    "onpointerdown"
  ]);
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $radial, $$unsubscribe_radial;
  let $yGet, $$unsubscribe_yGet;
  let $yContext, $$unsubscribe_yContext;
  let $geo, $$unsubscribe_geo;
  let $xGet, $$unsubscribe_xGet;
  let $xContext, $$unsubscribe_xContext;
  let $flatData, $$unsubscribe_flatData;
  const { flatData, xGet, yGet, x: xContext, y: yContext, width, height, radial } = chartContext();
  $$unsubscribe_flatData = subscribe(flatData, (value) => $flatData = value);
  $$unsubscribe_xGet = subscribe(xGet, (value) => $xGet = value);
  $$unsubscribe_yGet = subscribe(yGet, (value) => $yGet = value);
  $$unsubscribe_xContext = subscribe(xContext, (value) => $xContext = value);
  $$unsubscribe_yContext = subscribe(yContext, (value) => $yContext = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_radial = subscribe(radial, (value) => $radial = value);
  const geo = geoContext();
  $$unsubscribe_geo = subscribe(geo, (value) => $geo = value);
  let { data = void 0 } = $$props;
  let { classes = {} } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { onpointerdown = void 0 } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0) $$bindings.classes(classes);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.onpointerdown === void 0 && $$bindings.onpointerdown && onpointerdown !== void 0) $$bindings.onpointerdown(onpointerdown);
  points = (data ?? $flatData).map((d) => {
    const xValue = $geo ? $xContext(d) : $xGet(d);
    const yValue = $geo ? $yContext(d) : $yGet(d);
    const x = Array.isArray(xValue) ? min(xValue) : xValue;
    const y = Array.isArray(yValue) ? min(yValue) : yValue;
    let point;
    if ($radial) {
      const radialPoint = pointRadial(x, y);
      point = [radialPoint[0] + $width / 2, radialPoint[1] + $height / 2];
    } else {
      point = [x, y];
    }
    point.data = d;
    return point;
  });
  boundWidth = Math.max($width, 0);
  boundHeight = Math.max($height, 0);
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_radial();
  $$unsubscribe_yGet();
  $$unsubscribe_yContext();
  $$unsubscribe_geo();
  $$unsubscribe_xGet();
  $$unsubscribe_xContext();
  $$unsubscribe_flatData();
  return `<g${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls(classes.root, $$props.class))
      }
    ],
    {}
  )}>${$geo ? (() => {
    let polygons = geoVoronoi().polygons(points);
    return ` ${each(polygons.features, (feature) => {
      return `${validate_component(GeoPath, "GeoPath").$$render(
        $$result,
        {
          geojson: feature,
          class: cls("fill-transparent stroke-transparent", classes.path),
          onclick: (e) => onclick?.(e, {
            data: feature.properties.site.data,
            feature
          }),
          onpointerenter: (e) => onpointerenter?.(e, {
            data: feature.properties.site.data,
            feature
          }),
          onpointermove: (e) => onpointermove?.(e, {
            data: feature.properties.site.data,
            feature
          }),
          onpointerdown: (e) => onpointerdown?.(e, {
            data: feature.properties.site.data,
            feature
          }),
          onpointerleave,
          ontouchmove: (e) => {
            e.preventDefault();
          }
        },
        {},
        {}
      )}`;
    })}`;
  })() : (() => {
    let voronoi = Delaunay.from(points).voronoi([0, 0, boundWidth, boundHeight]);
    return ` ${each(points, (point, i) => {
      let pathData = voronoi.renderCell(i);
      return `  ${pathData ? `${validate_component(Spline, "Spline").$$render(
        $$result,
        {
          pathData,
          class: cls("fill-transparent stroke-transparent", classes.path),
          onclick: (e) => onclick?.(e, { data: point.data, point }),
          onpointerenter: (e) => onpointerenter?.(e, { data: point.data, point }),
          onpointermove: (e) => onpointermove?.(e, { data: point.data, point }),
          onpointerleave,
          onpointerdown: (e) => onpointerdown?.(e, { data: point.data, point }),
          ontouchmove: (e) => {
            e.preventDefault();
          }
        },
        {},
        {}
      )}` : ``}`;
    })}`;
  })()}</g>`;
});
function cartesianToPolar(x, y) {
  let radians = Math.atan2(y, x);
  radians += Math.PI / 2;
  if (radians < 0) {
    radians += 2 * Math.PI;
  }
  return {
    radius: Math.sqrt(x ** 2 + y ** 2),
    radians
  };
}
function parsePercent(percent) {
  if (typeof percent === "number") {
    return percent;
  } else {
    return Number(percent.replace("%", "")) / 100;
  }
}
function quadtreeRects(quadtree2, showLeaves = true) {
  const rects = [];
  quadtree2.visit((node, x0, y0, x1, y1) => {
    if (showLeaves || Array.isArray(node)) {
      rects.push({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });
    }
  });
  return rects;
}
const tooltipContextKey = Symbol();
const defaultContext = writable({
  x: 0,
  y: 0,
  data: null,
  show: () => {
  },
  hide: () => {
  },
  mode: "manual"
});
function tooltipContext() {
  return getContext(tooltipContextKey) ?? defaultContext;
}
function setTooltipContext(tooltip) {
  setContext(tooltipContextKey, tooltip);
}
const TooltipContext = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let bisectX;
  let bisectY;
  let triggerPointerEvents;
  let $yRange, $$unsubscribe_yRange;
  let $yScale, $$unsubscribe_yScale;
  let $xRange, $$unsubscribe_xRange;
  let $xScale, $$unsubscribe_xScale;
  let $yGet, $$unsubscribe_yGet;
  let $xGet, $$unsubscribe_xGet;
  let $flatData, $$unsubscribe_flatData;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $tooltip, $$unsubscribe_tooltip;
  let $x, $$unsubscribe_x;
  let $y, $$unsubscribe_y;
  let $padding, $$unsubscribe_padding;
  let $radial, $$unsubscribe_radial;
  let $containerWidth, $$unsubscribe_containerWidth;
  let $containerHeight, $$unsubscribe_containerHeight;
  const { flatData, x, xScale, xGet, xRange, y, yScale, yGet, yRange, width, height, containerWidth, containerHeight, padding, radial } = chartContext();
  $$unsubscribe_flatData = subscribe(flatData, (value) => $flatData = value);
  $$unsubscribe_x = subscribe(x, (value) => $x = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_xGet = subscribe(xGet, (value) => $xGet = value);
  $$unsubscribe_xRange = subscribe(xRange, (value) => $xRange = value);
  $$unsubscribe_y = subscribe(y, (value) => $y = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_yGet = subscribe(yGet, (value) => $yGet = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_containerWidth = subscribe(containerWidth, (value) => $containerWidth = value);
  $$unsubscribe_containerHeight = subscribe(containerHeight, (value) => $containerHeight = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  $$unsubscribe_radial = subscribe(radial, (value) => $radial = value);
  let { mode = "manual" } = $$props;
  let { findTooltipData = "closest" } = $$props;
  let { raiseTarget = false } = $$props;
  let { locked = false } = $$props;
  let { radius = Infinity } = $$props;
  let { debug = false } = $$props;
  let { onclick = () => {
  } } = $$props;
  let { tooltip = writable({
    x: 0,
    y: 0,
    data: null,
    show: showTooltip,
    hide: hideTooltip,
    mode
  }) } = $$props;
  $$unsubscribe_tooltip = subscribe(tooltip, (value) => $tooltip = value);
  setTooltipContext(tooltip);
  let { hideDelay = 0 } = $$props;
  let hideTimeoutId;
  let tooltipContextNode;
  function findData(previousValue, currentValue, valueAtPoint, accessor2) {
    switch (findTooltipData) {
      case "closest":
        if (currentValue === void 0) {
          return previousValue;
        } else if (previousValue === void 0) {
          return currentValue;
        } else {
          return Number(valueAtPoint) - Number(accessor2(previousValue)) > Number(accessor2(currentValue)) - Number(valueAtPoint) ? currentValue : previousValue;
        }
      case "left":
        return previousValue;
      case "right":
      default:
        return currentValue;
    }
  }
  function showTooltip(e, tooltipData) {
    if (hideTimeoutId) {
      clearTimeout(hideTimeoutId);
    }
    if (locked) {
      return;
    }
    const containerNode = e.target.closest(".layercake-container");
    const point = localPoint(e, containerNode);
    if (tooltipData == null && // mode !== 'manual' but support annotations
    (point.x < tooltipContextNode.offsetLeft || point.x > tooltipContextNode.offsetLeft + tooltipContextNode.offsetWidth || point.y < tooltipContextNode.offsetTop || point.y > tooltipContextNode.offsetTop + tooltipContextNode.offsetHeight)) {
      hideTooltip();
      return;
    }
    if (tooltipData == null) {
      switch (mode) {
        case "bisect-x": {
          let xValueAtPoint;
          if ($radial) {
            const { radians } = cartesianToPolar(point.x - $width / 2, point.y - $height / 2);
            xValueAtPoint = scaleInvert($xScale, radians);
          } else {
            xValueAtPoint = scaleInvert($xScale, point.x - $padding.left);
          }
          const index = bisectX($flatData, xValueAtPoint, 1);
          const previousValue = $flatData[index - 1];
          const currentValue = $flatData[index];
          tooltipData = findData(previousValue, currentValue, xValueAtPoint, $x);
          break;
        }
        case "bisect-y": {
          const yValueAtPoint = scaleInvert($yScale, point.y - $padding.top);
          const index = bisectY($flatData, yValueAtPoint, 1);
          const previousValue = $flatData[index - 1];
          const currentValue = $flatData[index];
          tooltipData = findData(previousValue, currentValue, yValueAtPoint, $y);
          break;
        }
        case "bisect-band": {
          const xValueAtPoint = scaleInvert($xScale, point.x);
          const yValueAtPoint = scaleInvert($yScale, point.y);
          if (isScaleBand($xScale)) {
            const bandData = $flatData.filter((d) => $x(d) === xValueAtPoint).sort(sortFunc($y));
            const index = bisectY(bandData, yValueAtPoint, 1);
            const previousValue = bandData[index - 1];
            const currentValue = bandData[index];
            tooltipData = findData(previousValue, currentValue, yValueAtPoint, $y);
          } else if (isScaleBand($yScale)) {
            const bandData = $flatData.filter((d) => $y(d) === yValueAtPoint).sort(sortFunc($x));
            const index = bisectX(bandData, xValueAtPoint, 1);
            const previousValue = bandData[index - 1];
            const currentValue = bandData[index];
            tooltipData = findData(previousValue, currentValue, xValueAtPoint, $x);
          } else ;
          break;
        }
        case "quadtree": {
          tooltipData = quadtree$1.find(point.x, point.y, radius);
          break;
        }
      }
    }
    if (tooltipData) {
      if (raiseTarget) {
        raise(e.target);
      }
      set_store_value(
        tooltip,
        $tooltip = {
          ...$tooltip,
          x: point.x,
          y: point.y,
          data: tooltipData
        },
        $tooltip
      );
    } else {
      hideTooltip();
    }
  }
  function hideTooltip() {
    if (locked) {
      return;
    }
    hideTimeoutId = setTimeout(
      () => {
        {
          set_store_value(tooltip, $tooltip = { ...$tooltip, data: null }, $tooltip);
        }
      },
      hideDelay
    );
  }
  let quadtree$1;
  let rects = [];
  if ($$props.mode === void 0 && $$bindings.mode && mode !== void 0) $$bindings.mode(mode);
  if ($$props.findTooltipData === void 0 && $$bindings.findTooltipData && findTooltipData !== void 0) $$bindings.findTooltipData(findTooltipData);
  if ($$props.raiseTarget === void 0 && $$bindings.raiseTarget && raiseTarget !== void 0) $$bindings.raiseTarget(raiseTarget);
  if ($$props.locked === void 0 && $$bindings.locked && locked !== void 0) $$bindings.locked(locked);
  if ($$props.radius === void 0 && $$bindings.radius && radius !== void 0) $$bindings.radius(radius);
  if ($$props.debug === void 0 && $$bindings.debug && debug !== void 0) $$bindings.debug(debug);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.tooltip === void 0 && $$bindings.tooltip && tooltip !== void 0) $$bindings.tooltip(tooltip);
  if ($$props.hideDelay === void 0 && $$bindings.hideDelay && hideDelay !== void 0) $$bindings.hideDelay(hideDelay);
  bisectX = bisector((d) => {
    const value = $x(d);
    if (Array.isArray(value)) {
      return value[0];
    } else {
      return value;
    }
  }).left;
  bisectY = bisector((d) => {
    const value = $y(d);
    if (Array.isArray(value)) {
      return value[0];
    } else {
      return value;
    }
  }).left;
  {
    if (mode === "quadtree") {
      quadtree$1 = quadtree().extent([[0, 0], [$width, $height]]).x((d) => {
        const value = $xGet(d);
        if (Array.isArray(value)) {
          return min(value);
        } else {
          return value;
        }
      }).y((d) => {
        const value = $yGet(d);
        if (Array.isArray(value)) {
          return min(value);
        } else {
          return value;
        }
      }).addAll($flatData);
    }
  }
  {
    if (mode === "bounds" || mode === "band") {
      rects = $flatData.map((d) => {
        const xValue = $xGet(d);
        const yValue = $yGet(d);
        const x2 = Array.isArray(xValue) ? xValue[0] : xValue;
        const y2 = Array.isArray(yValue) ? yValue[0] : yValue;
        const xOffset = isScaleBand($xScale) ? $xScale.padding() * $xScale.step() / 2 : 0;
        const yOffset = isScaleBand($yScale) ? $yScale.padding() * $yScale.step() / 2 : 0;
        const fullWidth = max($xRange) - min($xRange);
        const fullHeight = max($yRange) - min($yRange);
        if (mode === "band") {
          return {
            x: isScaleBand($xScale) ? x2 - xOffset : min($xRange),
            y: isScaleBand($yScale) ? y2 - yOffset : min($yRange),
            width: isScaleBand($xScale) ? $xScale.step() : fullWidth,
            height: isScaleBand($yScale) ? $yScale.step() : fullHeight,
            data: d
          };
        } else if (mode === "bounds") {
          return {
            x: isScaleBand($xScale) || Array.isArray(xValue) ? x2 - xOffset : min($xRange),
            // y: isScaleBand($yScale) || Array.isArray(yValue) ? y - yOffset : min($yRange),
            y: y2 - yOffset,
            width: Array.isArray(xValue) ? xValue[1] - xValue[0] : isScaleBand($xScale) ? $xScale.step() : min($xRange) + x2,
            height: Array.isArray(yValue) ? yValue[1] - yValue[0] : isScaleBand($yScale) ? $yScale.step() : (
              // @ts-expect-error
              max($yRange) - y2
            ),
            data: d
          };
        }
      }).sort(sortFunc("x"));
    }
  }
  triggerPointerEvents = ["bisect-x", "bisect-y", "bisect-band", "quadtree"].includes(mode);
  $$unsubscribe_yRange();
  $$unsubscribe_yScale();
  $$unsubscribe_xRange();
  $$unsubscribe_xScale();
  $$unsubscribe_yGet();
  $$unsubscribe_xGet();
  $$unsubscribe_flatData();
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_tooltip();
  $$unsubscribe_x();
  $$unsubscribe_y();
  $$unsubscribe_padding();
  $$unsubscribe_radial();
  $$unsubscribe_containerWidth();
  $$unsubscribe_containerHeight();
  return `  <div${add_attribute("class", cls("TooltipContext absolute touch-none", debug && triggerPointerEvents && "bg-danger/10 outline outline-danger"), 0)}${add_styles({
    "top": `${$padding.top}px`,
    "left": `${$padding.left}px`,
    "width": `${$width}px`,
    "height": `${$height}px`
  })}${add_attribute("this", tooltipContextNode, 0)}> <div class="absolute"${add_styles({
    "top": `-${$padding.top ?? 0}px`,
    "left": `-${$padding.left ?? 0}px`,
    "width": `${$containerWidth}px`,
    "height": `${$containerHeight}px`
  })}>${slots.default ? slots.default({ tooltip: $tooltip }) : ``} ${mode === "voronoi" ? `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(Voronoi, "Voronoi").$$render(
        $$result,
        {
          onpointerenter: (e, { data }) => {
            showTooltip(e, data);
          },
          onpointermove: (e, { data }) => {
            showTooltip(e, data);
          },
          onpointerleave: hideTooltip,
          onpointerdown: (e) => {
            if (e.target?.hasPointerCapture(e.pointerId)) {
              e.target.releasePointerCapture(e.pointerId);
            }
          },
          onclick: (e, { data }) => {
            onclick(e, { data });
          },
          classes: {
            path: cls(debug && "fill-danger/10 stroke-danger")
          }
        },
        {},
        {}
      )}`;
    }
  })}` : `${mode === "bounds" || mode === "band" ? `${validate_component(Svg, "Svg").$$render($$result, {}, {}, {
    default: () => {
      return `<g class="tooltip-rects">${each(rects, (rect) => {
        return `<rect${add_attribute("x", rect.x, 0)}${add_attribute("y", rect.y, 0)}${add_attribute("width", rect.width, 0)}${add_attribute("height", rect.height, 0)}${add_attribute(
          "class",
          cls(debug ? "fill-danger/10 stroke-danger" : "fill-transparent"),
          0
        )}></rect>`;
      })}</g>`;
    }
  })}` : `${mode === "quadtree" && debug ? `${validate_component(Svg, "Svg").$$render($$result, { pointerEvents: false }, {}, {
    default: () => {
      return `${validate_component(ChartClipPath, "ChartClipPath").$$render($$result, {}, {}, {
        default: () => {
          return `<g class="tooltip-quadtree">${each(quadtreeRects(quadtree$1, false), (rect) => {
            return `<rect${add_attribute("x", rect.x, 0)}${add_attribute("y", rect.y, 0)}${add_attribute("width", rect.width, 0)}${add_attribute("height", rect.height, 0)}${add_attribute(
              "class",
              cls(debug ? "fill-danger/10 stroke-danger" : "fill-transparent"),
              0
            )}></rect>`;
          })}</g>`;
        }
      })}`;
    }
  })}` : ``}`}`}</div></div>`;
});
const brushContextKey = Symbol();
function setBrushContext(brush) {
  setContext(brushContextKey, brush);
}
const BrushContext = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let xDomainMin;
  let xDomainMax;
  let yDomainMin;
  let yDomainMax;
  let top;
  let bottom;
  let left;
  let right;
  let _range;
  let $brush, $$unsubscribe_brush;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $xScale, $$unsubscribe_xScale;
  let $yScale, $$unsubscribe_yScale;
  let $config, $$unsubscribe_config;
  let $padding, $$unsubscribe_padding;
  let $containerWidth, $$unsubscribe_containerWidth;
  let $containerHeight, $$unsubscribe_containerHeight;
  const { xScale, yScale, width, height, padding, containerWidth, containerHeight, config } = chartContext();
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  $$unsubscribe_containerWidth = subscribe(containerWidth, (value) => $containerWidth = value);
  $$unsubscribe_containerHeight = subscribe(containerHeight, (value) => $containerHeight = value);
  $$unsubscribe_config = subscribe(config, (value) => $config = value);
  let { axis = "x" } = $$props;
  let { handleSize = 5 } = $$props;
  let { resetOnEnd = false } = $$props;
  let { xDomain = $xScale.domain() } = $$props;
  let { yDomain = $yScale.domain() } = $$props;
  let { mode = "integrated" } = $$props;
  let { disabled = false } = $$props;
  const originalXDomain = $config.xDomain;
  const originalYDomain = $config.yDomain;
  let { range: range2 = void 0 } = $$props;
  let { handle = void 0 } = $$props;
  let { classes = {} } = $$props;
  let { onchange = () => {
  } } = $$props;
  let { onbrushstart = () => {
  } } = $$props;
  let { onbrushend = () => {
  } } = $$props;
  let { onreset = () => {
  } } = $$props;
  let { brush = writable({
    xDomain: null,
    yDomain: null,
    isActive: false,
    range: { x: 0, y: 0, width: 0, height: 0 },
    handleSize: 0
  }) } = $$props;
  $$unsubscribe_brush = subscribe(brush, (value) => $brush = value);
  setBrushContext(brush);
  let rootEl;
  new Logger("BrushContext");
  let isActive = false;
  if ($$props.axis === void 0 && $$bindings.axis && axis !== void 0) $$bindings.axis(axis);
  if ($$props.handleSize === void 0 && $$bindings.handleSize && handleSize !== void 0) $$bindings.handleSize(handleSize);
  if ($$props.resetOnEnd === void 0 && $$bindings.resetOnEnd && resetOnEnd !== void 0) $$bindings.resetOnEnd(resetOnEnd);
  if ($$props.xDomain === void 0 && $$bindings.xDomain && xDomain !== void 0) $$bindings.xDomain(xDomain);
  if ($$props.yDomain === void 0 && $$bindings.yDomain && yDomain !== void 0) $$bindings.yDomain(yDomain);
  if ($$props.mode === void 0 && $$bindings.mode && mode !== void 0) $$bindings.mode(mode);
  if ($$props.disabled === void 0 && $$bindings.disabled && disabled !== void 0) $$bindings.disabled(disabled);
  if ($$props.range === void 0 && $$bindings.range && range2 !== void 0) $$bindings.range(range2);
  if ($$props.handle === void 0 && $$bindings.handle && handle !== void 0) $$bindings.handle(handle);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0) $$bindings.classes(classes);
  if ($$props.onchange === void 0 && $$bindings.onchange && onchange !== void 0) $$bindings.onchange(onchange);
  if ($$props.onbrushstart === void 0 && $$bindings.onbrushstart && onbrushstart !== void 0) $$bindings.onbrushstart(onbrushstart);
  if ($$props.onbrushend === void 0 && $$bindings.onbrushend && onbrushend !== void 0) $$bindings.onbrushend(onbrushend);
  if ($$props.onreset === void 0 && $$bindings.onreset && onreset !== void 0) $$bindings.onreset(onreset);
  if ($$props.brush === void 0 && $$bindings.brush && brush !== void 0) $$bindings.brush(brush);
  [xDomainMin, xDomainMax] = extent($xScale.domain());
  [yDomainMin, yDomainMax] = extent($yScale.domain());
  top = $yScale(yDomain?.[1]);
  bottom = $yScale(yDomain?.[0]);
  left = $xScale(xDomain?.[0]);
  right = $xScale(xDomain?.[1]);
  _range = {
    x: axis === "both" || axis === "x" ? left : 0,
    y: axis === "both" || axis === "y" ? top : 0,
    width: axis === "both" || axis === "x" ? right - left : $width,
    height: axis === "both" || axis === "y" ? bottom - top : $height
  };
  {
    if (mode === "separated") {
      const isXAxisActive = xDomain?.[0]?.valueOf() !== originalXDomain?.[0]?.valueOf() || xDomain?.[1]?.valueOf() !== originalXDomain?.[1]?.valueOf();
      const isYAxisActive = yDomain?.[0]?.valueOf() !== originalYDomain?.[0]?.valueOf() || yDomain?.[1]?.valueOf() !== originalYDomain?.[1]?.valueOf();
      isActive = axis === "x" ? isXAxisActive : axis == "y" ? isYAxisActive : isXAxisActive || isYAxisActive;
    }
  }
  set_store_value(
    brush,
    $brush = {
      xDomain,
      yDomain,
      isActive,
      range: _range,
      handleSize
    },
    $brush
  );
  $$unsubscribe_brush();
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_xScale();
  $$unsubscribe_yScale();
  $$unsubscribe_config();
  $$unsubscribe_padding();
  $$unsubscribe_containerWidth();
  $$unsubscribe_containerHeight();
  return `${disabled ? `${slots.default ? slots.default({}) : ``}` : ` <div${add_attribute("class", cls("BrushContext absolute touch-none"), 0)}${add_styles({
    "top": `${$padding.top}px`,
    "left": `${$padding.left}px`,
    "width": `${$width}px`,
    "height": `${$height}px`
  })}${add_attribute("this", rootEl, 0)}><div class="absolute"${add_styles({
    "top": `-${$padding.top ?? 0}px`,
    "left": `-${$padding.left ?? 0}px`,
    "width": `${$containerWidth}px`,
    "height": `${$containerHeight}px`
  })}>${slots.default ? slots.default({ brush: $brush }) : ``}</div> ${isActive ? `<div${spread(
    [
      escape_object(range2),
      {
        class: escape_attribute_value(cls("range", "absolute bg-surface-content/10 cursor-move select-none", "z-10", classes.range, range2?.class))
      }
    ],
    {
      styles: {
        "left": `${_range.x}px`,
        "top": `${_range.y}px`,
        "width": `${_range.width}px`,
        "height": `${_range.height}px`
      }
    }
  )}></div> ${axis === "both" || axis === "y" ? `<div${spread(
    [
      escape_object(handle),
      {
        class: escape_attribute_value(cls("handle top", "cursor-ns-resize select-none", "range absolute", "z-10", classes.handle, handle?.class))
      }
    ],
    {
      styles: {
        "left": `${_range.x}px`,
        "top": `${_range.y}px`,
        "width": `${_range.width}px`,
        "height": `${handleSize}px`
      }
    }
  )}></div> <div${spread(
    [
      escape_object(handle),
      {
        class: escape_attribute_value(cls("handle bottom", "cursor-ns-resize select-none", "range absolute", "z-10", classes.handle, handle?.class))
      }
    ],
    {
      styles: {
        "left": `${_range.x}px`,
        "top": `${bottom - handleSize}px`,
        "width": `${_range.width}px`,
        "height": `${handleSize}px`
      }
    }
  )}></div>` : ``} ${axis === "both" || axis === "x" ? `<div${spread(
    [
      escape_object(handle),
      {
        class: escape_attribute_value(cls("handle left", "cursor-ew-resize select-none", "range absolute", "z-10", classes.handle, handle?.class))
      }
    ],
    {
      styles: {
        "left": `${_range.x}px`,
        "top": `${_range.y}px`,
        "width": `${handleSize}px`,
        "height": `${_range.height}px`
      }
    }
  )}></div> <div${spread(
    [
      escape_object(handle),
      {
        class: escape_attribute_value(cls("handle right", "cursor-ew-resize select-none", "range absolute", "z-10", classes.handle, handle?.class))
      }
    ],
    {
      styles: {
        "left": `${right - handleSize + 1}px`,
        "top": `${_range.y}px`,
        "width": `${handleSize}px`,
        "height": `${_range.height}px`
      }
    }
  )}></div>` : ``}` : ``}</div>`}`;
});
const renderContextKey = Symbol();
function getRenderContext() {
  return getContext(renderContextKey);
}
function setRenderContext(context) {
  setContext(renderContextKey, context);
}
const Chart = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let yReverse;
  let _x;
  let _y;
  let _yRange;
  let $$restProps = compute_rest_props($$props, [
    "data",
    "x",
    "xRange",
    "y",
    "yScale",
    "yRange",
    "x1",
    "x1Scale",
    "x1Domain",
    "x1Range",
    "y1",
    "y1Scale",
    "y1Domain",
    "y1Range",
    "c",
    "cScale",
    "cDomain",
    "cRange",
    "xBaseline",
    "yBaseline",
    "radial",
    "geo",
    "geoProjection",
    "tooltip",
    "tooltipContext",
    "transform",
    "transformContext",
    "brush",
    "brushContext",
    "onresize",
    "ondragstart",
    "ondragend",
    "ontransform"
  ]);
  let $geoProjection, $$unsubscribe_geoProjection = noop, $$subscribe_geoProjection = () => ($$unsubscribe_geoProjection(), $$unsubscribe_geoProjection = subscribe(geoProjection, ($$value) => $geoProjection = $$value), geoProjection);
  let { data = [] } = $$props;
  let { x = void 0 } = $$props;
  let { xRange = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { yScale = void 0 } = $$props;
  let { yRange = void 0 } = $$props;
  let { x1 = void 0 } = $$props;
  let { x1Scale = void 0 } = $$props;
  let { x1Domain = void 0 } = $$props;
  let { x1Range = void 0 } = $$props;
  let { y1 = void 0 } = $$props;
  let { y1Scale = void 0 } = $$props;
  let { y1Domain = void 0 } = $$props;
  let { y1Range = void 0 } = $$props;
  let { c = void 0 } = $$props;
  let { cScale = void 0 } = $$props;
  let { cDomain = void 0 } = $$props;
  let { cRange = void 0 } = $$props;
  let { xBaseline = null } = $$props;
  let xDomain = void 0;
  let { yBaseline = null } = $$props;
  let yDomain = void 0;
  let { radial = false } = $$props;
  let { geo = void 0 } = $$props;
  let { geoProjection = void 0 } = $$props;
  $$subscribe_geoProjection();
  let { tooltip = void 0 } = $$props;
  let { tooltipContext: tooltipContext2 = void 0 } = $$props;
  let { transform = void 0 } = $$props;
  let { transformContext: transformContext2 = void 0 } = $$props;
  let { brush = void 0 } = $$props;
  let { brushContext = void 0 } = $$props;
  let { onresize = void 0 } = $$props;
  let { ondragstart = void 0 } = $$props;
  let { ondragend = void 0 } = $$props;
  let { ontransform = void 0 } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.xRange === void 0 && $$bindings.xRange && xRange !== void 0) $$bindings.xRange(xRange);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.yScale === void 0 && $$bindings.yScale && yScale !== void 0) $$bindings.yScale(yScale);
  if ($$props.yRange === void 0 && $$bindings.yRange && yRange !== void 0) $$bindings.yRange(yRange);
  if ($$props.x1 === void 0 && $$bindings.x1 && x1 !== void 0) $$bindings.x1(x1);
  if ($$props.x1Scale === void 0 && $$bindings.x1Scale && x1Scale !== void 0) $$bindings.x1Scale(x1Scale);
  if ($$props.x1Domain === void 0 && $$bindings.x1Domain && x1Domain !== void 0) $$bindings.x1Domain(x1Domain);
  if ($$props.x1Range === void 0 && $$bindings.x1Range && x1Range !== void 0) $$bindings.x1Range(x1Range);
  if ($$props.y1 === void 0 && $$bindings.y1 && y1 !== void 0) $$bindings.y1(y1);
  if ($$props.y1Scale === void 0 && $$bindings.y1Scale && y1Scale !== void 0) $$bindings.y1Scale(y1Scale);
  if ($$props.y1Domain === void 0 && $$bindings.y1Domain && y1Domain !== void 0) $$bindings.y1Domain(y1Domain);
  if ($$props.y1Range === void 0 && $$bindings.y1Range && y1Range !== void 0) $$bindings.y1Range(y1Range);
  if ($$props.c === void 0 && $$bindings.c && c !== void 0) $$bindings.c(c);
  if ($$props.cScale === void 0 && $$bindings.cScale && cScale !== void 0) $$bindings.cScale(cScale);
  if ($$props.cDomain === void 0 && $$bindings.cDomain && cDomain !== void 0) $$bindings.cDomain(cDomain);
  if ($$props.cRange === void 0 && $$bindings.cRange && cRange !== void 0) $$bindings.cRange(cRange);
  if ($$props.xBaseline === void 0 && $$bindings.xBaseline && xBaseline !== void 0) $$bindings.xBaseline(xBaseline);
  if ($$props.yBaseline === void 0 && $$bindings.yBaseline && yBaseline !== void 0) $$bindings.yBaseline(yBaseline);
  if ($$props.radial === void 0 && $$bindings.radial && radial !== void 0) $$bindings.radial(radial);
  if ($$props.geo === void 0 && $$bindings.geo && geo !== void 0) $$bindings.geo(geo);
  if ($$props.geoProjection === void 0 && $$bindings.geoProjection && geoProjection !== void 0) $$bindings.geoProjection(geoProjection);
  if ($$props.tooltip === void 0 && $$bindings.tooltip && tooltip !== void 0) $$bindings.tooltip(tooltip);
  if ($$props.tooltipContext === void 0 && $$bindings.tooltipContext && tooltipContext2 !== void 0) $$bindings.tooltipContext(tooltipContext2);
  if ($$props.transform === void 0 && $$bindings.transform && transform !== void 0) $$bindings.transform(transform);
  if ($$props.transformContext === void 0 && $$bindings.transformContext && transformContext2 !== void 0) $$bindings.transformContext(transformContext2);
  if ($$props.brush === void 0 && $$bindings.brush && brush !== void 0) $$bindings.brush(brush);
  if ($$props.brushContext === void 0 && $$bindings.brushContext && brushContext !== void 0) $$bindings.brushContext(brushContext);
  if ($$props.onresize === void 0 && $$bindings.onresize && onresize !== void 0) $$bindings.onresize(onresize);
  if ($$props.ondragstart === void 0 && $$bindings.ondragstart && ondragstart !== void 0) $$bindings.ondragstart(ondragstart);
  if ($$props.ondragend === void 0 && $$bindings.ondragend && ondragend !== void 0) $$bindings.ondragend(ondragend);
  if ($$props.ontransform === void 0 && $$bindings.ontransform && ontransform !== void 0) $$bindings.ontransform(ontransform);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    {
      if (xBaseline != null && Array.isArray(data)) {
        const xValues = data.flatMap(accessor(x));
        xDomain = [min([xBaseline, ...xValues]), max([xBaseline, ...xValues])];
      }
    }
    {
      if (yBaseline != null && Array.isArray(data)) {
        const yValues = data.flatMap(accessor(y));
        yDomain = [min([yBaseline, ...yValues]), max([yBaseline, ...yValues])];
      }
    }
    yReverse = yScale ? !isScaleBand(yScale) : true;
    _x = x;
    _y = y;
    _yRange = yRange ?? (radial ? ({ height }) => [0, height / 2] : void 0);
    $$rendered = ` ${validate_component(LayerCake, "LayerCake").$$render(
      $$result,
      Object.assign(
        {},
        { data },
        { x: _x },
        { xDomain },
        {
          xRange: xRange ?? (radial ? [0, 2 * Math.PI] : void 0)
        },
        { y: _y },
        { yScale },
        { yDomain },
        { yRange: _yRange },
        { yReverse },
        { xDomainSort: false },
        { yDomainSort: false },
        { zDomainSort: false },
        { rDomainSort: false },
        $$restProps
      ),
      {},
      {
        default: ({ aspectRatio, containerHeight, containerWidth, height, width, element, x: x2, xScale, xGet, y: y2, yScale: yScale2, yGet, z, zScale, zGet, r, rScale, rGet, padding }) => {
          let initialTransform = geo?.applyTransform?.includes("translate") && geo?.fitGeojson && geo?.projection ? geoFitObjectTransform(geo.projection(), [width, height], geo.fitGeojson) : void 0;
          return ` ${validate_component(ChartContext, "ChartContext").$$render(
            $$result,
            {
              data,
              radial,
              x1,
              x1Scale,
              x1Domain,
              x1Range,
              y1,
              y1Scale,
              y1Domain,
              y1Range,
              c,
              cScale,
              cDomain,
              cRange,
              onresize
            },
            {},
            {
              default: ({ data: data2, flatData, config, x1: x12, x1Scale: x1Scale2, x1Get, y1: y12, y1Scale: y1Scale2, y1Get, c: c2, cScale: cScale2, cGet }) => {
                return `${validate_component(TransformContext, "TransformContext").$$render(
                  $$result,
                  Object.assign(
                    {},
                    {
                      mode: transform?.mode ?? geo?.applyTransform?.length ? "manual" : "none"
                    },
                    {
                      initialTranslate: initialTransform?.translate
                    },
                    { initialScale: initialTransform?.scale },
                    {
                      processTranslate: geo ? (x3, y3, deltaX, deltaY) => {
                        if (geo.applyTransform?.includes("rotate")) {
                          const projectionScale = $geoProjection.scale();
                          const sensitivity = 75;
                          return {
                            x: x3 + deltaX * (sensitivity / projectionScale),
                            y: y3 + deltaY * (sensitivity / projectionScale) * -1
                          };
                        } else {
                          return { x: x3 + deltaX, y: y3 + deltaY };
                        }
                      } : void 0
                    },
                    transform,
                    { ondragstart },
                    { ontransform },
                    { ondragend },
                    { this: transformContext2 }
                  ),
                  {
                    this: ($$value) => {
                      transformContext2 = $$value;
                      $$settled = false;
                    }
                  },
                  {
                    default: ({ transform: _transform }) => {
                      return `${validate_component(GeoContext, "GeoContext").$$render(
                        $$result,
                        Object.assign({}, geo, { geo: geoProjection }),
                        {
                          geo: ($$value) => {
                            geoProjection = $$value;
                            $$settled = false;
                          }
                        },
                        {
                          default: ({ projection }) => {
                            let brushProps = typeof brush === "object" ? brush : { disabled: !brush };
                            return `${validate_component(BrushContext, "BrushContext").$$render(
                              $$result,
                              Object.assign({}, brushProps, { brush: brushContext }),
                              {
                                brush: ($$value) => {
                                  brushContext = $$value;
                                  $$settled = false;
                                }
                              },
                              {
                                default: ({ brush: brush2 }) => {
                                  let tooltipProps = typeof tooltip === "object" ? tooltip : {};
                                  return `${validate_component(TooltipContext, "TooltipContext").$$render(
                                    $$result,
                                    Object.assign({}, tooltipProps, { tooltip: tooltipContext2 }),
                                    {
                                      tooltip: ($$value) => {
                                        tooltipContext2 = $$value;
                                        $$settled = false;
                                      }
                                    },
                                    {
                                      default: ({ tooltip: tooltip2 }) => {
                                        return `${slots.default ? slots.default({
                                          aspectRatio,
                                          containerHeight,
                                          containerWidth,
                                          height,
                                          width,
                                          element,
                                          projection,
                                          transform: _transform,
                                          tooltip: tooltip2,
                                          brush: brush2,
                                          x: x2,
                                          xScale,
                                          xGet,
                                          y: y2,
                                          yScale: yScale2,
                                          yGet,
                                          z,
                                          zScale,
                                          zGet,
                                          r,
                                          rScale,
                                          rGet,
                                          x1: x12,
                                          x1Scale: x1Scale2,
                                          x1Get,
                                          y1: y12,
                                          y1Scale: y1Scale2,
                                          y1Get,
                                          c: c2,
                                          cScale: cScale2,
                                          cGet,
                                          padding,
                                          data: data2,
                                          flatData,
                                          config
                                        }) : ``}`;
                                      }
                                    }
                                  )}`;
                                }
                              }
                            )}`;
                          }
                        }
                      )}`;
                    }
                  }
                )}`;
              }
            }
          )}`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_geoProjection();
  return $$rendered;
});
const Area = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let xAccessor;
  let y0Accessor;
  let y1Accessor;
  let xOffset;
  let yOffset;
  let tweened_d;
  let $$restProps = compute_rest_props($$props, [
    "data",
    "pathData",
    "x",
    "y0",
    "y1",
    "tweened",
    "clipPath",
    "curve",
    "defined",
    "line",
    "fill",
    "fillOpacity",
    "stroke",
    "strokeWidth",
    "class",
    "onclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave"
  ]);
  let $tweened_d, $$unsubscribe_tweened_d = noop, $$subscribe_tweened_d = () => ($$unsubscribe_tweened_d(), $$unsubscribe_tweened_d = subscribe(tweened_d, ($$value) => $tweened_d = $$value), tweened_d);
  let $contextData, $$unsubscribe_contextData;
  let $y, $$unsubscribe_y;
  let $yScale, $$unsubscribe_yScale;
  let $config, $$unsubscribe_config;
  let $yRange, $$unsubscribe_yRange;
  let $xScale, $$unsubscribe_xScale;
  let $radial, $$unsubscribe_radial;
  let $yDomain, $$unsubscribe_yDomain;
  let $contextX, $$unsubscribe_contextX;
  const { data: contextData, xScale, yScale, x: contextX, y, yDomain, yRange, radial, config } = chartContext();
  $$unsubscribe_contextData = subscribe(contextData, (value) => $contextData = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_contextX = subscribe(contextX, (value) => $contextX = value);
  $$unsubscribe_y = subscribe(y, (value) => $y = value);
  $$unsubscribe_yDomain = subscribe(yDomain, (value) => $yDomain = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  $$unsubscribe_radial = subscribe(radial, (value) => $radial = value);
  $$unsubscribe_config = subscribe(config, (value) => $config = value);
  let { data = void 0 } = $$props;
  let { pathData = void 0 } = $$props;
  let { x = void 0 } = $$props;
  let { y0 = void 0 } = $$props;
  let { y1 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let { clipPath = void 0 } = $$props;
  let { curve = void 0 } = $$props;
  let { defined = void 0 } = $$props;
  let { line: line2 = false } = $$props;
  let { fill = void 0 } = $$props;
  let { fillOpacity = void 0 } = $$props;
  let { stroke = void 0 } = $$props;
  let { strokeWidth = void 0 } = $$props;
  let { class: className = void 0 } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  function defaultPathData() {
    if (!tweenedOptions) {
      return "";
    } else if (pathData) {
      return flattenPathData(pathData, Math.min($yScale(0), $yRange[0]));
    } else if ($config.x) {
      const path2 = $radial ? areaRadial().angle((d) => $xScale(xAccessor(d))).innerRadius((d) => Math.min($yScale(0), $yRange[0])).outerRadius((d) => Math.min($yScale(0), $yRange[0])) : area().x((d) => $xScale(xAccessor(d)) + xOffset).y0((d) => Math.min($yScale(0), $yRange[0])).y1((d) => Math.min($yScale(0), $yRange[0]));
      path2.defined(defined ?? ((d) => xAccessor(d) != null && y1Accessor(d) != null));
      if (curve) path2.curve(curve);
      return path2(data ?? $contextData);
    }
  }
  const tweenedOptions = tweened2 ? {
    interpolate: interpolatePath,
    ...typeof tweened2 === "object" ? tweened2 : null
  } : false;
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  function render2(ctx, styleOverrides) {
    renderPathData(ctx, $tweened_d, styleOverrides ? merge({ styles: { strokeWidth } }, styleOverrides) : {
      styles: { fill, fillOpacity, stroke, strokeWidth },
      classes: className
    });
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.pathData === void 0 && $$bindings.pathData && pathData !== void 0) $$bindings.pathData(pathData);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y0 === void 0 && $$bindings.y0 && y0 !== void 0) $$bindings.y0(y0);
  if ($$props.y1 === void 0 && $$bindings.y1 && y1 !== void 0) $$bindings.y1(y1);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  if ($$props.clipPath === void 0 && $$bindings.clipPath && clipPath !== void 0) $$bindings.clipPath(clipPath);
  if ($$props.curve === void 0 && $$bindings.curve && curve !== void 0) $$bindings.curve(curve);
  if ($$props.defined === void 0 && $$bindings.defined && defined !== void 0) $$bindings.defined(defined);
  if ($$props.line === void 0 && $$bindings.line && line2 !== void 0) $$bindings.line(line2);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.fillOpacity === void 0 && $$bindings.fillOpacity && fillOpacity !== void 0) $$bindings.fillOpacity(fillOpacity);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  xAccessor = x ? accessor(x) : $contextX;
  y0Accessor = y0 ? accessor(y0) : (d) => min($yDomain);
  y1Accessor = y1 ? accessor(y1) : $y;
  xOffset = isScaleBand($xScale) ? $xScale.bandwidth() / 2 : 0;
  yOffset = isScaleBand($yScale) ? $yScale.bandwidth() / 2 : 0;
  $$subscribe_tweened_d(tweened_d = motionStore(defaultPathData(), { tweened: tweenedOptions }));
  {
    {
      const path2 = $radial ? areaRadial().angle((d2) => $xScale(xAccessor(d2))).innerRadius((d2) => $yScale(y0Accessor(d2))).outerRadius((d2) => $yScale(y1Accessor(d2))) : area().x((d2) => $xScale(xAccessor(d2)) + xOffset).y0((d2) => {
        let value = max($yRange);
        if (y0) {
          value = $yScale(y0Accessor(d2));
        } else if (Array.isArray($config.y) && $config.y[0] === 0) {
          value = $yScale($y(d2)[0]);
        }
        return value + yOffset;
      }).y1((d2) => {
        let value = max($yRange);
        if (y1) {
          value = $yScale(y1Accessor(d2));
        } else if (Array.isArray($config.y) && $config.y[1] === 1) {
          value = $yScale($y(d2)[1]);
        } else {
          value = $yScale($y(d2));
        }
        return value + yOffset;
      });
      path2.defined(defined ?? ((d2) => xAccessor(d2) != null && y1Accessor(d2) != null));
      if (curve) path2.curve(curve);
      const d = pathData ?? path2(data ?? $contextData);
      tweened_d.set(d ?? "");
    }
  }
  fill && typeof fill === "object" ? objectId(fill) : fill;
  stroke && typeof stroke === "object" ? objectId(stroke) : stroke;
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({
        name: "Area",
        render: render2,
        events: {
          click: onclick,
          pointerenter: onpointerenter,
          pointermove: onpointermove,
          pointerleave: onpointerleave
        }
      });
      tweened_d.subscribe(() => {
        canvasContext.invalidate();
      });
    }
  }
  $$unsubscribe_tweened_d();
  $$unsubscribe_contextData();
  $$unsubscribe_y();
  $$unsubscribe_yScale();
  $$unsubscribe_config();
  $$unsubscribe_yRange();
  $$unsubscribe_xScale();
  $$unsubscribe_radial();
  $$unsubscribe_yDomain();
  $$unsubscribe_contextX();
  return `${line2 ? `${validate_component(Spline, "Spline").$$render($$result, Object.assign({}, { data }, { x }, { y: y1 }, { curve }, { defined }, { tweened: tweened2 }, typeof line2 === "object" ? line2 : null), {}, {})}` : ``} ${renderContext === "svg" ? ` <path${spread(
    [
      { d: escape_attribute_value($tweened_d) },
      {
        "clip-path": escape_attribute_value(clipPath)
      },
      { fill: escape_attribute_value(fill) },
      {
        "fill-opacity": escape_attribute_value(fillOpacity)
      },
      { stroke: escape_attribute_value(stroke) },
      {
        "stroke-width": escape_attribute_value(strokeWidth)
      },
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls("path-area", className))
      }
    ],
    {}
  )}></path>` : ``}`;
});
const Line = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let markerStartId;
  let markerEndId;
  let $$restProps = compute_rest_props($$props, [
    "x1",
    "initialX1",
    "y1",
    "initialY1",
    "x2",
    "initialX2",
    "y2",
    "initialY2",
    "fill",
    "stroke",
    "strokeWidth",
    "class",
    "onclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave",
    "marker",
    "markerStart",
    "markerEnd",
    "spring",
    "tweened"
  ]);
  let $$slots = compute_slots(slots);
  let $tweened_y2, $$unsubscribe_tweened_y2;
  let $tweened_x2, $$unsubscribe_tweened_x2;
  let $tweened_y1, $$unsubscribe_tweened_y1;
  let $tweened_x1, $$unsubscribe_tweened_x1;
  let { x1 } = $$props;
  let { initialX1 = x1 } = $$props;
  let { y1 } = $$props;
  let { initialY1 = y1 } = $$props;
  let { x2 } = $$props;
  let { initialX2 = x2 } = $$props;
  let { y2 } = $$props;
  let { initialY2 = y2 } = $$props;
  let { fill = void 0 } = $$props;
  let { stroke = void 0 } = $$props;
  let { strokeWidth = void 0 } = $$props;
  let { class: className = void 0 } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { marker = void 0 } = $$props;
  let { markerStart = marker } = $$props;
  let { markerEnd = marker } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let tweened_x1 = motionStore(initialX1, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_x1 = subscribe(tweened_x1, (value) => $tweened_x1 = value);
  let tweened_y1 = motionStore(initialY1, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_y1 = subscribe(tweened_y1, (value) => $tweened_y1 = value);
  let tweened_x2 = motionStore(initialX2, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_x2 = subscribe(tweened_x2, (value) => $tweened_x2 = value);
  let tweened_y2 = motionStore(initialY2, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_y2 = subscribe(tweened_y2, (value) => $tweened_y2 = value);
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  function render2(ctx, styleOverrides) {
    const pathData = `M ${$tweened_x1},${$tweened_y1} L ${$tweened_x2},${$tweened_y2}`;
    renderPathData(ctx, pathData, styleOverrides ? merge({ styles: { strokeWidth } }, styleOverrides) : {
      styles: { fill, stroke, strokeWidth },
      classes: className
    });
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  if ($$props.x1 === void 0 && $$bindings.x1 && x1 !== void 0) $$bindings.x1(x1);
  if ($$props.initialX1 === void 0 && $$bindings.initialX1 && initialX1 !== void 0) $$bindings.initialX1(initialX1);
  if ($$props.y1 === void 0 && $$bindings.y1 && y1 !== void 0) $$bindings.y1(y1);
  if ($$props.initialY1 === void 0 && $$bindings.initialY1 && initialY1 !== void 0) $$bindings.initialY1(initialY1);
  if ($$props.x2 === void 0 && $$bindings.x2 && x2 !== void 0) $$bindings.x2(x2);
  if ($$props.initialX2 === void 0 && $$bindings.initialX2 && initialX2 !== void 0) $$bindings.initialX2(initialX2);
  if ($$props.y2 === void 0 && $$bindings.y2 && y2 !== void 0) $$bindings.y2(y2);
  if ($$props.initialY2 === void 0 && $$bindings.initialY2 && initialY2 !== void 0) $$bindings.initialY2(initialY2);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.marker === void 0 && $$bindings.marker && marker !== void 0) $$bindings.marker(marker);
  if ($$props.markerStart === void 0 && $$bindings.markerStart && markerStart !== void 0) $$bindings.markerStart(markerStart);
  if ($$props.markerEnd === void 0 && $$bindings.markerEnd && markerEnd !== void 0) $$bindings.markerEnd(markerEnd);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  markerStartId = markerStart || $$slots["markerStart"] ? uniqueId("marker-") : "";
  markerEndId = markerEnd || $$slots["markerEnd"] ? uniqueId("marker-") : "";
  {
    tick().then(() => {
      tweened_x1.set(x1);
      tweened_y1.set(y1);
      tweened_x2.set(x2);
      tweened_y2.set(y2);
    });
  }
  fill && typeof fill === "object" ? objectId(fill) : fill;
  stroke && typeof stroke === "object" ? objectId(stroke) : stroke;
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({
        name: "Line",
        render: render2,
        events: {
          click: onclick,
          pointerenter: onpointerenter,
          pointermove: onpointermove,
          pointerleave: onpointerleave
        }
      });
    }
  }
  $$unsubscribe_tweened_y2();
  $$unsubscribe_tweened_x2();
  $$unsubscribe_tweened_y1();
  $$unsubscribe_tweened_x1();
  return `${renderContext === "svg" ? ` <line${spread(
    [
      { x1: escape_attribute_value($tweened_x1) },
      { y1: escape_attribute_value($tweened_y1) },
      { x2: escape_attribute_value($tweened_x2) },
      { y2: escape_attribute_value($tweened_y2) },
      { fill: escape_attribute_value(fill) },
      { stroke: escape_attribute_value(stroke) },
      {
        "stroke-width": escape_attribute_value(strokeWidth)
      },
      {
        "marker-start": escape_attribute_value(markerStartId ? `url(#${markerStartId})` : void 0)
      },
      {
        "marker-end": escape_attribute_value(markerEndId ? `url(#${markerEndId})` : void 0)
      },
      {
        class: escape_attribute_value(cls(stroke === void 0 && "stroke-surface-content", className))
      },
      escape_object($$restProps)
    ],
    {}
  )}></line> ${slots.markerStart ? slots.markerStart({ id: markerStartId }) : ` ${markerStart ? `${validate_component(Marker, "Marker").$$render(
    $$result,
    Object.assign(
      {},
      { id: markerStartId },
      {
        type: typeof markerStart === "string" ? markerStart : void 0
      },
      typeof markerStart === "object" ? markerStart : null
    ),
    {},
    {}
  )}` : ``} `} ${slots.markerEnd ? slots.markerEnd({ id: markerEndId }) : ` ${validate_component(Marker, "Marker").$$render(
    $$result,
    Object.assign(
      {},
      { id: markerEndId },
      {
        type: typeof markerEnd === "string" ? markerEnd : void 0
      },
      typeof markerEnd === "object" ? markerEnd : null
    ),
    {},
    {}
  )} `}` : ``}`;
});
const Circle = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "cx",
    "initialCx",
    "cy",
    "initialCy",
    "r",
    "initialR",
    "spring",
    "tweened",
    "fill",
    "fillOpacity",
    "stroke",
    "strokeWidth",
    "class",
    "onclick",
    "onpointerdown",
    "onpointerenter",
    "onpointermove",
    "onpointerleave"
  ]);
  let $tweened_r, $$unsubscribe_tweened_r;
  let $tweened_cy, $$unsubscribe_tweened_cy;
  let $tweened_cx, $$unsubscribe_tweened_cx;
  let { cx = 0 } = $$props;
  let { initialCx = cx } = $$props;
  let { cy = 0 } = $$props;
  let { initialCy = cy } = $$props;
  let { r = 1 } = $$props;
  let { initialR = r } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let { fill = void 0 } = $$props;
  let { fillOpacity = void 0 } = $$props;
  let { stroke = void 0 } = $$props;
  let { strokeWidth = void 0 } = $$props;
  let { class: className = void 0 } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerdown = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let tweened_cx = motionStore(initialCx, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_cx = subscribe(tweened_cx, (value) => $tweened_cx = value);
  let tweened_cy = motionStore(initialCy, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_cy = subscribe(tweened_cy, (value) => $tweened_cy = value);
  let tweened_r = motionStore(initialR, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_r = subscribe(tweened_r, (value) => $tweened_r = value);
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  function render2(ctx, styleOverrides) {
    renderCircle(
      ctx,
      {
        cx: $tweened_cx,
        cy: $tweened_cy,
        r: $tweened_r
      },
      styleOverrides ? merge({ styles: { strokeWidth } }, styleOverrides) : {
        styles: { fill, fillOpacity, stroke, strokeWidth },
        classes: className
      }
    );
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  if ($$props.cx === void 0 && $$bindings.cx && cx !== void 0) $$bindings.cx(cx);
  if ($$props.initialCx === void 0 && $$bindings.initialCx && initialCx !== void 0) $$bindings.initialCx(initialCx);
  if ($$props.cy === void 0 && $$bindings.cy && cy !== void 0) $$bindings.cy(cy);
  if ($$props.initialCy === void 0 && $$bindings.initialCy && initialCy !== void 0) $$bindings.initialCy(initialCy);
  if ($$props.r === void 0 && $$bindings.r && r !== void 0) $$bindings.r(r);
  if ($$props.initialR === void 0 && $$bindings.initialR && initialR !== void 0) $$bindings.initialR(initialR);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.fillOpacity === void 0 && $$bindings.fillOpacity && fillOpacity !== void 0) $$bindings.fillOpacity(fillOpacity);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerdown === void 0 && $$bindings.onpointerdown && onpointerdown !== void 0) $$bindings.onpointerdown(onpointerdown);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  {
    tick().then(() => {
      tweened_cx.set(cx);
      tweened_cy.set(cy);
      tweened_r.set(r);
    });
  }
  fill && typeof fill === "object" ? objectId(fill) : fill;
  stroke && typeof stroke === "object" ? objectId(stroke) : stroke;
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({
        name: "Circle",
        render: render2,
        events: {
          click: onclick,
          pointerdown: onpointerdown,
          pointerenter: onpointerenter,
          pointermove: onpointermove,
          pointerleave: onpointerleave
        }
      });
    }
  }
  $$unsubscribe_tweened_r();
  $$unsubscribe_tweened_cy();
  $$unsubscribe_tweened_cx();
  return `${renderContext === "svg" ? ` <circle${spread(
    [
      { cx: escape_attribute_value($tweened_cx) },
      { cy: escape_attribute_value($tweened_cy) },
      { r: escape_attribute_value($tweened_r) },
      { fill: escape_attribute_value(fill) },
      {
        "fill-opacity": escape_attribute_value(fillOpacity)
      },
      { stroke: escape_attribute_value(stroke) },
      {
        "stroke-width": escape_attribute_value(strokeWidth)
      },
      {
        class: escape_attribute_value(cls(fill == null && "fill-surface-content", className))
      },
      escape_object($$restProps)
    ],
    {}
  )}></circle>` : ``}`;
});
const Rule = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let xRangeMin;
  let xRangeMax;
  let yRangeMin;
  let yRangeMax;
  let showRule;
  let $$restProps = compute_rest_props($$props, ["x", "xOffset", "y", "yOffset"]);
  let $yScale, $$unsubscribe_yScale;
  let $xScale, $$unsubscribe_xScale;
  let $yRange, $$unsubscribe_yRange;
  let $xRange, $$unsubscribe_xRange;
  let $radial, $$unsubscribe_radial;
  const { xScale, yScale, xRange, yRange, radial } = chartContext();
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_xRange = subscribe(xRange, (value) => $xRange = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  $$unsubscribe_radial = subscribe(radial, (value) => $radial = value);
  let { x = false } = $$props;
  let { xOffset = 0 } = $$props;
  let { y = false } = $$props;
  let { yOffset = 0 } = $$props;
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.xOffset === void 0 && $$bindings.xOffset && xOffset !== void 0) $$bindings.xOffset(xOffset);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.yOffset === void 0 && $$bindings.yOffset && yOffset !== void 0) $$bindings.yOffset(yOffset);
  [xRangeMin, xRangeMax] = extent($xRange);
  [yRangeMin, yRangeMax] = extent($yRange);
  showRule = (value, axis) => {
    switch (typeof value) {
      case "boolean":
        return value;
      case "string":
        return true;
      default:
        if (axis === "x") {
          return $xScale(value) >= xRangeMin && $xScale(value) <= xRangeMax;
        } else {
          return $yScale(value) >= yRangeMin && $yScale(value) <= yRangeMax;
        }
    }
  };
  $$unsubscribe_yScale();
  $$unsubscribe_xScale();
  $$unsubscribe_yRange();
  $$unsubscribe_xRange();
  $$unsubscribe_radial();
  return `<g class="rule">${showRule(x, "x") ? (() => {
    let xCoord = x === true || x === "left" ? xRangeMin : x === "right" ? xRangeMax : $xScale(x) + xOffset;
    return ` ${$radial ? (() => {
      let [x1, y1] = pointRadial(xCoord, Number(yRangeMin)), [x2, y2] = pointRadial(xCoord, Number(yRangeMax));
      return `  ${validate_component(Line, "Line").$$render(
        $$result,
        Object.assign({}, { x1 }, { y1 }, { x2 }, { y2 }, $$restProps, {
          class: cls("stroke-surface-content/10", $$props.class)
        }),
        {},
        {}
      )}`;
    })() : `${validate_component(Line, "Line").$$render(
      $$result,
      Object.assign({}, { x1: xCoord }, { x2: xCoord }, { y1: $yRange[0] || 0 }, { y2: $yRange[1] || 0 }, $$restProps, {
        class: cls("stroke-surface-content/50", $$props.class)
      }),
      {},
      {}
    )}`}`;
  })() : ``}${showRule(y, "y") ? `${$radial ? `${validate_component(Circle, "Circle").$$render(
    $$result,
    {
      r: y === true || y === "bottom" ? yRangeMax : y === "top" ? yRangeMin : $yScale(y) + yOffset,
      class: cls("fill-none stroke-surface-content/50", $$props.class)
    },
    {},
    {}
  )}` : `${validate_component(Line, "Line").$$render(
    $$result,
    Object.assign(
      {},
      { x1: $xRange[0] || 0 },
      { x2: $xRange[1] || 0 },
      {
        y1: y === true || y === "bottom" ? yRangeMax : y === "top" ? yRangeMin : $yScale(y) + yOffset
      },
      {
        y2: y === true || y === "bottom" ? yRangeMax : y === "top" ? yRangeMin : $yScale(y) + yOffset
      },
      $$restProps,
      {
        class: cls("stroke-surface-content/50", $$props.class)
      }
    ),
    {},
    {}
  )}`}` : ``}</g>`;
});
const MEASUREMENT_ELEMENT_ID = "__text_measurement_id";
function _getStringWidth(str, style) {
  try {
    let textEl = document.getElementById(MEASUREMENT_ELEMENT_ID);
    if (!textEl) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.style.width = "0";
      svg.style.height = "0";
      svg.style.position = "absolute";
      svg.style.top = "-100%";
      svg.style.left = "-100%";
      textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textEl.setAttribute("id", MEASUREMENT_ELEMENT_ID);
      svg.appendChild(textEl);
      document.body.appendChild(svg);
    }
    Object.assign(textEl.style, style);
    textEl.textContent = str;
    return textEl.getComputedTextLength();
  } catch (e) {
    return null;
  }
}
const getStringWidth = memoize(_getStringWidth, (str, style) => `${str}_${JSON.stringify(style)}`);
function getPixelValue(cssValue) {
  if (typeof cssValue === "number") {
    return cssValue;
  }
  const [match, value2, units] = cssValue.match(/([\d.]+)(\D+)/);
  const number = Number(value2);
  switch (units) {
    case "px":
      return number;
    case "em":
    case "rem":
      return number * 16;
    default:
      return 0;
  }
}
function isValidXOrY(xOrY) {
  return (
    // number that is not NaN or Infinity
    typeof xOrY === "number" && Number.isFinite(xOrY) || // for percentage
    typeof xOrY === "string"
  );
}
const Text = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let words;
  let lines;
  let rotateTransform;
  let transform;
  let $$restProps = compute_rest_props($$props, [
    "value",
    "width",
    "x",
    "initialX",
    "y",
    "initialY",
    "dx",
    "dy",
    "lineHeight",
    "capHeight",
    "scaleToFit",
    "textAnchor",
    "verticalAnchor",
    "rotate",
    "fill",
    "fillOpacity",
    "stroke",
    "strokeWidth",
    "class",
    "spring",
    "tweened"
  ]);
  let $tweened_y, $$unsubscribe_tweened_y;
  let $tweened_x, $$unsubscribe_tweened_x;
  let { value = 0 } = $$props;
  let { width = void 0 } = $$props;
  let { x = 0 } = $$props;
  let { initialX = x } = $$props;
  let { y = 0 } = $$props;
  let { initialY = y } = $$props;
  let { dx = 0 } = $$props;
  let { dy = 0 } = $$props;
  let { lineHeight = "1em" } = $$props;
  let { capHeight = "0.71em" } = $$props;
  let { scaleToFit = false } = $$props;
  let { textAnchor = "start" } = $$props;
  let { verticalAnchor = "end" } = $$props;
  let { rotate = void 0 } = $$props;
  let { fill = void 0 } = $$props;
  let { fillOpacity = void 0 } = $$props;
  let { stroke = void 0 } = $$props;
  let { strokeWidth = void 0 } = $$props;
  let { class: className = void 0 } = $$props;
  let wordsByLines = [];
  let wordsWithWidth = [];
  let spaceWidth = 0;
  let style = void 0;
  let startDy = 0;
  let scaleTransform = "";
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let tweened_x = motionStore(initialX, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_x = subscribe(tweened_x, (value2) => $tweened_x = value2);
  let tweened_y = motionStore(initialY, { spring: spring2, tweened: tweened2 });
  $$unsubscribe_tweened_y = subscribe(tweened_y, (value2) => $tweened_y = value2);
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  function render2(ctx, styleOverrides) {
    wordsByLines.forEach((line2, index) => {
      renderText(
        ctx,
        line2.words.join(" "),
        {
          x: getPixelValue($tweened_x) + getPixelValue(dx),
          y: getPixelValue($tweened_y) + getPixelValue(dy) + (index === 0 ? startDy : getPixelValue(lineHeight))
        },
        styleOverrides ? merge({ styles: { strokeWidth } }, styleOverrides) : {
          styles: {
            fill,
            fillOpacity,
            stroke,
            strokeWidth,
            paintOrder: "stroke",
            textAnchor
          },
          classes: cls(fill === void 0 && "fill-surface-content", className)
        }
      );
    });
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0) $$bindings.width(width);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.initialX === void 0 && $$bindings.initialX && initialX !== void 0) $$bindings.initialX(initialX);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.initialY === void 0 && $$bindings.initialY && initialY !== void 0) $$bindings.initialY(initialY);
  if ($$props.dx === void 0 && $$bindings.dx && dx !== void 0) $$bindings.dx(dx);
  if ($$props.dy === void 0 && $$bindings.dy && dy !== void 0) $$bindings.dy(dy);
  if ($$props.lineHeight === void 0 && $$bindings.lineHeight && lineHeight !== void 0) $$bindings.lineHeight(lineHeight);
  if ($$props.capHeight === void 0 && $$bindings.capHeight && capHeight !== void 0) $$bindings.capHeight(capHeight);
  if ($$props.scaleToFit === void 0 && $$bindings.scaleToFit && scaleToFit !== void 0) $$bindings.scaleToFit(scaleToFit);
  if ($$props.textAnchor === void 0 && $$bindings.textAnchor && textAnchor !== void 0) $$bindings.textAnchor(textAnchor);
  if ($$props.verticalAnchor === void 0 && $$bindings.verticalAnchor && verticalAnchor !== void 0) $$bindings.verticalAnchor(verticalAnchor);
  if ($$props.rotate === void 0 && $$bindings.rotate && rotate !== void 0) $$bindings.rotate(rotate);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.fillOpacity === void 0 && $$bindings.fillOpacity && fillOpacity !== void 0) $$bindings.fillOpacity(fillOpacity);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  words = value != null ? value.toString().split(/(?:(?!\u00A0+)\s+)/) : [];
  wordsWithWidth = words.map((word) => ({
    word,
    width: getStringWidth(word, style) || 0
  }));
  spaceWidth = getStringWidth(" ", style) || 0;
  wordsByLines = wordsWithWidth.reduce(
    (result, item) => {
      const currentLine = result[result.length - 1];
      if (currentLine && (width == null || scaleToFit || (currentLine.width || 0) + item.width + spaceWidth < width)) {
        currentLine.words.push(item.word);
        currentLine.width = currentLine.width || 0;
        currentLine.width += item.width + spaceWidth;
      } else {
        const newLine = { words: [item.word], width: item.width };
        result.push(newLine);
      }
      return result;
    },
    []
  );
  lines = wordsByLines.length;
  {
    if (verticalAnchor === "start") {
      startDy = getPixelValue(capHeight);
    } else if (verticalAnchor === "middle") {
      startDy = (lines - 1) / 2 * -getPixelValue(lineHeight) + getPixelValue(capHeight) / 2;
    } else {
      startDy = (lines - 1) * -getPixelValue(lineHeight);
    }
  }
  {
    if (scaleToFit && lines > 0 && typeof x == "number" && typeof y == "number" && typeof width == "number") {
      const lineWidth = wordsByLines[0].width || 1;
      const sx = width / lineWidth;
      const sy = sx;
      const originX = x - sx * x;
      const originY = y - sy * y;
      scaleTransform = `matrix(${sx}, 0, 0, ${sy}, ${originX}, ${originY})`;
    } else {
      scaleTransform = "";
    }
  }
  rotateTransform = rotate ? `rotate(${rotate}, ${x}, ${y})` : "";
  transform = `${scaleTransform} ${rotateTransform}`;
  {
    tick().then(() => {
      tweened_x.set(x);
      tweened_y.set(y);
    });
  }
  fill && typeof fill === "object" ? objectId(fill) : fill;
  stroke && typeof stroke === "object" ? objectId(stroke) : stroke;
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({ name: "Text", render: render2 });
    }
  }
  $$unsubscribe_tweened_y();
  $$unsubscribe_tweened_x();
  return `${renderContext === "svg" ? `  <svg${add_attribute("x", dx, 0)}${add_attribute("y", dy, 0)} class="overflow-visible [paint-order:stroke]">${isValidXOrY(x) && isValidXOrY(y) ? `<text${spread(
    [
      { x: escape_attribute_value($tweened_x) },
      { y: escape_attribute_value($tweened_y) },
      {
        transform: escape_attribute_value(transform)
      },
      {
        "text-anchor": escape_attribute_value(textAnchor)
      },
      escape_object($$restProps),
      { fill: escape_attribute_value(fill) },
      {
        "fill-opacity": escape_attribute_value(fillOpacity)
      },
      { stroke: escape_attribute_value(stroke) },
      {
        "stroke-width": escape_attribute_value(strokeWidth)
      },
      {
        class: escape_attribute_value(cls(fill === void 0 && "fill-surface-content", className))
      }
    ],
    {}
  )}>${each(wordsByLines, (line2, index) => {
    return `<tspan${add_attribute("x", $tweened_x, 0)}${add_attribute("dy", index === 0 ? startDy : lineHeight, 0)}>${escape(line2.words.join(" "))}</tspan>`;
  })}</text>` : ``}</svg>` : ``}`;
});
const Axis = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let orientation;
  let _scale;
  let tickVals;
  let resolvedLabelProps;
  let $padding, $$unsubscribe_padding;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let $yScale, $$unsubscribe_yScale;
  let $xScale, $$unsubscribe_xScale;
  let $xRange, $$unsubscribe_xRange;
  let $yRange, $$unsubscribe_yRange;
  const { xScale, yScale, xRange, yRange, width, height, padding } = chartContext();
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_xRange = subscribe(xRange, (value) => $xRange = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  let { placement } = $$props;
  let { label = "" } = $$props;
  let { labelPlacement = "middle" } = $$props;
  let { labelProps = void 0 } = $$props;
  let { rule = false } = $$props;
  let { grid = false } = $$props;
  let { ticks = void 0 } = $$props;
  let { tickLength = 4 } = $$props;
  let { format: format$12 = void 0 } = $$props;
  let { tickLabelProps = void 0 } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let { transitionIn = tweened2 ? fade : () => {
    return {};
  } } = $$props;
  let { transitionInParams = { easing: cubicIn } } = $$props;
  let { scale = void 0 } = $$props;
  let { classes = {} } = $$props;
  function getCoords(tick2, xRange2, yRange2) {
    const [xRangeMin, xRangeMax] = extent(xRange2);
    const [yRangeMin, yRangeMax] = extent(yRange2);
    switch (placement) {
      case "top":
        return {
          x: _scale(tick2) + (isScaleBand(_scale) ? _scale.bandwidth() / 2 : 0),
          y: yRangeMin
        };
      case "bottom":
        return {
          x: _scale(tick2) + (isScaleBand(_scale) ? _scale.bandwidth() / 2 : 0),
          y: yRangeMax
        };
      case "left":
        return {
          x: xRangeMin,
          y: _scale(tick2) + (isScaleBand(_scale) ? _scale.bandwidth() / 2 : 0)
        };
      case "right":
        return {
          x: xRangeMax,
          y: _scale(tick2) + (isScaleBand(_scale) ? _scale.bandwidth() / 2 : 0)
        };
      case "angle":
        return { x: _scale(tick2), y: yRangeMax };
      case "radius":
        return { x: xRangeMin, y: _scale(tick2) };
    }
  }
  function getDefaultTickLabelProps(tick2) {
    switch (placement) {
      case "top":
        return {
          textAnchor: "middle",
          verticalAnchor: "end",
          dy: -tickLength - 2
        };
      case "bottom":
        return {
          textAnchor: "middle",
          // manually adjusted until Text supports custom styles
          verticalAnchor: "start",
          dy: tickLength
        };
      case "left":
        return {
          textAnchor: "end",
          // manually adjusted until Text supports custom styles
          verticalAnchor: "middle",
          dx: -tickLength,
          dy: -2
        };
      case "right":
        return {
          textAnchor: "start",
          // manually adjusted until Text supports custom styles
          verticalAnchor: "middle",
          dx: tickLength,
          dy: -2
        };
      case "angle":
        const xValue = _scale(
          tick2
        );
        return {
          textAnchor: xValue === 0 || Math.abs(xValue - Math.PI) < 0.01 || // ~180deg
          Math.abs(xValue - Math.PI * 2) < 0.01 ? "middle" : xValue > Math.PI ? "end" : "start",
          verticalAnchor: "middle",
          dx: Math.sin(xValue) * (tickLength + 2),
          dy: -Math.cos(xValue) * (tickLength + 4)
        };
      case "radius":
        return {
          textAnchor: "middle",
          // manually adjusted until Text supports custom styles
          verticalAnchor: "middle",
          dx: 2,
          dy: -2
        };
    }
  }
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0) $$bindings.placement(placement);
  if ($$props.label === void 0 && $$bindings.label && label !== void 0) $$bindings.label(label);
  if ($$props.labelPlacement === void 0 && $$bindings.labelPlacement && labelPlacement !== void 0) $$bindings.labelPlacement(labelPlacement);
  if ($$props.labelProps === void 0 && $$bindings.labelProps && labelProps !== void 0) $$bindings.labelProps(labelProps);
  if ($$props.rule === void 0 && $$bindings.rule && rule !== void 0) $$bindings.rule(rule);
  if ($$props.grid === void 0 && $$bindings.grid && grid !== void 0) $$bindings.grid(grid);
  if ($$props.ticks === void 0 && $$bindings.ticks && ticks !== void 0) $$bindings.ticks(ticks);
  if ($$props.tickLength === void 0 && $$bindings.tickLength && tickLength !== void 0) $$bindings.tickLength(tickLength);
  if ($$props.format === void 0 && $$bindings.format && format$12 !== void 0) $$bindings.format(format$12);
  if ($$props.tickLabelProps === void 0 && $$bindings.tickLabelProps && tickLabelProps !== void 0) $$bindings.tickLabelProps(tickLabelProps);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  if ($$props.transitionIn === void 0 && $$bindings.transitionIn && transitionIn !== void 0) $$bindings.transitionIn(transitionIn);
  if ($$props.transitionInParams === void 0 && $$bindings.transitionInParams && transitionInParams !== void 0) $$bindings.transitionInParams(transitionInParams);
  if ($$props.scale === void 0 && $$bindings.scale && scale !== void 0) $$bindings.scale(scale);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0) $$bindings.classes(classes);
  orientation = placement === "angle" ? "angle" : placement === "radius" ? "radius" : ["top", "bottom"].includes(placement) ? "horizontal" : "vertical";
  _scale = scale ?? (["horizontal", "angle"].includes(orientation) ? $xScale : $yScale);
  tickVals = Array.isArray(ticks) ? ticks : typeof ticks === "function" ? ticks(_scale) : isLiteralObject(ticks) ? _scale.ticks(ticks.interval) : isScaleBand(_scale) ? ticks ? _scale.domain().filter((v, i) => i % ticks === 0) : _scale.domain() : _scale.ticks(ticks ?? (placement === "left" || placement === "right" ? 4 : void 0));
  resolvedLabelProps = {
    value: label,
    x: placement === "left" || orientation === "horizontal" && labelPlacement === "start" ? -$padding.left : placement === "right" || orientation === "horizontal" && labelPlacement === "end" ? $width + $padding.right : $width / 2,
    y: placement === "top" || orientation === "vertical" && labelPlacement === "start" ? -$padding.top : orientation === "vertical" && labelPlacement === "middle" ? $height / 2 : placement === "bottom" || labelPlacement === "end" ? $height + $padding.bottom : 0,
    textAnchor: labelPlacement === "middle" ? "middle" : placement === "right" || orientation === "horizontal" && labelPlacement === "end" ? "end" : "start",
    verticalAnchor: placement === "top" || orientation === "vertical" && labelPlacement === "start" || placement === "left" && labelPlacement === "middle" ? "start" : "end",
    rotate: orientation === "vertical" && labelPlacement === "middle" ? -90 : 0,
    capHeight: ".5rem",
    // text-[10px]
    ...labelProps,
    class: cls("label text-[10px] stroke-surface-100 [stroke-width:2px] font-light", classes.label, labelProps?.class)
  };
  $$unsubscribe_padding();
  $$unsubscribe_height();
  $$unsubscribe_width();
  $$unsubscribe_yScale();
  $$unsubscribe_xScale();
  $$unsubscribe_xRange();
  $$unsubscribe_yRange();
  return `<g${add_attribute("class", cls("Axis placement-{placement}", classes.root, $$props.class), 0)}>${rule !== false ? (() => {
    let ruleProps = typeof rule === "object" ? rule : null;
    return ` ${validate_component(Rule, "Rule").$$render(
      $$result,
      Object.assign(
        {},
        {
          x: placement === "left" || placement === "right" ? placement : placement === "angle"
        },
        {
          y: placement === "top" || placement === "bottom" ? placement : placement === "radius"
        },
        { tweened: tweened2 },
        { spring: spring2 },
        ruleProps,
        {
          class: cls("rule stroke-surface-content/50", classes.rule, ruleProps?.class)
        }
      ),
      {},
      {}
    )}`;
  })() : ``}${label ? `${validate_component(Text, "Text").$$render($$result, Object.assign({}, resolvedLabelProps), {}, {})}` : ``}${each(tickVals, (tick2, index) => {
    let tickCoords = getCoords(tick2, $xRange, $yRange), [radialTickCoordsX, radialTickCoordsY] = pointRadial(tickCoords.x, tickCoords.y), [radialTickMarkCoordsX, radialTickMarkCoordsY] = pointRadial(tickCoords.x, tickCoords.y + tickLength), resolvedTickLabelProps = {
      x: orientation === "angle" ? radialTickCoordsX : tickCoords.x,
      y: orientation === "angle" ? radialTickCoordsY : tickCoords.y,
      value: format(tick2, format$12 ?? _scale.tickFormat?.() ?? ((v) => v)),
      ...getDefaultTickLabelProps(tick2),
      tweened: tweened2,
      spring: spring2,
      ...tickLabelProps,
      class: cls("tickLabel text-[10px] stroke-surface-100 [stroke-width:2px] font-light", classes.tickLabel, tickLabelProps?.class)
    };
    return `    <g>${grid !== false ? (() => {
      let ruleProps = typeof grid === "object" ? grid : null;
      return ` ${validate_component(Rule, "Rule").$$render(
        $$result,
        Object.assign(
          {},
          {
            x: orientation === "horizontal" || orientation === "angle" ? tick2 : false
          },
          {
            y: orientation === "vertical" || orientation === "radius" ? tick2 : false
          },
          { tweened: tweened2 },
          { spring: spring2 },
          ruleProps,
          {
            class: cls("grid stroke-surface-content/10", classes.rule, ruleProps?.class)
          }
        ),
        {},
        {}
      )}`;
    })() : ``}${orientation === "horizontal" ? `${validate_component(Line, "Line").$$render(
      $$result,
      {
        x1: tickCoords.x,
        y1: tickCoords.y,
        x2: tickCoords.x,
        y2: tickCoords.y + (placement === "top" ? -tickLength : tickLength),
        tweened: tweened2,
        spring: spring2,
        class: cls("tick stroke-surface-content/50", classes.tick)
      },
      {},
      {}
    )}` : `${orientation === "vertical" ? `${validate_component(Line, "Line").$$render(
      $$result,
      {
        x1: tickCoords.x,
        y1: tickCoords.y,
        x2: tickCoords.x + (placement === "left" ? -tickLength : tickLength),
        y2: tickCoords.y,
        tweened: tweened2,
        spring: spring2,
        class: cls("tick stroke-surface-content/50", classes.tick)
      },
      {},
      {}
    )}` : `${orientation === "angle" ? `${validate_component(Line, "Line").$$render(
      $$result,
      {
        x1: radialTickCoordsX,
        y1: radialTickCoordsY,
        x2: radialTickMarkCoordsX,
        y2: radialTickMarkCoordsY,
        tweened: tweened2,
        spring: spring2,
        class: cls("tick stroke-surface-content/50", classes.tick)
      },
      {},
      {}
    )}` : ``}`}`}${slots.tickLabel ? slots.tickLabel({
      labelProps: resolvedTickLabelProps,
      index
    }) : ` ${validate_component(Text, "Text").$$render($$result, Object.assign({}, resolvedTickLabelProps), {}, {})} `}</g>`;
  })}</g>`;
});
const Grid = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let xTickVals;
  let yTickVals;
  let xBandOffset;
  let yBandOffset;
  let $yScale, $$unsubscribe_yScale;
  let $xScale, $$unsubscribe_xScale;
  let $radial, $$unsubscribe_radial;
  const { xScale, yScale, radial } = chartContext();
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_radial = subscribe(radial, (value) => $radial = value);
  let { x = false } = $$props;
  let { y = false } = $$props;
  let { xTicks = void 0 } = $$props;
  let { yTicks = !isScaleBand($yScale) ? 4 : void 0 } = $$props;
  let { bandAlign = "center" } = $$props;
  let { radialY = "circle" } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  let { transitionIn = tweened2 ? fade : () => {
    return {};
  } } = $$props;
  let { transitionInParams = { easing: cubicIn } } = $$props;
  let { classes = {} } = $$props;
  function getTickVals(scale, ticks) {
    return Array.isArray(ticks) ? ticks : typeof ticks === "function" ? ticks(scale) : isScaleBand(scale) ? ticks ? scale.domain().filter((v, i) => i % ticks === 0) : scale.domain() : scale.ticks?.(ticks);
  }
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.xTicks === void 0 && $$bindings.xTicks && xTicks !== void 0) $$bindings.xTicks(xTicks);
  if ($$props.yTicks === void 0 && $$bindings.yTicks && yTicks !== void 0) $$bindings.yTicks(yTicks);
  if ($$props.bandAlign === void 0 && $$bindings.bandAlign && bandAlign !== void 0) $$bindings.bandAlign(bandAlign);
  if ($$props.radialY === void 0 && $$bindings.radialY && radialY !== void 0) $$bindings.radialY(radialY);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  if ($$props.transitionIn === void 0 && $$bindings.transitionIn && transitionIn !== void 0) $$bindings.transitionIn(transitionIn);
  if ($$props.transitionInParams === void 0 && $$bindings.transitionInParams && transitionInParams !== void 0) $$bindings.transitionInParams(transitionInParams);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0) $$bindings.classes(classes);
  xTickVals = getTickVals($xScale, xTicks);
  yTickVals = getTickVals($yScale, yTicks);
  xBandOffset = isScaleBand($xScale) ? bandAlign === "between" ? -($xScale.padding() * $xScale.step()) / 2 : $xScale.step() / 2 - $xScale.padding() * $xScale.step() / 2 : 0;
  yBandOffset = isScaleBand($yScale) ? bandAlign === "between" ? -($yScale.padding() * $yScale.step()) / 2 : $yScale.step() / 2 - $yScale.padding() * $yScale.step() / 2 : 0;
  $$unsubscribe_yScale();
  $$unsubscribe_xScale();
  $$unsubscribe_radial();
  return `<g${add_attribute("class", cls("Grid", classes.root, $$props.class), 0)}>${x ? (() => {
    let splineProps = typeof x === "object" ? x : null;
    return ` <g>${each(xTickVals, (x2) => {
      return `${$radial ? `${validate_component(Spline, "Spline").$$render(
        $$result,
        Object.assign({}, { data: yTickVals.map((y2) => ({ x: x2, y: y2 })) }, { x: "x" }, { y: "y" }, { xOffset: xBandOffset }, { curve: curveLinearClosed }, { tweened: tweened2 }, { spring: spring2 }, splineProps, {
          class: cls("stroke-surface-content/10", classes.line, splineProps?.class)
        }),
        {},
        {}
      )}` : `${validate_component(Rule, "Rule").$$render(
        $$result,
        Object.assign({}, { x: x2 }, { xOffset: xBandOffset }, { tweened: tweened2 }, { spring: spring2 }, splineProps, {
          class: cls("stroke-surface-content/10", classes.line, splineProps?.class)
        }),
        {},
        {}
      )}`}`;
    })}${isScaleBand($xScale) && bandAlign === "between" && !$radial && xTickVals.length ? `${validate_component(Rule, "Rule").$$render(
      $$result,
      Object.assign({}, { x: xTickVals[xTickVals.length - 1] }, { xOffset: xBandOffset + $xScale.step() }, { tweened: tweened2 }, { spring: spring2 }, splineProps, {
        class: cls("stroke-surface-content/10", classes.line, splineProps?.class)
      }),
      {},
      {}
    )}` : ``}</g>`;
  })() : ``}${y ? (() => {
    let splineProps = typeof y === "object" ? y : null;
    return ` <g>${each(yTickVals, (y2) => {
      return `${$radial ? `${radialY === "circle" ? `${validate_component(Circle, "Circle").$$render(
        $$result,
        Object.assign({}, { r: $yScale(y2) }, { tweened: tweened2 }, { spring: spring2 }, splineProps, {
          class: cls("fill-none stroke-surface-content/10", classes.line, splineProps?.class)
        }),
        {},
        {}
      )}` : `${validate_component(Spline, "Spline").$$render(
        $$result,
        Object.assign({}, { data: xTickVals.map((x2) => ({ x: x2, y: y2 })) }, { x: "x" }, { y: "y" }, { yOffset: yBandOffset }, { tweened: tweened2 }, { spring: spring2 }, { curve: curveLinearClosed }, splineProps, {
          class: cls("stroke-surface-content/10", classes.line, splineProps?.class)
        }),
        {},
        {}
      )}`}` : `${validate_component(Rule, "Rule").$$render(
        $$result,
        Object.assign({}, { y: y2 }, { yOffset: yBandOffset }, { tweened: tweened2 }, { spring: spring2 }, splineProps, {
          class: cls("stroke-surface-content/10", classes.line, splineProps?.class)
        }),
        {},
        {}
      )}`}`;
    })}${isScaleBand($yScale) && bandAlign === "between" && !$radial && yTickVals.length ? `${validate_component(Rule, "Rule").$$render(
      $$result,
      Object.assign({}, { y: yTickVals[yTickVals.length - 1] }, { yOffset: yBandOffset + $yScale.step() }, { tweened: tweened2 }, { spring: spring2 }, splineProps, {
        class: cls("stroke-surface-content/10", classes.line, splineProps?.class)
      }),
      {},
      {}
    )}` : ``}</g>`;
  })() : ``}</g>`;
});
function createDimensionGetter(context, options) {
  const { xScale, yScale, x: xAccessor, y: yAccessor, x1: x1Accessor, y1: y1Accessor, x1Scale, y1Scale } = context;
  return derived([xScale, x1Scale, yScale, y1Scale, xAccessor, yAccessor, x1Accessor, y1Accessor], ([$xScale, $x1Scale, $yScale, $y1Scale, $xAccessor, $yAccessor, $x1Accessor, $y1Accessor]) => {
    const insets = resolveInsets(options?.insets);
    const [minXDomain, maxXDomain] = $xScale.domain();
    const [minYDomain, maxYDomain] = $yScale.domain();
    const _x = accessor(options?.x ?? $xAccessor);
    const _y = accessor(options?.y ?? $yAccessor);
    const _x1 = accessor(options?.x1 ?? $x1Accessor);
    const _y1 = accessor(options?.y1 ?? $y1Accessor);
    return function getter(item) {
      if (isScaleBand($yScale)) {
        const y = firstValue($yScale(_y(item)) ?? 0) + ($y1Scale ? $y1Scale(_y1(item)) : 0) + insets.top;
        const height = Math.max(0, $yScale.bandwidth ? ($y1Scale ? $y1Scale.bandwidth?.() ?? 0 : $yScale.bandwidth()) - insets.bottom - insets.top : 0);
        const xValue = _x(item);
        let left = 0;
        let right = 0;
        if (Array.isArray(xValue)) {
          left = min(xValue);
          right = max(xValue);
        } else if (xValue == null) {
          left = 0;
          right = 0;
        } else if (xValue > 0) {
          left = max([0, minXDomain]);
          right = xValue;
        } else {
          left = xValue;
          right = min([0, maxXDomain]);
        }
        const x = $xScale(left) + insets.left;
        const width = Math.max(0, $xScale(right) - $xScale(left) - insets.left - insets.right);
        return { x, y, width, height };
      } else {
        const x = firstValue($xScale(_x(item))) + ($x1Scale ? $x1Scale(_x1(item)) : 0) + insets.left;
        const width = Math.max(0, $xScale.bandwidth ? ($x1Scale ? $x1Scale.bandwidth?.() ?? 0 : $xScale.bandwidth()) - insets.left - insets.right : 0);
        const yValue = _y(item);
        let top = 0;
        let bottom = 0;
        if (Array.isArray(yValue)) {
          top = max(yValue);
          bottom = min(yValue);
        } else if (yValue == null) {
          top = 0;
          bottom = 0;
        } else if (yValue > 0) {
          top = yValue;
          bottom = max([0, minYDomain]);
        } else {
          top = min([0, maxYDomain]);
          bottom = yValue;
        }
        const y = $yScale(top) + insets.top;
        const height = $yScale(bottom) - $yScale(top) - insets.bottom - insets.top;
        return { x, y, width, height };
      }
    };
  });
}
function firstValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
function resolveInsets(insets) {
  const all = insets?.all ?? 0;
  const x = insets?.x ?? all;
  const y = insets?.y ?? all;
  const left = insets?.left ?? x;
  const right = insets?.right ?? x;
  const top = insets?.top ?? y;
  const bottom = insets?.bottom ?? y;
  return { left, right, bottom, top };
}
const Bar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let getDimensions;
  let dimensions;
  let isVertical;
  let valueAccessor;
  let value;
  let resolvedValue;
  let _rounded;
  let topLeft;
  let topRight;
  let bottomLeft;
  let bottomRight;
  let width;
  let height;
  let diameter;
  let pathData;
  let $$restProps = compute_rest_props($$props, [
    "bar",
    "x",
    "y",
    "x1",
    "y1",
    "fill",
    "stroke",
    "strokeWidth",
    "radius",
    "rounded",
    "insets",
    "onclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave",
    "spring",
    "tweened"
  ]);
  let $xScale, $$unsubscribe_xScale;
  let $getDimensions, $$unsubscribe_getDimensions = noop, $$subscribe_getDimensions = () => ($$unsubscribe_getDimensions(), $$unsubscribe_getDimensions = subscribe(getDimensions, ($$value) => $getDimensions = $$value), getDimensions);
  let $yContext, $$unsubscribe_yContext;
  let $xContext, $$unsubscribe_xContext;
  const { x: xContext, y: yContext, xScale } = chartContext();
  $$unsubscribe_xContext = subscribe(xContext, (value2) => $xContext = value2);
  $$unsubscribe_yContext = subscribe(yContext, (value2) => $yContext = value2);
  $$unsubscribe_xScale = subscribe(xScale, (value2) => $xScale = value2);
  let { bar } = $$props;
  let { x = $xContext } = $$props;
  let { y = $yContext } = $$props;
  let { x1 = void 0 } = $$props;
  let { y1 = void 0 } = $$props;
  let { fill = void 0 } = $$props;
  let { stroke = "black" } = $$props;
  let { strokeWidth = 0 } = $$props;
  let { radius = 0 } = $$props;
  let { rounded = "all" } = $$props;
  let { insets = void 0 } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { spring: spring2 = void 0 } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  getRenderContext();
  getCanvasContext();
  if ($$props.bar === void 0 && $$bindings.bar && bar !== void 0) $$bindings.bar(bar);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.x1 === void 0 && $$bindings.x1 && x1 !== void 0) $$bindings.x1(x1);
  if ($$props.y1 === void 0 && $$bindings.y1 && y1 !== void 0) $$bindings.y1(y1);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.radius === void 0 && $$bindings.radius && radius !== void 0) $$bindings.radius(radius);
  if ($$props.rounded === void 0 && $$bindings.rounded && rounded !== void 0) $$bindings.rounded(rounded);
  if ($$props.insets === void 0 && $$bindings.insets && insets !== void 0) $$bindings.insets(insets);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.spring === void 0 && $$bindings.spring && spring2 !== void 0) $$bindings.spring(spring2);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  {
    if (stroke === null || stroke === void 0) stroke = "black";
  }
  $$subscribe_getDimensions(getDimensions = createDimensionGetter(chartContext(), { x, y, x1, y1, insets }));
  dimensions = $getDimensions(bar) ?? { x: 0, y: 0, width: 0, height: 0 };
  isVertical = isScaleBand($xScale);
  valueAccessor = accessor(isVertical ? y : x);
  value = valueAccessor(bar);
  resolvedValue = Array.isArray(value) ? greatestAbs(value) : value;
  _rounded = rounded === "edge" ? isVertical ? resolvedValue >= 0 ? "top" : "bottom" : resolvedValue >= 0 ? "right" : "left" : rounded;
  topLeft = ["all", "top", "left", "top-left"].includes(_rounded);
  topRight = ["all", "top", "right", "top-right"].includes(_rounded);
  bottomLeft = ["all", "bottom", "left", "bottom-left"].includes(_rounded);
  bottomRight = ["all", "bottom", "right", "bottom-right"].includes(_rounded);
  width = dimensions.width;
  height = dimensions.height;
  diameter = 2 * radius;
  pathData = `M${dimensions.x + radius},${dimensions.y} h${width - diameter}
      ${topRight ? `a${radius},${radius} 0 0 1 ${radius},${radius}` : `h${radius}v${radius}`}
      v${height - diameter}
      ${bottomRight ? `a${radius},${radius} 0 0 1 ${-radius},${radius}` : `v${radius}h${-radius}`}
      h${diameter - width}
      ${bottomLeft ? `a${radius},${radius} 0 0 1 ${-radius},${-radius}` : `h${-radius}v${-radius}`}
      v${diameter - height}
      ${topLeft ? `a${radius},${radius} 0 0 1 ${radius},${-radius}` : `v${-radius}h${radius}`}
      z`.split("\n").join("");
  $$unsubscribe_xScale();
  $$unsubscribe_getDimensions();
  $$unsubscribe_yContext();
  $$unsubscribe_xContext();
  return `${_rounded === "all" || _rounded === "none" || radius === 0 ? `${validate_component(Rect, "Rect").$$render($$result, Object.assign({}, { fill }, { spring: spring2 }, { tweened: tweened2 }, { stroke }, { strokeWidth }, { rx: _rounded === "none" ? 0 : radius }, { onclick }, { onpointerenter }, { onpointermove }, { onpointerleave }, dimensions, $$restProps), {}, {})}` : `${validate_component(Spline, "Spline").$$render($$result, Object.assign({}, { pathData }, { fill }, { spring: spring2 }, { tweened: tweened2 }, { stroke }, { strokeWidth }, { onclick }, { onpointerenter }, { onpointermove }, { onpointerleave }, $$restProps), {}, {})}`}`;
});
function asAny(x) {
  return x;
}
const Highlight = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let highlightData;
  let $radial, $$unsubscribe_radial;
  let $cGet, $$unsubscribe_cGet;
  let $config, $$unsubscribe_config;
  let $yScale, $$unsubscribe_yScale;
  let $contextData, $$unsubscribe_contextData;
  let $xScale, $$unsubscribe_xScale;
  let $xRange, $$unsubscribe_xRange;
  let $flatData, $$unsubscribe_flatData;
  let $yDomain, $$unsubscribe_yDomain;
  let $yRange, $$unsubscribe_yRange;
  let $xDomain, $$unsubscribe_xDomain;
  let $tooltip, $$unsubscribe_tooltip;
  let $yContext, $$unsubscribe_yContext;
  let $xContext, $$unsubscribe_xContext;
  const { data: contextData, flatData, x: xContext, xDomain, xScale, xRange, y: yContext, yDomain, yScale, yRange, cGet, config, radial } = chartContext();
  $$unsubscribe_contextData = subscribe(contextData, (value) => $contextData = value);
  $$unsubscribe_flatData = subscribe(flatData, (value) => $flatData = value);
  $$unsubscribe_xContext = subscribe(xContext, (value) => $xContext = value);
  $$unsubscribe_xDomain = subscribe(xDomain, (value) => $xDomain = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_xRange = subscribe(xRange, (value) => $xRange = value);
  $$unsubscribe_yContext = subscribe(yContext, (value) => $yContext = value);
  $$unsubscribe_yDomain = subscribe(yDomain, (value) => $yDomain = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_yRange = subscribe(yRange, (value) => $yRange = value);
  $$unsubscribe_cGet = subscribe(cGet, (value) => $cGet = value);
  $$unsubscribe_config = subscribe(config, (value) => $config = value);
  $$unsubscribe_radial = subscribe(radial, (value) => $radial = value);
  const tooltip = tooltipContext();
  $$unsubscribe_tooltip = subscribe(tooltip, (value) => $tooltip = value);
  let { data = void 0 } = $$props;
  let { x = $xContext } = $$props;
  let { y = $yContext } = $$props;
  let { axis = void 0 } = $$props;
  let { points = false } = $$props;
  let { lines = false } = $$props;
  let { area: area2 = false } = $$props;
  let { bar = false } = $$props;
  let { motion = true } = $$props;
  let { onareaclick = void 0 } = $$props;
  let { onbarclick = void 0 } = $$props;
  let { onpointclick = void 0 } = $$props;
  let { onpointenter = void 0 } = $$props;
  let { onpointleave = void 0 } = $$props;
  const _x = accessor(x);
  const _y = accessor(y);
  let _points = [];
  let _lines = [];
  let _area = { x: 0, y: 0, width: 0, height: 0 };
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.axis === void 0 && $$bindings.axis && axis !== void 0) $$bindings.axis(axis);
  if ($$props.points === void 0 && $$bindings.points && points !== void 0) $$bindings.points(points);
  if ($$props.lines === void 0 && $$bindings.lines && lines !== void 0) $$bindings.lines(lines);
  if ($$props.area === void 0 && $$bindings.area && area2 !== void 0) $$bindings.area(area2);
  if ($$props.bar === void 0 && $$bindings.bar && bar !== void 0) $$bindings.bar(bar);
  if ($$props.motion === void 0 && $$bindings.motion && motion !== void 0) $$bindings.motion(motion);
  if ($$props.onareaclick === void 0 && $$bindings.onareaclick && onareaclick !== void 0) $$bindings.onareaclick(onareaclick);
  if ($$props.onbarclick === void 0 && $$bindings.onbarclick && onbarclick !== void 0) $$bindings.onbarclick(onbarclick);
  if ($$props.onpointclick === void 0 && $$bindings.onpointclick && onpointclick !== void 0) $$bindings.onpointclick(onpointclick);
  if ($$props.onpointenter === void 0 && $$bindings.onpointenter && onpointenter !== void 0) $$bindings.onpointenter(onpointenter);
  if ($$props.onpointleave === void 0 && $$bindings.onpointleave && onpointleave !== void 0) $$bindings.onpointleave(onpointleave);
  highlightData = data ?? $tooltip.data;
  {
    if (highlightData) {
      const xValue = _x(highlightData);
      const xCoord = Array.isArray(xValue) ? xValue.map((v) => $xScale(v)) : $xScale(xValue);
      const xOffset = isScaleBand($xScale) && !$radial ? $xScale.bandwidth() / 2 : 0;
      const yValue = _y(highlightData);
      const yCoord = Array.isArray(yValue) ? yValue.map((v) => $yScale(v)) : $yScale(yValue);
      const yOffset = isScaleBand($yScale) && !$radial ? $yScale.bandwidth() / 2 : 0;
      _lines = [];
      const defaultAxis = isScaleBand($yScale) ? "y" : "x";
      if (axis == null) {
        axis = defaultAxis;
      }
      if (axis === "x" || axis === "both") {
        if (Array.isArray(xCoord)) {
          _lines = [
            ..._lines,
            ...xCoord.filter(notNull).map((xItem, i) => ({
              x1: xItem + xOffset,
              y1: min($yRange),
              x2: xItem + xOffset,
              y2: max($yRange)
            }))
          ];
        } else if (xCoord) {
          _lines = [
            ..._lines,
            {
              x1: xCoord + xOffset,
              y1: min($yRange),
              x2: xCoord + xOffset,
              y2: max($yRange)
            }
          ];
        }
        if (Array.isArray(xCoord)) {
          _area.width = max(xCoord) - min(xCoord);
        } else if (isScaleBand($xScale)) {
          _area.width = $xScale.step();
        } else {
          const index = $flatData.findIndex((d) => Number(_x(d)) === Number(_x(highlightData)));
          const isLastPoint = index + 1 === $flatData.length;
          const nextDataPoint = isLastPoint ? max($xDomain) : _x($flatData[index + 1]);
          _area.width = ($xScale(nextDataPoint) ?? 0) - (xCoord ?? 0);
        }
        _area.x = (Array.isArray(xCoord) ? min(xCoord) : xCoord) - (isScaleBand($xScale) ? $xScale.padding() * $xScale.step() / 2 : 0);
        if (axis === "x") {
          _area.height = max($yRange);
        }
      }
      if (axis === "y" || axis === "both") {
        if (Array.isArray(yCoord)) {
          _lines = [
            ..._lines,
            ...yCoord.filter(notNull).map((yItem, i) => ({
              x1: min($xRange),
              y1: yItem + yOffset,
              x2: max($xRange),
              y2: yItem + yOffset
            }))
          ];
        } else if (yCoord) {
          _lines = [
            ..._lines,
            {
              x1: min($xRange),
              y1: yCoord + yOffset,
              x2: max($xRange),
              y2: yCoord + yOffset
            }
          ];
        }
        if (Array.isArray(yCoord)) {
          _area.height = max(yCoord) - min(yCoord);
        } else if (isScaleBand($yScale)) {
          _area.height = $yScale.step();
        } else {
          const index = $flatData.findIndex((d) => Number(_x(d)) === Number(_x(highlightData)));
          const isLastPoint = index + 1 === $flatData.length;
          const nextDataPoint = isLastPoint ? max($yDomain) : _x($flatData[index + 1]);
          _area.height = ($yScale(nextDataPoint) ?? 0) - (yCoord ?? 0);
        }
        _area.y = (Array.isArray(yCoord) ? min(yCoord) : yCoord) - (isScaleBand($yScale) ? $yScale.padding() * $yScale.step() / 2 : 0);
        if (axis === "y") {
          _area.width = max($xRange);
        }
      }
      if (Array.isArray(xCoord)) {
        if (Array.isArray(highlightData)) {
          const highlightSeriesPoint = highlightData;
          if (Array.isArray($contextData)) {
            const seriesPointsData = $contextData.map((series) => {
              return {
                series,
                point: series.find((d) => _y(d) === _y(highlightSeriesPoint))
              };
            }).filter((d) => d.point);
            _points = seriesPointsData.map((seriesPoint, i) => {
              return {
                x: $xScale(seriesPoint.point[1]) + xOffset,
                y: yCoord + yOffset,
                fill: $config.c ? $cGet(seriesPoint.series) : null,
                data: { x: seriesPoint.point[1], y: yValue }
              };
            });
          }
        } else {
          _points = xCoord.filter(notNull).map((xItem, i) => {
            const $key = $config.x[i];
            return {
              x: xItem + xOffset,
              y: yCoord + yOffset,
              // TODO: is there a better way to expose the series key/value?
              fill: $config.c ? $cGet({ ...highlightData, $key }) : null,
              data: {
                x: xValue,
                // TODO: use highlightData[$key]?
                y: yValue
              }
            };
          });
        }
      } else if (Array.isArray(yCoord)) {
        if (Array.isArray(highlightData)) {
          const highlightSeriesPoint = highlightData;
          if (Array.isArray($contextData)) {
            const seriesPointsData = $contextData.map((series) => {
              return {
                series,
                point: series.find((d) => _x(d) === _x(highlightSeriesPoint))
              };
            }).filter((d) => d.point);
            _points = seriesPointsData.map((seriesPoint, i) => ({
              x: xCoord + xOffset,
              y: $yScale(seriesPoint.point[1]) + yOffset,
              fill: $config.c ? $cGet(seriesPoint.series) : null,
              data: { x: xValue, y: seriesPoint.point[1] }
            }));
          }
        } else {
          _points = yCoord.filter(notNull).map((yItem, i) => {
            const $key = $config.y[i];
            return {
              x: xCoord + xOffset,
              y: yItem + yOffset,
              // TODO: is there a better way to expose the series key/value?
              fill: $config.c ? $cGet({ ...highlightData, $key }) : null,
              data: { x: xValue, y: yValue }
              // TODO: use highlightData[$key] ?
            };
          });
        }
      } else if (xCoord != null && yCoord != null) {
        _points = [
          {
            x: xCoord + xOffset,
            y: yCoord + yOffset,
            fill: $config.c ? $cGet(highlightData) : null,
            data: { x: xValue, y: yValue }
          }
        ];
      } else {
        _points = [];
      }
      if ($radial) {
        _points = _points.map((p) => {
          const [x2, y2] = pointRadial(p.x, p.y);
          return { ...p, x: x2, y: y2 };
        });
        _lines = _lines.map((l) => {
          const [x1, y1] = pointRadial(l.x1, l.y1);
          const [x2, y2] = pointRadial(l.x2, l.y2);
          return { ...l, x1, y1, x2, y2 };
        });
      }
    }
  }
  $$unsubscribe_radial();
  $$unsubscribe_cGet();
  $$unsubscribe_config();
  $$unsubscribe_yScale();
  $$unsubscribe_contextData();
  $$unsubscribe_xScale();
  $$unsubscribe_xRange();
  $$unsubscribe_flatData();
  $$unsubscribe_yDomain();
  $$unsubscribe_yRange();
  $$unsubscribe_xDomain();
  $$unsubscribe_tooltip();
  $$unsubscribe_yContext();
  $$unsubscribe_xContext();
  return `${highlightData ? `${area2 ? `${slots.area ? slots.area({ area: _area }) : ` ${validate_component(Rect, "Rect").$$render(
    $$result,
    Object.assign(
      {},
      { spring: motion },
      _area,
      typeof area2 === "object" ? area2 : null,
      {
        class: cls(
          // @ts-expect-error
          !area2.fill && "fill-surface-content/5",
          typeof area2 === "object" ? area2.class : null
        )
      },
      {
        onclick: onareaclick && ((e) => onareaclick(e, { data: highlightData }))
      }
    ),
    {},
    {}
  )} `}` : ``} ${bar ? `${slots.bar ? slots.bar({ bar }) : ` ${validate_component(Bar, "Bar").$$render(
    $$result,
    Object.assign(
      {},
      { spring: motion },
      { bar: highlightData },
      typeof bar === "object" ? bar : null,
      {
        class: cls(
          // @ts-expect-error
          !bar.fill && "fill-primary",
          typeof bar === "object" ? bar.class : null
        )
      },
      {
        onclick: onbarclick && ((e) => onbarclick(e, { data: highlightData }))
      }
    ),
    {},
    {}
  )} `}` : ``} ${lines ? `${slots.lines ? slots.lines({ lines: _lines }) : ` ${each(_lines, (line2) => {
    return `${validate_component(Line, "Line").$$render(
      $$result,
      Object.assign({}, { spring: motion }, { x1: line2.x1 }, { y1: line2.y1 }, { x2: line2.x2 }, { y2: line2.y2 }, typeof lines === "object" ? lines : null, {
        class: cls("stroke-surface-content/20 stroke-2 [stroke-dasharray:2,2] pointer-events-none", typeof lines === "object" ? lines.class : null)
      }),
      {},
      {}
    )}`;
  })} `}` : ``} ${points ? `${slots.points ? slots.points({ points: _points }) : ` ${each(_points, (point) => {
    return `${validate_component(Circle, "Circle").$$render(
      $$result,
      Object.assign(
        {},
        { spring: motion },
        { cx: point.x },
        { cy: point.y },
        { fill: point.fill },
        { r: 4 },
        { strokeWidth: 6 },
        typeof points === "object" ? points : null,
        {
          class: cls("stroke-white [paint-order:stroke] drop-shadow", !point.fill && (typeof points === "boolean" || !points.fill) && "fill-primary", typeof points === "object" ? points.class : null)
        },
        {
          onpointerdown: onpointclick && ((e) => {
            e.stopPropagation();
          })
        },
        {
          onclick: onpointclick && ((e) => onpointclick(e, { point, data: highlightData }))
        },
        {
          onpointerenter: onpointenter && ((e) => {
            if (onpointclick) {
              asAny(e.target).style.cursor = "pointer";
            }
            onpointenter(e, { point, data: highlightData });
          })
        },
        {
          onpointerleave: onpointleave && ((e) => {
            if (onpointclick) {
              asAny(e.target).style.cursor = "default";
            }
            onpointleave(e, { point, data: highlightData });
          })
        }
      ),
      {},
      {}
    )}`;
  })} `}` : ``}` : ``}`;
});
const Link = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let markerStartId;
  let markerMidId;
  let markerEndId;
  let tweened_d;
  let $$restProps = compute_rest_props($$props, [
    "data",
    "sankey",
    "source",
    "target",
    "orientation",
    "x",
    "y",
    "curve",
    "onclick",
    "onpointerenter",
    "onpointermove",
    "onpointerleave",
    "onpointerover",
    "onpointerout",
    "marker",
    "markerStart",
    "markerMid",
    "markerEnd",
    "tweened"
  ]);
  let $$slots = compute_slots(slots);
  let $tweened_d, $$unsubscribe_tweened_d = noop, $$subscribe_tweened_d = () => ($$unsubscribe_tweened_d(), $$unsubscribe_tweened_d = subscribe(tweened_d, ($$value) => $tweened_d = $$value), tweened_d);
  let { data = void 0 } = $$props;
  let { sankey = false } = $$props;
  let { source = sankey ? (d) => [d.source.x1, d.y0] : (d) => d.source } = $$props;
  let { target = sankey ? (d) => [d.target.x0, d.y1] : (d) => d.target } = $$props;
  let { orientation = sankey ? "horizontal" : "vertical" } = $$props;
  let { x = (d) => sankey ? d[0] : orientation === "horizontal" ? d.y : d.x } = $$props;
  let { y = (d) => sankey ? d[1] : orientation === "horizontal" ? d.x : d.y } = $$props;
  let { curve = orientation === "horizontal" ? curveBumpX : curveBumpY } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointermove = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { onpointerover = void 0 } = $$props;
  let { onpointerout = void 0 } = $$props;
  let { marker = void 0 } = $$props;
  let { markerStart = marker } = $$props;
  let { markerMid = marker } = $$props;
  let { markerEnd = marker } = $$props;
  let { tweened: tweened2 = void 0 } = $$props;
  const tweenedOptions = tweened2 ? {
    interpolate: interpolatePath,
    ...typeof tweened2 === "object" ? tweened2 : null
  } : false;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.sankey === void 0 && $$bindings.sankey && sankey !== void 0) $$bindings.sankey(sankey);
  if ($$props.source === void 0 && $$bindings.source && source !== void 0) $$bindings.source(source);
  if ($$props.target === void 0 && $$bindings.target && target !== void 0) $$bindings.target(target);
  if ($$props.orientation === void 0 && $$bindings.orientation && orientation !== void 0) $$bindings.orientation(orientation);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.curve === void 0 && $$bindings.curve && curve !== void 0) $$bindings.curve(curve);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointermove === void 0 && $$bindings.onpointermove && onpointermove !== void 0) $$bindings.onpointermove(onpointermove);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.onpointerover === void 0 && $$bindings.onpointerover && onpointerover !== void 0) $$bindings.onpointerover(onpointerover);
  if ($$props.onpointerout === void 0 && $$bindings.onpointerout && onpointerout !== void 0) $$bindings.onpointerout(onpointerout);
  if ($$props.marker === void 0 && $$bindings.marker && marker !== void 0) $$bindings.marker(marker);
  if ($$props.markerStart === void 0 && $$bindings.markerStart && markerStart !== void 0) $$bindings.markerStart(markerStart);
  if ($$props.markerMid === void 0 && $$bindings.markerMid && markerMid !== void 0) $$bindings.markerMid(markerMid);
  if ($$props.markerEnd === void 0 && $$bindings.markerEnd && markerEnd !== void 0) $$bindings.markerEnd(markerEnd);
  if ($$props.tweened === void 0 && $$bindings.tweened && tweened2 !== void 0) $$bindings.tweened(tweened2);
  markerStartId = markerStart || $$slots["markerStart"] ? uniqueId("marker-") : "";
  markerMidId = markerMid || $$slots["markerMid"] ? uniqueId("marker-") : "";
  markerEndId = markerEnd || $$slots["markerEnd"] ? uniqueId("marker-") : "";
  $$subscribe_tweened_d(tweened_d = motionStore("", { tweened: tweenedOptions }));
  {
    {
      const link$1 = link(curve).source(source).target(target).x(x).y(y);
      const d = link$1(data) ?? "";
      tweened_d.set(d);
    }
  }
  $$unsubscribe_tweened_d();
  return `${validate_component(Spline, "Spline").$$render(
    $$result,
    Object.assign(
      {},
      { class: "path-link" },
      { pathData: $tweened_d },
      { fill: "none" },
      {
        "marker-start": markerStartId ? `url(#${markerStartId})` : void 0
      },
      {
        "marker-mid": markerMidId ? `url(#${markerMidId})` : void 0
      },
      {
        "marker-end": markerEndId ? `url(#${markerEndId})` : void 0
      },
      { onclick },
      { onpointerenter },
      { onpointermove },
      { onpointerleave },
      { onpointerover },
      { onpointerout },
      $$restProps
    ),
    {},
    {}
  )} ${slots.markerStart ? slots.markerStart({ id: markerStartId }) : ` ${markerStart ? `${validate_component(Marker, "Marker").$$render(
    $$result,
    Object.assign(
      {},
      { id: markerStartId },
      {
        type: typeof markerStart === "string" ? markerStart : void 0
      },
      typeof markerStart === "object" ? markerStart : null
    ),
    {},
    {}
  )}` : ``} `} ${slots.markerMid ? slots.markerMid({ id: markerMidId }) : ` ${validate_component(Marker, "Marker").$$render(
    $$result,
    Object.assign(
      {},
      { id: markerMidId },
      {
        type: typeof markerMid === "string" ? markerMid : void 0
      },
      typeof markerMid === "object" ? markerMid : null
    ),
    {},
    {}
  )} `} ${slots.markerEnd ? slots.markerEnd({ id: markerEndId }) : ` ${validate_component(Marker, "Marker").$$render(
    $$result,
    Object.assign(
      {},
      { id: markerEndId },
      {
        type: typeof markerEnd === "string" ? markerEnd : void 0
      },
      typeof markerEnd === "object" ? markerEnd : null
    ),
    {},
    {}
  )} `}`;
});
const Points = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let xAccessor;
  let yAccessor;
  let pointsData;
  let points;
  let _links;
  let $$restProps = compute_rest_props($$props, [
    "data",
    "x",
    "y",
    "r",
    "offsetX",
    "offsetY",
    "links",
    "fill",
    "fillOpacity",
    "stroke",
    "strokeWidth",
    "class"
  ]);
  let $yScale, $$unsubscribe_yScale;
  let $yGet, $$unsubscribe_yGet;
  let $xScale, $$unsubscribe_xScale;
  let $xGet, $$unsubscribe_xGet;
  let $rGet, $$unsubscribe_rGet;
  let $config, $$unsubscribe_config;
  let $contextData, $$unsubscribe_contextData;
  let $contextY, $$unsubscribe_contextY;
  let $contextX, $$unsubscribe_contextX;
  let $radial, $$unsubscribe_radial;
  let $cGet, $$unsubscribe_cGet;
  const context = chartContext();
  const { data: contextData, x: contextX, xScale, xGet, y: contextY, yScale, yGet, cGet, rGet, config, radial } = context;
  $$unsubscribe_contextData = subscribe(contextData, (value) => $contextData = value);
  $$unsubscribe_contextX = subscribe(contextX, (value) => $contextX = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_xGet = subscribe(xGet, (value) => $xGet = value);
  $$unsubscribe_contextY = subscribe(contextY, (value) => $contextY = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_yGet = subscribe(yGet, (value) => $yGet = value);
  $$unsubscribe_cGet = subscribe(cGet, (value) => $cGet = value);
  $$unsubscribe_rGet = subscribe(rGet, (value) => $rGet = value);
  $$unsubscribe_config = subscribe(config, (value) => $config = value);
  $$unsubscribe_radial = subscribe(radial, (value) => $radial = value);
  let { data = void 0 } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { r = 5 } = $$props;
  let { offsetX = void 0 } = $$props;
  let { offsetY = void 0 } = $$props;
  let { links = false } = $$props;
  let { fill = void 0 } = $$props;
  let { fillOpacity = void 0 } = $$props;
  let { stroke = void 0 } = $$props;
  let { strokeWidth = void 0 } = $$props;
  let { class: className = void 0 } = $$props;
  function getOffset(value, offset, scale) {
    if (typeof offset === "function") {
      return offset(value, context);
    } else if (offset != null) {
      return offset;
    } else if (isScaleBand(scale) && !$radial) {
      return scale.bandwidth() / 2;
    } else {
      return 0;
    }
  }
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.r === void 0 && $$bindings.r && r !== void 0) $$bindings.r(r);
  if ($$props.offsetX === void 0 && $$bindings.offsetX && offsetX !== void 0) $$bindings.offsetX(offsetX);
  if ($$props.offsetY === void 0 && $$bindings.offsetY && offsetY !== void 0) $$bindings.offsetY(offsetY);
  if ($$props.links === void 0 && $$bindings.links && links !== void 0) $$bindings.links(links);
  if ($$props.fill === void 0 && $$bindings.fill && fill !== void 0) $$bindings.fill(fill);
  if ($$props.fillOpacity === void 0 && $$bindings.fillOpacity && fillOpacity !== void 0) $$bindings.fillOpacity(fillOpacity);
  if ($$props.stroke === void 0 && $$bindings.stroke && stroke !== void 0) $$bindings.stroke(stroke);
  if ($$props.strokeWidth === void 0 && $$bindings.strokeWidth && strokeWidth !== void 0) $$bindings.strokeWidth(strokeWidth);
  if ($$props.class === void 0 && $$bindings.class && className !== void 0) $$bindings.class(className);
  xAccessor = x ? accessor(x) : $contextX;
  yAccessor = y ? accessor(y) : $contextY;
  pointsData = data ?? $contextData;
  points = pointsData.flatMap((d) => {
    const xValue = xAccessor(d);
    const yValue = yAccessor(d);
    if (Array.isArray(xValue)) {
      return xValue.filter(notNull).map((xValue2) => {
        return {
          x: $xScale(xValue2) + getOffset($xScale(xValue2), offsetX, $xScale),
          y: $yScale(yValue) + getOffset($yScale(yValue), offsetY, $yScale),
          r: $config.r ? $rGet(d) : r,
          xValue: xValue2,
          yValue,
          data: d
        };
      });
    } else if (Array.isArray(yValue)) {
      return yValue.filter(notNull).map((yValue2) => {
        return {
          x: $xScale(xValue) + getOffset($xScale(xValue), offsetX, $xScale),
          y: $yScale(yValue2) + getOffset($yScale(yValue2), offsetY, $yScale),
          r: $config.r ? $rGet(d) : r,
          xValue,
          yValue: yValue2,
          data: d
        };
      });
    } else if (xValue != null && yValue != null) {
      return {
        x: $xScale(xValue) + getOffset($xScale(xValue), offsetX, $xScale),
        y: $yScale(yValue) + getOffset($yScale(yValue), offsetY, $yScale),
        r: $config.r ? $rGet(d) : r,
        xValue,
        yValue,
        data: d
      };
    }
  }).filter((p) => p);
  _links = pointsData.flatMap((d) => {
    const xValue = xAccessor(d);
    const yValue = yAccessor(d);
    if (Array.isArray(xValue)) {
      const [xMin, xMax] = extent($xGet(d));
      const y2 = $yGet(d) + getOffset($yGet(d), offsetY, $yScale);
      return {
        source: {
          x: xMin + getOffset(xMin, offsetX, $xScale) + ($config.r ? $rGet(d) : r),
          y: y2
        },
        target: {
          x: xMax + getOffset(xMax, offsetX, $xScale) - ($config.r ? $rGet(d) : r),
          y: y2
        },
        data: d
      };
    } else if (Array.isArray(yValue)) {
      const x2 = $xGet(d) + getOffset($xGet(d), offsetX, $xScale);
      const [yMin, yMax] = extent($yGet(d));
      return {
        source: {
          x: x2,
          y: yMin + getOffset(yMin, offsetY, $yScale)
        },
        target: {
          x: x2,
          y: yMax + getOffset(yMax, offsetY, $yScale)
        },
        data: d
      };
    }
  });
  $$unsubscribe_yScale();
  $$unsubscribe_yGet();
  $$unsubscribe_xScale();
  $$unsubscribe_xGet();
  $$unsubscribe_rGet();
  $$unsubscribe_config();
  $$unsubscribe_contextData();
  $$unsubscribe_contextY();
  $$unsubscribe_contextX();
  $$unsubscribe_radial();
  $$unsubscribe_cGet();
  return `${slots.default ? slots.default({ points }) : ` ${links ? `${each(_links, (link2) => {
    return `${validate_component(Link, "Link").$$render(
      $$result,
      Object.assign(
        {},
        { data: link2 },
        {
          stroke: fill ?? ($config.c ? $cGet(link2.data) : null)
        },
        typeof links === "object" ? links : null
      ),
      {},
      {}
    )}`;
  })}` : ``} ${each(points, (point) => {
    let radialPoint = pointRadial(point.x, point.y);
    return ` ${validate_component(Circle, "Circle").$$render(
      $$result,
      Object.assign(
        {},
        { cx: $radial ? radialPoint[0] : point.x },
        { cy: $radial ? radialPoint[1] : point.y },
        { r: point.r },
        {
          fill: fill ?? ($config.c ? $cGet(point.data) : null)
        },
        { fillOpacity },
        { stroke },
        { strokeWidth },
        { class: className },
        $$restProps
      ),
      {},
      {}
    )}`;
  })} `}`;
});
const Labels = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let getTextProps;
  let $$restProps = compute_rest_props($$props, ["data", "value", "x", "y", "placement", "offset", "format", "key"]);
  let $yScale, $$unsubscribe_yScale;
  let $xScale, $$unsubscribe_xScale;
  const { xScale, yScale } = chartContext();
  $$unsubscribe_xScale = subscribe(xScale, (value2) => $xScale = value2);
  $$unsubscribe_yScale = subscribe(yScale, (value2) => $yScale = value2);
  let { data = void 0 } = $$props;
  let { value = void 0 } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { placement = "outside" } = $$props;
  let { offset = placement === "center" ? 0 : 4 } = $$props;
  let { format: format$12 = void 0 } = $$props;
  let { key = (d, i) => i } = $$props;
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0) $$bindings.placement(placement);
  if ($$props.offset === void 0 && $$bindings.offset && offset !== void 0) $$bindings.offset(offset);
  if ($$props.format === void 0 && $$bindings.format && format$12 !== void 0) $$bindings.format(format$12);
  if ($$props.key === void 0 && $$bindings.key && key !== void 0) $$bindings.key(key);
  getTextProps = (point) => {
    const pointValue = isScaleBand($yScale) ? point.xValue : point.yValue;
    const displayValue = value ? accessor(value)(point.data) : isScaleBand($yScale) ? point.xValue : point.yValue;
    const formattedValue = format(displayValue, format$12 ?? (value ? void 0 : isScaleBand($yScale) ? $xScale.tickFormat?.() : $yScale.tickFormat?.()));
    if (isScaleBand($yScale)) {
      if (pointValue < 0) {
        return {
          value: formattedValue,
          x: point.x + (placement === "outside" ? -offset : offset),
          y: point.y,
          textAnchor: placement === "outside" ? "end" : "start",
          verticalAnchor: "middle",
          capHeight: ".6rem"
        };
      } else {
        return {
          value: formattedValue,
          x: point.x + (placement === "outside" ? offset : -offset),
          y: point.y,
          textAnchor: placement === "outside" ? "start" : "end",
          verticalAnchor: "middle",
          capHeight: ".6rem"
        };
      }
    } else {
      if (pointValue < 0) {
        return {
          value: formattedValue,
          x: point.x,
          y: point.y + (placement === "outside" ? offset : -offset),
          capHeight: ".6rem",
          textAnchor: "middle",
          verticalAnchor: placement === "center" ? "middle" : placement === "outside" ? "start" : "end"
        };
      } else {
        return {
          value: formattedValue,
          x: point.x,
          y: point.y + (placement === "outside" ? -offset : offset),
          capHeight: ".6rem",
          textAnchor: "middle",
          verticalAnchor: placement === "center" ? "middle" : placement === "outside" ? "end" : "start"
        };
      }
    }
  };
  $$unsubscribe_yScale();
  $$unsubscribe_xScale();
  return `<g class="Labels">${validate_component(Points, "Points").$$render($$result, { data, x, y }, {}, {
    default: ({ points }) => {
      return `${each(points, (point, i) => {
        let textProps = getTextProps(point);
        return ` ${slots.default ? slots.default({ data: point, textProps }) : ` ${validate_component(Text, "Text").$$render(
          $$result,
          Object.assign({}, textProps, $$restProps, {
            class: cls(
              "text-xs",
              placement === "inside" ? "fill-surface-300 stroke-surface-content" : "fill-surface-content stroke-surface-100",
              textProps.class,
              $$props.class
            )
          }),
          {},
          {}
        )} `}`;
      })}`;
    }
  })}</g>`;
});
const ColorRamp = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["interpolator", "steps", "height", "width"]);
  let { interpolator } = $$props;
  let { steps = 10 } = $$props;
  let { height = "20px" } = $$props;
  let { width = "100%" } = $$props;
  let href = "";
  if ($$props.interpolator === void 0 && $$bindings.interpolator && interpolator !== void 0) $$bindings.interpolator(interpolator);
  if ($$props.steps === void 0 && $$bindings.steps && steps !== void 0) $$bindings.steps(steps);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0) $$bindings.height(height);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0) $$bindings.width(width);
  {
    {
      const canvas = document.createElement("canvas");
      canvas.width = steps;
      canvas.height = 1;
      const context = canvas.getContext("2d");
      for (let i = 0; i < steps; ++i) {
        context.fillStyle = interpolator(i / (steps - 1));
        context.fillRect(i, 0, 1, 1);
      }
      href = canvas.toDataURL();
    }
  }
  return `<image${spread(
    [
      { href: escape_attribute_value(href) },
      { preserveAspectRatio: "none" },
      { height: escape_attribute_value(height) },
      { width: escape_attribute_value(width) },
      escape_object($$restProps)
    ],
    {}
  )}></image>`;
});
const Legend = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let _scale;
  let $$restProps = compute_rest_props($$props, [
    "scale",
    "title",
    "width",
    "height",
    "ticks",
    "tickFormat",
    "tickValues",
    "tickFontSize",
    "tickLength",
    "placement",
    "orientation",
    "onclick",
    "onpointerenter",
    "onpointerleave",
    "variant",
    "classes"
  ]);
  let $cScale, $$unsubscribe_cScale;
  const { cScale } = chartContext() ?? {};
  $$unsubscribe_cScale = subscribe(cScale, (value) => $cScale = value);
  let { scale = void 0 } = $$props;
  let { title = "" } = $$props;
  let { width = 320 } = $$props;
  let { height = 10 } = $$props;
  let { ticks = width / 64 } = $$props;
  let { tickFormat = void 0 } = $$props;
  let { tickValues = void 0 } = $$props;
  let { tickFontSize = 10 } = $$props;
  let { tickLength = 4 } = $$props;
  let { placement = void 0 } = $$props;
  let { orientation = "horizontal" } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { variant = "ramp" } = $$props;
  let { classes = {} } = $$props;
  let xScale;
  let interpolator;
  let swatches;
  let tickLabelOffset = 0;
  let tickLine = true;
  if ($$props.scale === void 0 && $$bindings.scale && scale !== void 0) $$bindings.scale(scale);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0) $$bindings.title(title);
  if ($$props.width === void 0 && $$bindings.width && width !== void 0) $$bindings.width(width);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0) $$bindings.height(height);
  if ($$props.ticks === void 0 && $$bindings.ticks && ticks !== void 0) $$bindings.ticks(ticks);
  if ($$props.tickFormat === void 0 && $$bindings.tickFormat && tickFormat !== void 0) $$bindings.tickFormat(tickFormat);
  if ($$props.tickValues === void 0 && $$bindings.tickValues && tickValues !== void 0) $$bindings.tickValues(tickValues);
  if ($$props.tickFontSize === void 0 && $$bindings.tickFontSize && tickFontSize !== void 0) $$bindings.tickFontSize(tickFontSize);
  if ($$props.tickLength === void 0 && $$bindings.tickLength && tickLength !== void 0) $$bindings.tickLength(tickLength);
  if ($$props.placement === void 0 && $$bindings.placement && placement !== void 0) $$bindings.placement(placement);
  if ($$props.orientation === void 0 && $$bindings.orientation && orientation !== void 0) $$bindings.orientation(orientation);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0) $$bindings.variant(variant);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0) $$bindings.classes(classes);
  _scale = scale ?? (cScale ? $cScale : null);
  {
    if (!_scale) ;
    else if (_scale.interpolate) {
      const n = Math.min(_scale.domain().length, _scale.range().length);
      xScale = _scale.copy().rangeRound(quantize(interpolate(0, width), n));
      interpolator = _scale.copy().domain(quantize(interpolate(0, 1), n));
      tickFormat = tickFormat ?? xScale.tickFormat?.();
    } else if (_scale.interpolator) {
      xScale = Object.assign(_scale.copy().interpolator(interpolateRound(0, width)), {
        range() {
          return [0, width];
        }
      });
      interpolator = _scale.interpolator();
      if (!xScale.ticks) {
        if (tickValues === void 0) {
          const n = Math.round(ticks + 1);
          tickValues = range(n).map((i) => quantile(_scale.domain(), i / (n - 1)));
        }
      }
      tickFormat = tickFormat ?? xScale.tickFormat?.();
    } else if (_scale.invertExtent) {
      const thresholds = _scale.thresholds ? _scale.thresholds() : _scale.quantiles ? _scale.quantiles() : _scale.domain();
      xScale = scaleLinear().domain([-1, _scale.range().length - 1]).rangeRound([0, width]);
      swatches = _scale.range().map((d, i) => {
        return {
          x: xScale(i - 1),
          y: 0,
          width: xScale(i) - xScale(i - 1),
          height,
          fill: d
        };
      });
      tickValues = range(thresholds.length);
      tickFormat = (i) => {
        const value = thresholds[i];
        return $$props.tickFormat ? format(value, $$props.tickFormat) : value;
      };
    } else {
      xScale = scaleBand().domain(_scale.domain()).rangeRound([0, width]);
      swatches = _scale.domain().map((d) => {
        return {
          x: xScale(d),
          y: 0,
          width: Math.max(0, xScale.bandwidth() - 1),
          height,
          fill: _scale(d)
        };
      });
      tickValues = _scale.domain();
      tickLabelOffset = xScale.bandwidth() / 2;
      tickLine = false;
      tickLength = 0;
    }
  }
  $$unsubscribe_cScale();
  return `<div${spread(
    [
      escape_object($$restProps),
      {
        class: escape_attribute_value(cls(
          "inline-block",
          "z-[1]",
          // stack above tooltip context layers (band rects, voronoi, ...)
          placement && [
            "absolute",
            {
              "top-left": "top-0 left-0",
              top: "top-0 left-1/2 -translate-x-1/2",
              "top-right": "top-0 right-0",
              left: "top-1/2 left-0 -translate-y-1/2",
              center: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
              right: "top-1/2 right-0 -translate-y-1/2",
              "bottom-left": "bottom-0 left-0",
              bottom: "bottom-0 left-1/2 -translate-x-1/2",
              "bottom-right": "bottom-0 right-0"
            }[placement]
          ],
          $$restProps.class,
          classes.root
        ))
      }
    ],
    {}
  )}><div${add_attribute("class", cls("text-[10px] font-semibold", classes.title), 0)}>${escape(title)}</div> ${slots.default ? slots.default({ values: tickValues ?? [], scale: _scale }) : ` ${variant === "ramp" ? `<svg${add_attribute("width", width, 0)}${add_attribute("height", height + tickLength + tickFontSize, 0)} viewBox="${"0 0 " + escape(width, true) + " " + escape(height + tickLength + tickFontSize, true)}" class="overflow-visible"><g>${interpolator ? `${validate_component(ColorRamp, "ColorRamp").$$render($$result, { width, height, interpolator }, {}, {})}` : `${swatches ? `${each(swatches, (swatch, i) => {
    return `<rect${spread([escape_object(swatch)], {})}></rect>`;
  })}` : ``}`}</g><g>${each(tickValues ?? xScale?.ticks?.(ticks) ?? [], (tick2, i) => {
    return `<text text-anchor="middle"${add_attribute("x", xScale(tick2) + tickLabelOffset, 0)}${add_attribute("y", height + tickLength + tickFontSize, 0)}${add_attribute("class", cls("text-[10px] fill-surface-content", classes.label), 0)}${add_styles({ "font-size": tickFontSize })}>${escape(tickFormat ? format(tick2, tickFormat) : tick2)}</text> ${tickLine ? `<line${add_attribute("x1", xScale(tick2), 0)}${add_attribute("y1", 0, 0)}${add_attribute("x2", xScale(tick2), 0)}${add_attribute("y2", height + tickLength, 0)}${add_attribute("class", cls("stroke-surface-content", classes.tick), 0)}></line>` : ``}`;
  })}</g></svg>` : `${variant === "swatches" ? `<div${add_attribute("class", cls("flex gap-x-4 gap-y-1", orientation === "vertical" && "flex-col", classes.swatches), 0)}>${each(tickValues ?? xScale?.ticks?.(ticks) ?? [], (tick2) => {
    let color = _scale(tick2), item = { value: tick2, color };
    return `  <button${add_attribute("class", cls("flex gap-1", !onclick && "cursor-auto", classes.item?.(item)), 0)}><div${add_attribute("class", cls("h-4 w-4 rounded-full", classes.swatch), 0)}${add_styles({ "background-color": color })}></div> <div${add_attribute("class", cls("text-xs text-surface-content whitespace-nowrap", classes.label), 0)}>${escape(tickFormat ? format(tick2, tickFormat) : tick2)}</div> </button>`;
  })}</div>` : ``}`} `}</div>`;
});
const TooltipHeader = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { value = void 0 } = $$props;
  let { format: format$12 = void 0 } = $$props;
  let { color = void 0 } = $$props;
  let { classes = {} } = $$props;
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  if ($$props.format === void 0 && $$bindings.format && format$12 !== void 0) $$bindings.format(format$12);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0) $$bindings.color(color);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0) $$bindings.classes(classes);
  return `<div${add_attribute("class", cls("TooltipHeader", "font-semibold whitespace-nowrap border-b mb-1 pb-1 flex items-center gap-2", classes.root, $$props.class), 0)}>${color ? `<div${add_attribute("class", cls("color", "inline-block size-2 rounded-full bg-[var(--color)]", classes.color), 0)}${add_styles({ "--color": color })}></div>` : ``} ${slots.default ? slots.default({}) : `${escape(format$12 ? format(value, format$12) : value)}`}</div>`;
});
const TooltipItem = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, [
    "label",
    "value",
    "format",
    "valueAlign",
    "color",
    "onclick",
    "onpointerenter",
    "onpointerleave",
    "classes"
  ]);
  let { label } = $$props;
  let { value = void 0 } = $$props;
  let { format: format$12 = void 0 } = $$props;
  let { valueAlign = "left" } = $$props;
  let { color = void 0 } = $$props;
  let { onclick = void 0 } = $$props;
  let { onpointerenter = void 0 } = $$props;
  let { onpointerleave = void 0 } = $$props;
  let { classes = {} } = $$props;
  if ($$props.label === void 0 && $$bindings.label && label !== void 0) $$bindings.label(label);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0) $$bindings.value(value);
  if ($$props.format === void 0 && $$bindings.format && format$12 !== void 0) $$bindings.format(format$12);
  if ($$props.valueAlign === void 0 && $$bindings.valueAlign && valueAlign !== void 0) $$bindings.valueAlign(valueAlign);
  if ($$props.color === void 0 && $$bindings.color && color !== void 0) $$bindings.color(color);
  if ($$props.onclick === void 0 && $$bindings.onclick && onclick !== void 0) $$bindings.onclick(onclick);
  if ($$props.onpointerenter === void 0 && $$bindings.onpointerenter && onpointerenter !== void 0) $$bindings.onpointerenter(onpointerenter);
  if ($$props.onpointerleave === void 0 && $$bindings.onpointerleave && onpointerleave !== void 0) $$bindings.onpointerleave(onpointerleave);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0) $$bindings.classes(classes);
  return `<div${spread(
    [
      {
        class: escape_attribute_value(cls("contents", classes.root, $$props.class))
      },
      escape_object($$restProps)
    ],
    {}
  )}><div${add_attribute("class", cls("label", "flex items-center gap-2 whitespace-nowrap", classes.label), 0)}>${color ? `<div${add_attribute("class", cls("color", "inline-block size-2 rounded-full bg-[var(--color)]", classes.color), 0)}${add_styles({ "--color": color })}></div>` : ``} ${slots.label ? slots.label({}) : `${escape(label)}`}</div> <div${add_attribute(
    "class",
    cls(
      "value",
      "tabular-nums",
      {
        "text-right": valueAlign === "right",
        "text-center": valueAlign === "center"
      },
      classes.value,
      $$props.class
    ),
    0
  )}>${slots.default ? slots.default({}) : `${escape(format$12 ? format(value, format$12) : value)}`}</div></div>`;
});
const TooltipList = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div${add_attribute("class", cls("TooltipList", "grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 items-center", $$props.class), 0)}>${slots.default ? slots.default({}) : ``}</div>`;
});
const TooltipSeparator = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div${add_attribute("class", cls("rounded bg-surface-content/20 my-1 col-span-full h-px", $$props.class), 0)}></div>`;
});
function alignValue(value, align, addlOffset, tooltipSize) {
  const alignOffset = align === "center" ? tooltipSize / 2 : align === "end" ? tooltipSize : 0;
  return value + (align === "end" ? -addlOffset : addlOffset) - alignOffset;
}
const Tooltip = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$slots = compute_slots(slots);
  let $xPos, $$unsubscribe_xPos;
  let $yPos, $$unsubscribe_yPos;
  let $padding, $$unsubscribe_padding;
  let $containerHeight, $$unsubscribe_containerHeight;
  let $containerWidth, $$unsubscribe_containerWidth;
  let $tooltip, $$unsubscribe_tooltip;
  let $yGet, $$unsubscribe_yGet;
  let $yScale, $$unsubscribe_yScale;
  let $xGet, $$unsubscribe_xGet;
  let $xScale, $$unsubscribe_xScale;
  let { x = "pointer" } = $$props;
  let { y = "pointer" } = $$props;
  let { xOffset = x === "pointer" ? 10 : 0 } = $$props;
  let { yOffset = y === "pointer" ? 10 : 0 } = $$props;
  let { anchor = "top-left" } = $$props;
  let { contained = "container" } = $$props;
  let { variant = "default" } = $$props;
  let { motion = true } = $$props;
  let { pointerEvents = false } = $$props;
  let { classes = {} } = $$props;
  const { padding, xScale, xGet, yScale, yGet, containerWidth, containerHeight } = chartContext();
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  $$unsubscribe_xScale = subscribe(xScale, (value) => $xScale = value);
  $$unsubscribe_xGet = subscribe(xGet, (value) => $xGet = value);
  $$unsubscribe_yScale = subscribe(yScale, (value) => $yScale = value);
  $$unsubscribe_yGet = subscribe(yGet, (value) => $yGet = value);
  $$unsubscribe_containerWidth = subscribe(containerWidth, (value) => $containerWidth = value);
  $$unsubscribe_containerHeight = subscribe(containerHeight, (value) => $containerHeight = value);
  const tooltip = tooltipContext();
  $$unsubscribe_tooltip = subscribe(tooltip, (value) => $tooltip = value);
  let tooltipWidth = 0;
  let tooltipHeight = 0;
  const xPos = motionStore($tooltip.x, { spring: motion });
  $$unsubscribe_xPos = subscribe(xPos, (value) => $xPos = value);
  const yPos = motionStore($tooltip.y, { spring: motion });
  $$unsubscribe_yPos = subscribe(yPos, (value) => $yPos = value);
  let rootEl;
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.xOffset === void 0 && $$bindings.xOffset && xOffset !== void 0) $$bindings.xOffset(xOffset);
  if ($$props.yOffset === void 0 && $$bindings.yOffset && yOffset !== void 0) $$bindings.yOffset(yOffset);
  if ($$props.anchor === void 0 && $$bindings.anchor && anchor !== void 0) $$bindings.anchor(anchor);
  if ($$props.contained === void 0 && $$bindings.contained && contained !== void 0) $$bindings.contained(contained);
  if ($$props.variant === void 0 && $$bindings.variant && variant !== void 0) $$bindings.variant(variant);
  if ($$props.motion === void 0 && $$bindings.motion && motion !== void 0) $$bindings.motion(motion);
  if ($$props.pointerEvents === void 0 && $$bindings.pointerEvents && pointerEvents !== void 0) $$bindings.pointerEvents(pointerEvents);
  if ($$props.classes === void 0 && $$bindings.classes && classes !== void 0) $$bindings.classes(classes);
  {
    if ($tooltip?.data) {
      const xBandOffset = isScaleBand($xScale) ? $xScale.step() / 2 - $xScale.padding() * $xScale.step() / 2 : 0;
      const xValue = typeof x === "number" ? x : x === "data" ? $xGet($tooltip.data) + $padding.left + xBandOffset : $tooltip.x;
      let xAlign = "start";
      switch (anchor) {
        case "top-left":
        case "left":
        case "bottom-left":
          xAlign = "start";
          break;
        case "top":
        case "center":
        case "bottom":
          xAlign = "center";
          break;
        case "top-right":
        case "right":
        case "bottom-right":
          xAlign = "end";
          break;
      }
      const yBandOffset = isScaleBand($yScale) ? $yScale.step() / 2 - $yScale.padding() * $yScale.step() / 2 : 0;
      const yValue = typeof y === "number" ? y : y === "data" ? $yGet($tooltip.data) + $padding.top + yBandOffset : $tooltip.y;
      let yAlign = "start";
      switch (anchor) {
        case "top-left":
        case "top":
        case "top-right":
          yAlign = "start";
          break;
        case "left":
        case "center":
        case "right":
          yAlign = "center";
          break;
        case "bottom-left":
        case "bottom":
        case "bottom-right":
          yAlign = "end";
          break;
      }
      const rect = {
        top: alignValue(yValue, yAlign, yOffset, tooltipHeight),
        left: alignValue(xValue, xAlign, xOffset, tooltipWidth),
        // set below
        bottom: 0,
        right: 0
      };
      rect.bottom = rect.top + tooltipHeight;
      rect.right = rect.left + tooltipWidth;
      if (contained === "container") {
        if (typeof x !== "number") {
          if ((xAlign === "start" || xAlign === "center") && rect.right > $containerWidth) {
            rect.left = alignValue(xValue, "end", xOffset, tooltipWidth);
          }
          if ((xAlign === "end" || xAlign === "center") && rect.left < $padding.left) {
            rect.left = alignValue(xValue, "start", xOffset, tooltipWidth);
          }
        }
        rect.right = rect.left + tooltipWidth;
        if (typeof y !== "number") {
          if ((yAlign === "start" || yAlign === "center") && rect.bottom > $containerHeight) {
            rect.top = alignValue(yValue, "end", yOffset, tooltipHeight);
          }
          if ((yAlign === "end" || yAlign === "center") && rect.top < $padding.top) {
            rect.top = alignValue(yValue, "start", yOffset, tooltipHeight);
          }
        }
        rect.bottom = rect.top + tooltipHeight;
      }
      set_store_value(yPos, $yPos = rect.top, $yPos);
      set_store_value(xPos, $xPos = rect.left, $xPos);
    }
  }
  $$unsubscribe_xPos();
  $$unsubscribe_yPos();
  $$unsubscribe_padding();
  $$unsubscribe_containerHeight();
  $$unsubscribe_containerWidth();
  $$unsubscribe_tooltip();
  $$unsubscribe_yGet();
  $$unsubscribe_yScale();
  $$unsubscribe_xGet();
  $$unsubscribe_xScale();
  return `${$tooltip.data ? `<div${add_attribute("class", cls("absolute z-50 select-none", !pointerEvents && "pointer-events-none", classes.root), 0)}${add_styles({
    "top": `${$yPos}px`,
    "left": `${$xPos}px`
  })}${add_attribute("this", rootEl, 0)}><div${add_attribute(
    "class",
    cls(
      variant !== "none" && ["text-sm py-1 px-2 h-full rounded elevation-1"],
      {
        default: [
          "bg-surface-100/90 dark:bg-surface-300/90 backdrop-filter backdrop-blur-[2px] text-surface-content",
          "[&_.label]:text-surface-content/75"
        ],
        invert: [
          "bg-surface-content/90 backdrop-filter backdrop-blur-[2px] text-surface-100 border border-surface-content",
          "[&_.label]:text-surface-100/50"
        ],
        none: ""
      }[variant],
      classes.container,
      $$props.class
    ),
    0
  )}>${$$slots.default ? `<div${add_attribute("class", cls(classes.content), 0)}>${slots.default ? slots.default({ data: $tooltip.data }) : ``}</div>` : ``}</div></div>` : ``}`;
});
const AreaChart = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let isDefaultSeries;
  let stackSeries;
  let allSeriesData;
  let chartData;
  let xScale;
  let getAreaProps;
  let visibleSeries;
  let brushProps;
  let $$restProps = compute_rest_props($$props, [
    "data",
    "x",
    "y",
    "xDomain",
    "radial",
    "series",
    "seriesLayout",
    "axis",
    "brush",
    "grid",
    "labels",
    "legend",
    "points",
    "rule",
    "tooltipContext",
    "ontooltipclick",
    "onpointclick",
    "props",
    "renderContext",
    "profile",
    "debug"
  ]);
  let $selectedSeries, $$unsubscribe_selectedSeries;
  let { data = [] } = $$props;
  let { x = void 0 } = $$props;
  let { y = void 0 } = $$props;
  let { xDomain = void 0 } = $$props;
  let { radial = false } = $$props;
  let { series = [
    {
      key: "default",
      value: y,
      color: "hsl(var(--color-primary))"
    }
  ] } = $$props;
  let { seriesLayout = "overlap" } = $$props;
  let { axis = true } = $$props;
  let { brush = false } = $$props;
  let { grid = true } = $$props;
  let { labels = false } = $$props;
  let { legend = false } = $$props;
  let { points = false } = $$props;
  let { rule = true } = $$props;
  let { tooltipContext: tooltipContext2 = void 0 } = $$props;
  let { ontooltipclick = () => {
  } } = $$props;
  let { onpointclick = void 0 } = $$props;
  let { props = {} } = $$props;
  let { renderContext = "svg" } = $$props;
  let { profile = false } = $$props;
  let { debug = false } = $$props;
  let highlightSeriesKey = null;
  function setHighlightSeriesKey(seriesKey) {
    highlightSeriesKey = seriesKey;
  }
  function getPointsProps(s, i) {
    const pointsProps = {
      data: s.data,
      y: stackSeries ? (d) => d.stackData[i][1] : Array.isArray(s.value) ? s.value[1] : s.value ?? (s.data ? void 0 : s.key),
      fill: s.color,
      ...props.points,
      ...typeof points === "object" ? points : null,
      class: cls("stroke-surface-200 transition-opacity", highlightSeriesKey && highlightSeriesKey !== s.key && "opacity-10", props.points?.class, typeof points === "object" && points.class)
    };
    return pointsProps;
  }
  function getLabelsProps(s, i) {
    const labelsProps = {
      data: s.data,
      y: stackSeries ? (d) => d.stackData[i][1] : Array.isArray(s.value) ? s.value[1] : s.value ?? (s.data ? void 0 : s.key),
      ...props.labels,
      ...typeof labels === "object" ? labels : null,
      class: cls("stroke-surface-200 transition-opacity", highlightSeriesKey && highlightSeriesKey !== s.key && "opacity-10", props.labels?.class, typeof labels === "object" && labels.class)
    };
    return labelsProps;
  }
  const selectedSeries = selectionStore();
  $$unsubscribe_selectedSeries = subscribe(selectedSeries, (value) => $selectedSeries = value);
  if (profile) {
    console.time("AreaChart render");
  }
  if ($$props.data === void 0 && $$bindings.data && data !== void 0) $$bindings.data(data);
  if ($$props.x === void 0 && $$bindings.x && x !== void 0) $$bindings.x(x);
  if ($$props.y === void 0 && $$bindings.y && y !== void 0) $$bindings.y(y);
  if ($$props.xDomain === void 0 && $$bindings.xDomain && xDomain !== void 0) $$bindings.xDomain(xDomain);
  if ($$props.radial === void 0 && $$bindings.radial && radial !== void 0) $$bindings.radial(radial);
  if ($$props.series === void 0 && $$bindings.series && series !== void 0) $$bindings.series(series);
  if ($$props.seriesLayout === void 0 && $$bindings.seriesLayout && seriesLayout !== void 0) $$bindings.seriesLayout(seriesLayout);
  if ($$props.axis === void 0 && $$bindings.axis && axis !== void 0) $$bindings.axis(axis);
  if ($$props.brush === void 0 && $$bindings.brush && brush !== void 0) $$bindings.brush(brush);
  if ($$props.grid === void 0 && $$bindings.grid && grid !== void 0) $$bindings.grid(grid);
  if ($$props.labels === void 0 && $$bindings.labels && labels !== void 0) $$bindings.labels(labels);
  if ($$props.legend === void 0 && $$bindings.legend && legend !== void 0) $$bindings.legend(legend);
  if ($$props.points === void 0 && $$bindings.points && points !== void 0) $$bindings.points(points);
  if ($$props.rule === void 0 && $$bindings.rule && rule !== void 0) $$bindings.rule(rule);
  if ($$props.tooltipContext === void 0 && $$bindings.tooltipContext && tooltipContext2 !== void 0) $$bindings.tooltipContext(tooltipContext2);
  if ($$props.ontooltipclick === void 0 && $$bindings.ontooltipclick && ontooltipclick !== void 0) $$bindings.ontooltipclick(ontooltipclick);
  if ($$props.onpointclick === void 0 && $$bindings.onpointclick && onpointclick !== void 0) $$bindings.onpointclick(onpointclick);
  if ($$props.props === void 0 && $$bindings.props && props !== void 0) $$bindings.props(props);
  if ($$props.renderContext === void 0 && $$bindings.renderContext && renderContext !== void 0) $$bindings.renderContext(renderContext);
  if ($$props.profile === void 0 && $$bindings.profile && profile !== void 0) $$bindings.profile(profile);
  if ($$props.debug === void 0 && $$bindings.debug && debug !== void 0) $$bindings.debug(debug);
  let $$settled;
  let $$rendered;
  let previous_head = $$result.head;
  do {
    $$settled = true;
    $$result.head = previous_head;
    isDefaultSeries = series.length === 1 && series[0].key === "default";
    stackSeries = seriesLayout.startsWith("stack");
    visibleSeries = series.filter((s) => {
      return (
        // @ts-expect-error
        $selectedSeries.selected.length === 0 || $selectedSeries.isSelected(s.key)
      );
    });
    allSeriesData = visibleSeries.flatMap((s) => s.data?.map((d) => ({ seriesKey: s.key, ...d }))).filter((d) => d);
    chartData = allSeriesData.length ? allSeriesData : chartDataArray(data);
    {
      if (stackSeries) {
        const seriesKeys = visibleSeries.map((s) => s.key);
        const offset = seriesLayout === "stackExpand" ? stackOffsetExpand : seriesLayout === "stackDiverging" ? stackOffsetDiverging : stackOffsetNone;
        const stackData = stack().keys(seriesKeys).value((d, key) => {
          const s = series.find((d2) => d2.key === key);
          return accessor(s.value ?? s.key)(d);
        }).offset(offset)(chartDataArray(data));
        chartData = chartData.map((d, i) => {
          return {
            ...d,
            stackData: stackData.map((sd) => sd[i])
          };
        });
      }
    }
    xScale = $$props.xScale ?? (accessor(x)(chartData[0]) instanceof Date ? scaleTime() : scaleLinear());
    getAreaProps = (s, i) => {
      const lineProps = {
        ...props.line,
        ...typeof props.area?.line === "object" ? props.area.line : null,
        ...typeof s.props?.line === "object" ? s.props.line : null
      };
      const areaProps = {
        data: s.data,
        y0: stackSeries ? (d) => d.stackData[i][0] : Array.isArray(s.value) ? s.value[0] : void 0,
        y1: stackSeries ? (d) => d.stackData[i][1] : Array.isArray(s.value) ? s.value[1] : s.value ?? (s.data ? void 0 : s.key),
        fill: s.color,
        fillOpacity: 0.3,
        ...props.area,
        ...s.props,
        class: cls(
          "transition-opacity",
          // Checking `visibleSeries.length > 1` fixes re-animated tweened areas on hover
          visibleSeries.length > 1 && highlightSeriesKey && highlightSeriesKey !== s.key && "opacity-10",
          props.area?.class,
          s.props?.class
        ),
        line: {
          stroke: s.color,
          ...lineProps,
          class: cls("transition-opacity", visibleSeries.length > 1 && highlightSeriesKey && highlightSeriesKey !== s.key && "opacity-10", lineProps.class)
        }
      };
      return areaProps;
    };
    brushProps = {
      ...typeof brush === "object" ? brush : null,
      ...props.brush
    };
    $$rendered = `${validate_component(Chart, "Chart").$$render(
      $$result,
      Object.assign(
        {},
        { data: chartData },
        { x },
        { xDomain },
        { xScale },
        {
          y: y ?? (stackSeries ? (d) => visibleSeries.flatMap((s, i) => d.stackData[i]) : visibleSeries.map((s) => s.value ?? s.key))
        },
        { yBaseline: 0 },
        { yNice: true },
        { radial },
        {
          padding: radial ? void 0 : defaultChartPadding(axis, legend)
        },
        $$restProps,
        {
          tooltip: $$props.tooltip === false ? false : {
            mode: "bisect-x",
            onclick: ontooltipclick,
            debug,
            ...props.tooltip?.context,
            ...$$props.tooltip
          }
        },
        {
          brush: brush && (brush === true || brush.mode == void 0 || brush.mode === "integrated") ? {
            axis: "x",
            resetOnEnd: true,
            xDomain,
            ...brushProps,
            onbrushend: (e) => {
              xDomain = e.xDomain;
              brushProps.onbrushend?.(e);
            }
          } : false
        },
        { tooltipContext: tooltipContext2 }
      ),
      {
        tooltipContext: ($$value) => {
          tooltipContext2 = $$value;
          $$settled = false;
        }
      },
      {
        default: ({ x: x2, xScale: xScale2, y: y2, yScale, c, cScale, width, height, padding, tooltip }) => {
          let slotProps = {
            x: x2,
            xScale: xScale2,
            y: y2,
            yScale,
            c,
            cScale,
            width,
            height,
            padding,
            tooltip,
            series,
            visibleSeries,
            getAreaProps,
            getLabelsProps,
            getPointsProps,
            highlightSeriesKey,
            setHighlightSeriesKey
          };
          return `${slots.default ? slots.default({ ...slotProps }) : ` ${slots.belowContext ? slots.belowContext({ ...slotProps }) : ``} ${validate_component((renderContext === "canvas" ? Canvas : Svg) || missing_component, "svelte:component").$$render($$result, Object.assign({}, asAny(renderContext === "canvas" ? props.canvas : props.svg), { center: radial }, { debug }), {}, {
            default: () => {
              return `${slots.grid ? slots.grid({ ...slotProps }) : ` ${grid ? `${validate_component(Grid, "Grid").$$render($$result, Object.assign({}, { x: radial }, { y: true }, typeof grid === "object" ? grid : null, props.grid), {}, {})}` : ``} `} ${validate_component(ChartClipPath, "ChartClipPath").$$render($$result, { disabled: !brush }, {}, {
                default: () => {
                  return `${slots.belowMarks ? slots.belowMarks({ ...slotProps }) : ``} ${slots.marks ? slots.marks({ ...slotProps }) : ` ${each(visibleSeries, (s, i) => {
                    return `${validate_component(Area, "Area").$$render($$result, Object.assign({}, getAreaProps(s, i)), {}, {})}`;
                  })} `}`;
                }
              })} ${slots.aboveMarks ? slots.aboveMarks({ ...slotProps }) : ``} ${slots.axis ? slots.axis({ ...slotProps }) : ` ${axis ? `${axis !== "x" ? `${validate_component(Axis, "Axis").$$render(
                $$result,
                Object.assign(
                  {},
                  { placement: radial ? "radius" : "left" },
                  {
                    format: (value) => {
                      if (seriesLayout === "stackExpand") {
                        return format(value, "percentRound");
                      } else {
                        return format(value, void 0, { variant: "short" });
                      }
                    }
                  },
                  typeof axis === "object" ? axis : null,
                  props.yAxis
                ),
                {},
                {}
              )}` : ``} ${axis !== "y" ? `${validate_component(Axis, "Axis").$$render(
                $$result,
                Object.assign(
                  {},
                  { placement: radial ? "angle" : "bottom" },
                  {
                    format: (value) => format(value, void 0, { variant: "short" })
                  },
                  typeof axis === "object" ? axis : null,
                  props.xAxis
                ),
                {},
                {}
              )}` : ``} ${rule ? `${validate_component(Rule, "Rule").$$render($$result, Object.assign({}, { x: 0 }, { y: 0 }, typeof rule === "object" ? rule : null, props.rule), {}, {})}` : ``}` : ``} `}  ${validate_component(ChartClipPath, "ChartClipPath").$$render($$result, { disabled: !brush, full: true }, {}, {
                default: () => {
                  return `${points ? `${each(visibleSeries, (s, i) => {
                    return `${validate_component(Points, "Points").$$render($$result, Object.assign({}, getPointsProps(s, i)), {}, {})}`;
                  })}` : ``} ${slots.highlight ? slots.highlight({ ...slotProps }) : ` ${each(visibleSeries, (s, i) => {
                    let seriesTooltipData = s.data && tooltip.data ? findRelatedData(s.data, tooltip.data, x2) : null, highlightPointsProps = typeof props.highlight?.points === "object" ? props.highlight.points : null;
                    return `  ${validate_component(Highlight, "Highlight").$$render(
                      $$result,
                      Object.assign(
                        {},
                        { data: seriesTooltipData },
                        {
                          y: stackSeries ? (d) => d.stackData[i][1] : s.value ?? (s.data ? void 0 : s.key)
                        },
                        { lines: i == 0 },
                        {
                          onpointclick: onpointclick ? (e, detail) => onpointclick(e, { ...detail, series: s }) : void 0
                        },
                        {
                          onpointenter: () => highlightSeriesKey = s.key
                        },
                        {
                          onpointleave: () => highlightSeriesKey = null
                        },
                        props.highlight,
                        {
                          points: props.highlight?.points == false ? false : {
                            ...highlightPointsProps,
                            fill: s.color,
                            class: cls("transition-opacity", highlightSeriesKey && highlightSeriesKey !== s.key && "opacity-10", highlightPointsProps?.class)
                          }
                        }
                      ),
                      {},
                      {}
                    )}`;
                  })} `} ${labels ? `${each(visibleSeries, (s, i) => {
                    return `${validate_component(Labels, "Labels").$$render($$result, Object.assign({}, getLabelsProps(s, i)), {}, {})}`;
                  })}` : ``}`;
                }
              })}`;
            }
          })} ${slots.aboveContext ? slots.aboveContext({ ...slotProps }) : ``} ${slots.legend ? slots.legend({ ...slotProps }) : ` ${legend ? `${validate_component(Legend, "Legend").$$render(
            $$result,
            Object.assign(
              {},
              {
                scale: isDefaultSeries ? void 0 : scaleOrdinal(series.map((s) => s.key), series.map((s) => s.color))
              },
              {
                tickFormat: (key) => series.find((s) => s.key === key)?.label ?? key
              },
              { placement: "bottom" },
              { variant: "swatches" },
              {
                onclick: (e, item) => $selectedSeries.toggleSelected(item.value)
              },
              {
                onpointerenter: (e, item) => highlightSeriesKey = item.value
              },
              {
                onpointerleave: (e) => highlightSeriesKey = null
              },
              props.legend,
              typeof legend === "object" ? legend : null,
              {
                classes: {
                  item: (item) => visibleSeries.length && !visibleSeries.some((s) => s.key === item.value) ? "opacity-50" : "",
                  ...props.legend?.classes,
                  ...typeof legend === "object" ? legend.classes : null
                }
              }
            ),
            {},
            {}
          )}` : ``} `} ${slots.tooltip ? slots.tooltip({ ...slotProps }) : ` ${validate_component(Tooltip, "Tooltip.Root").$$render($$result, Object.assign({}, props.tooltip?.root), {}, {
            default: ({ data: data2 }) => {
              return `${validate_component(TooltipHeader, "Tooltip.Header").$$render($$result, Object.assign({}, { value: x2(data2) }, { format }, props.tooltip?.header), {}, {})} ${validate_component(TooltipList, "Tooltip.List").$$render($$result, Object.assign({}, props.tooltip?.list), {}, {
                default: () => {
                  let seriesItems = stackSeries ? [...visibleSeries].reverse() : visibleSeries;
                  return ` ${each(seriesItems, (s) => {
                    let seriesTooltipData = s.data ? findRelatedData(s.data, data2, x2) : data2, valueAccessor = accessor(s.value ?? (s.data ? asAny(y2) : s.key));
                    return `  ${validate_component(TooltipItem, "Tooltip.Item").$$render(
                      $$result,
                      Object.assign(
                        {},
                        {
                          label: s.label ?? (s.key !== "default" ? s.key : "value")
                        },
                        {
                          value: seriesTooltipData ? valueAccessor(seriesTooltipData) : null
                        },
                        { color: s.color },
                        { format },
                        { valueAlign: "right" },
                        {
                          onpointerenter: () => highlightSeriesKey = s.key
                        },
                        {
                          onpointerleave: () => highlightSeriesKey = null
                        },
                        props.tooltip?.item
                      ),
                      {},
                      {}
                    )}`;
                  })} ${stackSeries && visibleSeries.length > 1 ? `${validate_component(TooltipSeparator, "Tooltip.Separator").$$render($$result, Object.assign({}, props.tooltip?.separator), {}, {})} ${validate_component(TooltipItem, "Tooltip.Item").$$render(
                    $$result,
                    Object.assign(
                      {},
                      { label: "total" },
                      {
                        value: sum(visibleSeries, (s) => {
                          const seriesTooltipData = s.data ? s.data.find((d) => x2(d) === x2(data2)) : data2;
                          const valueAccessor = accessor(s.value ?? (s.data ? asAny(y2) : s.key));
                          return valueAccessor(seriesTooltipData);
                        })
                      },
                      { format: "integer" },
                      { valueAlign: "right" },
                      props.tooltip?.root
                    ),
                    {},
                    {}
                  )}` : ``}`;
                }
              })}`;
            }
          })} `} `}`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_selectedSeries();
  return $$rendered;
});
const LinearGradient = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["id", "stops", "vertical", "x1", "y1", "x2", "y2", "rotate", "units"]);
  let $padding, $$unsubscribe_padding;
  let $height, $$unsubscribe_height;
  let $width, $$unsubscribe_width;
  let { id = uniqueId("linearGradient-") } = $$props;
  let { stops = ["var(--tw-gradient-from)", "var(--tw-gradient-to)"] } = $$props;
  let { vertical = false } = $$props;
  let { x1 = "0%" } = $$props;
  let { y1 = "0%" } = $$props;
  let { x2 = vertical ? "0%" : "100%" } = $$props;
  let { y2 = vertical ? "100%" : "0%" } = $$props;
  let { rotate = void 0 } = $$props;
  let { units = "objectBoundingBox" } = $$props;
  const { width, height, padding } = chartContext();
  $$unsubscribe_width = subscribe(width, (value) => $width = value);
  $$unsubscribe_height = subscribe(height, (value) => $height = value);
  $$unsubscribe_padding = subscribe(padding, (value) => $padding = value);
  const renderContext = getRenderContext();
  const canvasContext = getCanvasContext();
  let canvasGradient;
  function render2(ctx) {
    const _stops = stops.map((stop, i) => {
      if (Array.isArray(stop)) {
        const { fill } = getComputedStyles(ctx.canvas, {
          styles: { fill: stop[1] },
          classes: $$props.class
        });
        return {
          offset: parsePercent(stop[0]),
          color: fill
        };
      } else {
        const { fill } = getComputedStyles(ctx.canvas, {
          styles: { fill: stop },
          classes: $$props.class
        });
        return {
          offset: i / (stops.length - 1),
          color: fill
        };
      }
    });
    const gradient = createLinearGradient(ctx, $padding.left, $padding.top, vertical ? $padding.left : $width - $padding.right, vertical ? $height + $padding.bottom : $padding.top, _stops);
    canvasGradient = gradient;
  }
  let canvasUnregister;
  onDestroy(() => {
    if (renderContext === "canvas") {
      canvasUnregister();
    }
  });
  if ($$props.id === void 0 && $$bindings.id && id !== void 0) $$bindings.id(id);
  if ($$props.stops === void 0 && $$bindings.stops && stops !== void 0) $$bindings.stops(stops);
  if ($$props.vertical === void 0 && $$bindings.vertical && vertical !== void 0) $$bindings.vertical(vertical);
  if ($$props.x1 === void 0 && $$bindings.x1 && x1 !== void 0) $$bindings.x1(x1);
  if ($$props.y1 === void 0 && $$bindings.y1 && y1 !== void 0) $$bindings.y1(y1);
  if ($$props.x2 === void 0 && $$bindings.x2 && x2 !== void 0) $$bindings.x2(x2);
  if ($$props.y2 === void 0 && $$bindings.y2 && y2 !== void 0) $$bindings.y2(y2);
  if ($$props.rotate === void 0 && $$bindings.rotate && rotate !== void 0) $$bindings.rotate(rotate);
  if ($$props.units === void 0 && $$bindings.units && units !== void 0) $$bindings.units(units);
  {
    if (renderContext === "canvas") {
      canvasContext.invalidate();
    }
  }
  {
    if (renderContext === "canvas") {
      canvasUnregister = canvasContext.register({ name: "Gradient", render: render2 });
    }
  }
  $$unsubscribe_padding();
  $$unsubscribe_height();
  $$unsubscribe_width();
  return `${renderContext === "canvas" ? `${slots.default ? slots.default({ id, gradient: canvasGradient }) : ``}` : `${renderContext === "svg" ? `<defs><linearGradient${spread(
    [
      { id: escape_attribute_value(id) },
      { x1: escape_attribute_value(x1) },
      { y1: escape_attribute_value(y1) },
      { x2: escape_attribute_value(x2) },
      { y2: escape_attribute_value(y2) },
      {
        gradientTransform: escape_attribute_value(rotate ? `rotate(${rotate})` : "")
      },
      {
        gradientUnits: escape_attribute_value(units)
      },
      escape_object($$restProps)
    ],
    {}
  )}>${slots.stops ? slots.stops({}) : ` ${stops ? `${each(stops, (stop, i) => {
    return `${Array.isArray(stop) ? `<stop${add_attribute("offset", stop[0], 0)}${add_attribute("stop-color", stop[1], 0)}></stop>` : `<stop offset="${escape(i * (100 / (stops.length - 1)), true) + "%"}"${add_attribute("stop-color", stop, 0)}></stop>`}`;
  })}` : ``} `}</linearGradient></defs> ${slots.default ? slots.default({ id, gradient: "url(#" + id + ")" }) : ``}` : ``}`}`;
});
[
  {
    predicate: (duration) => duration == null,
    // Unknown
    interval: timeYear.every(1),
    // Better than rendering a lot of items
    format: (date) => date.toString()
  },
  {
    predicate: (duration) => duration.years > 1,
    interval: timeYear.every(1),
    format: (date) => formatDate(date, PeriodType.CalendarYear, { variant: "short" })
  },
  {
    predicate: (duration) => duration.years,
    interval: timeMonth.every(1),
    format: (date) => formatDate(date, PeriodType.Month, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 30,
    interval: timeMonth.every(1),
    format: (date) => formatDate(date, PeriodType.Month, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days,
    interval: timeDay.every(1),
    format: (date) => formatDate(date, PeriodType.Day, { variant: "short" })
  },
  {
    predicate: (duration) => duration.hours,
    interval: timeHour.every(1),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes > 10,
    interval: timeMinute.every(10),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes,
    interval: timeMinute.every(1),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.seconds > 10,
    interval: timeSecond.every(10),
    format: (date) => format$1(date, "h:mm:ss")
  },
  {
    predicate: (duration) => duration.seconds,
    interval: timeSecond.every(1),
    format: (date) => format$1(date, "h:mm:ss")
  },
  {
    predicate: (duration) => true,
    // 0 or more milliseconds
    interval: timeMillisecond.every(100),
    format: (date) => format$1(date, "h:mm:ss.SSS")
  }
];
[
  {
    predicate: (duration) => duration == null,
    // Unknown
    interval: timeYear.every(1),
    // Better than rendering a lot of items
    format: (date) => date.toString()
  },
  {
    predicate: (duration) => duration.years,
    interval: timeMonth.every(1),
    format: (date) => formatDate(date, PeriodType.Month, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 90,
    interval: timeMonth.every(1),
    format: (date) => formatDate(date, PeriodType.Month, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 30,
    interval: timeWeek.every(1),
    format: (date) => formatDate(date, PeriodType.WeekSun, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 7,
    interval: timeDay.every(1),
    format: (date) => formatDate(date, PeriodType.Day, { variant: "short" })
  },
  {
    predicate: (duration) => duration.days > 3,
    interval: timeHour.every(8),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.days,
    interval: timeHour.every(1),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.hours,
    interval: timeMinute.every(15),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes > 10,
    interval: timeMinute.every(10),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes > 2,
    interval: timeMinute.every(1),
    format: (date) => format$1(date, "h:mm a")
  },
  {
    predicate: (duration) => duration.minutes,
    interval: timeSecond.every(10),
    format: (date) => format$1(date, "h:mm:ss")
  },
  {
    predicate: (duration) => duration.seconds,
    interval: timeSecond.every(1),
    format: (date) => format$1(date, "h:mm:ss")
  },
  {
    predicate: (duration) => true,
    // 0 or more milliseconds
    interval: timeMillisecond.every(10),
    format: (date) => format$1(date, "h:mm:ss.SSS")
  }
];
function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
function sortByMonth(data) {
  return [...data || []].sort((a, b) => String(a.month).localeCompare(String(b.month)));
}
function addMonths(key, delta) {
  if (!key) return "";
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1 + delta, 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}`;
}
function yearFromMonth(key) {
  return String(key || "").slice(0, 4);
}
function monthLabel(key) {
  if (!key) return "";
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}
function weightedAverage(items) {
  if (!items.length) return null;
  const totalWeight = items.reduce((sum2, item) => sum2 + item.weight, 0);
  if (!totalWeight) return null;
  const total = items.reduce((sum2, item) => sum2 + item.value * item.weight, 0);
  return total / totalWeight;
}
function trimOutliers(items) {
  if (items.length < 4) return items;
  const sorted = [...items].sort((a, b) => a.value - b.value);
  return sorted.slice(1, -1);
}
function computeWeightedContribution(savings) {
  const sorted = sortByMonth(savings);
  if (!sorted.length) return null;
  const byYear = /* @__PURE__ */ new Map();
  for (const point of sorted) {
    const year = yearFromMonth(point.month);
    if (!year) continue;
    const current = byYear.get(year) || 0;
    const net = toNumber(point.income) - toNumber(point.expense);
    byYear.set(year, current + net);
  }
  const years = Array.from(byYear.keys()).sort();
  const recentYears = years.slice(-5);
  const items = recentYears.map((year, idx) => ({
    value: byYear.get(year) || 0,
    weight: idx + 1
  }));
  return weightedAverage(items);
}
function projectNetWorth(latestMonth, currentValue, annualGrowth, annualContribution, monthsAhead) {
  const results = [];
  if (!latestMonth) return results;
  const monthlyGrowth = annualGrowth === null ? 0 : Math.pow(1 + annualGrowth, 1 / 12) - 1;
  const monthlyContribution = annualContribution === null ? 0 : annualContribution / 12;
  let value = currentValue;
  for (let i = 1; i <= monthsAhead; i += 1) {
    value = value * (1 + monthlyGrowth) + monthlyContribution;
    results.push({
      month: addMonths(latestMonth, i),
      networth: value
    });
  }
  return results;
}
function formatCrore(value) {
  const crore = value / 1e7;
  if (Math.abs(crore) < 0.05) return "0";
  const rounded = Math.round(crore * 10) / 10;
  return `${rounded} cr`;
}
function safeX(d) {
  return d && typeof d.index === "number" ? d.index : 0;
}
function safeY(d) {
  return d && typeof d.value === "number" ? d.value : 0;
}
const NetWorthTargetPanel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let orderedSeries;
  let latest;
  let currentNetWorth;
  let cagrMetrics;
  let cagr;
  let recentYoY;
  let avgContribution;
  let projectionMonths;
  let projected;
  let monthsToTarget;
  let targetReached;
  let projectedHorizon;
  let projectedVisible;
  let historyVisible;
  let historyChart;
  let projectionChart;
  let chartSeries;
  let hasChartData;
  let chartValues;
  let chartMinValue;
  let chartMaxValue;
  let chartRangeValue;
  let chartAbsMax;
  let chartPad;
  let currentPoint;
  let progressPct;
  let targetYear;
  let trendLabel;
  let targetEtaLabel;
  let xLabels;
  let { series = [] } = $$props;
  let { savingsSeries = [] } = $$props;
  let target = 0;
  let targetInitialized = false;
  function computeWeightedCagr(monthly) {
    const sorted = sortByMonth(monthly);
    if (sorted.length < 13) return { cagr: null, recentYoY: null };
    const lastIndex = sorted.length - 1;
    const rates = [];
    for (let yearIndex = 0; yearIndex < 5; yearIndex += 1) {
      const endIndex = lastIndex - yearIndex * 12;
      const startIndex = endIndex - 12;
      if (startIndex < 0 || endIndex < 0) continue;
      const startValue = toNumber(sorted[startIndex].networth);
      const endValue = toNumber(sorted[endIndex].networth);
      if (Math.abs(startValue) < 1e-5) continue;
      const rate = endValue / startValue - 1;
      rates.push({ value: rate, weight: 5 - yearIndex });
    }
    if (!rates.length) return { cagr: null, recentYoY: null };
    const recentYoY2 = rates[0] ? rates[0].value : null;
    const filtered = trimOutliers(rates);
    const avg = weightedAverage(filtered);
    return { cagr: avg, recentYoY: recentYoY2 };
  }
  function findMonthsToTarget(projected2, targetValue) {
    if (!projected2.length) return null;
    const idx = projected2.findIndex((point) => point.networth >= targetValue);
    return idx === -1 ? null : idx + 1;
  }
  if ($$props.series === void 0 && $$bindings.series && series !== void 0) $$bindings.series(series);
  if ($$props.savingsSeries === void 0 && $$bindings.savingsSeries && savingsSeries !== void 0) $$bindings.savingsSeries(savingsSeries);
  orderedSeries = sortByMonth(series || []);
  latest = orderedSeries.length ? orderedSeries[orderedSeries.length - 1] : null;
  currentNetWorth = latest ? toNumber(latest.networth) : 0;
  {
    if (!targetInitialized && currentNetWorth > 0) {
      target = Math.round(currentNetWorth * 1.5);
      targetInitialized = true;
    }
  }
  cagrMetrics = computeWeightedCagr(orderedSeries);
  cagr = cagrMetrics.cagr;
  recentYoY = cagrMetrics.recentYoY;
  avgContribution = computeWeightedContribution(savingsSeries);
  projectionMonths = 120;
  projected = projectNetWorth(latest ? latest.month : "", currentNetWorth, cagr, avgContribution, projectionMonths);
  monthsToTarget = target > 0 ? findMonthsToTarget(projected, target) : null;
  targetReached = target > 0 && currentNetWorth >= target;
  projectedHorizon = (() => {
    if (targetReached) return 12;
    if (monthsToTarget) return Math.min(projectionMonths, Math.max(12, monthsToTarget));
    return projectionMonths;
  })();
  projectedVisible = projected.slice(0, projectedHorizon);
  historyVisible = orderedSeries.slice(-120);
  historyChart = historyVisible.map((point, index) => ({
    index,
    month: point.month,
    label: monthLabel(point.month),
    value: toNumber(point.networth),
    seriesKey: "history"
  }));
  projectionChart = projectedVisible.map((point, index) => ({
    index: historyChart.length + index,
    month: point.month,
    label: monthLabel(point.month),
    value: toNumber(point.networth),
    seriesKey: "projection"
  }));
  chartSeries = [...historyChart, ...projectionChart];
  hasChartData = chartSeries.length > 0;
  chartValues = chartSeries.map((d) => d.value).filter((v) => Number.isFinite(v));
  chartMinValue = chartValues.length ? Math.min(...chartValues) : 0;
  chartMaxValue = chartValues.length ? Math.max(...chartValues) : 0;
  chartRangeValue = chartMaxValue - chartMinValue;
  chartAbsMax = Math.max(Math.abs(chartMinValue), Math.abs(chartMaxValue));
  chartPad = chartAbsMax === 0 ? 1 : chartRangeValue < chartAbsMax * 0.08 ? chartAbsMax * 0.08 : chartRangeValue * 0.12;
  currentPoint = historyChart.length ? historyChart[historyChart.length - 1] : null;
  progressPct = target > 0 ? Math.min(100, Math.max(0, currentNetWorth / target * 100)) : 0;
  targetYear = (() => {
    if (targetReached) return "Reached";
    if (!monthsToTarget) return null;
    const monthKey = addMonths(latest ? latest.month : "", monthsToTarget);
    return monthKey ? monthKey.slice(0, 4) : null;
  })();
  trendLabel = (() => {
    if (recentYoY === null || cagr === null) return "Trend data unavailable.";
    const recentPct = recentYoY * 100;
    const longPct = cagr * 100;
    const diff = recentPct - longPct;
    const direction = diff >= 0 ? "above" : "below";
    return `Recent 12-month trend is ${Math.abs(diff).toFixed(1)}% ${direction} the long-term pace.`;
  })();
  targetEtaLabel = (() => {
    if (targetReached) return "Target already reached.";
    if (!target || target <= 0) return "Set a target to estimate timeline.";
    if (monthsToTarget) return `${monthsToTarget} months to target.`;
    if (cagr === null && avgContribution === null) return "Not enough data to estimate target.";
    if ((cagr || 0) <= 0 && (avgContribution || 0) <= 0) return "Target not reachable with current trend.";
    return "Target likely beyond 10 years.";
  })();
  xLabels = Array.from({ length: 6 }).map((_, i) => ({ label: `Year ${i}` }));
  return `<section class="target-panel"><div class="target-panel__header" data-svelte-h="svelte-4b7cs1"><div><div class="target-panel__title">Net Worth Target Tracker</div> <div class="target-panel__subtitle">Goal projection driven by historical growth and contributions.</div></div> <div class="target-panel__pill">Projection</div></div> <div class="target-panel__body"><div class="target-panel__metrics"><div class="target-panel__value">${escape(currentNetWorth ? formatInr(currentNetWorth) : "--")}</div> <div class="target-panel__label" data-svelte-h="svelte-1tydos7">Current Net Worth</div> <label class="target-panel__input-label">Target Net Worth
        <input class="target-panel__input" type="number" min="0" step="1000"${add_attribute("value", target, 0)}></label> <div class="target-panel__progress"><div class="target-panel__progress-row"><span data-svelte-h="svelte-16oy1pd">Progress</span> <span>${escape(target ? `${progressPct.toFixed(1)}%` : "--")}</span></div> <div class="target-panel__progress-track"><div class="target-panel__progress-bar"${add_attribute("style", `width: ${progressPct}%`, 0)}></div></div></div> <div class="target-panel__insights"><div>5Y weighted CAGR: ${escape(cagr === null ? "--" : `${(cagr * 100).toFixed(2)}%`)}</div> <div>Avg annual contribution: ${escape(avgContribution === null ? "--" : formatInr(Math.round(avgContribution)))}</div> <div>Estimated target year: ${escape(targetYear || "--")}</div> <div>${escape(trendLabel)}</div> <div>${escape(targetEtaLabel)}</div></div></div> <div class="target-panel__chart"><div class="target-panel__chart-header" data-svelte-h="svelte-ybu9q0"><div><div class="target-panel__chart-title">Net Worth Trajectory</div> <div class="target-panel__chart-subtitle">Historical vs projection (next 5 years)</div></div> <div class="target-panel__legend"><span class="target-panel__legend-item"><span class="dot dot-history"></span>History</span> <span class="target-panel__legend-item"><span class="dot dot-projection"></span>Projection</span> <span class="target-panel__legend-item"><span class="dot dot-target"></span>Target</span></div></div> <div class="target-panel__chart-card">${validate_component(AreaChart, "AreaChart").$$render(
    $$result,
    {
      data: hasChartData ? chartSeries : [
        {
          index: 0,
          value: 0,
          label: "",
          seriesKey: "history"
        }
      ],
      yDomain: chartValues.length ? [chartMinValue - chartPad, chartMaxValue + chartPad] : void 0,
      x: safeX,
      y: safeY,
      axis: "y",
      grid: {
        y: true,
        x: false,
        classes: { line: "target-grid-line" }
      },
      rule: false,
      padding: { top: 12, right: 24, bottom: 24, left: 56 },
      props: {
        yAxis: {
          ticks: 4,
          tickLength: 0,
          format: (value) => formatCrore(value),
          tickLabelProps: { class: "target-axis-label" },
          classes: { rule: "hidden", tick: "hidden" }
        },
        area: {
          curve: curveMonotoneX,
          fillOpacity: 0.2,
          line: {
            curve: curveMonotoneX,
            strokeWidth: 2.5,
            draw: { duration: 600 }
          }
        },
        tooltip: {
          root: { class: "target-tooltip" },
          header: { class: "target-tooltip__title" },
          list: { class: "target-tooltip__list" },
          item: { class: "target-tooltip__item" },
          separator: { class: "target-tooltip__separator" }
        }
      },
      series: [
        {
          key: "history",
          label: "History",
          data: historyChart,
          value: (d) => d.value,
          color: "var(--nw-history)",
          props: {
            fillOpacity: 0,
            line: {
              stroke: "var(--nw-history)",
              strokeWidth: 2.6,
              draw: { duration: 600 }
            }
          }
        },
        {
          key: "projection",
          label: "Projection",
          data: projectionChart,
          value: (d) => d.value,
          color: "url(#nw-projection-fill)",
          props: {
            fillOpacity: 0.35,
            line: {
              stroke: "var(--nw-projection)",
              strokeWidth: 2.2,
              strokeDasharray: "6 6",
              opacity: 0.9,
              draw: { duration: 600 }
            }
          }
        }
      ]
    },
    {},
    {
      tooltip: () => {
        return `${validate_component(Tooltip, "Tooltip.Root").$$render(
          $$result,
          {
            x: "data",
            y: "data",
            anchor: "top",
            classes: { container: "target-tooltip__container" }
          },
          {},
          {
            default: ({ data }) => {
              return `<div class="target-tooltip__title">${escape(data?.label || "")}</div> <div class="target-tooltip__value">${escape(data ? formatInr(Math.round(data.value)) : "--")}</div> <div class="target-tooltip__meta">${escape(data?.seriesKey === "projection" ? "Projection" : "Historical")}</div>`;
            }
          }
        )} `;
      },
      aboveMarks: ({ xScale, yScale, width, height }) => {
        return `${target > 0 ? `${validate_component(Line, "Line").$$render(
          $$result,
          {
            x1: 0,
            x2: width,
            y1: yScale(target),
            y2: yScale(target),
            stroke: "var(--nw-target)",
            strokeWidth: 1,
            strokeDasharray: "5 6",
            class: "target-line"
          },
          {},
          {}
        )}` : ``} ${currentPoint ? `${validate_component(Circle, "Circle").$$render(
          $$result,
          {
            cx: xScale(currentPoint.index),
            cy: yScale(currentPoint.value),
            r: 5,
            fill: "var(--nw-primary)",
            stroke: "#ffffff",
            strokeWidth: 2,
            class: "target-current-point"
          },
          {},
          {}
        )}` : ``} `;
      },
      belowMarks: () => {
        return `${validate_component(LinearGradient, "LinearGradient").$$render(
          $$result,
          {
            id: "nw-projection-fill",
            vertical: true,
            stops: [
              ["0%", "rgba(99,102,241,0.35)"],
              ["70%", "rgba(99,102,241,0.08)"],
              ["100%", "rgba(99,102,241,0)"]
            ]
          },
          {},
          {}
        )}`;
      }
    }
  )}</div> <div class="target-panel__xlabels">${each(xLabels, (label) => {
    return `<span>${escape(label.label)}</span>`;
  })}</div></div></div></section>`;
});
function sparklinePath(values, width, height) {
  if (!values.length) return "";
  const min2 = Math.min(...values);
  const max2 = Math.max(...values);
  const range2 = max2 - min2 || 1;
  const points = values.map((v, i) => {
    const x = i / Math.max(values.length - 1, 1) * width;
    const y = height - (v - min2) / range2 * height;
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
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let networthMonthly = [];
  let savingsMonthly = [];
  return `<div class="space-y-8"><div class="space-y-2" data-svelte-h="svelte-1l9o3dg"><h1 class="text-2xl font-semibold text-gray-900">Dashboard</h1> <p class="text-sm text-gray-500">Financial intelligence from your ledger activity.</p></div> ${``} <div class="grid grid-cols-1 gap-8 lg:grid-cols-2"><div class="lg:col-span-2">${validate_component(NetWorthTargetPanel, "NetWorthTargetPanel").$$render(
    $$result,
    {
      series: networthMonthly,
      savingsSeries: savingsMonthly
    },
    {},
    {}
  )}</div> ${validate_component(NetWorthGrowthPanel, "NetWorthGrowthPanel").$$render($$result, { series: networthMonthly }, {}, {})} ${validate_component(MonthlySavingPanel, "MonthlySavingPanel").$$render($$result, { series: savingsMonthly }, {}, {})}</div></div>`;
});
export {
  Page as default
};
