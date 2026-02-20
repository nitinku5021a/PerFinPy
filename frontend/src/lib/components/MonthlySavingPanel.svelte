<script>
  import { formatInr } from "$lib/format";
  import { getMonthlySavings } from "$lib/financeMetrics";
  import DashboardCard from "$lib/components/DashboardCard.svelte";

  /** @type {import("$lib/financeMetrics").SavingsMonthlyPoint[]} */
  export let series = [];

  /**
   * @param {number[]} values
   * @param {number} width
   * @param {number} height
   */
  function sparklinePath(values, width, height) {
    if (!values.length) return "";
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
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

  $: metrics = getMonthlySavings(series);
  $: savingValue = metrics.currentSaving;
  $: avgValue = metrics.avgPrev12Saving;
  $: savingPct = metrics.savingPctOfIncome;
  $: today = new Date();
  $: currentMonthKey = metrics.current ? metrics.current.month : "";
  $: currentMonthYear = currentMonthKey ? Number(currentMonthKey.split("-")[0]) : null;
  $: currentMonthIndex = currentMonthKey ? Number(currentMonthKey.split("-")[1]) - 1 : null;
  $: isCurrentMonth =
    currentMonthYear !== null &&
    currentMonthIndex !== null &&
    currentMonthYear === today.getFullYear() &&
    currentMonthIndex === today.getMonth();
  $: daysInCurrentMonth =
    currentMonthYear !== null && currentMonthIndex !== null
      ? new Date(currentMonthYear, currentMonthIndex + 1, 0).getDate()
      : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  $: monthProgress = isCurrentMonth
    ? (daysInCurrentMonth ? today.getDate() / daysInCurrentMonth : 0)
    : 1;
  $: proratedAvg = avgValue !== null ? avgValue * monthProgress : null;
  $: savingDelta = savingValue !== null && proratedAvg !== null ? savingValue - proratedAvg : null;
  $: savingDeltaAbs = savingDelta !== null ? Math.abs(savingDelta) : null;
  $: savingClass =
    savingDelta === null ? "text-gray-400" : savingDelta >= 0 ? "text-emerald-600" : "text-rose-600";
  $: savingBadgeBg =
    savingDelta === null ? "bg-slate-100 text-slate-500" : savingDelta >= 0 ? "bg-emerald-50" : "bg-rose-50";
  $: savingSeries = (series || [])
    .slice(-12)
    .map((point) => Number(point.income || 0) - Number(point.expense || 0));
</script>

<DashboardCard title="This Month Saving" iconBg="bg-indigo-50" iconColor="text-indigo-600">
  <span slot="value">{savingValue !== null ? formatInr(savingValue) : "--"}</span>
  <div slot="body" class="mt-4 flex flex-wrap gap-2">
    <span class={`rounded-full px-3 py-1 text-xs font-semibold ${savingClass} ${savingBadgeBg}`}>
      {savingDelta !== null
        ? `vs 12m avg (pro-rated) ${savingDelta >= 0 ? "↑" : "↓"} ${formatInr(savingDeltaAbs)}`
        : "vs 12m avg (pro-rated) --"}
    </span>
    <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
      {savingPct !== null ? `${savingPct.toFixed(1)}% of income` : "% of income --"}
    </span>
  </div>
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-6 w-6" stroke-width="1.5">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M3 17.25l6-6 4 4 7-7M21 7.5V14.25M21 7.5h-6.75"
    />
  </svg>
  <svg slot="sparkline" viewBox="0 0 260 90" class="h-full w-full" preserveAspectRatio="none">
    <path
      d={sparklinePath(savingSeries, 260, 80)}
      fill="none"
      stroke="#6366f1"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</DashboardCard>
