import { c as create_ssr_component, b as subscribe, g as escape, v as validate_component } from "../../../chunks/ssr.js";
import { T as Table } from "../../../chunks/Table.js";
import { p as page } from "../../../chunks/stores.js";
import { f as formatInr } from "../../../chunks/format.js";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => value);
  const columns = [
    {
      header: "Date",
      render: (row) => row.entry_date
    },
    {
      header: "Debit Account",
      render: (row) => row.debit_account
    },
    {
      header: "Amount",
      render: (row) => formatInr(row.amount),
      align: "right"
    },
    {
      header: "Description",
      render: (row) => row.description
    },
    {
      header: "Credit Account",
      render: (row) => row.credit_account
    }
  ];
  $$unsubscribe_page();
  return `<h1 class="page-title" data-svelte-h="svelte-vinmls">Journal Entries</h1> <p class="page-subtitle" data-svelte-h="svelte-3hiry4">Account-level drilldown.</p> ${``} <div class="toolbar"><label>Account: 
    <select>${``}</select></label> <span class="meta">Total: ${escape(0)} entries</span></div> ${validate_component(Table, "Table").$$render($$result, { columns, rows: [] }, {}, {})} <div class="toolbar"><button class="button" ${"disabled"}>Prev Page</button> <span class="meta">Page ${escape(1)} / ${escape(1)}</span> <button class="button" ${"disabled"}>Next Page</button></div>`;
});
export {
  Page as default
};
