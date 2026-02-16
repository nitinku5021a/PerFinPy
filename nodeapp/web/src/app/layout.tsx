import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PerFinPy",
  description: "Personal finance dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} app-body antialiased`}>
        <div className="app-shell">
          <aside className="app-sidebar">
            <div className="brand">PerFinPy</div>
            <nav className="nav">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/networth">Balance Sheet</Link>
              <Link href="/income-statement">Income Statement</Link>
              <Link href="/transactions">Monthly Transactions</Link>
              <Link href="/reminders">Reminders</Link>
              <Link href="/reports">Reports</Link>
              <div className="nav-section">Others</div>
              <Link href="/accounts">Accounts</Link>
              <Link href="/ledger">Ledger</Link>
              <Link href="/investments">Investments</Link>
              <Link href="/monthly-budget">Monthly Budget</Link>
              <Link href="/wealth-report">Wealth Report</Link>
              <Link href="/trial-balance">Trial Balance</Link>
              <Link href="/journal-entries">Journal Entries</Link>
            </nav>
          </aside>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
