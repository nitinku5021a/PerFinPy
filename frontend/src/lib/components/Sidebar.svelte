<script>
  import { page } from "$app/stores";

  const primaryLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/networth", label: "Balance Sheet" },
    { href: "/income-statement", label: "Income Statement" },
    { href: "/transactions", label: "Monthly Transactions" },
    { href: "/reminders", label: "Reminders" },
    { href: "/report", label: "Reports" }
  ];

  const otherLinks = [
    { href: "/accounts", label: "Accounts" },
    { href: "/ledger", label: "Ledger" },
    { href: "/investments", label: "Investments" },
    { href: "/monthly-budget", label: "Monthly Budget" },
    { href: "/wealth-report", label: "Wealth Report" },
    { href: "/trial-balance", label: "Trial Balance" },
    { href: "/journal-entries", label: "Journal Entries" }
  ];
</script>

<aside class="sidebar">
  <div class="brand">PerFinPy</div>
  <nav class="nav">
    {#each primaryLinks as link}
      <a href={link.href} class:active={$page.url.pathname === link.href}>
        {link.label}
      </a>
    {/each}
    <div class="nav-section">Others</div>
    {#each otherLinks as link}
      <a href={link.href} class:active={$page.url.pathname === link.href}>
        {link.label}
      </a>
    {/each}
  </nav>
</aside>
