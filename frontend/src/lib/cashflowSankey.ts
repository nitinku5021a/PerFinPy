export type SankeyNode = {
  name: string;
  type: "income" | "expense" | "savings" | "deficit" | "other_income" | "other_expense";
  order?: number;
  value?: number;
};

export type SankeyLink = {
  source: number;
  target: number;
  value: number;
};

function groupTop(items, limit, otherLabel, otherType) {
  if (items.length <= limit) return items;
  const sorted = items.slice().sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const restTotal = rest.reduce((sum, item) => sum + item.value, 0);
  if (restTotal > 0) {
    top.push({ id: "other", name: otherLabel, value: restTotal, type: otherType });
  }
  return top;
}

export function getCashFlowSankeyData(month, accounts, entries) {
  const accountById = new Map();
  for (const acc of accounts || []) {
    accountById.set(acc.id, {
      id: acc.id,
      name: acc.path || acc.name,
      type: acc.account_type
    });
  }

  const incomeTotals = new Map();
  const expenseTotals = new Map();

  for (const entry of entries || []) {
    for (const line of entry.lines || []) {
      const acc = accountById.get(line.account_id);
      if (!acc) continue;
      const amount = Math.abs(Number(line.amount || 0));
      if (acc.type === "Income") {
        incomeTotals.set(acc.id, (incomeTotals.get(acc.id) || 0) + amount);
      } else if (acc.type === "Expense") {
        expenseTotals.set(acc.id, (expenseTotals.get(acc.id) || 0) + amount);
      }
    }
  }

  const incomeAccountsRaw = Array.from(incomeTotals.entries())
    .filter(([, value]) => value > 0)
    .map(([id, value]) => {
      const acc = accountById.get(id);
      return { id, name: acc ? acc.name : `Income ${id}`, value, type: "income" };
    });

  const expenseAccountsRaw = Array.from(expenseTotals.entries())
    .filter(([, value]) => value > 0)
    .map(([id, value]) => {
      const acc = accountById.get(id);
      return { id, name: acc ? acc.name : `Expense ${id}`, value, type: "expense" };
    });

  const incomeAccounts = groupTop(incomeAccountsRaw, 3, "Other Income", "other_income");
  const expenseAccounts = groupTop(expenseAccountsRaw, 5, "Other Expenses", "other_expense");

  const totalIncome = incomeAccounts.reduce((sum, item) => sum + item.value, 0);
  const totalExpense = expenseAccounts.reduce((sum, item) => sum + item.value, 0);
  const savings = totalIncome - totalExpense;

  const nodes = [];
  const nodeIndex = new Map();

  function pushNode(name, type, order, value) {
    const idx = nodes.length;
    nodes.push({ name, type, order, value });
    nodeIndex.set(name, idx);
    return idx;
  }

  const incomeNodeIds = new Map();
  const incomeSorted = incomeAccounts.slice().sort((a, b) => b.value - a.value);
  for (let i = 0; i < incomeSorted.length; i += 1) {
    const item = incomeSorted[i];
    const order = i;
    incomeNodeIds.set(item.id, pushNode(item.name, item.type, order, item.value));
  }

  const expenseNodeIds = new Map();
  const expenseSorted = expenseAccounts.slice().sort((a, b) => b.value - a.value);
  for (let i = 0; i < expenseSorted.length; i += 1) {
    const item = expenseSorted[i];
    const order = i;
    expenseNodeIds.set(item.id, pushNode(item.name, item.type, order, item.value));
  }

  let savingsNode = null;
  let deficitNode = null;
  if (savings >= 0) {
    savingsNode = pushNode("Savings", "savings", expenseSorted.length + 2, Math.abs(savings));
  } else {
    deficitNode = pushNode("Deficit", "deficit", expenseSorted.length + 2, Math.abs(savings));
  }

  const links = [];

  if (totalIncome > 0 && totalExpense > 0) {
    for (const exp of expenseAccounts) {
      for (const inc of incomeAccounts) {
        const value = (exp.value * inc.value) / totalIncome;
        if (value <= 0) continue;
        links.push({
          source: incomeNodeIds.get(inc.id),
          target: expenseNodeIds.get(exp.id),
          value
        });
      }
    }
  }

  if (totalIncome > 0 && savings > 0 && savingsNode !== null) {
    for (const inc of incomeAccounts) {
      const value = (savings * inc.value) / totalIncome;
      if (value <= 0) continue;
      links.push({
        source: incomeNodeIds.get(inc.id),
        target: savingsNode,
        value
      });
    }
  }

  if (totalExpense > 0 && savings < 0 && deficitNode !== null) {
    const deficitValue = Math.abs(savings);
    for (const exp of expenseAccounts) {
      const value = (deficitValue * exp.value) / totalExpense;
      if (value <= 0) continue;
      links.push({
        source: expenseNodeIds.get(exp.id),
        target: deficitNode,
        value
      });
    }
  }

  return { month, nodes, links };
}
