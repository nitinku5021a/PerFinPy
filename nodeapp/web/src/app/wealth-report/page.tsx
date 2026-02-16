"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type GrowthRow = { year: number; networth: number; pct_change: number | null };
type EiaRow = {
  year: number;
  sum_income: number;
  sum_expense: number;
  max_asset: number;
  savings_pct_income: number | null;
  savings_pct_expense: number | null;
  asset_yoy_change_pct: number | null;
};

function formatMoney(value: number) {
  const num = Number(value || 0);
  const prefix = num < 0 ? "-Rs " : "Rs ";
  return `${prefix}${Math.abs(num).toLocaleString("en-IN")}`;
}

function formatPct(value: number | null) {
  if (value === null || value === undefined) return "--";
  return `${value.toFixed(1)}%`;
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [growth, setGrowth] = useState<GrowthRow[]>([]);
  const [years, setYears] = useState<EiaRow[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const growthPayload = await apiGet("/reports/networth-growth");
      const eiaPayload = await apiGet("/reports/expense-income-asset");
      setGrowth(growthPayload?.yearly || []);
      setYears(eiaPayload?.years || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load wealth report.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Wealth Report</div>
        <div className="subtle">High-level net worth growth and income vs expense trends.</div>
      </div>

      {error ? <div className="danger">{error}</div> : null}

      {loading ? (
        <div className="meta">Loading...</div>
      ) : (
        <>
          <div className="card">
            <div className="h1" style={{ fontSize: 16, marginBottom: 8 }}>
              Net Worth Growth (Yearly)
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="num">Net Worth</th>
                  <th className="num">YoY %</th>
                </tr>
              </thead>
              <tbody>
                {growth.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="meta">
                      No yearly net worth data.
                    </td>
                  </tr>
                ) : null}
                {growth.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className="num">{formatMoney(row.networth)}</td>
                    <td className="num">{formatPct(row.pct_change)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="h1" style={{ fontSize: 16, marginBottom: 8 }}>
              Income, Expense, Asset Summary (Yearly)
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="num">Income</th>
                  <th className="num">Expense</th>
                  <th className="num">Max Assets</th>
                  <th className="num">Savings % Income</th>
                  <th className="num">Asset YoY %</th>
                </tr>
              </thead>
              <tbody>
                {years.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="meta">
                      No yearly summary data.
                    </td>
                  </tr>
                ) : null}
                {years.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className="num">{formatMoney(row.sum_income)}</td>
                    <td className="num">{formatMoney(row.sum_expense)}</td>
                    <td className="num">{formatMoney(row.max_asset)}</td>
                    <td className="num">{formatPct(row.savings_pct_income)}</td>
                    <td className="num">{formatPct(row.asset_yoy_change_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
