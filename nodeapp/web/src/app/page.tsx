import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-4">
      <div className="h1">PerFinPy</div>
      <div className="subtle">Welcome to your finance dashboard.</div>
      <Link className="underline text-indigo-600" href="/dashboard">Go to Dashboard</Link>
    </div>
  );
}
