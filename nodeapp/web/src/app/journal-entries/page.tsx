"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type Entry = {
  id: number;
  entry_date: string;
  description: string;
  debit_account: string;
  credit_account: string;
  amount: number;
};

function formatMoney(value: number) {
  const num = Number(value || 0);
  const prefix = num < 0 ? "-Rs " : "Rs ";
  return `${prefix}${Math.abs(num).toLocaleString("en-IN")}`;
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  async function load(targetPage: number) {
    setLoading(true);
    setError("");
    try {
      const payload = await apiGet(`/transactions?page=${targetPage}`);
      setEntries(payload?.entries || []);
      setPages(payload?.pagination?.pages || 1);
      setPage(payload?.pagination?.page || targetPage);
    } catch (err: any) {
      setError(err?.message || "Failed to load journal entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Journal Entries</div>
        <div className="subtle">Combined debit/credit view of journal entries.</div>
      </div>

      {error ? <div className="danger">{error}</div> : null}

      <div className="card">
        <div className="toolbar">
          <button
            className="button"
            type="button"
            onClick={() => load(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="meta">
            Page {page} of {pages}
          </span>
          <button
            className="button"
            type="button"
            onClick={() => load(Math.min(pages, page + 1))}
            disabled={page >= pages}
          >
            Next
          </button>
        </div>
      </div>

      {loading ? (
        <div className="meta">Loading...</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Debit</th>
                <th className="num">Amount</th>
                <th>Description</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="meta">
                    No journal entries found.
                  </td>
                </tr>
              ) : null}
              {entries.map((row) => (
                <tr key={row.id}>
                  <td>{row.entry_date}</td>
                  <td>{row.debit_account}</td>
                  <td className="num">{formatMoney(row.amount)}</td>
                  <td>{row.description}</td>
                  <td>{row.credit_account}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
