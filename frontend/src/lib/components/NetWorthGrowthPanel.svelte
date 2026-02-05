<script>
  import { formatInr } from "$lib/format";
  import { getMonthlyNetWorth } from "$lib/financeMetrics";
  import DashboardCard from "$lib/components/DashboardCard.svelte";

  /** @type {import("$lib/financeMetrics").NetWorthMonthlyPoint[]} */
  export let series = [];

  /**
   * @param {import("$lib/financeMetrics").NetWorthMonthlyPoint[]} data
   * @param {number} width
   * @param {number} height
   */
  function sparklinePath(data, width, height) {
    if (!data.length) return "";
    const values = data.map((d) => Number(d.networth) || 0);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * width;
      const y = height - ((Number(d.networth) || 0) - min) / range * height;
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

  $: metrics = getMonthlyNetWorth(series);
  $: sparklineSeries = metrics.series.slice(-12);
  $: growthLabel = metrics.annualizedGrowthPct === null
    ? "--"
    : `${metrics.annualizedGrowthPct >= 0 ? "↑" : "↓"} ${Math.abs(metrics.annualizedGrowthPct).toFixed(1)}% p.a. (monthly annualized)`;
  $: growthClass =
    metrics.annualizedGrowthPct === null
      ? "text-gray-400"
      : metrics.annualizedGrowthPct >= 0
        ? "text-emerald-600"
        : "text-rose-600";
</script>

<DashboardCard title="Net Worth" iconBg="bg-emerald-50" iconColor="text-emerald-600">
  <span slot="value">{metrics.latest ? formatInr(metrics.latest.networth) : "--"}</span>
  <div slot="body" class={`mt-2 flex items-center gap-2 text-sm font-semibold ${growthClass}`}>
    <span>{growthLabel}</span>
  </div>
  <svg slot="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-6 w-6" stroke-width="1.5">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      d="M2.25 7.5h19.5m-16.5 6h3.75m3 0h3.75m3 0h1.5M3 6.75h18A1.5 1.5 0 0122.5 8.25v7.5A1.5 1.5 0 0121 17.25H3A1.5 1.5 0 011.5 15.75v-7.5A1.5 1.5 0 013 6.75z"
    />
  </svg>
  <svg slot="sparkline" viewBox="0 0 260 90" class="h-full w-full" preserveAspectRatio="none">
    <path
      d={sparklinePath(sparklineSeries, 260, 80)}
      fill="none"
      stroke="#2563eb"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</DashboardCard>
