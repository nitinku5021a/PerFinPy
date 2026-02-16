require("reflect-metadata");
const Fastify = require("fastify");
const cors = require("@fastify/cors");
const multipart = require("@fastify/multipart");
const formbody = require("@fastify/formbody");
const xlsx = require("xlsx");
const { AppDataSource, dbPath } = require("./db");

const app = Fastify({ logger: true });

app.register(cors, { origin: true });
app.register(multipart);
app.register(formbody);

const ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"];
const BUDGET_OWNERS = ["Guchi", "Gunu", "None"];

function pad2(num) {
  return String(num).padStart(2, "0");
}

function formatDate(date) {
  if (!date) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthEnd(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const str = String(value).trim();
  if (!str) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(str);
  if (iso) {
    const [y, m, d] = str.split("-").map((x) => Number(x));
    return new Date(y, m - 1, d);
  }
  const dm = /^\d{1,2}-\d{1,2}-\d{4}/.exec(str);
  if (dm) {
    const [d, m, y] = str.split("-").map((x) => Number(x));
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseMonth(value) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), 1);
  const str = String(value).trim();
  if (!str) return null;
  const m = /^\d{4}-\d{2}/.exec(str);
  if (m) {
    const [y, mo] = str.split("-").map((x) => Number(x));
    return new Date(y, mo - 1, 1);
  }
  const parsed = parseDate(str);
  return parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : null;
}

