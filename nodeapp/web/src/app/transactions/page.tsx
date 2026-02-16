import { apiGet } from "@/lib/api";

export default async function TransactionsPage() {
  const data = await apiGet("/transactions");

  return (
    <div className="space-y-6">
      <div>
        <div className="h1">Monthly Transactions</div>
        <div className="subtle">Latest journal entries.</div>
      </div>
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Debit</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Credit</th>
            </tr>
          </thead>
          <tbody>
            {data?.entries?.map((row: any) => (
              <tr key={row.id}>
                <td>{row.entry_date}</td>
                <td>{row.debit_account}</td>
                <td>{Number(row.amount || 0).toLocaleString()}</td>
                <td>{row.description}</td>
                <td>{row.credit_account}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
