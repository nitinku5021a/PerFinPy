"use client";

import Link from "next/link";

const REPORTS = [
  { href: "/networth", title: "Balance Sheet", desc: "Assets, liabilities, equity breakdown." },
  { href: "/income-statement", title: "Income Statement", desc: "Income, expense, and net income." },
  { href: "/trial-balance", title: "Trial Balance", desc: "Debits/credits by account." },
  { href: "/wealth-report", title: "Wealth Report", desc: "Yearly net worth and savings trends." },
  { href: "/investments", title: "Investments", desc: "Net investment flows for selected assets." },
  { href: "/ledger", title: "Ledger", desc: "Account-wise journal entries." },
  { href: "/journal-entries", title: "Journal Entries", desc: "Unified journal entry list." },
  { href: "/monthly-budget", title: "Monthly Budget", desc: "Monthly budget tracking." },
  { href: "/reminders", title: "Reminders", desc: "Recurring reminders." }
];

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Reports</div>
        <div className="subtle">Quick links to financial reports and tools.</div>
      </div>

      <div className="card">
        <div className="space-y-3">
          {REPORTS.map((item) => (
            <div key={item.href} className="panel-row" style={{ borderBottom: "none" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{item.title}</div>
                <div className="subtle">{item.desc}</div>
              </div>
              <Link href={item.href} className="button" style={{ textDecoration: "none" }}>
                Open
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
