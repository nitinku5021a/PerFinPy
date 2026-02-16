"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";

type Account = { id: number; name: string; account_type: string; path?: string };
type FlowRow = { month: string; net_invested: number };

function formatMoney(value: number) {
  const num = Number(value || 0);
  const prefix = num < 0 ? "-Rs " : "Rs ";
  return `${prefix}${Math.abs(num).toLocaleString("en-IN")}`;
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [flows, setFlows] = useState<FlowRow[]>([]);

  async function loadAccounts() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/transactions/accounts");
      setAccounts(payload?.accounts || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function loadFlows(ids: number[]) {
    setError("");
    try {
      const query = ids.length ? `?account_ids=${ids.join(",")}` : "";
      const payload = await apiGet(`/reports/investment-flows${query}`);
      setFlows(payload?.months || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load investment flows.");
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedIds.length) {
      loadFlows(selectedIds);
    } else {
      setFlows([]);
    }
  }, [selectedIds]);

  const investmentAccounts = useMemo(
    () => accounts.filter((a) => a.account_type === "Asset"),
    [accounts]
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Investments</div>
        <div className="subtle">Track net invested amount across selected asset accounts.</div>
      </div>

      {error ? <div className="danger">{error}</div> : null}

      <div className="card">
        <div className="toolbar">
          <label>
            Select Accounts:&nbsp;
            <select
              multiple
              value={selectedIds.map(String)}
              onChange={(e) => {
                const options = Array.from(e.currentTarget.selectedOptions).map((o) => Number(o.value));
                setSelectedIds(options);
              }}
              size={Math.min(8, Math.max(3, investmentAccounts.length))}
              style={{ minWidth: 260 }}
            >
              {investmentAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.path || acc.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {loading ? <div className="meta">Loading accounts...</div> : null}
      </div>

      <div className="card">
        <div className="h1" style={{ fontSize: 16, marginBottom: 8 }}>
          Net Invested (Last 13 Months)
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Net Invested</th>
            </tr>
          </thead>
          <tbody>
            {selectedIds.length === 0 ? (
              <tr>
                <td colSpan={2} className="meta">
                  Select one or more asset accounts to view flows.
                </td>
              </tr>
            ) : null}
            {selectedIds.length > 0 && flows.length === 0 ? (
              <tr>
                <td colSpan={2} className="meta">
                  No investment flow data available.
                </td>
              </tr>
            ) : null}
            {flows.map((row) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td className="num">{formatMoney(row.net_invested)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
