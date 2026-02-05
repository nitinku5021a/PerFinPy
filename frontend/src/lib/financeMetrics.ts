export type NetWorthMonthlyPoint = {
  month: string;
  networth: number;
  delta?: number | null;
  pct_change?: number | null;
};

export type SavingsMonthlyPoint = {
  month: string;
  income: number;
  expense: number;
  net_savings?: number | null;
  net_savings_pct?: number | null;
};

export type NetWorthMetrics = {
  series: NetWorthMonthlyPoint[];
  latest: NetWorthMonthlyPoint | null;
  annualizedGrowthPct: number | null;
};

export type SavingsMetrics = {
  current: SavingsMonthlyPoint | null;
  currentSaving: number | null;
  avgPrev12Saving: number | null;
  savingPctOfIncome: number | null;
  previous12: SavingsMonthlyPoint[];
};

function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function getMonthlyNetWorth(
  months: NetWorthMonthlyPoint[],
  count = 13
): NetWorthMetrics {
  const safeSeries = (months || []).map((point) => ({
    ...point,
    networth: toNumber(point.networth)
  }));
  const series = safeSeries.slice(-count);
  const latest = series.length ? series[series.length - 1] : null;
  const prev = series.length > 1 ? series[series.length - 2] : null;

  let annualizedGrowthPct: number | null = null;
  if (latest && prev && Math.abs(prev.networth) > 0.00001) {
    const monthlyGrowth = (latest.networth - prev.networth) / prev.networth;
    annualizedGrowthPct = (Math.pow(1 + monthlyGrowth, 12) - 1) * 100;
  }

  return {
    series,
    latest,
    annualizedGrowthPct
  };
}

export function getMonthlySavings(
  months: SavingsMonthlyPoint[]
): SavingsMetrics {
  const safeSeries = (months || []).map((point) => ({
    ...point,
    income: toNumber(point.income),
    expense: toNumber(point.expense)
  }));
  const current = safeSeries.length ? safeSeries[safeSeries.length - 1] : null;

  let currentSaving: number | null = null;
  let savingPctOfIncome: number | null = null;
  if (current) {
    currentSaving = current.income - current.expense;
    if (current.income > 0.00001) {
      savingPctOfIncome = (currentSaving / current.income) * 100;
    }
  }

  const previous12 = safeSeries.slice(0, -1).slice(-12);
  let avgPrev12Saving: number | null = null;
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
