<script>
  import { onMount } from "svelte";
  import { formatInr } from "$lib/format";

  export let snapshot = null;
  export let loading = false;
  export let refreshKey = 0;

  let error = "";
  let animate = false;
  let lastRefreshKey = 0;

  const ringRadius = 56;
  const ringCircumference = 2 * Math.PI * ringRadius;

  function safeNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatMonthLabel(key) {
    if (!key) return "";
    const [y, m] = String(key).split("-");
    if (!y || !m) return "";
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function toFixedOrDash(value, digits = 1) {
    if (value === null || value === undefined || Number.isNaN(value)) return "--";
    return Number(value).toFixed(digits);
  }

  function formatMoney(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "--";
    return `INR ${formatInr(value)}`;
  }

  function formatMonthsAsYears(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "--";
    if (value < 12) return `${toFixedOrDash(value, 1)} months`;
    const totalMonths = Math.round(value);
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (months === 0) return `${years} year${years === 1 ? "" : "s"}`;
    return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
  }

  function formatDaysToMonths(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return "--";
    if (value < 30) return `${toFixedOrDash(value, 1)} days`;
    const totalDays = Math.round(value);
    const months = Math.floor(totalDays / 30);
    const days = totalDays % 30;
    if (days === 0) return `${months} month${months === 1 ? "" : "s"}`;
    return `${months} month${months === 1 ? "" : "s"} ${days} day${days === 1 ? "" : "s"}`;
  }

  onMount(() => {
    setTimeout(() => {
      animate = true;
    }, 30);
  });

  $: if (refreshKey !== lastRefreshKey) {
    lastRefreshKey = refreshKey;
    animate = false;
    setTimeout(() => {
      animate = true;
    }, 30);
  }

  $: netWorth = safeNumber(snapshot?.net_worth);
  $: monthlyExpenses = safeNumber(snapshot?.monthly_expenses);
  $: monthlySaving = safeNumber(snapshot?.monthly_saving);
  $: netWorthChange = safeNumber(snapshot?.net_worth_change_last_month);
  $: targetMonths = safeNumber(snapshot?.target_months) || 300;

  $: monthsFunded =
    safeNumber(snapshot?.months_funded) ??
    (netWorth !== null && monthlyExpenses ? netWorth / monthlyExpenses : null);
  $: savingCoveragePct =
    safeNumber(snapshot?.saving_coverage_pct) ??
    (monthlySaving !== null && monthlyExpenses ? (monthlySaving / monthlyExpenses) * 100 : null);
  $: daysFreedomGained =
    safeNumber(snapshot?.days_freedom_gained) ??
    (netWorthChange !== null && monthlyExpenses ? (netWorthChange / monthlyExpenses) * 30 : null);
  $: freedomProgressPct =
    safeNumber(snapshot?.freedom_progress_pct) ??
    (monthsFunded !== null ? (monthsFunded / targetMonths) * 100 : null);

  $: ringProgress = freedomProgressPct !== null ? clamp(freedomProgressPct, 0, 100) : 0;
  $: ringOffset = ringCircumference * (1 - ringProgress / 100);

  $: insightText = (() => {
    if (daysFreedomGained !== null) {
      return `You gained ${formatDaysToMonths(daysFreedomGained)} of freedom this month.`;
    }
    if (savingCoveragePct !== null) {
      return `Your savings cover ${toFixedOrDash(savingCoveragePct, 0)}% of expenses.`;
    }
    if (monthsFunded !== null) {
      return `You are financially secure for ${formatMonthsAsYears(monthsFunded)}.`;
    }
    return "No cached data yet. Refresh the dashboard to compute your freedom clock.";
  })();
</script>

<section class="freedom-clock">
  <div class="freedom-clock__orb freedom-clock__orb--a"></div>
  <div class="freedom-clock__orb freedom-clock__orb--b"></div>

  <div class={`freedom-clock__content ${animate ? "is-visible" : ""}`}>
    <div class="freedom-clock__header">
      <div>
        <div class="freedom-clock__title">Financial Freedom Clock</div>
        <div class="freedom-clock__subtitle">How much of your life is already funded.</div>
      </div>
      <div class="freedom-clock__tag">Freedom Progress</div>
    </div>

    {#if error}
      <p class="text-sm font-semibold text-rose-600">{error}</p>
    {/if}

    <div class="freedom-clock__grid">
      <div class="freedom-clock__main">
        <div class="freedom-clock__metric">
          <div class="freedom-clock__value">
            {monthsFunded !== null ? formatMonthsAsYears(monthsFunded) : "--"}
          </div>
          <div class="freedom-clock__label">Months of living expenses covered</div>
        </div>

        <div class="freedom-clock__meta">
          <div>
            <div class="freedom-clock__meta-label">Monthly expenses</div>
            <div class="freedom-clock__meta-value">
              {monthlyExpenses !== null ? formatMoney(monthlyExpenses) : "--"}
            </div>
          </div>
          <div>
            <div class="freedom-clock__meta-label">Liquid net worth</div>
            <div class="freedom-clock__meta-value">
              {netWorth !== null ? formatMoney(netWorth) : "--"}
            </div>
          </div>
          <div>
            <div class="freedom-clock__meta-label">Last updated</div>
            <div class="freedom-clock__meta-value">
              {snapshot?.updated_month ? formatMonthLabel(snapshot.updated_month) : "--"}
            </div>
          </div>
        </div>

        <div class="freedom-clock__stats">
          <div class="freedom-clock__stat">
            <div class="freedom-clock__stat-label">Saving coverage</div>
            <div class="freedom-clock__stat-value">
              {savingCoveragePct !== null ? `${toFixedOrDash(savingCoveragePct, 0)}%` : "--"}
            </div>
          </div>
          <div class="freedom-clock__stat">
            <div class="freedom-clock__stat-label">Days gained this month</div>
            <div class="freedom-clock__stat-value">
              {daysFreedomGained !== null ? formatDaysToMonths(daysFreedomGained) : "--"}
            </div>
          </div>
        </div>

        <div class="freedom-clock__insight">{insightText}</div>
      </div>

      <div class="freedom-clock__progress">
        <div class="freedom-clock__ring">
          <svg viewBox="0 0 140 140" class="freedom-ring">
            <defs>
              <linearGradient id="freedom-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#22d3ee" />
                <stop offset="100%" stop-color="#6366f1" />
              </linearGradient>
            </defs>
            <circle class="freedom-ring__track" cx="70" cy="70" r={ringRadius} />
            <circle
              class="freedom-ring__progress"
              cx="70"
              cy="70"
              r={ringRadius}
              stroke-dasharray={ringCircumference}
              stroke-dashoffset={animate ? ringOffset : ringCircumference}
            />
          </svg>
          <div class="freedom-ring__center">
            <div class="freedom-ring__value">
              {freedomProgressPct !== null ? `${toFixedOrDash(freedomProgressPct, 1)}%` : "--"}
            </div>
            <div class="freedom-ring__label">of {targetMonths} months</div>
          </div>
        </div>
        <div class="freedom-clock__progress-text">
          Targeted freedom runway of {targetMonths} months.
        </div>
      </div>
    </div>

    {#if loading}
      <div class="freedom-clock__loading">Loading financial freedom metrics...</div>
    {/if}
  </div>
</section>
