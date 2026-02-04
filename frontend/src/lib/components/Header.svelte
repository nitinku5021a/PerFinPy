<script>
  import { page } from "$app/stores";

  const titles = {
    "/dashboard": "Dashboard",
    "/accounts": "Accounts",
    "/ledger": "Ledger",
    "/networth": "Net Worth",
    "/income-statement": "Income Statement",
    "/trial-balance": "Trial Balance",
    "/journal-entries": "Journal Entries",
    "/transactions": "Transactions"
  };

  $: title = titles[$page.url.pathname] || "PerFinPy";
</script>

<header class="header">
  <div class="header-title">{title}</div>
  <div class="header-meta">INR</div>
</header>
