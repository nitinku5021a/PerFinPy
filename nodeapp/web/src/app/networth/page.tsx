import { apiGet } from "@/lib/api";

export default async function NetWorthPage() {
  const data = await apiGet("/reports/networth-monthly");

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Balance Sheet</div>
        <div className="subtle">Net worth snapshots by month.</div>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Assets</th>
              <th>Liabilities</th>
              <th>Net Worth</th>
            </tr>
          </thead>
          <tbody>
            {data?.months?.map((row: any) => (
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
