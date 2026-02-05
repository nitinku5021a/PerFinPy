<script>
  import { page } from "$app/stores";

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/accounts", label: "Accounts" },
    { href: "/ledger", label: "Ledger" },
    { href: "/networth", label: "Net Worth" },
    { href: "/investments", label: "Investments" },
    { href: "/wealth-report", label: "Wealth Report" },
    { href: "/income-statement", label: "Income Statement" },
    { href: "/trial-balance", label: "Trial Balance" },
    { href: "/journal-entries", label: "Journal Entries" },
    { href: "/transactions", label: "Transactions" }
  ];
</script>

<aside class="sidebar">
  <div class="brand">PerFinPy</div>
  <nav class="nav">
    {#each links as link}
      <a href={link.href} class:active={$page.url.pathname === link.href}>
        {link.label}
      </a>
    {/each}
  </nav>
</aside>
