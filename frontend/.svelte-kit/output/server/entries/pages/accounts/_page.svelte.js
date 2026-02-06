import { c as create_ssr_component, g as escape, v as validate_component } from "../../../chunks/ssr.js";
import { T as Table } from "../../../chunks/Table.js";
import { f as formatInr } from "../../../chunks/format.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let filtered;
  let accounts = [];
  const columns = [
    {
      header: "Account",
      render: (row) => `<a href="/journal-entries?account_id=${row.id}&period=ytd">${row.path}</a>`
    },
    {
      header: "Type",
      render: (row) => row.account_type
    },
    {
      header: "Opening Balance",
      render: (row) => formatInr(row.opening_balance),
      align: "right"
    },
    {
      header: "Status",
      render: (row) => row.is_active ? "Active" : "Inactive"
    }
  ];
  filtered = accounts;
  return `<h1 class="page-title" data-svelte-h="svelte-ckpwg5">Accounts</h1> <p class="page-subtitle" data-svelte-h="svelte-1pepg66">Chart of accounts and structure.</p> ${``} <div class="panel"><div class="toolbar"><button class="button">${escape("New Account")}</button> ${``} ${``}</div> ${``}</div> <div class="toolbar"><span class="meta">Total: ${escape(filtered.length)}</span> <label>Type: 
    <select><option value="all" data-svelte-h="svelte-421o1o">All</option><option value="Asset" data-svelte-h="svelte-17u4uly">Asset</option><option value="Liability" data-svelte-h="svelte-13wai1o">Liability</option><option value="Equity" data-svelte-h="svelte-1r5iq36">Equity</option><option value="Income" data-svelte-h="svelte-1dc872i">Income</option><option value="Expense" data-svelte-h="svelte-g8868e">Expense</option></select></label></div> ${validate_component(Table, "Table").$$render($$result, { columns, rows: filtered, allowHtml: true }, {}, {})}`;
});
export {
  Page as default
};
