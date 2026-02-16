"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Account = { id: number; name: string; path?: string };
type Entry = { id: number; entry_date: string; description: string; reference: string; notes: string };

const PERIODS = [
  { value: "ytd", label: "Year to Date" },
  { value: "current_month", label: "Current Month" },
  { value: "all", label: "All Time" }
];

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [period, setPeriod] = useState("ytd");
  const [entries, setEntries] = useState<Entry[]>([]);

  async function loadAccounts() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet("/transactions/accounts");
      setAccounts(payload?.accounts || []);
      if (payload?.accounts?.length) {
        setAccountId(payload.accounts[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function loadEntries(targetId: number | null, targetPeriod: string) {
    if (!targetId) return;
    setError("");
    try {
      const payload = await apiGet(`/reports/accounts/${targetId}/entries?period=${targetPeriod}`);
      setEntries(payload?.entries || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load ledger entries.");
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (accountId) {
      loadEntries(accountId, period);
    }
  }, [accountId, period]);

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Ledger</div>
        <div className="subtle">Account-wise journal entries with period filter.</div>
      </div>

      {error ? <div className="danger">{error}</div> : null}

      <div className="card">
        <div className="toolbar">
          <label>
            Account:&nbsp;
            <select
              value={accountId ?? ""}
              onChange={(e) => setAccountId(Number(e.target.value))}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.path || acc.name}
                </option>
              ))}
            </select>
          </label>
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
        </div>
      </div>

      {loading ? (
        <div className="meta">Loading accounts...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Reference</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="meta">
                    No entries found for selected account.
                  </td>
                </tr>
              ) : null}
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.entry_date}</td>
                  <td>{entry.description}</td>
                  <td>{entry.reference || "--"}</td>
                  <td>{entry.notes || "--"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
