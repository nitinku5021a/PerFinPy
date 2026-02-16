import { apiGet } from "@/lib/api";

export default async function DashboardPage() {
  const [networthSeries, savingsSeries] = await Promise.all([
    apiGet("/reports/networth-monthly"),
    apiGet("/reports/net-savings-series")
  ]);
  const latest = networthSeries?.months?.[networthSeries.months.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Dashboard</div>
        <div className="subtle">Overview of your finances.</div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="subtle">Current Net Worth</div>
          <div className="text-3xl font-bold mt-2">{latest?.networth?.toLocaleString?.() || "--"}</div>
        </div>
        <div className="card">
          <div className="subtle">Latest Net Savings</div>
          <div className="text-3xl font-bold mt-2">
            {savingsSeries?.months?.length
              ? savingsSeries.months[savingsSeries.months.length - 1].net_savings?.toLocaleString?.()
              : "--"}
          </div>
        </div>
      </div>
      <div className="card">
        <div className="subtle">Net Worth (Monthly)</div>
        <table className="table mt-4">
          <thead>
            <tr>
              <th>Month</th>
              <th>Assets</th>
              <th>Liabilities</th>
              <th>Net Worth</th>
            </tr>
          </thead>
          <tbody>
            {networthSeries?.months?.slice(-12)?.map((row: any) => (
              <tr key={row.month}>
                <td>{row.month}</td>
                <td>{Number(row.assets || 0).toLocaleString()}</td>
                <td>{Number(row.liabilities || 0).toLocaleString()}</td>
                <td>{Number(row.networth || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
