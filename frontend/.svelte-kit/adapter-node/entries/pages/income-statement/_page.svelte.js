import { c as create_ssr_component, b as add_attribute, v as validate_component } from "../../../chunks/ssr.js";
import { N as NetworthMatrixTable } from "../../../chunks/NetworthMatrixTable.js";
import { f as formatInr } from "../../../chunks/format.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let filteredGroups;
  let data = [];
  let months = [];
  let showZero = false;
  filteredGroups = data.map((g) => {
    const parents = (g.parents || []).map((p) => {
      const accounts = (p.accounts || []).filter((a) => {
        return months.some((mm) => {
          const val = a.monthly_balances?.[mm.key] ?? 0;
          return Math.abs(Number(val) || 0) > 5e-3;
        });
      });
      const keepParent = months.some((mm) => {
        const val = p.monthly_balances?.[mm.key] ?? 0;
        return Math.abs(Number(val) || 0) > 5e-3;
      }) || accounts.length > 0;
      return keepParent ? { ...p, accounts } : null;
    }).filter(Boolean);
    return { ...g, parents };
  }).filter((g) => g.parents && g.parents.length > 0);
  return `<h1 class="page-title" data-svelte-h="svelte-ha586n">Income Statement</h1> <p class="page-subtitle" data-svelte-h="svelte-1t25gdt">Monthly income and expenses for the last 12 months.</p> ${``} <div class="toolbar"><label><input type="checkbox"${add_attribute("checked", showZero, 1)}>
     Show Zero Balances</label> <button class="button" ${"disabled"}>Prev 12</button> <button class="button" ${"disabled"}>Next 12</button></div> ${validate_component(NetworthMatrixTable, "NetworthMatrixTable").$$render(
    $$result,
    {
      groups: filteredGroups,
      months,
      formatValue: formatInr,
      drillMode: "month",
      networthLabel: "NET SAVINGS",
      networthByMonth: (() => {
        const income = data?.find((g) => g.group === "Income");
        const expense = data?.find((g) => g.group === "Expense");
        if (!income || !expense) return null;
        return Object.fromEntries(months.map((m) => [
          m.key,
          (income.monthly_balances?.[m.key] || 0) - (expense.monthly_balances?.[m.key] || 0)
        ]));
      })()
    },
    {},
    {}
  )}`;
});
export {
  Page as default
};
