export type AccountSummary = {
  id: number;
  account_type: string;
  path?: string;
  name?: string;
  is_leaf?: boolean;
};

export type AccountMonthlyBalances = Record<string, number>;

export type PortfolioValuePoint = {
  month: string;
  value: number;
};

export type InvestmentFlowPoint = {
  month: string;
  net_invested: number;
};

export type PerformanceRow = {
  month: string;
  start_value: number;
  net_invested: number;
  end_value: number;
  return_pct: number | null;
};

export type PerformanceSummary = {
  rows: PerformanceRow[];
  total_invested: number;
  overall_return_pct: number | null;
};

const MUTUAL_FUND_RE = /mutual\s*funds?/i;

export function getInvestmentAccounts(accounts: AccountSummary[]): AccountSummary[] {
  return (accounts || []).filter((acc) => {
    if (acc.account_type === "Equity") return true;
    if (acc.account_type !== "Asset") return false;
    const label = `${acc.path || ""} ${acc.name || ""}`.trim();
    return MUTUAL_FUND_RE.test(label);
  });
}

export function getMonthlyPortfolioValues(
  months: string[],
  balancesByAccountId: Record<string, AccountMonthlyBalances>,
  accountIds: number[]
): PortfolioValuePoint[] {
  return (months || []).map((month) => {
    let total = 0;
    for (const accId of accountIds) {
      const balances = balancesByAccountId[String(accId)];
      total += balances ? Number(balances[month] || 0) : 0;
    }
    return { month, value: total };
  });
}

export function getMonthlyInvestmentFlows(
  months: string[],
  flowPoints: InvestmentFlowPoint[]
): InvestmentFlowPoint[] {
  const byMonth = new Map((flowPoints || []).map((p) => [p.month, p.net_invested]));
  return (months || []).map((month) => ({
    month,
    net_invested: Number(byMonth.get(month) || 0)
  }));
}

export function getMonthlyPerformance(
  portfolioValues: PortfolioValuePoint[],
  flows: InvestmentFlowPoint[]
): PerformanceSummary {
  const rows: PerformanceRow[] = [];
  for (let i = 1; i < (portfolioValues || []).length; i += 1) {
    const prev = portfolioValues[i - 1];
    const current = portfolioValues[i];
    const flow = flows[i]?.net_invested ?? 0;
    const startValue = Number(prev.value || 0);
    const endValue = Number(current.value || 0);
    let returnPct: number | null = null;
    if (Math.abs(startValue) > 0.00001) {
      returnPct = ((endValue - startValue) / startValue) * 100;
    }
    rows.push({
      month: current.month,
      start_value: startValue,
      net_invested: flow,
      end_value: endValue,
      return_pct: returnPct
    });
  }

  const last12 = rows.slice(-12);
  const totalInvested = last12.reduce((sum, row) => sum + row.net_invested, 0);
  const firstRow = last12.length ? last12[0] : null;
  const lastRow = last12.length ? last12[last12.length - 1] : null;

  let overallReturnPct: number | null = null;
  if (firstRow && lastRow && Math.abs(firstRow.start_value) > 0.00001) {
    overallReturnPct = ((lastRow.end_value - firstRow.start_value) / firstRow.start_value) * 100;
  }

  return {
    rows: last12,
    total_invested: totalInvested,
    overall_return_pct: overallReturnPct
  };
}
