"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type AccountNode = {
  account: { id: number; name: string; path?: string };
  balance: number;
  children?: AccountNode[];
};

type ReportPayload = {
  income_accounts: AccountNode[];
  expense_accounts: AccountNode[];
  total_income: number;
  total_expenses: number;
  net_income: number;
  period: string;
  start_date: string | null;
  end_date: string | null;
};

const PERIODS = [
  { value: "current_month", label: "Current Month" },
  { value: "ytd", label: "Year to Date" },
  { value: "all", label: "All Time" }
];

function formatMoney(value: number) {
  const num = Number(value || 0);
  const prefix = num < 0 ? "-Rs " : "Rs ";
  return `${prefix}${Math.abs(num).toLocaleString("en-IN")}`;
}

function renderRows(nodes: AccountNode[], depth = 0): JSX.Element[] {
  return nodes.flatMap((node) => {
    const rows = [
      <tr key={`${node.account.id}-${depth}`}>
        <td style={{ paddingLeft: depth * 16 }}>{node.account.name}</td>
        <td className="num">{formatMoney(node.balance)}</td>
      </tr>
    ];
    if (node.children && node.children.length) {
      rows.push(...renderRows(node.children, depth + 1));
    }
    return rows;
  });
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState("current_month");
  const [report, setReport] = useState<ReportPayload | null>(null);

  async function load(targetPeriod: string) {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet(`/reports/income-statement?period=${targetPeriod}`);
      setReport(payload);
    } catch (err: any) {
      setError(err?.message || "Failed to load income statement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(period);
  }, [period]);

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Income Statement</div>
        <div className="subtle">Income vs expense for the selected period.</div>
      </div>

      {error ? <div className="danger">{error}</div> : null}

      <div className="card">
        <div className="toolbar">
          <label>
            Period:&nbsp;
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {report?.start_date || report?.end_date ? (
            <span className="meta">
              {report?.start_date || "--"} to {report?.end_date || "--"}
            </span>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="meta">Loading...</div>
      ) : (
        <>
          <div className="card">
            <div className="panel-row">
              <span className="panel-label">Total Income</span>
              <span className="panel-value">{formatMoney(report?.total_income || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Total Expenses</span>
              <span className="panel-value">{formatMoney(report?.total_expenses || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Net Income</span>
              <span className="panel-value">{formatMoney(report?.net_income || 0)}</span>
            </div>
          </div>

          <div className="card">
            <div className="h1" style={{ fontSize: 16, marginBottom: 8 }}>
              Income
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report?.income_accounts?.length ? (
                  renderRows(report.income_accounts)
                ) : (
                  <tr>
                    <td colSpan={2} className="meta">
                      No income accounts for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="h1" style={{ fontSize: 16, marginBottom: 8 }}>
              Expenses
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {report?.expense_accounts?.length ? (
                  renderRows(report.expense_accounts)
                ) : (
                  <tr>
                    <td colSpan={2} className="meta">
                      No expense accounts for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
