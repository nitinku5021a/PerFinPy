<script>
  import { onMount } from "svelte";
  import { apiGet } from "$lib/api";
  import { toPeriodParam } from "$lib/period";
  import Table from "$lib/components/Table.svelte";
  import { formatInr } from "$lib/format";
  import { getInvestmentAccounts } from "$lib/investmentMetrics";

  let data = null;
  let period = "current_month";
  let startDate = "";
  let endDate = "";
  let accountId = "all";
  let error = "";
  let ready = false;
  let importStatus = "";
  let importError = "";
  let importProgress = 0;
  let fakeProgressTimer = null;
  let monthStart = "";
  let months = [];
  let activeMonth = "";
  let exportAll = false;
  function toLocalDate(d) {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  let entryDate = toLocalDate(new Date());
  let debitQuery = "";
  let creditQuery = "";
  let amount = "";
  let description = "";
  let debitAccount = null;
  let creditAccount = null;
  let debitOpen = false;
  let creditOpen = false;
  let debitIndex = 0;
  let creditIndex = 0;
  let entryStatus = "";
  let entryError = "";
  let debitInput;
  let blurTimer;
  const mtmGainPattern = /(unrealized|mark\s*to\s*market|mtm|gain|profit|p&l|pnl|income)/i;
  const mtmLossPattern = /(unrealized|mark\s*to\s*market|mtm|loss|expense|p&l|pnl)/i;
  const smartModes = [
    { id: "expense", label: "Expense", hint: "Spent money from a bank, wallet, broker, or card" },
    { id: "income", label: "Income", hint: "Income can land in a bank or stay in a broker account" },
    { id: "move_money", label: "Move Money", hint: "Covers bank, broker, wallet, and credit-card payments" },
    { id: "investment_mtm", label: "Investment MTM", hint: "Book a monthly gain or loss without debit/credit jargon" }
  ];
  let smartMode = "expense";
  let smartDate = toLocalDate(new Date());
  let smartAmount = "";
  let smartNote = "";
  let smartExpenseCategoryId = "";
  let smartExpenseCategoryQuery = "";
  let smartExpenseCategoryOpen = false;
  let smartExpenseCategoryIndex = 0;
  let smartExpenseSourceId = "";
  let smartExpenseSourceQuery = "";
  let smartExpenseSourceOpen = false;
  let smartExpenseSourceIndex = 0;
  let smartIncomeSourceId = "";
  let smartIncomeSourceQuery = "";
  let smartIncomeSourceOpen = false;
  let smartIncomeSourceIndex = 0;
  let smartIncomeDestinationId = "";
  let smartIncomeDestinationQuery = "";
  let smartIncomeDestinationOpen = false;
  let smartIncomeDestinationIndex = 0;
  let smartMoveFromId = "";
  let smartMoveFromQuery = "";
  let smartMoveFromOpen = false;
  let smartMoveFromIndex = 0;
  let smartMoveToId = "";
  let smartMoveToQuery = "";
  let smartMoveToOpen = false;
  let smartMoveToIndex = 0;
  let smartInvestmentAccountId = "";
  let smartInvestmentAccountQuery = "";
  let smartInvestmentAccountOpen = false;
  let smartInvestmentAccountIndex = 0;
  let smartMtmOffsetAccountId = "";
  let smartMtmOffsetAccountQuery = "";
  let smartMtmOffsetAccountOpen = false;
  let smartMtmOffsetAccountIndex = 0;
  let smartStatus = "";
  let smartError = "";
  let smartExpenseCategoryInput;
  let smartExpenseSourceInput;
  let smartIncomeSourceInput;
  let smartIncomeDestinationInput;
  let smartMoveFromInput;
  let smartMoveToInput;
  let smartInvestmentAccountInput;
  let smartMtmOffsetAccountInput;
  let smartDraft = null;
  let smartPreview = "Preview waiting for: amount.";

  const columns = [
    { header: "Date", render: (row) => row.entry_date },
    { header: "Debit Account", render: (row) => row.debit_account },
    { header: "Amount", render: (row) => formatInr(row.amount), align: "right" },
    { header: "Description", render: (row) => row.description },
    { header: "Credit Account", render: (row) => row.credit_account }
  ];

  $: sums = data?.period_sums || { Asset: [], Liability: [], Income: [], Expense: [] };
  $: totals = {
    Asset: Math.round(sums.Asset?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Liability: Math.round(sums.Liability?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Income: Math.round(sums.Income?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Expense: Math.round(sums.Expense?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0)
  };

  $: leafAccounts = (data?.accounts_for_select || []).filter((a) => a.is_leaf);
  $: debitMatches = debitQuery
    ? leafAccounts.filter((a) => (a.path || a.name).toLowerCase().includes(debitQuery.toLowerCase()))
    : leafAccounts;
  $: creditMatches = creditQuery
    ? leafAccounts.filter((a) => (a.path || a.name).toLowerCase().includes(creditQuery.toLowerCase()))
    : leafAccounts;
  $: expenseCategoryAccounts = leafAccounts.filter((a) => a.account_type === "Expense");
  $: incomeCategoryAccounts = leafAccounts.filter((a) => a.account_type === "Income");
  $: holdingAccounts = leafAccounts.filter((a) => a.account_type === "Asset" || a.account_type === "Liability");
  $: incomeDestinationAccounts = leafAccounts.filter((a) => a.account_type === "Asset");
  $: investmentLeafAccounts = getInvestmentAccounts(leafAccounts);
  $: smartExpenseCategoryMatches = smartExpenseCategoryQuery
    ? expenseCategoryAccounts.filter((a) => accountLabel(a).toLowerCase().includes(smartExpenseCategoryQuery.toLowerCase()))
    : expenseCategoryAccounts;
  $: smartExpenseSourceMatches = smartExpenseSourceQuery
    ? holdingAccounts.filter((a) => accountLabel(a).toLowerCase().includes(smartExpenseSourceQuery.toLowerCase()))
    : holdingAccounts;
  $: smartIncomeSourceMatches = smartIncomeSourceQuery
    ? incomeCategoryAccounts.filter((a) => accountLabel(a).toLowerCase().includes(smartIncomeSourceQuery.toLowerCase()))
    : incomeCategoryAccounts;
  $: smartIncomeDestinationMatches = smartIncomeDestinationQuery
    ? incomeDestinationAccounts.filter((a) =>
        accountLabel(a).toLowerCase().includes(smartIncomeDestinationQuery.toLowerCase())
      )
    : incomeDestinationAccounts;
  $: smartMoveFromMatches = smartMoveFromQuery
    ? holdingAccounts.filter((a) => accountLabel(a).toLowerCase().includes(smartMoveFromQuery.toLowerCase()))
    : holdingAccounts;
  $: smartMoveToMatches = smartMoveToQuery
    ? holdingAccounts.filter((a) => accountLabel(a).toLowerCase().includes(smartMoveToQuery.toLowerCase()))
    : holdingAccounts;
  $: smartInvestmentAccountMatches = smartInvestmentAccountQuery
    ? investmentLeafAccounts.filter((a) =>
        accountLabel(a).toLowerCase().includes(smartInvestmentAccountQuery.toLowerCase())
      )
    : investmentLeafAccounts;
  $: mtmGainAccounts = incomeCategoryAccounts.filter((a) => mtmGainPattern.test(accountLabel(a)));
  $: mtmLossAccounts = expenseCategoryAccounts.filter((a) => mtmLossPattern.test(accountLabel(a)));
  $: smartMtmOffsetAccountMatches = smartMtmOffsetAccountQuery
    ? mtmOffsetAccounts.filter((a) => accountLabel(a).toLowerCase().includes(smartMtmOffsetAccountQuery.toLowerCase()))
    : mtmOffsetAccounts;
  $: smartAmountNumber = Number(smartAmount || 0);
  $: smartAbsoluteAmount = Math.abs(smartAmountNumber || 0);
  $: smartIsGain = smartAmountNumber >= 0;
  $: mtmOffsetAccounts = smartIsGain
    ? (mtmGainAccounts.length ? mtmGainAccounts : incomeCategoryAccounts)
    : (mtmLossAccounts.length ? mtmLossAccounts : expenseCategoryAccounts);
  $: {
    smartMode;
    smartDate;
    smartAmount;
    smartNote;
    smartExpenseCategoryId;
    smartExpenseCategoryQuery;
    smartExpenseSourceId;
    smartExpenseSourceQuery;
    smartIncomeSourceId;
    smartIncomeSourceQuery;
    smartIncomeDestinationId;
    smartIncomeDestinationQuery;
    smartMoveFromId;
    smartMoveFromQuery;
    smartMoveToId;
    smartMoveToQuery;
    smartInvestmentAccountId;
    smartInvestmentAccountQuery;
    smartMtmOffsetAccountId;
    smartMtmOffsetAccountQuery;
    smartAbsoluteAmount;
    smartAmountNumber;
    smartIsGain;
    mtmOffsetAccounts;
    leafAccounts;
    smartDraft = buildSmartDraft();
    smartPreview = buildSmartPreview();
  }
  $: smartModeMeta = smartModes.find((mode) => mode.id === smartMode) || smartModes[0];
  $: if (
    smartMode === "investment_mtm" &&
    mtmOffsetAccounts.length &&
    !mtmOffsetAccounts.some((a) => String(a.id) === String(smartMtmOffsetAccountId))
  ) {
    selectSmartMtmOffsetAccount(mtmOffsetAccounts[0]);
  }

  function selectDebit(acc) {
    debitAccount = acc;
    debitQuery = acc.path || acc.name;
    debitOpen = false;
  }

  function selectCredit(acc) {
    creditAccount = acc;
    creditQuery = acc.path || acc.name;
    creditOpen = false;
  }

  function closeDebit() {
    debitOpen = false;
  }

  function closeCredit() {
    creditOpen = false;
  }

  function closeAllDropdowns() {
    debitOpen = false;
    creditOpen = false;
    closeSmartDropdowns();
  }

  function closeSmartDropdowns() {
    smartExpenseCategoryOpen = false;
    smartExpenseSourceOpen = false;
    smartIncomeSourceOpen = false;
    smartIncomeDestinationOpen = false;
    smartMoveFromOpen = false;
    smartMoveToOpen = false;
    smartInvestmentAccountOpen = false;
    smartMtmOffsetAccountOpen = false;
  }

  function accountLabel(account) {
    return account?.path || account?.name || "";
  }

  function getAccountById(id) {
    return leafAccounts.find((account) => String(account.id) === String(id)) || null;
  }

  function setSmartMode(mode) {
    smartMode = mode;
    smartStatus = "";
    smartError = "";
    closeSmartDropdowns();
  }

  function closeSmartExpenseCategory() {
    smartExpenseCategoryOpen = false;
  }

  function selectSmartExpenseCategory(account) {
    smartExpenseCategoryId = String(account.id);
    smartExpenseCategoryQuery = accountLabel(account);
    smartExpenseCategoryOpen = false;
  }

  function closeSmartExpenseSource() {
    smartExpenseSourceOpen = false;
  }

  function selectSmartExpenseSource(account) {
    smartExpenseSourceId = String(account.id);
    smartExpenseSourceQuery = accountLabel(account);
    smartExpenseSourceOpen = false;
  }

  function closeSmartIncomeSource() {
    smartIncomeSourceOpen = false;
  }

  function selectSmartIncomeSource(account) {
    smartIncomeSourceId = String(account.id);
    smartIncomeSourceQuery = accountLabel(account);
    smartIncomeSourceOpen = false;
  }

  function closeSmartIncomeDestination() {
    smartIncomeDestinationOpen = false;
  }

  function selectSmartIncomeDestination(account) {
    smartIncomeDestinationId = String(account.id);
    smartIncomeDestinationQuery = accountLabel(account);
    smartIncomeDestinationOpen = false;
  }

  function closeSmartMoveFrom() {
    smartMoveFromOpen = false;
  }

  function selectSmartMoveFrom(account) {
    smartMoveFromId = String(account.id);
    smartMoveFromQuery = accountLabel(account);
    smartMoveFromOpen = false;
  }

  function closeSmartMoveTo() {
    smartMoveToOpen = false;
  }

  function selectSmartMoveTo(account) {
    smartMoveToId = String(account.id);
    smartMoveToQuery = accountLabel(account);
    smartMoveToOpen = false;
  }

  function closeSmartInvestmentAccount() {
    smartInvestmentAccountOpen = false;
  }

  function selectSmartInvestmentAccount(account) {
    smartInvestmentAccountId = String(account.id);
    smartInvestmentAccountQuery = accountLabel(account);
    smartInvestmentAccountOpen = false;
  }

  function closeSmartMtmOffsetAccount() {
    smartMtmOffsetAccountOpen = false;
  }

  function selectSmartMtmOffsetAccount(account) {
    smartMtmOffsetAccountId = String(account.id);
    smartMtmOffsetAccountQuery = accountLabel(account);
    smartMtmOffsetAccountOpen = false;
  }

  async function postJournalEntry({ entryDate, debitAccount, creditAccount, amount, description }) {
    try {
      const form = new URLSearchParams();
      form.set("entry_date", entryDate);
      form.set("description", (description || "").trim());
      form.set("debit_account_id", String(debitAccount.id));
      form.set("credit_account_id", String(creditAccount.id));
      form.set("amount", String(amount));
      const res = await fetch("/api/transactions/new", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString()
      });
      const rawText = await res.text();
      let payload = null;
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        payload = null;
      }
      if (!res.ok) {
        const text = payload?.error || rawText;
        throw new Error(text || `Request failed: ${res.status}`);
      }
      if (payload?.error) {
        throw new Error(payload.error);
      }
      return payload;
    } catch (err) {
      throw new Error(err.message || "Failed to save.");
    }
  }

  async function refreshAfterSave(savedDate) {
    const entryMonthKey = savedDate ? savedDate.slice(0, 7) : "";
    let didLoad = false;
    if (entryMonthKey) {
      ensureMonthVisible(entryMonthKey);
      await setActiveMonth(entryMonthKey);
      didLoad = true;
    }
    if (!didLoad) {
      await load();
    }
  }

  function buildSmartDraft() {
    const trimmedNote = (smartNote || "").trim();
    if (!smartDate || !smartAbsoluteAmount) {
      return null;
    }

    if (smartMode === "expense") {
      const category = getAccountById(smartExpenseCategoryId);
      const paidFrom = getAccountById(smartExpenseSourceId);
      if (!category || !paidFrom) return null;
      return {
        entryDate: smartDate,
        debitAccount: category,
        creditAccount: paidFrom,
        amount: smartAbsoluteAmount,
        description: trimmedNote || `${category.name} using ${paidFrom.name}`
      };
    }

    if (smartMode === "income") {
      const source = getAccountById(smartIncomeSourceId);
      const receivedIn = getAccountById(smartIncomeDestinationId);
      if (!source || !receivedIn) return null;
      return {
        entryDate: smartDate,
        debitAccount: receivedIn,
        creditAccount: source,
        amount: smartAbsoluteAmount,
        description: trimmedNote || `${source.name} received in ${receivedIn.name}`
      };
    }

    if (smartMode === "move_money") {
      const from = getAccountById(smartMoveFromId);
      const to = getAccountById(smartMoveToId);
      if (!from || !to || from.id === to.id) return null;
      return {
        entryDate: smartDate,
        debitAccount: to,
        creditAccount: from,
        amount: smartAbsoluteAmount,
        description: trimmedNote || `Move money from ${from.name} to ${to.name}`
      };
    }

    if (smartMode === "investment_mtm") {
      const investment = getAccountById(smartInvestmentAccountId);
      const offset = getAccountById(smartMtmOffsetAccountId);
      if (!investment || !offset || investment.id === offset.id || !smartAmountNumber) return null;
      if (smartIsGain) {
        return {
          entryDate: smartDate,
          debitAccount: investment,
          creditAccount: offset,
          amount: smartAbsoluteAmount,
          description: trimmedNote || `${investment.name} MTM gain`
        };
      }
      return {
        entryDate: smartDate,
        debitAccount: offset,
        creditAccount: investment,
        amount: smartAbsoluteAmount,
        description: trimmedNote || `${investment.name} MTM loss`
      };
    }

    return null;
  }

  function buildSmartPreview() {
    if (smartDraft) {
      return `Will save: Dr ${accountLabel(smartDraft.debitAccount)} / Cr ${accountLabel(smartDraft.creditAccount)} / ${formatInr(
        smartDraft.amount
      )}`;
    }

    if (smartMode === "expense") {
      const missing = [];
      if (!smartAbsoluteAmount) missing.push("amount");
      if (!smartExpenseCategoryId) {
        missing.push(smartExpenseCategoryQuery ? "select category with Enter" : "category");
      }
      if (!smartExpenseSourceId) {
        missing.push(smartExpenseSourceQuery ? "select paid from with Enter" : "paid from");
      }
      return `Preview waiting for: ${missing.join(", ")}.`;
    }

    if (smartMode === "income") {
      const missing = [];
      if (!smartAbsoluteAmount) missing.push("amount");
      if (!smartIncomeSourceId) {
        missing.push(smartIncomeSourceQuery ? "select income source with Enter" : "income source");
      }
      if (!smartIncomeDestinationId) {
        missing.push(smartIncomeDestinationQuery ? "select received in with Enter" : "received in");
      }
      return `Preview waiting for: ${missing.join(", ")}.`;
    }

    if (smartMode === "move_money") {
      const missing = [];
      if (!smartAbsoluteAmount) missing.push("amount");
      if (!smartMoveFromId) {
        missing.push(smartMoveFromQuery ? "select from account with Enter" : "from account");
      }
      if (!smartMoveToId) {
        missing.push(smartMoveToQuery ? "select to account with Enter" : "to account");
      }
      if (smartMoveFromId && smartMoveToId && smartMoveFromId === smartMoveToId) {
        missing.push("different source and destination");
      }
      return `Preview waiting for: ${missing.join(", ")}.`;
    }

    const missing = [];
    if (!smartAmountNumber) missing.push("signed value change");
    if (!smartInvestmentAccountId) {
      missing.push(smartInvestmentAccountQuery ? "select investment account with Enter" : "investment account");
    }
    if (!smartMtmOffsetAccountId) {
      missing.push(smartMtmOffsetAccountQuery ? "select offset account with Enter" : smartIsGain ? "gain account" : "loss account");
    }
    return `Preview waiting for: ${missing.join(", ")}.`;
  }

  function smartValidationMessage() {
    if (smartMode === "expense") {
      return "Date, amount, category and paid from are required.";
    }
    if (smartMode === "income") {
      return "Date, amount, income source and received in are required.";
    }
    if (smartMode === "move_money") {
      return "Date, amount, from and to accounts are required, and they must be different.";
    }
    return "Date, signed value change, investment account and gain/loss account are required.";
  }

  async function submitSmartEntry() {
    smartError = "";
    smartStatus = "";
    const draft = buildSmartDraft();
    if (!draft) {
      smartError = smartValidationMessage();
      return;
    }
    try {
      await postJournalEntry(draft);
      await refreshAfterSave(draft.entryDate);
      smartStatus = "Saved.";
      smartAmount = "";
      smartNote = "";
      if (smartMode === "expense" && smartExpenseCategoryInput) {
        smartExpenseCategoryInput.focus();
      }
    } catch (err) {
      smartError = err.message || "Failed to save.";
    }
  }

  async function submitEntry() {
    entryError = "";
    entryStatus = "";
    if (!entryDate || !debitAccount || !creditAccount || !amount) {
      entryError = "Date, debit, credit and amount are required.";
      return;
    }
    const descValue =
      (description || "").trim() ||
      `${debitAccount?.name || debitAccount?.path || "Debit"} to ${creditAccount?.name || creditAccount?.path || "Credit"}`;
    try {
      await postJournalEntry({
        entryDate,
        debitAccount,
        creditAccount,
        amount,
        description: descValue
      });
      await refreshAfterSave(entryDate);
      entryStatus = "Saved.";
      amount = "";
      description = "";
      debitQuery = "";
      creditQuery = "";
      debitAccount = null;
      creditAccount = null;
      if (debitInput) {
        debitInput.focus();
      }
    } catch (err) {
      entryError = err.message || "Failed to save.";
    }
  }

  function labelForMonth(key) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "short", year: "numeric" });
  }

  function addMonths(key, delta) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1 + delta, 1);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }

  function buildMonths(startKey, minKey, maxKey) {
    const out = [];
    for (let i = 0; i < 12; i += 1) {
      const key = addMonths(startKey, -i);
      if (minKey && key < minKey) continue;
      if (maxKey && key > maxKey) continue;
      out.push({ key, label: labelForMonth(key) });
    }
    return out;
  }

  function ensureMonthVisible(key) {
    if (!key) return;
    if (!monthStart) {
      monthStart = key;
      months = buildMonths(monthStart, null, null);
      return;
    }
    const oldest = addMonths(monthStart, -11);
    if (key > monthStart || key < oldest) {
      monthStart = key;
      months = buildMonths(monthStart, null, null);
    }
  }

  async function setActiveMonth(key) {
    activeMonth = key;
    const [y, m] = key.split("-");
    const start = new Date(Number(y), Number(m) - 1, 1);
    const end = new Date(Number(y), Number(m), 0);
    startDate = toLocalDate(start);
    endDate = toLocalDate(end);
    period = "custom";
    await load();
  }

  async function load() {
    try {
      error = "";
      const params = new URLSearchParams();
      params.set("period", toPeriodParam(period, startDate, endDate));
      if (accountId !== "all") params.set("account_id", accountId);
      data = await apiGet(`/transactions?${params.toString()}`);
    } catch (err) {
      error = err.message || "Failed to load.";
    }
  }

  onMount(() => {
    ready = true;
  });

  function applyAccountFilter(id) {
    accountId = String(id);
  }

  function resetAccountFilter() {
    accountId = "all";
  }

  $: if (ready) {
    period;
    startDate;
    endDate;
    accountId;
    if (period !== "custom" || (startDate && endDate)) {
      load();
    }
  }

  $: if (ready && data) {
    const maxKey = data?.max_entry_date ? data.max_entry_date.slice(0, 7) : new Date().toISOString().slice(0, 7);
    const minKey = data?.min_entry_date ? data.min_entry_date.slice(0, 7) : null;
    if (!monthStart) {
      monthStart = maxKey;
    }
    months = buildMonths(monthStart, minKey, maxKey);
    if (months.length && !activeMonth) {
      setActiveMonth(months[0].key);
    }
  }

  $: shadedEntries = (() => {
    const rows = data?.entries || [];
    let lastDate = null;
    let toggle = false;
    return rows.map((row) => {
      if (row.entry_date !== lastDate) {
        toggle = !toggle;
        lastDate = row.entry_date;
      }
      return { ...row, __shade: toggle ? "date-shade-a" : "date-shade-b" };
    });
  })();

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    importStatus = "Uploading...";
    importError = "";
    importProgress = 0;
    try {
      const payload = await new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append("file", file);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/transactions/import");
        // Simulated progress to keep UI responsive when browser doesn't emit intermediate events
        fakeProgressTimer = setInterval(() => {
          if (importProgress < 95) {
            importProgress += 5;
            importStatus = `Uploading... ${importProgress}%`;
          }
        }, 300);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            importProgress = Math.round((e.loaded / e.total) * 100);
            importStatus = `Uploading... ${importProgress}%`;
          }
        };
        xhr.upload.onload = () => {
          importProgress = 100;
          importStatus = "Processing...";
        };
        xhr.onload = () => {
          if (fakeProgressTimer) {
            clearInterval(fakeProgressTimer);
            fakeProgressTimer = null;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({});
            }
          } else {
            reject(new Error(xhr.responseText || `Import failed: ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Import failed."));
        xhr.send(formData);
      });
      importProgress = 100;
      importStatus = `Imported ${payload?.results?.success ?? 0} transactions.`;
      await load();
      setTimeout(() => {
        importStatus = "";
        importProgress = 0;
      }, 2000);
    } catch (err) {
      if (fakeProgressTimer) {
        clearInterval(fakeProgressTimer);
        fakeProgressTimer = null;
      }
      importStatus = "";
      importError = err.message || "Import failed.";
    }
  }

  function monthTabColor(index) {
    const palette = [
      "var(--tab-a)",
      "var(--tab-b)",
      "var(--tab-c)",
      "var(--tab-d)",
      "var(--tab-e)",
      "var(--tab-f)"
    ];
    return palette[index % palette.length];
  }
</script>

<h1 class="page-title">Transactions</h1>
<p class="page-subtitle">Journal entries and filters.</p>

{#if error}
  <p class="danger">{error}</p>
{/if}

<div class="panel">
  <div class="toolbar">
    <label>
      Import Excel:&nbsp;
      <input type="file" accept=".xlsx,.xls" on:change={handleImport} />
    </label>
    <button
      class="button"
      on:click={() => {
        const exportPeriod = exportAll ? "all" : toPeriodParam(period, startDate, endDate);
        const url = `/api/transactions/export?period=${exportPeriod}`;
        window.open(url, "_blank");
      }}
    >
      Export Excel
    </button>
    <label class="meta">
      <input type="checkbox" bind:checked={exportAll} />
      &nbsp;Export all
    </label>
    {#if importStatus}
      <span class="meta">{importStatus}</span>
    {/if}
    {#if importError}
      <span class="danger">{importError}</span>
    {/if}
  </div>
</div>

<div class="panel smart-entry-panel">
  <div class="smart-entry__header">
    <div>
      <div class="smart-entry__eyebrow">Smart Entry</div>
      <h2 class="smart-entry__title">Tell the system what happened. We will turn it into the journal entry.</h2>
      <p class="smart-entry__subtitle">{smartModeMeta.hint}</p>
    </div>
    <label class="smart-entry__date">
      <span>Entry Date</span>
      <input type="date" bind:value={smartDate} />
    </label>
  </div>

  <div class="smart-entry__modes">
    {#each smartModes as mode}
      <button
        class={`smart-entry__mode ${smartMode === mode.id ? "active" : ""}`}
        type="button"
        on:click={() => setSmartMode(mode.id)}
      >
        <strong>{mode.label}</strong>
        <span>{mode.hint}</span>
      </button>
    {/each}
  </div>

  <div class="smart-entry__body">
    <div class="smart-entry__preview">
      <span class="smart-entry__preview-label">Accounting Preview</span>
      <strong>{smartPreview}</strong>
    </div>

    {#if smartMode === "expense"}
      <div class="smart-entry__sentence">
        <span>I spent</span>
        <label class="smart-entry__field">
          <span>Amount</span>
          <input type="number" step="0.01" bind:value={smartAmount} placeholder="0.00" />
        </label>
        <span>on</span>
        <label class="smart-entry__field smart-entry__field--autocomplete">
          <span>Category</span>
          <div class="autocomplete smart-entry__autocomplete">
            <input
              type="text"
              bind:this={smartExpenseCategoryInput}
              bind:value={smartExpenseCategoryQuery}
              placeholder="Type a leaf category and press Enter"
              on:focus={() => {
                closeAllDropdowns();
                smartExpenseCategoryOpen = true;
              }}
              on:input={() => {
                smartExpenseCategoryId = "";
                smartExpenseCategoryOpen = true;
                smartExpenseCategoryIndex = 0;
              }}
              on:blur={() => {
                blurTimer = setTimeout(closeSmartExpenseCategory, 120);
              }}
              on:keydown={(e) => {
                if (!smartExpenseCategoryOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  smartExpenseCategoryOpen = true;
                }
                if (!smartExpenseCategoryOpen) {
                  if (e.key === "Enter" && smartExpenseCategoryMatches.length) {
                    e.preventDefault();
                    selectSmartExpenseCategory(smartExpenseCategoryMatches[0]);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeSmartExpenseCategory();
                  return;
                }
                if (e.key === "Tab") {
                  closeSmartExpenseCategory();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  smartExpenseCategoryIndex = Math.min(
                    smartExpenseCategoryIndex + 1,
                    smartExpenseCategoryMatches.length - 1
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  smartExpenseCategoryIndex = Math.max(smartExpenseCategoryIndex - 1, 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (smartExpenseCategoryMatches[smartExpenseCategoryIndex]) {
                    selectSmartExpenseCategory(smartExpenseCategoryMatches[smartExpenseCategoryIndex]);
                  }
                }
              }}
            />
            {#if smartExpenseCategoryOpen && smartExpenseCategoryMatches.length}
              <div class="autocomplete-list">
                {#each smartExpenseCategoryMatches as account, i}
                  <button
                    class={`autocomplete-item ${i === smartExpenseCategoryIndex ? "active" : ""}`}
                    type="button"
                    on:mousedown|preventDefault={() => {
                      if (blurTimer) clearTimeout(blurTimer);
                      selectSmartExpenseCategory(account);
                    }}
                  >
                    {accountLabel(account)}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </label>
        <span>using</span>
        <label class="smart-entry__field smart-entry__field--autocomplete">
          <span>Paid From</span>
          <div class="autocomplete smart-entry__autocomplete">
            <input
              type="text"
              bind:this={smartExpenseSourceInput}
              bind:value={smartExpenseSourceQuery}
              placeholder="Type account like Cash or ICICI and press Enter"
              on:focus={() => {
                closeAllDropdowns();
                smartExpenseSourceOpen = true;
              }}
              on:input={() => {
                smartExpenseSourceId = "";
                smartExpenseSourceOpen = true;
                smartExpenseSourceIndex = 0;
              }}
              on:blur={() => {
                blurTimer = setTimeout(closeSmartExpenseSource, 120);
              }}
              on:keydown={(e) => {
                if (!smartExpenseSourceOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  smartExpenseSourceOpen = true;
                }
                if (!smartExpenseSourceOpen) {
                  if (e.key === "Enter" && smartExpenseSourceMatches.length) {
                    e.preventDefault();
                    selectSmartExpenseSource(smartExpenseSourceMatches[0]);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeSmartExpenseSource();
                  return;
                }
                if (e.key === "Tab") {
                  closeSmartExpenseSource();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  smartExpenseSourceIndex = Math.min(
                    smartExpenseSourceIndex + 1,
                    smartExpenseSourceMatches.length - 1
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  smartExpenseSourceIndex = Math.max(smartExpenseSourceIndex - 1, 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (smartExpenseSourceMatches[smartExpenseSourceIndex]) {
                    selectSmartExpenseSource(smartExpenseSourceMatches[smartExpenseSourceIndex]);
                  }
                }
              }}
            />
            {#if smartExpenseSourceOpen && smartExpenseSourceMatches.length}
              <div class="autocomplete-list">
                {#each smartExpenseSourceMatches as account, i}
                  <button
                    class={`autocomplete-item ${i === smartExpenseSourceIndex ? "active" : ""}`}
                    type="button"
                    on:mousedown|preventDefault={() => {
                      if (blurTimer) clearTimeout(blurTimer);
                      selectSmartExpenseSource(account);
                    }}
                  >
                    {accountLabel(account)}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </label>
      </div>
      <p class="smart-entry__helper">Type `Cash` to find your cash wallet/account quickly.</p>
    {:else if smartMode === "income"}
      <div class="smart-entry__sentence">
        <span>I received</span>
        <label class="smart-entry__field">
          <span>Amount</span>
          <input type="number" step="0.01" bind:value={smartAmount} placeholder="0.00" />
        </label>
        <span>from</span>
        <label class="smart-entry__field smart-entry__field--autocomplete">
          <span>Income Source</span>
          <div class="autocomplete smart-entry__autocomplete">
            <input
              type="text"
              bind:this={smartIncomeSourceInput}
              bind:value={smartIncomeSourceQuery}
              placeholder="Type income source and press Enter"
              on:focus={() => {
                closeAllDropdowns();
                smartIncomeSourceOpen = true;
              }}
              on:input={() => {
                smartIncomeSourceId = "";
                smartIncomeSourceOpen = true;
                smartIncomeSourceIndex = 0;
              }}
              on:blur={() => {
                blurTimer = setTimeout(closeSmartIncomeSource, 120);
              }}
              on:keydown={(e) => {
                if (!smartIncomeSourceOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  smartIncomeSourceOpen = true;
                }
                if (!smartIncomeSourceOpen) {
                  if (e.key === "Enter" && smartIncomeSourceMatches.length) {
                    e.preventDefault();
                    selectSmartIncomeSource(smartIncomeSourceMatches[0]);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeSmartIncomeSource();
                  return;
                }
                if (e.key === "Tab") {
                  closeSmartIncomeSource();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  smartIncomeSourceIndex = Math.min(smartIncomeSourceIndex + 1, smartIncomeSourceMatches.length - 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  smartIncomeSourceIndex = Math.max(smartIncomeSourceIndex - 1, 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (smartIncomeSourceMatches[smartIncomeSourceIndex]) {
                    selectSmartIncomeSource(smartIncomeSourceMatches[smartIncomeSourceIndex]);
                  }
                }
              }}
            />
            {#if smartIncomeSourceOpen && smartIncomeSourceMatches.length}
              <div class="autocomplete-list">
                {#each smartIncomeSourceMatches as account, i}
                  <button
                    class={`autocomplete-item ${i === smartIncomeSourceIndex ? "active" : ""}`}
                    type="button"
                    on:mousedown|preventDefault={() => {
                      if (blurTimer) clearTimeout(blurTimer);
                      selectSmartIncomeSource(account);
                    }}
                  >
                    {accountLabel(account)}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </label>
        <span>into</span>
        <label class="smart-entry__field smart-entry__field--autocomplete">
          <span>Received In</span>
          <div class="autocomplete smart-entry__autocomplete">
            <input
              type="text"
              bind:this={smartIncomeDestinationInput}
              bind:value={smartIncomeDestinationQuery}
              placeholder="Type destination account and press Enter"
              on:focus={() => {
                closeAllDropdowns();
                smartIncomeDestinationOpen = true;
              }}
              on:input={() => {
                smartIncomeDestinationId = "";
                smartIncomeDestinationOpen = true;
                smartIncomeDestinationIndex = 0;
              }}
              on:blur={() => {
                blurTimer = setTimeout(closeSmartIncomeDestination, 120);
              }}
              on:keydown={(e) => {
                if (!smartIncomeDestinationOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  smartIncomeDestinationOpen = true;
                }
                if (!smartIncomeDestinationOpen) {
                  if (e.key === "Enter" && smartIncomeDestinationMatches.length) {
                    e.preventDefault();
                    selectSmartIncomeDestination(smartIncomeDestinationMatches[0]);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeSmartIncomeDestination();
                  return;
                }
                if (e.key === "Tab") {
                  closeSmartIncomeDestination();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  smartIncomeDestinationIndex = Math.min(
                    smartIncomeDestinationIndex + 1,
                    smartIncomeDestinationMatches.length - 1
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  smartIncomeDestinationIndex = Math.max(smartIncomeDestinationIndex - 1, 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (smartIncomeDestinationMatches[smartIncomeDestinationIndex]) {
                    selectSmartIncomeDestination(smartIncomeDestinationMatches[smartIncomeDestinationIndex]);
                  }
                }
              }}
            />
            {#if smartIncomeDestinationOpen && smartIncomeDestinationMatches.length}
              <div class="autocomplete-list">
                {#each smartIncomeDestinationMatches as account, i}
                  <button
                    class={`autocomplete-item ${i === smartIncomeDestinationIndex ? "active" : ""}`}
                    type="button"
                    on:mousedown|preventDefault={() => {
                      if (blurTimer) clearTimeout(blurTimer);
                      selectSmartIncomeDestination(account);
                    }}
                  >
                    {accountLabel(account)}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </label>
      </div>
    {:else if smartMode === "move_money"}
      <div class="smart-entry__sentence">
        <span>I moved</span>
        <label class="smart-entry__field">
          <span>Amount</span>
          <input type="number" step="0.01" bind:value={smartAmount} placeholder="0.00" />
        </label>
        <span>from</span>
        <label class="smart-entry__field smart-entry__field--autocomplete">
          <span>From</span>
          <div class="autocomplete smart-entry__autocomplete">
            <input
              type="text"
              bind:this={smartMoveFromInput}
              bind:value={smartMoveFromQuery}
              placeholder="Type source account and press Enter"
              on:focus={() => {
                closeAllDropdowns();
                smartMoveFromOpen = true;
              }}
              on:input={() => {
                smartMoveFromId = "";
                smartMoveFromOpen = true;
                smartMoveFromIndex = 0;
              }}
              on:blur={() => {
                blurTimer = setTimeout(closeSmartMoveFrom, 120);
              }}
              on:keydown={(e) => {
                if (!smartMoveFromOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  smartMoveFromOpen = true;
                }
                if (!smartMoveFromOpen) {
                  if (e.key === "Enter" && smartMoveFromMatches.length) {
                    e.preventDefault();
                    selectSmartMoveFrom(smartMoveFromMatches[0]);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeSmartMoveFrom();
                  return;
                }
                if (e.key === "Tab") {
                  closeSmartMoveFrom();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  smartMoveFromIndex = Math.min(smartMoveFromIndex + 1, smartMoveFromMatches.length - 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  smartMoveFromIndex = Math.max(smartMoveFromIndex - 1, 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (smartMoveFromMatches[smartMoveFromIndex]) {
                    selectSmartMoveFrom(smartMoveFromMatches[smartMoveFromIndex]);
                  }
                }
              }}
            />
            {#if smartMoveFromOpen && smartMoveFromMatches.length}
              <div class="autocomplete-list">
                {#each smartMoveFromMatches as account, i}
                  <button
                    class={`autocomplete-item ${i === smartMoveFromIndex ? "active" : ""}`}
                    type="button"
                    on:mousedown|preventDefault={() => {
                      if (blurTimer) clearTimeout(blurTimer);
                      selectSmartMoveFrom(account);
                    }}
                  >
                    {accountLabel(account)}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </label>
        <span>to</span>
        <label class="smart-entry__field smart-entry__field--autocomplete">
          <span>To</span>
          <div class="autocomplete smart-entry__autocomplete">
            <input
              type="text"
              bind:this={smartMoveToInput}
              bind:value={smartMoveToQuery}
              placeholder="Type destination account and press Enter"
              on:focus={() => {
                closeAllDropdowns();
                smartMoveToOpen = true;
              }}
              on:input={() => {
                smartMoveToId = "";
                smartMoveToOpen = true;
                smartMoveToIndex = 0;
              }}
              on:blur={() => {
                blurTimer = setTimeout(closeSmartMoveTo, 120);
              }}
              on:keydown={(e) => {
                if (!smartMoveToOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  smartMoveToOpen = true;
                }
                if (!smartMoveToOpen) {
                  if (e.key === "Enter" && smartMoveToMatches.length) {
                    e.preventDefault();
                    selectSmartMoveTo(smartMoveToMatches[0]);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeSmartMoveTo();
                  return;
                }
                if (e.key === "Tab") {
                  closeSmartMoveTo();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  smartMoveToIndex = Math.min(smartMoveToIndex + 1, smartMoveToMatches.length - 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  smartMoveToIndex = Math.max(smartMoveToIndex - 1, 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (smartMoveToMatches[smartMoveToIndex]) {
                    selectSmartMoveTo(smartMoveToMatches[smartMoveToIndex]);
                  }
                }
              }}
            />
            {#if smartMoveToOpen && smartMoveToMatches.length}
              <div class="autocomplete-list">
                {#each smartMoveToMatches as account, i}
                  <button
                    class={`autocomplete-item ${i === smartMoveToIndex ? "active" : ""}`}
                    type="button"
                    on:mousedown|preventDefault={() => {
                      if (blurTimer) clearTimeout(blurTimer);
                      selectSmartMoveTo(account);
                    }}
                  >
                    {accountLabel(account)}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </label>
      </div>
      <p class="smart-entry__helper">
        Use this for bank-to-bank, broker-to-bank, wallet transfers, and bank-to-credit-card payments.
      </p>
    {:else}
      <div class="smart-entry__sentence">
        <span>My</span>
        <label class="smart-entry__field smart-entry__field--autocomplete">
          <span>Investment</span>
          <div class="autocomplete smart-entry__autocomplete">
            <input
              type="text"
              bind:this={smartInvestmentAccountInput}
              bind:value={smartInvestmentAccountQuery}
              placeholder="Type investment account and press Enter"
              on:focus={() => {
                closeAllDropdowns();
                smartInvestmentAccountOpen = true;
              }}
              on:input={() => {
                smartInvestmentAccountId = "";
                smartInvestmentAccountOpen = true;
                smartInvestmentAccountIndex = 0;
              }}
              on:blur={() => {
                blurTimer = setTimeout(closeSmartInvestmentAccount, 120);
              }}
              on:keydown={(e) => {
                if (!smartInvestmentAccountOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  smartInvestmentAccountOpen = true;
                }
                if (!smartInvestmentAccountOpen) {
                  if (e.key === "Enter" && smartInvestmentAccountMatches.length) {
                    e.preventDefault();
                    selectSmartInvestmentAccount(smartInvestmentAccountMatches[0]);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeSmartInvestmentAccount();
                  return;
                }
                if (e.key === "Tab") {
                  closeSmartInvestmentAccount();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  smartInvestmentAccountIndex = Math.min(
                    smartInvestmentAccountIndex + 1,
                    smartInvestmentAccountMatches.length - 1
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  smartInvestmentAccountIndex = Math.max(smartInvestmentAccountIndex - 1, 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (smartInvestmentAccountMatches[smartInvestmentAccountIndex]) {
                    selectSmartInvestmentAccount(smartInvestmentAccountMatches[smartInvestmentAccountIndex]);
                  }
                }
              }}
            />
            {#if smartInvestmentAccountOpen && smartInvestmentAccountMatches.length}
              <div class="autocomplete-list">
                {#each smartInvestmentAccountMatches as account, i}
                  <button
                    class={`autocomplete-item ${i === smartInvestmentAccountIndex ? "active" : ""}`}
                    type="button"
                    on:mousedown|preventDefault={() => {
                      if (blurTimer) clearTimeout(blurTimer);
                      selectSmartInvestmentAccount(account);
                    }}
                  >
                    {accountLabel(account)}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </label>
        <span>changed by</span>
        <label class="smart-entry__field">
          <span>Value Change</span>
          <input
            type="number"
            step="0.01"
            bind:value={smartAmount}
            placeholder="Use positive for gain, negative for loss"
          />
        </label>
        <span>and should hit</span>
        <label class="smart-entry__field smart-entry__field--autocomplete">
          <span>{smartIsGain ? "Gain Account" : "Loss Account"}</span>
          <div class="autocomplete smart-entry__autocomplete">
            <input
              type="text"
              bind:this={smartMtmOffsetAccountInput}
              bind:value={smartMtmOffsetAccountQuery}
              placeholder={`Type ${smartIsGain ? "gain" : "loss"} account and press Enter`}
              on:focus={() => {
                closeAllDropdowns();
                smartMtmOffsetAccountOpen = true;
              }}
              on:input={() => {
                smartMtmOffsetAccountId = "";
                smartMtmOffsetAccountOpen = true;
                smartMtmOffsetAccountIndex = 0;
              }}
              on:blur={() => {
                blurTimer = setTimeout(closeSmartMtmOffsetAccount, 120);
              }}
              on:keydown={(e) => {
                if (!smartMtmOffsetAccountOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  smartMtmOffsetAccountOpen = true;
                }
                if (!smartMtmOffsetAccountOpen) {
                  if (e.key === "Enter" && smartMtmOffsetAccountMatches.length) {
                    e.preventDefault();
                    selectSmartMtmOffsetAccount(smartMtmOffsetAccountMatches[0]);
                  }
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closeSmartMtmOffsetAccount();
                  return;
                }
                if (e.key === "Tab") {
                  closeSmartMtmOffsetAccount();
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  smartMtmOffsetAccountIndex = Math.min(
                    smartMtmOffsetAccountIndex + 1,
                    smartMtmOffsetAccountMatches.length - 1
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  smartMtmOffsetAccountIndex = Math.max(smartMtmOffsetAccountIndex - 1, 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (smartMtmOffsetAccountMatches[smartMtmOffsetAccountIndex]) {
                    selectSmartMtmOffsetAccount(smartMtmOffsetAccountMatches[smartMtmOffsetAccountIndex]);
                  }
                }
              }}
            />
            {#if smartMtmOffsetAccountOpen && smartMtmOffsetAccountMatches.length}
              <div class="autocomplete-list">
                {#each smartMtmOffsetAccountMatches as account, i}
                  <button
                    class={`autocomplete-item ${i === smartMtmOffsetAccountIndex ? "active" : ""}`}
                    type="button"
                    on:mousedown|preventDefault={() => {
                      if (blurTimer) clearTimeout(blurTimer);
                      selectSmartMtmOffsetAccount(account);
                    }}
                  >
                    {accountLabel(account)}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
        </label>
      </div>
      <p class="smart-entry__helper">Positive amount books a gain. Negative amount books a loss.</p>
    {/if}

    <div class="smart-entry__footer">
      <label class="smart-entry__field smart-entry__field--note">
        <span>Note</span>
        <input
          type="text"
          bind:value={smartNote}
          placeholder="Optional. Leave blank to auto-build a description."
        />
      </label>
      <button class="button smart-entry__submit" type="button" on:click={submitSmartEntry}>
        Save {smartModeMeta.label}
      </button>
      {#if smartStatus}
        <span class="meta">{smartStatus}</span>
      {/if}
      {#if smartError}
        <span class="danger">{smartError}</span>
      {/if}
    </div>

  </div>
</div>

<div class="panel entry-panel">
  <div class="toolbar entry-form">
    <label>
      Date:&nbsp;
      <input type="date" bind:value={entryDate} />
    </label>
    <div class="autocomplete">
      <label>Debit:&nbsp;</label>
      <input
        type="text"
        bind:this={debitInput}
        bind:value={debitQuery}
        on:focus={() => {
          creditOpen = false;
          debitOpen = true;
        }}
        on:input={() => {
          debitOpen = true;
          debitIndex = 0;
        }}
        on:blur={() => {
          blurTimer = setTimeout(closeDebit, 120);
        }}
        on:keydown={(e) => {
          if (!debitOpen) return;
          if (e.key === "Escape") {
            e.preventDefault();
            closeDebit();
            return;
          }
          if (e.key === "Tab") {
            closeDebit();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            debitIndex = Math.min(debitIndex + 1, debitMatches.length - 1);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            debitIndex = Math.max(debitIndex - 1, 0);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (debitMatches[debitIndex]) {
              selectDebit(debitMatches[debitIndex]);
            }
          }
        }}
        placeholder="Type to search"
      />
      {#if debitOpen && debitMatches.length}
        <div class="autocomplete-list">
          {#each debitMatches as acc, i}
            <button
              class={`autocomplete-item ${i === debitIndex ? "active" : ""}`}
              on:mousedown|preventDefault={() => {
                if (blurTimer) clearTimeout(blurTimer);
                selectDebit(acc);
              }}
            >
              {acc.path || acc.name}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <label>
      Amount:&nbsp;
      <input
        type="number"
        step="0.01"
        bind:value={amount}
        on:keydown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submitEntry();
          }
        }}
        on:focus={closeAllDropdowns}
      />
    </label>
    <label>
      Desc:&nbsp;
      <input
        type="text"
        bind:value={description}
        on:keydown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submitEntry();
          }
        }}
        on:focus={closeAllDropdowns}
      />
    </label>
    <div class="autocomplete">
      <label>Credit:&nbsp;</label>
      <input
        type="text"
        bind:value={creditQuery}
        on:focus={() => {
          debitOpen = false;
          creditOpen = true;
        }}
        on:input={() => {
          creditOpen = true;
          creditIndex = 0;
        }}
        on:blur={() => {
          blurTimer = setTimeout(closeCredit, 120);
        }}
        on:keydown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            closeCredit();
            return;
          }
          if (e.key === "Tab") {
            closeCredit();
            return;
          }
          if (creditOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            if (e.key === "ArrowDown") {
              creditIndex = Math.min(creditIndex + 1, creditMatches.length - 1);
            } else {
              creditIndex = Math.max(creditIndex - 1, 0);
            }
            return;
          }
          if (e.key === "Enter") {
            e.preventDefault();
            if (creditOpen && creditMatches[creditIndex]) {
              selectCredit(creditMatches[creditIndex]);
            } else {
              submitEntry();
            }
          }
        }}
        placeholder="Type to search"
      />
      {#if creditOpen && creditMatches.length}
        <div class="autocomplete-list">
          {#each creditMatches as acc, i}
            <button
              class={`autocomplete-item ${i === creditIndex ? "active" : ""}`}
              on:mousedown|preventDefault={() => {
                if (blurTimer) clearTimeout(blurTimer);
                selectCredit(acc);
              }}
            >
              {acc.path || acc.name}
            </button>
          {/each}
        </div>
      {/if}
    </div>
    <button class="button" on:click={submitEntry}>Add</button>
    {#if entryStatus}
      <span class="meta">{entryStatus}</span>
    {/if}
    {#if entryError}
      <span class="danger">{entryError}</span>
    {/if}
  </div>
</div>

<div class="toolbar">
  <button class="button" on:click={() => {
    monthStart = addMonths(monthStart, -12);
    const maxKey = data?.max_entry_date ? data.max_entry_date.slice(0, 7) : null;
    const minKey = data?.min_entry_date ? data.min_entry_date.slice(0, 7) : null;
    months = buildMonths(monthStart, minKey, maxKey);
    if (months.length) setActiveMonth(months[0].key);
  }}>
    Prev 12
  </button>
  <button class="button" on:click={() => {
    monthStart = addMonths(monthStart, 12);
    const maxKey = data?.max_entry_date ? data.max_entry_date.slice(0, 7) : null;
    const minKey = data?.min_entry_date ? data.min_entry_date.slice(0, 7) : null;
    months = buildMonths(monthStart, minKey, maxKey);
    if (months.length) setActiveMonth(months[0].key);
  }}>
    Next 12
  </button>
  <label>
    Period:&nbsp;
    <select bind:value={period}>
      <option value="current_month">Current Month</option>
      <option value="ytd">Year to Date</option>
      <option value="all">All</option>
      <option value="custom">Custom Range</option>
    </select>
  </label>
  {#if period === "custom"}
    <label>
      Start:&nbsp;
      <input type="date" bind:value={startDate} />
    </label>
    <label>
      End:&nbsp;
      <input type="date" bind:value={endDate} />
    </label>
  {/if}
  <label>
    Account:&nbsp;
    <select bind:value={accountId}>
      <option value="all">All Accounts</option>
      {#if data?.accounts_for_select}
        {#each data.accounts_for_select as acc}
          <option value={acc.id}>{acc.path || acc.name}</option>
        {/each}
      {/if}
    </select>
  </label>
  <span class="meta">Total: {data?.pagination?.total ?? 0} entries</span>
</div>

<div class="tabs">
  {#each months as m, i}
    <button
      class={`tab ${activeMonth === m.key ? "active" : ""}`}
      style={`--tab-color: ${monthTabColor(i)}`}
      on:click={() => setActiveMonth(m.key)}
    >
      {m.label}
    </button>
  {/each}
</div>

<div class="split">
  <div>
    <Table columns={columns} rows={shadedEntries} rowClass={(row) => row.__shade} />
    <div class="toolbar">
      <button class="button" disabled={!data?.pagination?.has_prev} on:click={() => {
        const params = new URLSearchParams();
        params.set("period", toPeriodParam(period, startDate, endDate));
        if (accountId !== "all") params.set("account_id", accountId);
        params.set("page", String((data?.pagination?.page || 1) - 1));
        apiGet(`/transactions?${params.toString()}`).then((res) => (data = res));
      }}>
        Prev Page
      </button>
      <span class="meta">Page {data?.pagination?.page ?? 1} / {data?.pagination?.pages ?? 1}</span>
      <button class="button" disabled={!data?.pagination?.has_next} on:click={() => {
        const params = new URLSearchParams();
        params.set("period", toPeriodParam(period, startDate, endDate));
        if (accountId !== "all") params.set("account_id", accountId);
        params.set("page", String((data?.pagination?.page || 1) + 1));
        apiGet(`/transactions?${params.toString()}`).then((res) => (data = res));
      }}>
        Next Page
      </button>
    </div>
  </div>
  <div>
    <div class="toolbar">
      <span class="meta">Account filter: {accountId === "all" ? "All" : accountId}</span>
      <button class="button" on:click={resetAccountFilter} disabled={accountId === "all"}>
        Reset
      </button>
    </div>
    <div class="table-wrap">
      <table class="table summary-table">
        <thead>
          <tr>
            <th class="col-asset">Asset <span class="meta">({formatInr(totals.Asset)})</span></th>
            <th class="col-liability">Liability <span class="meta">({formatInr(totals.Liability)})</span></th>
            <th class="col-income">Income <span class="meta">({formatInr(totals.Income)})</span></th>
            <th class="col-expense">Expense <span class="meta">({formatInr(totals.Expense)})</span></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="col-asset">
              {#each data?.period_sums?.Asset || [] as item}
                <button class="list-row list-row-btn" on:click={() => applyAccountFilter(item.account_id)}>
                  <span>{item.name}</span>
                  <span class="num">{formatInr(item.value)}</span>
                </button>
              {/each}
            </td>
            <td class="col-liability">
              {#each data?.period_sums?.Liability || [] as item}
                <button class="list-row list-row-btn" on:click={() => applyAccountFilter(item.account_id)}>
                  <span>{item.name}</span>
                  <span class="num">{formatInr(item.value)}</span>
                </button>
              {/each}
            </td>
            <td class="col-income">
              {#each data?.period_sums?.Income || [] as item}
                <button class="list-row list-row-btn" on:click={() => applyAccountFilter(item.account_id)}>
                  <span>{item.name}</span>
                  <span class="num">{formatInr(item.value)}</span>
                </button>
              {/each}
            </td>
            <td class="col-expense">
              {#each data?.period_sums?.Expense || [] as item}
                <button class="list-row list-row-btn" on:click={() => applyAccountFilter(item.account_id)}>
                  <span>{item.name}</span>
                  <span class="num">{formatInr(item.value)}</span>
                </button>
              {/each}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .smart-entry-panel {
    padding: 14px 16px;
    background:
      radial-gradient(circle at top right, rgba(14, 165, 233, 0.12), transparent 28%),
      linear-gradient(135deg, rgba(29, 78, 216, 0.04), rgba(34, 197, 94, 0.04)),
      var(--panel);
  }

  .smart-entry__header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 14px;
  }

  .smart-entry__eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #0369a1;
    margin-bottom: 4px;
  }

  .smart-entry__title {
    font-size: 18px;
    line-height: 1.3;
    font-weight: 700;
    max-width: 760px;
  }

  .smart-entry__subtitle {
    margin-top: 6px;
    color: var(--muted);
    font-size: 13px;
  }

  .smart-entry__date {
    display: grid;
    gap: 6px;
    min-width: 170px;
    color: var(--muted);
    font-size: 12px;
  }

  .smart-entry__date input,
  .smart-entry__field input,
  .smart-entry__field select {
    width: 100%;
    min-height: 38px;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.96);
    color: var(--text);
    padding: 8px 10px;
    font-size: 13px;
  }

  .smart-entry__date input:focus,
  .smart-entry__field input:focus,
  .smart-entry__field select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  .smart-entry__modes {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
  }

  .smart-entry__mode {
    border: 1px solid #dbeafe;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 14px;
    padding: 12px;
    text-align: left;
    display: grid;
    gap: 6px;
    color: var(--text);
    transition:
      transform 0.16s ease,
      border-color 0.16s ease,
      box-shadow 0.16s ease,
      background 0.16s ease;
  }

  .smart-entry__mode strong {
    font-size: 13px;
  }

  .smart-entry__mode span {
    color: var(--muted);
    font-size: 12px;
    line-height: 1.45;
  }

  .smart-entry__mode:hover {
    transform: translateY(-1px);
    border-color: #93c5fd;
    box-shadow: 0 10px 20px rgba(14, 165, 233, 0.08);
  }

  .smart-entry__mode.active {
    border-color: #2563eb;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(16, 185, 129, 0.06));
    box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
  }

  .smart-entry__body {
    display: grid;
    gap: 12px;
  }

  .smart-entry__sentence {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px;
    border: 1px solid #dbeafe;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.72);
  }

  .smart-entry__sentence > span {
    font-size: 16px;
    font-weight: 600;
    color: #0f172a;
    padding-bottom: 8px;
  }

  .smart-entry__field {
    display: grid;
    gap: 6px;
    min-width: 170px;
    flex: 1 1 180px;
  }

  .smart-entry__field--autocomplete {
    position: relative;
  }

  .smart-entry__field span {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #64748b;
  }

  .smart-entry__field--note {
    flex: 1 1 320px;
  }

  .smart-entry__autocomplete {
    min-width: 0;
  }

  .smart-entry__autocomplete .autocomplete-list {
    border-radius: 10px;
    box-shadow: 0 14px 28px rgba(15, 23, 42, 0.12);
  }

  .smart-entry__helper {
    color: var(--muted);
    font-size: 12px;
    margin-top: -4px;
  }

  .smart-entry__footer {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 10px;
  }

  .smart-entry__submit {
    min-height: 38px;
    padding-inline: 14px;
    border-radius: 10px;
    border-color: #93c5fd;
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 600;
  }

  .smart-entry__submit:hover {
    border-color: #2563eb;
    color: #1d4ed8;
  }

  .smart-entry__preview {
    display: grid;
    gap: 4px;
    padding: 12px 14px;
    border-radius: 14px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
  }

  .smart-entry__preview-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1d4ed8;
  }

  .smart-entry__preview strong {
    font-size: 13px;
    line-height: 1.5;
  }

  @media (max-width: 1100px) {
    .smart-entry__modes {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 900px) {
    .smart-entry__header {
      flex-direction: column;
    }

    .smart-entry__date {
      min-width: 0;
      width: 100%;
    }

    .smart-entry__sentence > span {
      width: 100%;
      padding-bottom: 0;
    }
  }

  @media (max-width: 720px) {
    .smart-entry__modes {
      grid-template-columns: 1fr;
    }

    .smart-entry__field {
      min-width: 100%;
    }
  }
</style>
