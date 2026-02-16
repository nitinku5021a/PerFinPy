"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type BudgetEntry = {
  entry_id: number;
  date: string;
  description: string;
  reference: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  expense_amount: number;
  owner: "Guchi" | "Gunu" | "None";
};

type BudgetSummary = {
  total_expense: number;
  common_spent: number;
  guchi_expense: number;
  gunu_expense: number;
  remaining_budget: number;
  discretionary_pool: number;
  remaining_shared: number;
  guchi_remaining_power: number;
  gunu_remaining_power: number;
  guchi_final_available: number;
  gunu_final_available: number;
};

function addMonths(key: string, delta: number) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1 + delta, 1);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}`;
}

function canMoveTo(targetMonth: string, minMonth: string | null, maxMonth: string | null) {
  if (minMonth && targetMonth < minMonth) return false;
  if (maxMonth && targetMonth > maxMonth) return false;
  return true;
}

function formatMoney(value: number) {
  const num = Number(value || 0);
  const prefix = num < 0 ? "-Rs " : "Rs ";
  return `${prefix}${Math.abs(num).toLocaleString("en-IN")}`;
}

function isExpenseEntry(entry: BudgetEntry) {
  return Math.abs(Number(entry.expense_amount || 0)) > 0.00001;
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [minMonth, setMinMonth] = useState<string | null>(null);
  const [maxMonth, setMaxMonth] = useState<string | null>(null);

  const [budgetAmount, setBudgetAmount] = useState(0);
  const [guchiOpening, setGuchiOpening] = useState(0);
  const [gunuOpening, setGunuOpening] = useState(0);
  const [saveStatus, setSaveStatus] = useState("");

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [entries, setEntries] = useState<BudgetEntry[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    setSaveStatus("");
    try {
      const payload = await apiGet(`/budget/monthly?month=${month}`);
      setMonth(payload?.month || month);
      setMinMonth(payload?.min_month || null);
      setMaxMonth(payload?.max_month || null);
      setBudgetAmount(Number(payload?.budget?.budget_amount || 0));
      setGuchiOpening(Number(payload?.budget?.guchi_opening_balance || 0));
      setGunuOpening(Number(payload?.budget?.gunu_opening_balance || 0));
      setSummary(payload?.summary || null);
      setEntries(payload?.entries || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load monthly budget.");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaveStatus("");
    setError("");
    try {
      await apiPost("/budget/monthly/settings", {
        month,
        budget_amount: Number(budgetAmount || 0),
        guchi_opening_balance: Number(guchiOpening || 0),
        gunu_opening_balance: Number(gunuOpening || 0)
      });
      await load();
      setSaveStatus("Settings saved.");
    } catch (err: any) {
      setError(err?.message || "Failed to save settings.");
    }
  }

  async function updateOwner(entryId: number, owner: string) {
    setError("");
    try {
      await apiPost("/budget/monthly/assign-owner", {
        month,
        journal_entry_id: entryId,
        owner
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to update owner.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Monthly Budget</div>
        <div className="subtle">
          Assign each transaction line to Guchi, Gunu, or None for month-wise budget tracking.
        </div>
      </div>

      {error ? <div className="danger">{error}</div> : null}

      <div className="card">
        <div className="toolbar">
          <button
            className="button"
            type="button"
            onClick={() => {
              const target = addMonths(month, -1);
              if (canMoveTo(target, minMonth, maxMonth)) {
                setMonth(target);
                load();
              }
            }}
          >
            Prev Month
          </button>
          <input
            type="month"
            value={month}
            min={minMonth || undefined}
            max={maxMonth || undefined}
            onChange={(e) => {
              setMonth(e.target.value);
              load();
            }}
          />
          <button
            className="button"
            type="button"
            onClick={() => {
              const target = addMonths(month, 1);
              if (canMoveTo(target, minMonth, maxMonth)) {
                setMonth(target);
                load();
              }
            }}
          >
            Next Month
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <label>
            Household Budget:&nbsp;
            <input
              type="number"
              step="0.01"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(Number(e.target.value || 0))}
            />
          </label>
          <label>
            Guchi Opening:&nbsp;
            <input
              type="number"
              step="0.01"
              value={guchiOpening}
              onChange={(e) => setGuchiOpening(Number(e.target.value || 0))}
            />
          </label>
          <label>
            Gunu Opening:&nbsp;
            <input
              type="number"
              step="0.01"
              value={gunuOpening}
              onChange={(e) => setGunuOpening(Number(e.target.value || 0))}
            />
          </label>
          <button className="button" type="button" onClick={saveSettings}>
            Save Settings
          </button>
          {saveStatus ? <span className="meta">{saveStatus}</span> : null}
        </div>
      </div>

      {loading ? (
        <div className="meta">Loading...</div>
      ) : (
        <>
          <div className="card">
            <div className="panel-row">
              <span className="panel-label">Total Expense (month)</span>
              <span className="panel-value">{formatMoney(summary?.total_expense || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Common Spent (None)</span>
              <span className="panel-value">{formatMoney(summary?.common_spent || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Guchi Expense</span>
              <span className="panel-value">{formatMoney(summary?.guchi_expense || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Gunu Expense</span>
              <span className="panel-value">{formatMoney(summary?.gunu_expense || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Remaining Budget</span>
              <span className="panel-value">{formatMoney(summary?.remaining_budget || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Discretionary Pool (Budget - Common)</span>
              <span className="panel-value">{formatMoney(summary?.discretionary_pool || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Shared Remaining</span>
              <span className="panel-value">{formatMoney(summary?.remaining_shared || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Guchi Remaining Power</span>
              <span className="panel-value">{formatMoney(summary?.guchi_remaining_power || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Gunu Remaining Power</span>
              <span className="panel-value">{formatMoney(summary?.gunu_remaining_power || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Guchi Final Available (after opening)</span>
              <span className="panel-value">{formatMoney(summary?.guchi_final_available || 0)}</span>
            </div>
            <div className="panel-row">
              <span className="panel-label">Gunu Final Available (after opening)</span>
              <span className="panel-value">{formatMoney(summary?.gunu_final_available || 0)}</span>
            </div>
          </div>

          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Debit Account</th>
                  <th>Credit Account</th>
                  <th className="num">Amount</th>
                  <th className="num">Expense Amount</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="meta">
                      No transactions found for selected month.
                    </td>
                  </tr>
                ) : null}
                {entries.map((entry) => (
                  <tr key={entry.entry_id}>
                    <td>{entry.date}</td>
                    <td>{entry.description}</td>
                    <td>{entry.debit_account}</td>
                    <td>{entry.credit_account}</td>
                    <td className="num">{formatMoney(entry.amount)}</td>
                    <td className="num">
                      {isExpenseEntry(entry) ? formatMoney(entry.expense_amount) : "--"}
                    </td>
                    <td>
                      <select
                        value={entry.owner}
                        onChange={(e) => updateOwner(entry.entry_id, e.currentTarget.value)}
                      >
                        <option value="None">None</option>
                        <option value="Guchi">Guchi</option>
                        <option value="Gunu">Gunu</option>
                      </select>
                    </td>
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