function monthKey(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

function monthStartFromKey(monthKeyValue) {
  if (monthKeyValue) {
    const parsed = parseMonth(monthKeyValue);
    if (parsed) return parsed;
  }
  const today = new Date();
  return monthStart(today);
}

function monthBounds(monthStartDate) {
  const start = monthStartDate;
  const end = addMonths(monthStartDate, 1);
  return [start, end];
}

function normalizeOwner(owner) {
  if (owner === null || owner === undefined) return "None";
  const value = String(owner).trim();
  if (!BUDGET_OWNERS.includes(value)) {
    throw new Error("Owner must be one of Guchi, Gunu, None");
  }
  return value;
}

function getPeriodDates(period) {
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (period === "all") return [null, null];
  if (period === "ytd") return [new Date(today.getFullYear(), 0, 1), todayDate];
  if (period === "current_month") return [new Date(today.getFullYear(), today.getMonth(), 1), todayDate];
  if (period && period.startsWith("custom_")) {
    const parts = period.split("_");
    if (parts.length >= 3) {
      const startStr = parts[1];
      const endStr = parts[2];
      const start = new Date(
        startStr.slice(0, 4),
        Number(startStr.slice(4, 6)) - 1,
        Number(startStr.slice(6, 8))
      );
      const end = new Date(
        endStr.slice(0, 4),
        Number(endStr.slice(4, 6)) - 1,
        Number(endStr.slice(6, 8))
      );
      return [start, end];
    }
  }
  return [null, null];
}

function monthsBetween(minDate, maxDate) {
  const months = [];
  let cursor = monthStart(minDate);
  const end = monthStart(maxDate);
  while (cursor <= end) {
    months.push(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

async function fetchAccounts() {
  return AppDataSource.query(
    "SELECT id, code, name, account_type, description, parent_id, opening_balance, is_active FROM accounts"
  );
}

function buildAccountMaps(accounts) {
  const byId = new Map();
  const children = new Map();
  const parent = new Map();
  for (const acc of accounts) {
    byId.set(acc.id, acc);
    parent.set(acc.id, acc.parent_id || null);
    if (!children.has(acc.id)) children.set(acc.id, []);
  }
  for (const acc of accounts) {
    if (acc.parent_id) {
      if (!children.has(acc.parent_id)) children.set(acc.parent_id, []);
      children.get(acc.parent_id).push(acc.id);
    }
  }
  return { byId, children, parent };
}

function getDescendants(id, childrenMap) {
  const out = [];
  const stack = [...(childrenMap.get(id) || [])];
  while (stack.length) {
    const current = stack.pop();
    out.push(current);
    const kids = childrenMap.get(current) || [];
    for (const kid of kids) stack.push(kid);
  }
  return out;
}

function getAccountPath(id, parentMap, byId) {
  const parts = [];
  let current = id;
  while (current) {
    const acc = byId.get(current);
    if (!acc) break;
    parts.push(acc.name);
    current = parentMap.get(current);
  }
  return parts.reverse().join(":");
}

async function getBalancesForAccounts(accounts, startDate, endDate) {
  if (!accounts.length) return {};
  const ids = accounts.map((a) => a.id);
  const placeholders = ids.map(() => "?").join(",");
  const params = [...ids];
  let sql = `SELECT account_id, COALESCE(SUM(balance),0) as total FROM daily_account_balance WHERE account_id IN (${placeholders})`;
  if (startDate) {
    sql += " AND date >= ?";
    params.push(formatDate(startDate));
  }
  if (endDate) {
    sql += " AND date <= ?";
    params.push(formatDate(endDate));
  }
  sql += " GROUP BY account_id";
  const rows = await AppDataSource.query(sql, params);
  const sums = new Map(rows.map((r) => [r.account_id, Number(r.total || 0)]));
  const map = {};
  for (const acc of accounts) {
    map[acc.id] = Number(acc.opening_balance || 0) + Number(sums.get(acc.id) || 0);
  }
  return map;
}

function groupBalance(id, childrenMap, balanceMap) {
  let total = balanceMap[id] || 0;
  const kids = childrenMap.get(id) || [];
  for (const kid of kids) {
    total += groupBalance(kid, childrenMap, balanceMap);
  }
  return total;
}

function buildTwoLevelTree(roots, childrenMap, balanceMap, showZero = false, tol = 0.005) {
  const accounts = [];
  for (const root of roots) {
    const parentBalance = childrenMap.get(root.id)?.length
      ? groupBalance(root.id, childrenMap, balanceMap)
      : balanceMap[root.id] || 0;
    const parentPayload = { account: root, balance: parentBalance, children: [] };

    const childIds = childrenMap.get(root.id) || [];
    for (const childId of childIds) {
      const child = root._byId.get(childId);
      const childBalance = childrenMap.get(childId)?.length
        ? groupBalance(childId, childrenMap, balanceMap)
        : balanceMap[childId] || 0;
      const childPayload = { account: child, balance: childBalance, children: [] };

      const gcIds = childrenMap.get(childId) || [];
      for (const gcId of gcIds) {
        const gc = root._byId.get(gcId);
        const gcBalance = childrenMap.get(gcId)?.length
          ? groupBalance(gcId, childrenMap, balanceMap)
          : balanceMap[gcId] || 0;
        if (!showZero && Math.abs(gcBalance) <= tol) continue;
        childPayload.children.push({ account: gc, balance: gcBalance });
      }

      if (!showZero && Math.abs(childBalance) <= tol && childPayload.children.length === 0) continue;
      parentPayload.children.push(childPayload);
    }

    if (!showZero && Math.abs(parentBalance) <= tol && parentPayload.children.length === 0) continue;
    accounts.push(parentPayload);
  }
  return accounts;
}

function accountToDict(acc, path = null) {
  return {
    id: acc.id,
    code: acc.code,
    name: acc.name,
    account_type: acc.account_type,
    description: acc.description || "",
    parent_id: acc.parent_id || null,
    opening_balance: Number(acc.opening_balance || 0),
    is_active: acc.is_active !== 0,
    path: path || acc.name
  };
}

function treeToDict(nodes, parentMap, byId) {
  return nodes.map((node) => {
    const children = node.children || [];
    return {
      account: accountToDict(node.account, getAccountPath(node.account.id, parentMap, byId)),
      balance: node.balance,
      children: children.map((child) => ({
        account: accountToDict(child.account, getAccountPath(child.account.id, parentMap, byId)),
        balance: child.balance,
        children: child.children
          ? child.children.map((gc) => ({
              account: accountToDict(gc.account, getAccountPath(gc.account.id, parentMap, byId)),
              balance: gc.balance
            }))
          : []
      }))
    };
  });
}

async function fetchEntryWithLines(entryId) {
  const entries = await AppDataSource.query(
    "SELECT id, entry_date, description, reference, notes FROM journal_entries WHERE id = ?",
    [entryId]
  );
  if (!entries.length) return null;
  const entry = entries[0];
  const lines = await AppDataSource.query(
    `SELECT tl.id, tl.account_id, tl.line_type, tl.amount, tl.date, tl.description,
            a.name as account_name, a.account_type
     FROM transaction_lines tl
     JOIN accounts a ON a.id = tl.account_id
     WHERE tl.journal_entry_id = ?
     ORDER BY tl.id ASC`,
    [entryId]
  );
  return {
    id: entry.id,
    entry_date: entry.entry_date,
    description: entry.description,
    reference: entry.reference,
    notes: entry.notes,
    transaction_lines: lines.map((line) => ({
      id: line.id,
      account_id: line.account_id,
      line_type: line.line_type,
      amount: Number(line.amount || 0),
      date: line.date,
      description: line.description || "",
      account: { id: line.account_id, name: line.account_name, account_type: line.account_type }
    }))
  };
}

function detectAccountType(pathStr, fallback = "Asset") {
  const top = String(pathStr || "").split(":")[0].trim().toLowerCase();
  if (["bank", "cash", "asset", "saving"].some((k) => top.includes(k))) return "Asset";
  if (["credit", "card", "loan", "liability"].some((k) => top.includes(k))) return "Liability";
  if (["equity", "capital", "owner"].some((k) => top.includes(k))) return "Equity";
  if (["revenue", "income", "sales"].some((k) => top.includes(k))) return "Income";
  if (["expense", "expenses", "cost"].some((k) => top.includes(k))) return "Expense";
  return fallback;
}

async function getOrCreateAccountPath(pathStr, accountType) {
  const partsRaw = String(pathStr || "").split(":").map((p) => p.trim()).filter(Boolean);
  if (!partsRaw.length) throw new Error(`Invalid account path: ${pathStr}`);
  const typeNames = ACCOUNT_TYPES.map((t) => t.toLowerCase());
  let parts = partsRaw;
  if (parts[0] && typeNames.includes(parts[0].toLowerCase())) {
    parts = parts.slice(1);
  }
  if (!parts.length) throw new Error(`Account path must contain an account name after the type: ${pathStr}`);

  let parentId = null;
  let currentId = null;
  for (const name of parts) {
    const rows = await AppDataSource.query(
      "SELECT id FROM accounts WHERE LOWER(name) = LOWER(?) AND account_type = ? AND parent_id IS ?",
      [name, accountType, parentId]
    );
    if (rows.length) {
      currentId = rows[0].id;
    } else {
      const code = `__auto__${Math.random().toString(16).slice(2, 10)}`;
      await AppDataSource.query(
        "INSERT INTO accounts (code, name, account_type, parent_id, description, opening_balance, is_active, created_at) VALUES (?, ?, ?, ?, '', 0.0, 1, datetime('now'))",
        [code, name, accountType, parentId]
      );
      const newIdRow = await AppDataSource.query("SELECT last_insert_rowid() as id");
      currentId = newIdRow[0].id;
    }
    parentId = currentId;
  }
  return currentId;
}

async function upsertDailyBalance(accountId, dateStr, delta) {
  const existing = await AppDataSource.query(
    "SELECT id, balance FROM daily_account_balance WHERE account_id = ? AND date = ?",
    [accountId, dateStr]
  );
  if (existing.length) {
    const next = Number(existing[0].balance || 0) + delta;
    await AppDataSource.query(
      "UPDATE daily_account_balance SET balance = ? WHERE id = ?",
      [next, existing[0].id]
    );
  } else {
    await AppDataSource.query(
      "INSERT INTO daily_account_balance (account_id, date, balance) VALUES (?, ?, ?)",
      [accountId, dateStr, delta]
    );
  }
}

async function recomputeMonthlySnapshots(monthStartDate) {
  const accounts = await fetchAccounts();
  const openingByType = {};
  for (const acc of accounts) {
    openingByType[acc.account_type] = (openingByType[acc.account_type] || 0) + Number(acc.opening_balance || 0);
  }

  const monthStartDateStr = formatDate(monthStartDate);
  const monthEndDateStr = formatDate(monthEnd(monthStartDate));
  const sumsByType = await AppDataSource.query(
    `SELECT a.account_type as type, COALESCE(SUM(d.balance),0) as total
     FROM daily_account_balance d
     JOIN accounts a ON a.id = d.account_id
     WHERE d.date >= ? AND d.date <= ?
     GROUP BY a.account_type`,
    [monthStartDateStr, monthEndDateStr]
  );
  const activity = {};
  for (const row of sumsByType) {
    activity[row.type] = Number(row.total || 0);
  }

  const assets = (openingByType.Asset || 0) + (activity.Asset || 0);
  const liabilities = (openingByType.Liability || 0) + (activity.Liability || 0);
  const networth = assets - liabilities;

  const existing = await AppDataSource.query(
    "SELECT id FROM monthly_networth WHERE month = ?",
    [monthStartDateStr]
  );
  if (existing.length) {
    await AppDataSource.query(
      "UPDATE monthly_networth SET assets = ?, liabilities = ?, networth = ? WHERE month = ?",
      [assets, liabilities, networth, monthStartDateStr]
    );
  } else {
    await AppDataSource.query(
      "INSERT INTO monthly_networth (month, assets, liabilities, networth) VALUES (?, ?, ?, ?)",
      [monthStartDateStr, assets, liabilities, networth]
    );
  }

  const incomeAccounts = accounts.filter((a) => a.account_type === "Income");
  const expenseAccounts = accounts.filter((a) => a.account_type === "Expense");
  const balanceMap = await getBalancesForAccounts(incomeAccounts.concat(expenseAccounts), monthStartDate, monthEnd(monthStartDate));

  const incomeTotal = incomeAccounts.reduce((sum, acc) => sum + Math.abs(balanceMap[acc.id] || 0), 0);
  const expenseTotal = expenseAccounts.reduce((sum, acc) => sum + (balanceMap[acc.id] || 0), 0);
  const profit = incomeTotal - expenseTotal;

  const pnlExisting = await AppDataSource.query(
    "SELECT id FROM monthly_pnl WHERE month = ?",
    [monthStartDateStr]
  );
  if (pnlExisting.length) {
    await AppDataSource.query(
      "UPDATE monthly_pnl SET income = ?, expense = ?, profit = ? WHERE month = ?",
      [incomeTotal, expenseTotal, profit, monthStartDateStr]
    );
  } else {
    await AppDataSource.query(
      "INSERT INTO monthly_pnl (month, income, expense, profit) VALUES (?, ?, ?, ?)",
      [monthStartDateStr, incomeTotal, expenseTotal, profit]
    );
  }
}

async function backfillSnapshots() {
  await AppDataSource.query("DELETE FROM daily_account_balance");
  await AppDataSource.query("DELETE FROM monthly_networth");
  await AppDataSource.query("DELETE FROM monthly_pnl");

  const rows = await AppDataSource.query(
    `SELECT account_id, date,
      COALESCE(SUM(CASE WHEN UPPER(line_type) = 'DEBIT' THEN amount ELSE -amount END),0) AS balance
     FROM transaction_lines
     GROUP BY account_id, date`
  );

  for (const row of rows) {
    await AppDataSource.query(
      "INSERT INTO daily_account_balance (account_id, date, balance) VALUES (?, ?, ?)",
      [row.account_id, row.date, row.balance]
    );
  }

  const minRow = await AppDataSource.query("SELECT MIN(date) as min_date FROM transaction_lines");
  const maxRow = await AppDataSource.query("SELECT MAX(date) as max_date FROM transaction_lines");
  const minDate = minRow[0]?.min_date ? parseDate(minRow[0].min_date) : new Date();
  const maxDate = maxRow[0]?.max_date ? parseDate(maxRow[0].max_date) : minDate;
  const months = monthsBetween(minDate, maxDate);
  for (const month of months) {
    await recomputeMonthlySnapshots(month);
  }
}

async function loadMonthEntries(monthStartDate) {
  const [start, end] = monthBounds(monthStartDate);
  const entries = await AppDataSource.query(
    `SELECT DISTINCT je.id, je.entry_date, je.description, je.reference, je.notes
     FROM journal_entries je
     JOIN transaction_lines tl ON tl.journal_entry_id = je.id
     WHERE tl.date >= ? AND tl.date < ?
     ORDER BY je.entry_date DESC, je.id DESC`,
    [formatDate(start), formatDate(end)]
  );
  return entries;
}

async function loadEntryLines(entryIds) {
  if (!entryIds.length) return [];
  return AppDataSource.query(
    `SELECT tl.journal_entry_id, tl.line_type, tl.amount, tl.account_id,
            a.name as account_name, a.account_type
     FROM transaction_lines tl
     JOIN accounts a ON a.id = tl.account_id
     WHERE tl.journal_entry_id IN (${entryIds.map(() => "?").join(",")})`,
    entryIds
  );
}

function summarizeEntry(entry, lines) {
  const debitLines = lines.filter((l) => String(l.line_type).toUpperCase() === "DEBIT");
  const creditLines = lines.filter((l) => String(l.line_type).toUpperCase() === "CREDIT");
  const debitName = debitLines.length === 1 ? debitLines[0].account_name : "Multiple";
  const creditName = creditLines.length === 1 ? creditLines[0].account_name : "Multiple";

  let amount = 0;
  if (debitLines.length) {
    amount = debitLines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  } else if (creditLines.length) {
    amount = creditLines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  }

  let expenseAmount = 0;
  for (const line of lines) {
    if (line.account_type !== "Expense") continue;
    if (String(line.line_type).toUpperCase() === "DEBIT") {
      expenseAmount += Number(line.amount || 0);
    } else {
      expenseAmount -= Number(line.amount || 0);
    }
  }

  return {
    entry_id: entry.id,
    date: entry.entry_date,
    description: entry.description || "",
    reference: entry.reference || "",
    debit_account: debitName,
    credit_account: creditName,
    amount,
    expense_amount: expenseAmount
  };
}

function computeBudgetSummary(budgetAmount, guchiOpening, gunuOpening, entryPayloads) {
  const guchiExpense = entryPayloads
    .filter((item) => item.owner === "Guchi")
    .reduce((sum, item) => sum + Number(item.expense_amount || 0), 0);
  const gunuExpense = entryPayloads
    .filter((item) => item.owner === "Gunu")
    .reduce((sum, item) => sum + Number(item.expense_amount || 0), 0);
  const commonSpent = entryPayloads
    .filter((item) => item.owner === "None")
    .reduce((sum, item) => sum + Number(item.expense_amount || 0), 0);

  const totalExpense = guchiExpense + gunuExpense + commonSpent;
  const remainingBudget = Number(budgetAmount) - totalExpense;
  const discretionaryPool = Number(budgetAmount) - commonSpent;
  const remainingShared = discretionaryPool - guchiExpense - gunuExpense;
  const eachRemainingPower = remainingShared / 2.0;

  return {
    total_expense: totalExpense,
    common_spent: commonSpent,
    guchi_expense: guchiExpense,
    gunu_expense: gunuExpense,
    remaining_budget: remainingBudget,
    discretionary_pool: discretionaryPool,
    remaining_shared: remainingShared,
    guchi_remaining_power: eachRemainingPower,
    gunu_remaining_power: eachRemainingPower,
    guchi_final_available: Number(guchiOpening) + eachRemainingPower,
    gunu_final_available: Number(gunuOpening) + eachRemainingPower
  };
}

async function computeMonthFinalAvailable(monthStartDate) {
  const configRows = await AppDataSource.query(
    "SELECT budget_amount, guchi_opening_balance, gunu_opening_balance FROM monthly_budget WHERE month = ?",
    [formatDate(monthStartDate)]
  );
  if (!configRows.length) return [0.0, 0.0];

  const entries = await loadMonthEntries(monthStartDate);
  const entryIds = entries.map((e) => e.id);
  const lines = await loadEntryLines(entryIds);
  const linesByEntry = new Map();
  for (const line of lines) {
    if (!linesByEntry.has(line.journal_entry_id)) linesByEntry.set(line.journal_entry_id, []);
    linesByEntry.get(line.journal_entry_id).push(line);
  }

  const assignments = entryIds.length
    ? await AppDataSource.query(
        `SELECT journal_entry_id, owner FROM budget_entry_assignment
         WHERE month = ? AND journal_entry_id IN (${entryIds.map(() => "?").join(",")})`,
        [formatDate(monthStartDate), ...entryIds]
      )
    : [];
  const ownerByEntry = new Map(assignments.map((a) => [a.journal_entry_id, normalizeOwner(a.owner)]));

  const entryPayloads = entries.map((entry) => {
    const summary = summarizeEntry(entry, linesByEntry.get(entry.id) || []);
    return {
      owner: ownerByEntry.get(entry.id) || "None",
      expense_amount: summary.expense_amount
    };
  });

  const config = configRows[0];
  const summary = computeBudgetSummary(
    config.budget_amount || 0.0,
    config.guchi_opening_balance || 0.0,
    config.gunu_opening_balance || 0.0,
    entryPayloads
  );

  return [summary.guchi_final_available, summary.gunu_final_available];
}

async function getOrCreateMonthConfig(monthStartDate) {
  const existing = await AppDataSource.query(
    "SELECT id, budget_amount, guchi_opening_balance, gunu_opening_balance FROM monthly_budget WHERE month = ?",
    [formatDate(monthStartDate)]
  );
  if (existing.length) return existing[0];

  const prevMonth = addMonths(monthStartDate, -1);
  const [prevGuchi, prevGunu] = await computeMonthFinalAvailable(prevMonth);
  await AppDataSource.query(
    `INSERT INTO monthly_budget
     (month, budget_amount, guchi_opening_balance, gunu_opening_balance, created_at, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [formatDate(monthStartDate), 0.0, prevGuchi, prevGunu]
  );
  const idRow = await AppDataSource.query("SELECT last_insert_rowid() as id");
  return {
    id: idRow[0].id,
    budget_amount: 0.0,
    guchi_opening_balance: prevGuchi,
    gunu_opening_balance: prevGunu
  };
}

async function monthlyBudgetReport(monthKeyValue) {
  const monthStartDate = monthStartFromKey(monthKeyValue);
  const config = await getOrCreateMonthConfig(monthStartDate);
  const entries = await loadMonthEntries(monthStartDate);
  const entryIds = entries.map((e) => e.id);
  const lines = await loadEntryLines(entryIds);
  const linesByEntry = new Map();
  for (const line of lines) {
    if (!linesByEntry.has(line.journal_entry_id)) linesByEntry.set(line.journal_entry_id, []);
    linesByEntry.get(line.journal_entry_id).push(line);
  }

  const assignments = entryIds.length
    ? await AppDataSource.query(
        `SELECT journal_entry_id, owner FROM budget_entry_assignment
         WHERE month = ? AND journal_entry_id IN (${entryIds.map(() => "?").join(",")})`,
        [formatDate(monthStartDate), ...entryIds]
      )
    : [];
  const ownerByEntry = new Map(assignments.map((a) => [a.journal_entry_id, normalizeOwner(a.owner)]));

  const entryPayloads = entries.map((entry) => {
    const summary = summarizeEntry(entry, linesByEntry.get(entry.id) || []);
    return {
      entry_id: summary.entry_id,
      date: summary.date,
      description: summary.description,
      reference: summary.reference,
      debit_account: summary.debit_account,
      credit_account: summary.credit_account,
      amount: summary.amount,
      expense_amount: summary.expense_amount,
      owner: ownerByEntry.get(entry.id) || "None"
    };
  });

  const summary = computeBudgetSummary(
    config.budget_amount || 0.0,
    config.guchi_opening_balance || 0.0,
    config.gunu_opening_balance || 0.0,
    entryPayloads
  );

  const minRow = await AppDataSource.query("SELECT MIN(date) as min_date, MAX(date) as max_date FROM transaction_lines");
  const minDate = minRow[0]?.min_date ? parseDate(minRow[0].min_date) : null;
  const maxDate = minRow[0]?.max_date ? parseDate(minRow[0].max_date) : monthStartDate;

  return {
    month: monthKey(monthStartDate),
    budget: {
      budget_amount: Number(config.budget_amount || 0.0),
      guchi_opening_balance: Number(config.guchi_opening_balance || 0.0),
      gunu_opening_balance: Number(config.gunu_opening_balance || 0.0)
    },
    summary,
    entries: entryPayloads,
    min_month: minDate ? monthKey(monthStart(minDate)) : null,
    max_month: maxDate ? monthKey(monthStart(maxDate)) : monthKey(monthStartDate)
  };
}

async function updateMonthlyBudgetSettings(monthKeyValue, budgetAmount, guchiOpening, gunuOpening) {
  const monthStartDate = monthStartFromKey(monthKeyValue);
  await getOrCreateMonthConfig(monthStartDate);
  await AppDataSource.query(
    "UPDATE monthly_budget SET budget_amount = ?, guchi_opening_balance = ?, gunu_opening_balance = ?, updated_at = datetime('now') WHERE month = ?",
    [Number(budgetAmount || 0.0), Number(guchiOpening || 0.0), Number(gunuOpening || 0.0), formatDate(monthStartDate)]
  );
  return { ok: true };
}

async function assignEntryOwner(monthKeyValue, journalEntryId, owner) {
  const monthStartDate = monthStartFromKey(monthKeyValue);
  const [start, end] = monthBounds(monthStartDate);
  const normalizedOwner = normalizeOwner(owner);

  const entryRow = await AppDataSource.query("SELECT id FROM journal_entries WHERE id = ?", [journalEntryId]);
  if (!entryRow.length) throw new Error("Transaction not found");

  const exists = await AppDataSource.query(
    `SELECT 1 FROM transaction_lines
     WHERE journal_entry_id = ? AND date >= ? AND date < ? LIMIT 1`,
    [journalEntryId, formatDate(start), formatDate(end)]
  );
  if (!exists.length) throw new Error("Transaction does not belong to selected month");

  const existing = await AppDataSource.query(
    "SELECT id FROM budget_entry_assignment WHERE month = ? AND journal_entry_id = ?",
    [formatDate(monthStartDate), journalEntryId]
  );
  if (existing.length) {
    await AppDataSource.query(
      "UPDATE budget_entry_assignment SET owner = ?, updated_at = datetime('now') WHERE id = ?",
      [normalizedOwner, existing[0].id]
    );
  } else {
    await AppDataSource.query(
      `INSERT INTO budget_entry_assignment
       (month, journal_entry_id, owner, created_at, updated_at)
       VALUES (?, ?, ?, datetime('now'), datetime('now'))`,
      [formatDate(monthStartDate), journalEntryId, normalizedOwner]
    );
  }
  return { ok: true };
}

function dueDateForMonth(monthStartDate, dueDayOfMonth) {
  const year = monthStartDate.getFullYear();
  const month = monthStartDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(Math.max(Number(dueDayOfMonth), 1), lastDay);
  return new Date(year, month, day);
}

async function ensureMonthOccurrences(monthStartDate) {
  const tasks = await AppDataSource.query(
    "SELECT id, title, notes, due_day_of_month, is_active FROM reminder_task WHERE is_active = 1"
  );
  if (!tasks.length) return;

  const taskIds = tasks.map((t) => t.id);
  const existing = await AppDataSource.query(
    `SELECT reminder_task_id FROM reminder_occurrence
     WHERE month = ? AND reminder_task_id IN (${taskIds.map(() => "?").join(",")})`,
    [formatDate(monthStartDate), ...taskIds]
  );
  const existingIds = new Set(existing.map((e) => e.reminder_task_id));

  for (const task of tasks) {
    if (existingIds.has(task.id)) continue;
    const dueDate = dueDateForMonth(monthStartDate, task.due_day_of_month);
    await AppDataSource.query(
      `INSERT INTO reminder_occurrence
       (reminder_task_id, month, due_date, is_done, done_at, is_removed, removed_at, created_at, updated_at)
       VALUES (?, ?, ?, 0, NULL, 0, NULL, datetime('now'), datetime('now'))`,
      [task.id, formatDate(monthStartDate), formatDate(dueDate)]
    );
  }
}

app.get("/health", async () => ({ ok: true, db: dbPath }));

app.get("/reports/networth-monthly", async () => {
  const rows = await AppDataSource.query(
    "SELECT month, assets, liabilities, networth FROM monthly_networth ORDER BY month"
  );
  return { months: rows };
});

app.get("/reports/net-savings-series", async () => {
  const rows = await AppDataSource.query(
    "SELECT month, income, expense, profit AS net_savings FROM monthly_pnl ORDER BY month"
  );
  const months = rows.map((r) => ({
    month: r.month,
    income: Number(r.income || 0),
    expense: Number(r.expense || 0),
    net_savings: Number(r.net_savings || 0),
    net_savings_pct: r.income ? (Number(r.net_savings || 0) / Number(r.income)) * 100 : null
  }));
  return { months };
});

app.get("/reports/networth", async (req) => {
  const period = req.query.period || "all";
  const showZero = ["1", "true", "True"].includes(req.query.show_zero);
  const [startDate, endDate] = getPeriodDates(period);
  const accounts = await fetchAccounts();
  const { byId, children, parent } = buildAccountMaps(accounts);
  const rootsByType = (type) => accounts.filter((a) => a.account_type === type && !a.parent_id);

  const allAccounts = accounts.filter((a) => ["Asset", "Liability", "Equity"].includes(a.account_type));
  const balanceMap = await getBalancesForAccounts(allAccounts, startDate, endDate);

  const assets = rootsByType("Asset").map((r) => ({ ...r, _byId: byId }));
  const liabilities = rootsByType("Liability").map((r) => ({ ...r, _byId: byId }));
  const equity = rootsByType("Equity").map((r) => ({ ...r, _byId: byId }));

  const assetTree = buildTwoLevelTree(assets, children, balanceMap, showZero);
  const liabilityTree = buildTwoLevelTree(liabilities, children, balanceMap, showZero);
  const equityTree = buildTwoLevelTree(equity, children, balanceMap, showZero);

  const sumRoots = (roots) =>
    roots.reduce(
      (sum, r) => sum + (children.get(r.id)?.length ? groupBalance(r.id, children, balanceMap) : balanceMap[r.id] || 0),
      0
    );
  const totalAssets = sumRoots(assets);
  const totalLiabilities = sumRoots(liabilities);

  const incomeAccounts = accounts.filter((a) => a.account_type === "Income");
  const expenseAccounts = accounts.filter((a) => a.account_type === "Expense");
  const incomeBalance = await getBalancesForAccounts(incomeAccounts.concat(expenseAccounts), startDate, endDate);
  let totalIncome = 0;
  let totalExpenses = 0;
  for (const acc of incomeAccounts) totalIncome += Math.abs(incomeBalance[acc.id] || 0);
  for (const acc of expenseAccounts) totalExpenses += incomeBalance[acc.id] || 0;
  const netIncome = totalIncome - totalExpenses;

  const totalEquityBefore = sumRoots(equity) + netIncome;
  const openingBalanceLedger = equity.reduce((sum, r) => sum + Number(r.opening_balance || 0), 0);
  const carryForward = totalAssets - (totalLiabilities + totalEquityBefore);
  const totalEquity = totalEquityBefore + carryForward;

  return {
    report: "networth",
    asset_accounts: treeToDict(assetTree, parent, byId),
    liability_accounts: treeToDict(liabilityTree, parent, byId),
    equity_accounts: treeToDict(equityTree, parent, byId),
    total_assets: totalAssets,
    total_liabilities: totalLiabilities,
    total_equity: totalEquity,
    net_income: netIncome,
    opening_balance_ledger: openingBalanceLedger,
    carry_forward: carryForward,
    start_date: startDate ? formatDate(startDate) : null,
    end_date: endDate ? formatDate(endDate) : null,
    period,
    show_zero: showZero
  };
});

app.get("/reports/income-statement", async (req) => {
  const period = req.query.period || "current_month";
  const showZero = ["1", "true", "True"].includes(req.query.show_zero);
  const [startDate, endDate] = getPeriodDates(period);
  const accounts = await fetchAccounts();
  const { byId, children, parent } = buildAccountMaps(accounts);
  const rootsByType = (type) => accounts.filter((a) => a.account_type === type && !a.parent_id);

  const incomeRoots = rootsByType("Income").map((r) => ({ ...r, _byId: byId }));
  const expenseRoots = rootsByType("Expense").map((r) => ({ ...r, _byId: byId }));

  const allAccounts = accounts.filter((a) => ["Income", "Expense"].includes(a.account_type));
  const balanceMap = await getBalancesForAccounts(allAccounts, startDate, endDate);

  const incomeTree = buildTwoLevelTree(incomeRoots, children, balanceMap, showZero);
  const expenseTree = buildTwoLevelTree(expenseRoots, children, balanceMap, showZero);

  const totalIncome = incomeTree.reduce((sum, item) => sum + Math.abs(item.balance || 0), 0);
  const totalExpenses = expenseTree.reduce((sum, item) => sum + (item.balance || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  return {
    report: "income_statement",
    income_accounts: treeToDict(incomeTree, parent, byId),
    expense_accounts: treeToDict(expenseTree, parent, byId),
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_income: netIncome,
    start_date: startDate ? formatDate(startDate) : null,
    end_date: endDate ? formatDate(endDate) : null,
    period,
    show_zero: showZero
  };
});

app.get("/reports/trial-balance", async (req) => {
  const period = req.query.period || "all";
  const [startDate, endDate] = getPeriodDates(period);
  const accounts = (await fetchAccounts()).filter((a) => a.is_active !== 0);
  const balanceMap = await getBalancesForAccounts(accounts, startDate, endDate);
  const accountBalances = [];
  let totalDebits = 0;
  let totalCredits = 0;

  for (const acc of accounts) {
    const balance = balanceMap[acc.id] || 0;
    if (balance !== 0) {
      if (balance > 0) totalDebits += balance;
      else totalCredits += Math.abs(balance);
      accountBalances.push({
        account: accountToDict(acc),
        balance: Math.abs(balance),
        type: balance > 0 ? "Debit" : "Credit"
      });
    }
  }

  return {
    report: "trial_balance",
    account_balances: accountBalances,
    total_debits: totalDebits,
    total_credits: totalCredits,
    start_date: startDate ? formatDate(startDate) : null,
    end_date: endDate ? formatDate(endDate) : null,
    period
  };
});

app.get("/reports/networth-matrix", async (req) => {
  const startMonthStr = req.query.start;
  const accounts = await fetchAccounts();
  const { byId, children, parent } = buildAccountMaps(accounts);

  const maxRow = await AppDataSource.query("SELECT MAX(date) as max_date, MIN(date) as min_date FROM daily_account_balance");
  const maxDate = maxRow[0]?.max_date ? parseDate(maxRow[0].max_date) : new Date();
  const minDate = maxRow[0]?.min_date ? parseDate(maxRow[0].min_date) : new Date();
  let maxMonth = monthStart(maxDate);
  let minMonth = monthStart(minDate);

  let startMonth = monthStart(new Date());
  if (startMonthStr) {
    const parsed = parseMonth(startMonthStr);
    if (parsed) startMonth = parsed;
  }
  if (startMonth > maxMonth) startMonth = maxMonth;
  if (startMonth < minMonth) startMonth = minMonth;

  const months = Array.from({ length: 12 }).map((_, i) => addMonths(startMonth, -i));
  const monthKeys = months.map((m) => `${m.getFullYear()}-${pad2(m.getMonth() + 1)}`);

  const accountTypes = ["Asset", "Liability", "Equity"];
  const filtered = accounts.filter((a) => accountTypes.includes(a.account_type));
  const accountIds = filtered.map((a) => a.id);
  const openingById = Object.fromEntries(filtered.map((a) => [a.id, Number(a.opening_balance || 0)]));

  const balancesByMonth = {};
  for (let i = 0; i < months.length; i += 1) {
    const monthEndDate = formatDate(monthEnd(months[i]));
    const rows = await AppDataSource.query(
      `SELECT account_id, COALESCE(SUM(balance),0) as total FROM daily_account_balance
       WHERE account_id IN (${accountIds.map(() => "?").join(",")})
       AND date <= ? GROUP BY account_id`,
      [...accountIds, monthEndDate]
    );
    const sums = new Map(rows.map((r) => [r.account_id, Number(r.total || 0)]));
    balancesByMonth[monthKeys[i]] = Object.fromEntries(
      accountIds.map((id) => [id, (openingById[id] || 0) + (sums.get(id) || 0)])
    );
  }

  const labelMap = { Asset: "Assets", Liability: "Liabilities", Equity: "Equity" };
  const groups = [];
  for (const type of accountTypes) {
    const roots = filtered.filter((a) => a.account_type === type && !a.parent_id);
    const groupPayload = { group: labelMap[type] || type, parents: [], monthly_balances: {} };

    for (const root of roots.sort((a, b) => a.name.localeCompare(b.name))) {
      const descendants = getDescendants(root.id, children);
      const leafAccounts = descendants.length ? descendants : [root.id];
      const parentPayload = {
        name: getAccountPath(root.id, parent, byId),
        account_id: root.id,
        accounts: [],
        monthly_balances: {}
      };

      for (const accId of leafAccounts) {
        const acc = byId.get(accId);
        const accMonthly = {};
        for (const m of monthKeys) {
          accMonthly[m] = balancesByMonth[m][accId] ?? openingById[accId] ?? 0;
        }
        parentPayload.accounts.push({
          name: acc.name,
          account_id: accId,
          monthly_balances: accMonthly
        });
      }

      for (const m of monthKeys) {
        const ids = [root.id, ...descendants];
        parentPayload.monthly_balances[m] = ids.reduce(
          (sum, id) => sum + (balancesByMonth[m][id] ?? openingById[id] ?? 0),
          0
        );
      }

      groupPayload.parents.push(parentPayload);
    }

    for (const m of monthKeys) {
      groupPayload.monthly_balances[m] = groupPayload.parents.reduce(
        (sum, p) => sum + (p.monthly_balances[m] || 0),
        0
      );
    }

    groups.push(groupPayload);
  }

  const hasOlder = addMonths(startMonth, -11) > minMonth;
  const hasNewer = startMonth < maxMonth;

  return {
    start_month: `${startMonth.getFullYear()}-${pad2(startMonth.getMonth() + 1)}`,
    months: monthKeys,
    has_older: hasOlder,
    has_newer: hasNewer,
    groups
  };
});

app.get("/reports/income-matrix", async (req) => {
  const startMonthStr = req.query.start;
  const accounts = await fetchAccounts();
  const { byId, children, parent } = buildAccountMaps(accounts);

  const maxRow = await AppDataSource.query("SELECT MAX(date) as max_date, MIN(date) as min_date FROM daily_account_balance");
  const maxDate = maxRow[0]?.max_date ? parseDate(maxRow[0].max_date) : new Date();
  const minDate = maxRow[0]?.min_date ? parseDate(maxRow[0].min_date) : new Date();
  let maxMonth = monthStart(maxDate);
  let minMonth = monthStart(minDate);

  let startMonth = monthStart(new Date());
  if (startMonthStr) {
    const parsed = parseMonth(startMonthStr);
    if (parsed) startMonth = parsed;
  }
  if (startMonth > maxMonth) startMonth = maxMonth;
  if (startMonth < minMonth) startMonth = minMonth;

  const months = Array.from({ length: 12 }).map((_, i) => addMonths(startMonth, -i));
  const monthKeys = months.map((m) => `${m.getFullYear()}-${pad2(m.getMonth() + 1)}`);

  const accountTypes = ["Income", "Expense"];
  const filtered = accounts.filter((a) => accountTypes.includes(a.account_type));
  const accountIds = filtered.map((a) => a.id);
  const typeById = Object.fromEntries(filtered.map((a) => [a.id, a.account_type]));

  const balancesByMonth = {};
  for (let i = 0; i < months.length; i += 1) {
    const monthStartDate = formatDate(monthStart(months[i]));
    const monthEndDate = formatDate(monthEnd(months[i]));
    const rows = await AppDataSource.query(
      `SELECT account_id, COALESCE(SUM(balance),0) as total FROM daily_account_balance
       WHERE account_id IN (${accountIds.map(() => "?").join(",")})
       AND date >= ? AND date <= ?
       GROUP BY account_id`,
      [...accountIds, monthStartDate, monthEndDate]
    );
    const sums = new Map(rows.map((r) => [r.account_id, Number(r.total || 0)]));
    balancesByMonth[monthKeys[i]] = Object.fromEntries(
      accountIds.map((id) => [id, sums.get(id) || 0])
    );
  }

  const groups = [];
  for (const type of accountTypes) {
    const roots = filtered.filter((a) => a.account_type === type && !a.parent_id);
    const groupPayload = { group: type, parents: [], monthly_balances: {} };

    for (const root of roots.sort((a, b) => a.name.localeCompare(b.name))) {
      const descendants = getDescendants(root.id, children);
      const leafAccounts = descendants.length ? descendants : [root.id];
      const parentPayload = {
        name: getAccountPath(root.id, parent, byId),
        account_id: root.id,
        accounts: [],
        monthly_balances: {}
      };

      for (const accId of leafAccounts) {
        const acc = byId.get(accId);
        const accMonthly = {};
        for (const m of monthKeys) {
          let val = balancesByMonth[m][accId] ?? 0;
          if (typeById[accId] === "Income") val = Math.abs(val);
          accMonthly[m] = val;
        }
        parentPayload.accounts.push({
          name: acc.name,
          account_id: accId,
          monthly_balances: accMonthly
        });
      }

      for (const m of monthKeys) {
        const ids = [root.id, ...descendants];
        let total = 0;
        for (const id of ids) {
          let val = balancesByMonth[m][id] ?? 0;
          if (typeById[id] === "Income") val = Math.abs(val);
          total += val;
        }
        parentPayload.monthly_balances[m] = total;
      }

      groupPayload.parents.push(parentPayload);
    }

    for (const m of monthKeys) {
      groupPayload.monthly_balances[m] = groupPayload.parents.reduce(
        (sum, p) => sum + (p.monthly_balances[m] || 0),
        0
      );
    }

    groups.push(groupPayload);
  }

  const hasOlder = addMonths(startMonth, -11) > minMonth;
  const hasNewer = startMonth < maxMonth;

  return {
    start_month: `${startMonth.getFullYear()}-${pad2(startMonth.getMonth() + 1)}`,
    months: monthKeys,
    has_older: hasOlder,
    has_newer: hasNewer,
    groups
  };
});

app.get("/reports/networth-growth", async () => {
  const maxRow = await AppDataSource.query("SELECT MAX(date) as max_date, MIN(date) as min_date FROM daily_account_balance");
  if (!maxRow[0]?.max_date || !maxRow[0]?.min_date) return { yearly: [] };

  const minMonth = monthStart(parseDate(maxRow[0].min_date));
  const maxMonth = monthStart(parseDate(maxRow[0].max_date));
  const accounts = await fetchAccounts();
  const filtered = accounts.filter((a) => ["Asset", "Liability"].includes(a.account_type));
  const accountIds = filtered.map((a) => a.id);
  const openingById = Object.fromEntries(filtered.map((a) => [a.id, Number(a.opening_balance || 0)]));
  const typeById = Object.fromEntries(filtered.map((a) => [a.id, a.account_type]));

  const yearly = [];
  let prevValue = null;
  for (let year = minMonth.getFullYear(); year <= maxMonth.getFullYear(); year += 1) {
    let yearEnd = new Date(year, 11, 1);
    if (yearEnd > maxMonth) yearEnd = maxMonth;
    const monthEndDate = formatDate(monthEnd(yearEnd));
    const rows = await AppDataSource.query(
      `SELECT account_id, COALESCE(SUM(balance),0) as total FROM daily_account_balance
       WHERE account_id IN (${accountIds.map(() => "?").join(",")})
       AND date <= ? GROUP BY account_id`,
      [...accountIds, monthEndDate]
    );
    const sums = new Map(rows.map((r) => [r.account_id, Number(r.total || 0)]));
    let assets = 0;
    let liabilities = 0;
    for (const id of accountIds) {
      const val = (openingById[id] || 0) + (sums.get(id) || 0);
      if (typeById[id] === "Asset") assets += val;
      else liabilities += val;
    }
    const networth = assets + liabilities;
    let pct = null;
    if (prevValue !== null && Math.abs(prevValue) > 0.00001) {
      pct = ((networth - prevValue) / Math.abs(prevValue)) * 100;
    }
    yearly.push({ year: yearEnd.getFullYear(), networth, pct_change: pct });
    prevValue = networth;
  }

  return { yearly };
});

app.get("/reports/expense-income-asset", async () => {
  const maxRow = await AppDataSource.query("SELECT MAX(date) as max_date, MIN(date) as min_date FROM daily_account_balance");
  if (!maxRow[0]?.max_date || !maxRow[0]?.min_date) return { months: [], years: [] };

  const minMonth = monthStart(parseDate(maxRow[0].min_date));
  const maxMonth = monthStart(parseDate(maxRow[0].max_date));
  const months = monthsBetween(minMonth, maxMonth);

  const accounts = await fetchAccounts();
  const incomeAccounts = accounts.filter((a) => a.account_type === "Income");
  const expenseAccounts = accounts.filter((a) => a.account_type === "Expense");
  const assetAccounts = accounts.filter((a) => a.account_type === "Asset");

  const incomeIds = incomeAccounts.map((a) => a.id);
  const expenseIds = expenseAccounts.map((a) => a.id);
  const assetIds = assetAccounts.map((a) => a.id);
  const assetOpening = Object.fromEntries(assetAccounts.map((a) => [a.id, Number(a.opening_balance || 0)]));

  const rows = [];
  for (const month of months) {
    const start = formatDate(monthStart(month));
    const end = formatDate(monthEnd(month));

    const incomeRows = incomeIds.length
      ? await AppDataSource.query(
          `SELECT account_id, COALESCE(SUM(balance),0) as total FROM daily_account_balance
           WHERE account_id IN (${incomeIds.map(() => "?").join(",")}) AND date >= ? AND date <= ?
           GROUP BY account_id`,
          [...incomeIds, start, end]
        )
      : [];

    const expenseRows = expenseIds.length
      ? await AppDataSource.query(
          `SELECT account_id, COALESCE(SUM(balance),0) as total FROM daily_account_balance
           WHERE account_id IN (${expenseIds.map(() => "?").join(",")}) AND date >= ? AND date <= ?
           GROUP BY account_id`,
          [...expenseIds, start, end]
        )
      : [];

    const assetRows = assetIds.length
      ? await AppDataSource.query(
          `SELECT account_id, COALESCE(SUM(balance),0) as total FROM daily_account_balance
           WHERE account_id IN (${assetIds.map(() => "?").join(",")}) AND date <= ?
           GROUP BY account_id`,
          [...assetIds, end]
        )
      : [];

    const incomeSums = new Map(incomeRows.map((r) => [r.account_id, Number(r.total || 0)]));
    const expenseSums = new Map(expenseRows.map((r) => [r.account_id, Number(r.total || 0)]));
    const assetSums = new Map(assetRows.map((r) => [r.account_id, Number(r.total || 0)]));

    const sumIncome = incomeIds.reduce((sum, id) => sum + Math.abs(incomeSums.get(id) || 0), 0);
    const sumExpense = -expenseIds.reduce((sum, id) => sum + Math.abs(expenseSums.get(id) || 0), 0);
    const maxAsset = assetIds.reduce((sum, id) => sum + (assetOpening[id] || 0) + (assetSums.get(id) || 0), 0);
    const savings = sumIncome + sumExpense;
    const savingsPctIncome = Math.abs(sumIncome) > 0.00001 ? (savings / sumIncome) * 100 : null;
    const savingsPctExpense = Math.abs(sumExpense) > 0.00001 ? (savings / Math.abs(sumExpense)) * 100 : null;

    rows.push({
      month: `${month.getFullYear()}-${pad2(month.getMonth() + 1)}`,
      year: month.getFullYear(),
      month_number: month.getMonth() + 1,
      sum_income: sumIncome,
      sum_expense: sumExpense,
      max_asset: maxAsset,
      rolling_avg_expense: null,
      asset_mom_change_pct: null,
      asset_yoy_change_pct: null,
      savings_pct_income: savingsPctIncome,
      savings_pct_expense: savingsPctExpense
    });
  }

  const monthIndex = new Map(rows.map((r, idx) => [r.month, idx]));
  for (let i = 0; i < rows.length; i += 1) {
    const window = rows.slice(Math.max(0, i - 11), i + 1);
    if (window.length) {
      rows[i].rolling_avg_expense = window.reduce((sum, item) => sum + item.sum_expense, 0) / window.length;
    }
    if (i > 0) {
      const prev = rows[i - 1].max_asset;
      if (Math.abs(prev) > 0.00001) {
        rows[i].asset_mom_change_pct = ((rows[i].max_asset - prev) / Math.abs(prev)) * 100;
      }
    }
    const prevKey = `${rows[i].year - 1}-${pad2(rows[i].month_number)}`;
    const prevIdx = monthIndex.get(prevKey);
    if (prevIdx !== undefined) {
      const prev = rows[prevIdx].max_asset;
      if (Math.abs(prev) > 0.00001) {
        rows[i].asset_yoy_change_pct = ((rows[i].max_asset - prev) / Math.abs(prev)) * 100;
      }
    }
  }

  const yearlyMap = new Map();
  for (const row of rows) {
    if (!yearlyMap.has(row.year)) {
      yearlyMap.set(row.year, { year: row.year, sum_income: 0, sum_expense: 0, max_asset: row.max_asset });
    }
    const target = yearlyMap.get(row.year);
    target.sum_income += row.sum_income;
    target.sum_expense += row.sum_expense;
    target.max_asset = Math.max(target.max_asset, row.max_asset);
  }

  const yearRows = Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year);
  let prevYear = null;
  for (const row of yearRows) {
    const savings = row.sum_income + row.sum_expense;
    row.rolling_avg_expense = null;
    row.asset_mom_change_pct = null;
    row.asset_yoy_change_pct = null;
    row.savings_pct_income = Math.abs(row.sum_income) > 0.00001 ? (savings / row.sum_income) * 100 : null;
    row.savings_pct_expense = Math.abs(row.sum_expense) > 0.00001 ? (savings / Math.abs(row.sum_expense)) * 100 : null;
    if (prevYear && Math.abs(prevYear.max_asset) > 0.00001) {
      row.asset_yoy_change_pct = ((row.max_asset - prevYear.max_asset) / Math.abs(prevYear.max_asset)) * 100;
    }
    prevYear = row;
  }

  return { months: rows, years: yearRows };
});

app.get("/reports/investment-flows", async (req) => {
  const accountIds = String(req.query.account_ids || "")
    .split(",")
    .map((x) => Number(x))
    .filter(Boolean);
  if (!accountIds.length) return { months: [] };

  const monthsCount = 13;
  const today = new Date();
  const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startMonth = addMonths(endMonth, -(monthsCount - 1));
  const monthList = Array.from({ length: monthsCount }).map((_, i) => addMonths(startMonth, i));

  const flows = [];
  for (const month of monthList) {
    const start = formatDate(monthStart(month));
    const end = formatDate(monthEnd(month));
    const row = await AppDataSource.query(
      `SELECT COALESCE(SUM(CASE WHEN UPPER(line_type) = 'DEBIT' THEN amount ELSE -amount END),0) as net
       FROM transaction_lines WHERE account_id IN (${accountIds.map(() => "?").join(",")})
       AND date >= ? AND date <= ?`,
      [...accountIds, start, end]
    );
    flows.push({
      month: `${month.getFullYear()}-${pad2(month.getMonth() + 1)}`,
      net_invested: Number(row[0]?.net || 0)
    });
  }

  return { months: flows };
});

app.get("/reports/cashflow-sankey", async (req) => {
  const monthStr = req.query.month;
  let monthStartDate = monthStart(new Date());
  if (monthStr) {
    const parsed = parseMonth(monthStr);
    if (parsed) monthStartDate = parsed;
  }
  const start = formatDate(monthStartDate);
  const end = formatDate(monthEnd(monthStartDate));

  const entries = await AppDataSource.query(
    `SELECT DISTINCT je.id, je.entry_date, je.description, je.reference, je.notes
     FROM journal_entries je
     JOIN transaction_lines tl ON tl.journal_entry_id = je.id
     WHERE tl.date >= ? AND tl.date <= ?
     ORDER BY je.entry_date ASC`,
    [start, end]
  );

  const entryIds = entries.map((e) => e.id);
  const lines = entryIds.length
    ? await AppDataSource.query(
        `SELECT tl.journal_entry_id, tl.account_id, tl.line_type, tl.amount, tl.date, tl.description,
                a.name as account_name, a.account_type
         FROM transaction_lines tl
         JOIN accounts a ON a.id = tl.account_id
         WHERE tl.journal_entry_id IN (${entryIds.map(() => "?").join(",")})`,
        entryIds
      )
    : [];

  const byEntry = new Map();
  for (const line of lines) {
    if (!byEntry.has(line.journal_entry_id)) byEntry.set(line.journal_entry_id, []);
    byEntry.get(line.journal_entry_id).push({
      account_id: line.account_id,
      line_type: line.line_type,
      amount: Number(line.amount || 0),
      date: line.date,
      description: line.description || "",
      account: { id: line.account_id, name: line.account_name, account_type: line.account_type }
    });
  }

  const accounts = await AppDataSource.query(
    "SELECT id, name, account_type, parent_id, opening_balance FROM accounts ORDER BY account_type ASC, name ASC"
  );

  return {
    month: `${monthStartDate.getFullYear()}-${pad2(monthStartDate.getMonth() + 1)}`,
    accounts: accounts.map((a) => accountToDict(a)),
    entries: entries.map((e) => ({
      id: e.id,
      entry_date: e.entry_date,
      description: e.description,
      reference: e.reference,
      notes: e.notes,
      transaction_lines: byEntry.get(e.id) || []
    }))
  };
});

app.get("/reports/accounts/:accountId/entries", async (req) => {
  const accountId = Number(req.params.accountId);
  const period = req.query.period || "ytd";
  const [startDate, endDate] = getPeriodDates(period);
  const accounts = await fetchAccounts();
  const { byId, children } = buildAccountMaps(accounts);
  const descendantIds = getDescendants(accountId, children);
  const ids = [accountId, ...descendantIds];
  if (!ids.length) return { report: "account_entries", account: null, entries: [] };

  const params = [...ids];
  let sql = `SELECT DISTINCT je.id, je.entry_date, je.description, je.reference, je.notes
             FROM journal_entries je
             JOIN transaction_lines tl ON tl.journal_entry_id = je.id
             WHERE tl.account_id IN (${ids.map(() => "?").join(",")})`;
  if (startDate) {
    sql += " AND tl.date >= ?";
    params.push(formatDate(startDate));
  }
  if (endDate) {
    sql += " AND tl.date <= ?";
    params.push(formatDate(endDate));
  }
  sql += " ORDER BY je.entry_date DESC";

  const entries = await AppDataSource.query(sql, params);
  return {
    report: "account_entries",
    account: byId.get(accountId) ? accountToDict(byId.get(accountId)) : null,
    entries,
    period,
    start_date: startDate ? formatDate(startDate) : null,
    end_date: endDate ? formatDate(endDate) : null
  };
});

app.get("/transactions", async (req) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;
  const period = req.query.period || "all";
  const accountId = req.query.account_id ? Number(req.query.account_id) : null;
  const [startDate, endDate] = getPeriodDates(period);

  const accounts = await fetchAccounts();
  const { byId, children, parent } = buildAccountMaps(accounts);

  let accountFilterIds = null;
  if (accountId) {
    if (byId.get(accountId)) {
      accountFilterIds = [accountId, ...getDescendants(accountId, children)];
    } else {
      accountFilterIds = [accountId];
    }
  }

  const where = [];
  const params = [];
  if (accountFilterIds) {
    where.push(`tl_filter.account_id IN (${accountFilterIds.map(() => "?").join(",")})`);
    params.push(...accountFilterIds);
  }
  if (startDate) {
    where.push("tl_filter.date >= ?");
    params.push(formatDate(startDate));
  }
  if (endDate) {
    where.push("tl_filter.date <= ?");
    params.push(formatDate(endDate));
  }

  let baseSql = "FROM journal_entries je";
  if (where.length) {
    baseSql += " JOIN transaction_lines tl_filter ON tl_filter.journal_entry_id = je.id";
    baseSql += ` WHERE ${where.join(" AND ")}`;
  }

  const countRow = await AppDataSource.query(
    `SELECT COUNT(DISTINCT je.id) as total ${baseSql}`,
    params
  );
  const total = Number(countRow?.[0]?.total || 0);

  const entries = await AppDataSource.query(
    `SELECT DISTINCT je.id, je.entry_date, je.description, je.reference, je.notes
     ${baseSql}
     ORDER BY je.entry_date DESC, je.id DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const entryIds = entries.map((e) => e.id);
  const lines = entryIds.length
    ? await AppDataSource.query(
        `SELECT tl.journal_entry_id, tl.line_type, tl.amount, tl.account_id,
                a.name as account_name
         FROM transaction_lines tl
         JOIN accounts a ON a.id = tl.account_id
         WHERE tl.journal_entry_id IN (${entryIds.map(() => "?").join(",")})`,
        entryIds
      )
    : [];

  const linesByEntry = new Map();
  for (const line of lines) {
    if (!linesByEntry.has(line.journal_entry_id)) linesByEntry.set(line.journal_entry_id, []);
    linesByEntry.get(line.journal_entry_id).push(line);
  }

  const summarizedEntries = entries.map((entry) => {
    const entryLines = linesByEntry.get(entry.id) || [];
    const debitLines = entryLines.filter((l) => String(l.line_type).toUpperCase() === "DEBIT");
    const creditLines = entryLines.filter((l) => String(l.line_type).toUpperCase() === "CREDIT");
    const debitName = debitLines.length === 1 ? debitLines[0].account_name : "Multiple";
    const creditName = creditLines.length === 1 ? creditLines[0].account_name : "Multiple";

    let amount = 0;
    if (debitLines.length) {
      amount = debitLines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    } else if (creditLines.length) {
      amount = creditLines.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    }

    return {
      id: entry.id,
      entry_date: entry.entry_date,
      description: entry.description,
      reference: entry.reference,
      debit_account: debitName,
      credit_account: creditName,
      amount
    };
  });

  const typeGroups = { Asset: [], Liability: [], Income: [], Expense: [] };
  const typeAccounts = accounts.filter((a) => Object.keys(typeGroups).includes(a.account_type));
  const leafAccounts = typeAccounts.filter((a) => !(children.get(a.id) || []).length);
  if (leafAccounts.length) {
    const leafIds = leafAccounts.map((a) => a.id);
    const sumsParams = [...leafIds];
    let sumsSql = `SELECT account_id, COALESCE(SUM(balance),0) as total FROM daily_account_balance WHERE account_id IN (${leafIds.map(() => "?").join(",")})`;
    if (startDate) {
      sumsSql += " AND date >= ?";
      sumsParams.push(formatDate(startDate));
    }
    if (endDate) {
      sumsSql += " AND date <= ?";
      sumsParams.push(formatDate(endDate));
    }
    sumsSql += " GROUP BY account_id";
    const sumRows = await AppDataSource.query(sumsSql, sumsParams);
    const sums = new Map(sumRows.map((r) => [r.account_id, Number(r.total || 0)]));

    for (const acc of leafAccounts) {
      let val = sums.get(acc.id) || 0;
      if (acc.account_type === "Income") val = Math.abs(val);
      else if (acc.account_type === "Expense") val = -Math.abs(val);
      if (Math.abs(val) > 0.005) {
        typeGroups[acc.account_type].push({
          account_id: acc.id,
          name: acc.name,
          value: val
        });
      }
    }

    for (const key of Object.keys(typeGroups)) {
      typeGroups[key] = typeGroups[key].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    }
  }

  const maxEntryRow = await AppDataSource.query("SELECT MAX(entry_date) as max_date FROM journal_entries");
  const minEntryRow = await AppDataSource.query("SELECT MIN(entry_date) as min_date FROM journal_entries");
  const maxEntryDate = maxEntryRow?.[0]?.max_date || null;
  const minEntryDate = minEntryRow?.[0]?.min_date || null;

  const totalAmountRow = await AppDataSource.query(
    `SELECT COALESCE(SUM(tl.amount),0) as total
     FROM transaction_lines tl
     WHERE UPPER(tl.line_type) = 'DEBIT'
     AND tl.journal_entry_id IN (SELECT DISTINCT je.id ${baseSql})`,
    params
  );
  const totalAmount = Number(totalAmountRow?.[0]?.total || 0);

  let accountNetTotalAll = null;
  let accountNetTotalPage = null;
  if (accountFilterIds) {
    const accountParams = [...accountFilterIds, ...params];
    const netTotalRow = await AppDataSource.query(
      `SELECT COALESCE(SUM(CASE WHEN UPPER(tl.line_type) = 'DEBIT' THEN tl.amount ELSE -tl.amount END),0) as total
       FROM transaction_lines tl
       WHERE tl.account_id IN (${accountFilterIds.map(() => "?").join(",")})
       AND tl.journal_entry_id IN (SELECT DISTINCT je.id ${baseSql})`,
      accountParams
    );
    accountNetTotalAll = Number(netTotalRow?.[0]?.total || 0);

    if (entryIds.length) {
      const pageParams = [...accountFilterIds, ...entryIds];
      const pageRow = await AppDataSource.query(
        `SELECT COALESCE(SUM(CASE WHEN UPPER(tl.line_type) = 'DEBIT' THEN tl.amount ELSE -tl.amount END),0) as total
         FROM transaction_lines tl
         WHERE tl.account_id IN (${accountFilterIds.map(() => "?").join(",")})
         AND tl.journal_entry_id IN (${entryIds.map(() => "?").join(",")})`,
        pageParams
      );
      accountNetTotalPage = Number(pageRow?.[0]?.total || 0);
    } else {
      accountNetTotalPage = 0;
    }
  }

  const accountsForSelect = accounts
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((a) => accountToDict(a, getAccountPath(a.id, parent, byId)));

  return {
    page: "transactions_list",
    entries: summarizedEntries,
    period_sums: typeGroups,
    pagination: {
      page,
      per_page: pageSize,
      pages: Math.ceil(total / pageSize),
      total,
      has_next: page * pageSize < total,
      has_prev: page > 1
    },
    total_amount: totalAmount,
    account_net_total_all: accountNetTotalAll,
    account_net_total_page: accountNetTotalPage,
    period,
    account_id: accountId,
    accounts_for_select: accountsForSelect,
    start_date: startDate ? formatDate(startDate) : null,
    end_date: endDate ? formatDate(endDate) : null,
    max_entry_date: maxEntryDate,
    min_entry_date: minEntryDate
  };
});

app.get("/transactions/accounts", async () => {
  const accounts = await fetchAccounts();
  const { byId, parent } = buildAccountMaps(accounts);
  const sorted = accounts.slice().sort((a, b) => a.name.localeCompare(b.name));
  return { accounts: sorted.map((a) => accountToDict(a, getAccountPath(a.id, parent, byId))) };
});

app.get("/transactions/new", async () => {
  const accounts = (await fetchAccounts()).filter((a) => a.is_active !== 0);
  const { byId, parent } = buildAccountMaps(accounts);
  return {
    page: "transactions_new",
    accounts: accounts
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => accountToDict(a, getAccountPath(a.id, parent, byId)))
  };
});

app.get("/transactions/accounts/new", async () => {
  const accounts = await fetchAccounts();
  const { byId, parent } = buildAccountMaps(accounts);
  return {
    page: "accounts_new",
    account_types: ACCOUNT_TYPES,
    parent_accounts: accounts
      .filter((a) => !a.parent_id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => accountToDict(a, getAccountPath(a.id, parent, byId)))
  };
});

app.post("/transactions/accounts/new", async (req, reply) => {
  const form = req.body || {};
  const name = String(form.name || "").trim();
  const accountType = String(form.account_type || "").trim();
  const parentId = form.parent_id ? Number(form.parent_id) : null;
  const openingBalance = Number(form.opening_balance || 0);
  if (!name) return reply.code(400).send({ error: "Account name is required" });
  if (!ACCOUNT_TYPES.includes(accountType)) return reply.code(400).send({ error: "Invalid account type" });

  if (parentId) {
    const parentRow = await AppDataSource.query("SELECT account_type FROM accounts WHERE id = ?", [parentId]);
    if (!parentRow.length) return reply.code(400).send({ error: "Selected parent account not found" });
    if (parentRow[0].account_type !== accountType) {
      return reply.code(400).send({ error: "Parent account type must match selected account type" });
    }
  }

  const exists = await AppDataSource.query(
    "SELECT id FROM accounts WHERE LOWER(name) = LOWER(?) AND account_type = ? AND parent_id IS ?",
    [name, accountType, parentId]
  );
  if (exists.length) {
    return reply.code(400).send({ error: "An account with this name already exists under the same parent" });
  }

  const code = `__auto__${Math.random().toString(16).slice(2, 10)}`;
  await AppDataSource.query(
    "INSERT INTO accounts (code, name, account_type, description, parent_id, opening_balance, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'))",
    [code, name, accountType, form.description || "", parentId, openingBalance]
  );
  const idRow = await AppDataSource.query("SELECT last_insert_rowid() as id");
  return { account_id: idRow[0].id };
});

app.post("/transactions/new", async (req, reply) => {
  const form = req.body || {};
  const entryDate = parseDate(form.entry_date);
  const description = String(form.description || "").trim();
  const debitAccountId = Number(form.debit_account_id || 0);
  const creditAccountId = Number(form.credit_account_id || 0);
  const amount = Math.abs(Number(form.amount || 0));

  if (!entryDate) return reply.code(400).send({ error: "Date is required" });
  if (!description) return reply.code(400).send({ error: "Description is required" });
  if (!debitAccountId || !creditAccountId) {
    return reply.code(400).send({ error: "Debit and Credit accounts are required" });
  }
  if (debitAccountId === creditAccountId) {
    return reply.code(400).send({ error: "Debit and Credit must be different accounts" });
  }
  if (amount <= 0) return reply.code(400).send({ error: "Amount must be greater than zero" });

  const entryDateStr = formatDate(entryDate);
  await AppDataSource.query(
    "INSERT INTO journal_entries (entry_date, description, reference, notes, created_at) VALUES (?, ?, '', '', datetime('now'))",
    [entryDateStr, description]
  );
  const idRow = await AppDataSource.query("SELECT last_insert_rowid() as id");
  const entryId = idRow[0].id;

  const lines = [
    { account_id: debitAccountId, line_type: "DEBIT" },
    { account_id: creditAccountId, line_type: "CREDIT" }
  ];
  for (const line of lines) {
    await AppDataSource.query(
      "INSERT INTO transaction_lines (journal_entry_id, account_id, line_type, amount, date, description, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      [entryId, line.account_id, line.line_type, amount, entryDateStr, description]
    );
    const delta = line.line_type === "DEBIT" ? amount : -amount;
    await upsertDailyBalance(line.account_id, entryDateStr, delta);
  }

  await recomputeMonthlySnapshots(monthStart(entryDate));

  return { success: true, entry_id: entryId };
});

app.get("/transactions/:id", async (req, reply) => {
  const entryId = Number(req.params.id);
  const entry = await fetchEntryWithLines(entryId);
  if (!entry) return reply.code(404).send({ error: "Entry not found" });
  return { page: "transactions_view", entry };
});

app.get("/transactions/:id/edit", async (req, reply) => {
  const entryId = Number(req.params.id);
  const entry = await fetchEntryWithLines(entryId);
  if (!entry) return reply.code(404).send({ error: "Entry not found" });
  const accounts = (await fetchAccounts()).filter((a) => a.is_active !== 0);
  const { byId, parent } = buildAccountMaps(accounts);
  return {
    page: "transactions_edit",
    entry,
    accounts: accounts.map((a) => accountToDict(a, getAccountPath(a.id, parent, byId)))
  };
});

app.post("/transactions/:id/edit", async (req, reply) => {
  const entryId = Number(req.params.id);
  const entryDate = parseDate(req.body?.entry_date);
  const description = String(req.body?.description || "").trim();
  const debitAccountId = Number(req.body?.debit_account_id || 0);
  const creditAccountId = Number(req.body?.credit_account_id || 0);
  const amount = Math.abs(Number(req.body?.amount || 0));

  if (!entryDate) return reply.code(400).send({ error: "Date is required" });
  if (!description) return reply.code(400).send({ error: "Description is required" });
  if (!debitAccountId || !creditAccountId) {
    return reply.code(400).send({ error: "Debit and Credit accounts are required" });
  }
  if (debitAccountId === creditAccountId) {
    return reply.code(400).send({ error: "Debit and Credit must be different accounts" });
  }
  if (amount <= 0) return reply.code(400).send({ error: "Amount must be greater than zero" });

  await AppDataSource.query(
    "UPDATE journal_entries SET entry_date = ?, description = ? WHERE id = ?",
    [formatDate(entryDate), description, entryId]
  );
  await AppDataSource.query("DELETE FROM transaction_lines WHERE journal_entry_id = ?", [entryId]);

  const lines = [
    { account_id: debitAccountId, line_type: "DEBIT" },
    { account_id: creditAccountId, line_type: "CREDIT" }
  ];
  for (const line of lines) {
    await AppDataSource.query(
      "INSERT INTO transaction_lines (journal_entry_id, account_id, line_type, amount, date, description, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      [entryId, line.account_id, line.line_type, amount, formatDate(entryDate), description]
    );
  }

  await backfillSnapshots();

  return { entry_id: entryId };
});

app.get("/transactions/accounts/:id/edit", async (req, reply) => {
  const accountId = Number(req.params.id);
  const accounts = await fetchAccounts();
  const { byId, parent } = buildAccountMaps(accounts);
  const account = byId.get(accountId);
  if (!account) return reply.code(404).send({ error: "Account not found" });
  return {
    page: "accounts_edit",
    account: accountToDict(account, getAccountPath(account.id, parent, byId)),
    account_types: ACCOUNT_TYPES,
    parent_accounts: accounts
      .filter((a) => !a.parent_id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => accountToDict(a, getAccountPath(a.id, parent, byId)))
  };
});

app.post("/transactions/accounts/:id/edit", async (req, reply) => {
  const accountId = Number(req.params.id);
  const name = String(req.body?.name || "").trim();
  const accountType = String(req.body?.account_type || "").trim();
  const parentId = req.body?.parent_id ? Number(req.body.parent_id) : null;
  const description = String(req.body?.description || "");
  const openingBalance = Number(req.body?.opening_balance || 0);

  if (!name) return reply.code(400).send({ error: "Account name is required" });
  if (!ACCOUNT_TYPES.includes(accountType)) return reply.code(400).send({ error: "Invalid account type" });

  const accounts = await fetchAccounts();
  const { byId, children } = buildAccountMaps(accounts);
  const account = byId.get(accountId);
  if (!account) return reply.code(404).send({ error: "Account not found" });

  if (parentId) {
    if (parentId === accountId) return reply.code(400).send({ error: "Parent cannot be the account itself" });
    const descendants = getDescendants(accountId, children);
    if (descendants.includes(parentId)) return reply.code(400).send({ error: "Parent cannot be a descendant" });
    const parentRow = await AppDataSource.query("SELECT account_type FROM accounts WHERE id = ?", [parentId]);
    if (!parentRow.length) return reply.code(400).send({ error: "Selected parent account not found" });
    if (parentRow[0].account_type !== accountType) {
      return reply.code(400).send({ error: "Parent account type must match selected account type" });
    }
  }

  if (account.account_type !== accountType) {
    const subtree = [accountId, ...getDescendants(accountId, children)];
    const countRow = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM transaction_lines WHERE account_id IN (${subtree.map(() => "?").join(",")})`,
      subtree
    );
    if (Number(countRow[0]?.cnt || 0) > 0) {
      return reply.code(400).send({ error: "Cannot change account type: account or descendants have transactions" });
    }
    await AppDataSource.query(
      `UPDATE accounts SET account_type = ? WHERE id IN (${subtree.map(() => "?").join(",")})`,
      [accountType, ...subtree]
    );
  }

  const exists = await AppDataSource.query(
    "SELECT id FROM accounts WHERE LOWER(name) = LOWER(?) AND account_type = ? AND parent_id IS ? AND id != ?",
    [name, accountType, parentId, accountId]
  );
  if (exists.length) {
    return reply.code(400).send({ error: "An account with this name already exists under the same parent" });
  }

  await AppDataSource.query(
    "UPDATE accounts SET name = ?, account_type = ?, parent_id = ?, description = ?, opening_balance = ? WHERE id = ?",
    [name, accountType, parentId, description, openingBalance, accountId]
  );

  return { account_id: accountId };
});

app.post("/transactions/import", async (req, reply) => {
  const file = await req.file();
  if (!file) return reply.code(400).send({ error: "No file selected" });
  const buffer = await file.toBuffer();
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const results = { success: 0, errors: [], warnings: [] };

  const sheet = workbook.Sheets["Transactions"] || workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { results };
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const dataRows = rows.slice(1);

  for (let i = 0; i < dataRows.length; i += 1) {
    const row = dataRows[i];
    if (!row || row.every((v) => !v)) continue;
    try {
      const entryDate = parseDate(row[0]);
      const debitPath = String(row[1] || "").trim();
      const description = String(row[2] || "").trim();
      const amount = Number(row[3] || 0);
      const creditPath = String(row[4] || "").trim();
      if (!entryDate) throw new Error("Invalid date");
      if (!debitPath || !creditPath) throw new Error("Missing account path");
      if (!amount || amount === 0) throw new Error("Amount must be non-zero");

      const debitType = detectAccountType(debitPath, "Expense");
      const creditType = detectAccountType(creditPath, "Asset");
      const debitId = await getOrCreateAccountPath(debitPath, debitType);
      const creditId = await getOrCreateAccountPath(creditPath, creditType);

      await AppDataSource.query(
        "INSERT INTO journal_entries (entry_date, description, reference, notes, created_at) VALUES (?, ?, '', '', datetime('now'))",
        [formatDate(entryDate), description]
      );
      const idRow = await AppDataSource.query("SELECT last_insert_rowid() as id");
      const entryId = idRow[0].id;

      const debitTypeVal = amount < 0 ? "CREDIT" : "DEBIT";
      const creditTypeVal = amount < 0 ? "DEBIT" : "CREDIT";
      const amt = Math.abs(amount);

      await AppDataSource.query(
        "INSERT INTO transaction_lines (journal_entry_id, account_id, line_type, amount, date, description, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
        [entryId, debitId, debitTypeVal, amt, formatDate(entryDate), description]
      );
      await AppDataSource.query(
        "INSERT INTO transaction_lines (journal_entry_id, account_id, line_type, amount, date, description, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
        [entryId, creditId, creditTypeVal, amt, formatDate(entryDate), description]
      );
      results.success += 1;
    } catch (err) {
      results.errors.push(`Row ${i + 2}: ${err.message}`);
    }
  }

  if (results.success) {
    await backfillSnapshots();
  }

  return { page: "transactions_import", results };
});

app.get("/budget/monthly", async (req) => {
  const month = req.query.month;
  return monthlyBudgetReport(month);
});

app.post("/budget/monthly/settings", async (req, reply) => {
  try {
    const payload = req.body || {};
    const month = payload.month;
    const budgetAmount = payload.budget_amount || 0.0;
    const guchiOpening = payload.guchi_opening_balance || 0.0;
    const gunuOpening = payload.gunu_opening_balance || 0.0;
    return await updateMonthlyBudgetSettings(month, budgetAmount, guchiOpening, gunuOpening);
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

app.post("/budget/monthly/assign-owner", async (req, reply) => {
  try {
    const payload = req.body || {};
    const month = payload.month;
    const journalEntryId = payload.journal_entry_id;
    const owner = payload.owner;
    if (!journalEntryId) return reply.code(400).send({ error: "journal_entry_id is required" });
    return await assignEntryOwner(month, Number(journalEntryId), owner);
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

app.get("/reminders/monthly", async (req, reply) => {
  try {
    const month = req.query.month;
    const monthStartDate = monthStartFromKey(month);
    await ensureMonthOccurrences(monthStartDate);
    const reminders = await AppDataSource.query(
      `SELECT ro.id as occurrence_id, ro.reminder_task_id as task_id, rt.title, rt.notes,
              rt.due_day_of_month, ro.due_date, ro.is_done, rt.is_active
       FROM reminder_occurrence ro
       JOIN reminder_task rt ON rt.id = ro.reminder_task_id
       WHERE ro.month = ? AND ro.is_removed = 0
       ORDER BY ro.due_date ASC, rt.title ASC`,
      [formatDate(monthStartDate)]
    );
    return {
      month: monthKey(monthStartDate),
      reminders: reminders.map((item) => ({
        occurrence_id: item.occurrence_id,
        task_id: item.task_id,
        title: item.title,
        notes: item.notes || "",
        due_day_of_month: Number(item.due_day_of_month),
        due_date: item.due_date,
        is_done: Boolean(item.is_done),
        is_active: Boolean(item.is_active)
      }))
    };
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

app.post("/reminders/tasks", async (req, reply) => {
  try {
    const payload = req.body || {};
    const title = String(payload.title || "").trim();
    const notes = String(payload.notes || "").trim();
    const dueDay = Number(payload.due_day_of_month);
    if (!title) return reply.code(400).send({ error: "Title is required" });
    if (!Number.isFinite(dueDay)) {
      return reply.code(400).send({ error: "Due day of month must be a number" });
    }
    if (dueDay < 1 || dueDay > 31) {
      return reply.code(400).send({ error: "Due day of month must be between 1 and 31" });
    }

    await AppDataSource.query(
      `INSERT INTO reminder_task (title, notes, due_day_of_month, is_active, created_at, updated_at)
       VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))`,
      [title, notes || null, dueDay]
    );
    const idRow = await AppDataSource.query("SELECT last_insert_rowid() as id");
    const taskId = idRow[0].id;

    const currentMonth = monthStartFromKey(null);
    const dueDate = dueDateForMonth(currentMonth, dueDay);
    await AppDataSource.query(
      `INSERT INTO reminder_occurrence
       (reminder_task_id, month, due_date, is_done, done_at, is_removed, removed_at, created_at, updated_at)
       VALUES (?, ?, ?, 0, NULL, 0, NULL, datetime('now'), datetime('now'))`,
      [taskId, formatDate(currentMonth), formatDate(dueDate)]
    );

    return { ok: true, task_id: taskId };
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

app.post("/reminders/occurrences/:id/done", async (req, reply) => {
  try {
    const occurrenceId = Number(req.params.id);
    const payload = req.body || {};
    const isDone = Boolean(payload.is_done);
    const rows = await AppDataSource.query(
      "SELECT id, is_removed FROM reminder_occurrence WHERE id = ?",
      [occurrenceId]
    );
    if (!rows.length) return reply.code(404).send({ error: "Reminder occurrence not found" });
    if (rows[0].is_removed) return reply.code(400).send({ error: "Removed reminder cannot be updated" });

    await AppDataSource.query(
      "UPDATE reminder_occurrence SET is_done = ?, done_at = ? WHERE id = ?",
      [isDone ? 1 : 0, isDone ? new Date().toISOString() : null, occurrenceId]
    );
    return { ok: true };
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

app.delete("/reminders/occurrences/:id", async (req, reply) => {
  try {
    const occurrenceId = Number(req.params.id);
    await AppDataSource.query(
      `UPDATE reminder_occurrence
       SET is_removed = 1, removed_at = ?, is_done = 0, done_at = NULL
       WHERE id = ?`,
      [new Date().toISOString(), occurrenceId]
    );
    return { ok: true };
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

app.delete("/reminders/tasks/:id", async (req, reply) => {
  try {
    const taskId = Number(req.params.id);
    await AppDataSource.query("DELETE FROM reminder_occurrence WHERE reminder_task_id = ?", [taskId]);
    await AppDataSource.query("DELETE FROM reminder_task WHERE id = ?", [taskId]);
    return { ok: true };
  } catch (err) {
    return reply.code(400).send({ error: err.message });
  }
});

app.get("/transactions/export", async (req, reply) => {
  const period = req.query.period || "all";
  const [startDate, endDate] = getPeriodDates(period);

  let sql = "SELECT id, entry_date, description FROM journal_entries";
  const params = [];
  if (startDate) {
    sql += " WHERE entry_date >= ?";
    params.push(formatDate(startDate));
  }
  if (endDate) {
    sql += startDate ? " AND" : " WHERE";
    sql += " entry_date <= ?";
    params.push(formatDate(endDate));
  }
  sql += " ORDER BY entry_date ASC";
  const entries = await AppDataSource.query(sql, params);

  const entryIds = entries.map((e) => e.id);
  const lines = entryIds.length
    ? await AppDataSource.query(
        `SELECT tl.journal_entry_id, tl.line_type, tl.amount, a.name as account_name
         FROM transaction_lines tl
         JOIN accounts a ON a.id = tl.account_id
         WHERE tl.journal_entry_id IN (${entryIds.map(() => "?").join(",")})`,
        entryIds
      )
    : [];

  const linesByEntry = new Map();
  for (const line of lines) {
    if (!linesByEntry.has(line.journal_entry_id)) linesByEntry.set(line.journal_entry_id, []);
    linesByEntry.get(line.journal_entry_id).push(line);
  }

  const accounts = await fetchAccounts();
  const { byId, parent } = buildAccountMaps(accounts);

  const wb = xlsx.utils.book_new();
  const txRows = [["Date", "Debit Account", "Description", "Amount", "Credit Account"]];
  const complexRows = [["JE ID", "Date", "Description", "Account Path", "Type", "Amount"]];

  for (const entry of entries) {
    const entryLines = linesByEntry.get(entry.id) || [];
    const debit = entryLines.find((l) => String(l.line_type).toUpperCase() === "DEBIT");
    const credit = entryLines.find((l) => String(l.line_type).toUpperCase() === "CREDIT");
    if (debit && credit && entryLines.filter((l) => String(l.line_type).toUpperCase() === "DEBIT").length === 1
        && entryLines.filter((l) => String(l.line_type).toUpperCase() === "CREDIT").length === 1) {
      txRows.push([
        formatDate(parseDate(entry.entry_date)),
        debit.account_name,
        entry.description || "",
        debit.amount,
        credit.account_name
      ]);
    } else if (entryLines.length) {
      for (const line of entryLines) {
        const path = byId.get(line.account_id)
          ? getAccountPath(line.account_id, parent, byId)
          : line.account_name;
        complexRows.push([
          entry.id,
          formatDate(parseDate(entry.entry_date)),
          entry.description || "",
          path,
          line.line_type,
          line.amount
        ]);
      }
    }
  }

  const txSheet = xlsx.utils.aoa_to_sheet(txRows);
  xlsx.utils.book_append_sheet(wb, txSheet, "Transactions");
  const complexSheet = xlsx.utils.aoa_to_sheet(complexRows);
  xlsx.utils.book_append_sheet(wb, complexSheet, "Complex Entries");

  const accountRows = [["Account Path", "Opening Balance", "Account Type", "Code", "Description"]];
  for (const acc of accounts.sort((a, b) => a.account_type.localeCompare(b.account_type) || a.name.localeCompare(b.name))) {
    accountRows.push([
      getAccountPath(acc.id, parent, byId),
      Number(acc.opening_balance || 0),
      acc.account_type,
      acc.code || "",
      acc.description || ""
    ]);
  }
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(accountRows), "Accounts");

  const budgetRows = [["Month", "Budget Amount", "Guchi Opening Balance", "Gunu Opening Balance"]];
  const budgets = await AppDataSource.query(
    "SELECT month, budget_amount, guchi_opening_balance, gunu_opening_balance FROM monthly_budget ORDER BY month ASC"
  );
  for (const row of budgets) {
    budgetRows.push([
      row.month ? monthKey(monthStart(parseDate(row.month))) : "",
      Number(row.budget_amount || 0),
      Number(row.guchi_opening_balance || 0),
      Number(row.gunu_opening_balance || 0)
    ]);
  }
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(budgetRows), "Monthly Budget");

  const assignmentRows = [["Month", "JE ID", "Entry Date", "Description", "Owner"]];
  const assignments = await AppDataSource.query(
    `SELECT b.month, b.journal_entry_id, je.entry_date, je.description, b.owner
     FROM budget_entry_assignment b
     JOIN journal_entries je ON je.id = b.journal_entry_id
     ORDER BY b.month ASC, b.journal_entry_id ASC`
  );
  for (const row of assignments) {
    assignmentRows.push([
      row.month ? monthKey(monthStart(parseDate(row.month))) : "",
      row.journal_entry_id,
      row.entry_date ? formatDate(parseDate(row.entry_date)) : "",
      row.description || "",
      row.owner || "None"
    ]);
  }
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(assignmentRows), "Budget Assignments");

  const taskRows = [["Task ID", "Title", "Notes", "Due Day Of Month", "Is Active"]];
  const tasks = await AppDataSource.query(
    "SELECT id, title, notes, due_day_of_month, is_active FROM reminder_task ORDER BY id ASC"
  );
  for (const row of tasks) {
    taskRows.push([
      row.id,
      row.title || "",
      row.notes || "",
      row.due_day_of_month,
      row.is_active ? 1 : 0
    ]);
  }
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(taskRows), "Reminders Tasks");

  const occurrenceRows = [[
    "Occurrence ID",
    "Task ID",
    "Month",
    "Due Date",
    "Is Done",
    "Done At",
    "Is Removed",
    "Removed At"
  ]];
  const occurrences = await AppDataSource.query(
    "SELECT id, reminder_task_id, month, due_date, is_done, done_at, is_removed, removed_at FROM reminder_occurrence ORDER BY month ASC, reminder_task_id ASC"
  );
  for (const row of occurrences) {
    occurrenceRows.push([
      row.id,
      row.reminder_task_id,
      row.month ? monthKey(monthStart(parseDate(row.month))) : "",
      row.due_date ? formatDate(parseDate(row.due_date)) : "",
      row.is_done ? 1 : 0,
      row.done_at || "",
      row.is_removed ? 1 : 0,
      row.removed_at || ""
    ]);
  }
  xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet(occurrenceRows), "Reminder Occurrences");

  const buffer = xlsx.write(wb, { bookType: "xlsx", type: "buffer" });
  reply.header(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  reply.header("Content-Disposition", "attachment; filename=transactions_export.xlsx");
  return reply.send(buffer);
});

const start = async () => {
  await AppDataSource.initialize();
  const port = Number(process.env.API_PORT || 8001);
  const host = process.env.API_HOST || "0.0.0.0";
  await app.listen({ port, host });
  app.log.info(`API running on http://${host}:${port}`);
};

start().catch((err) => {
  app.log.error(err);
  process.exit(1);
});
