import { c as create_ssr_component, f as add_attribute, d as escape, e as each, v as validate_component } from './ssr-CnIX4tEz.js';
import { T as Table } from './Table--H_an95z.js';
import { f as formatInr } from './format-BOhbCv64.js';

function toLocalDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let sums;
  let totals;
  let months = [];
  let activeMonth = "";
  let exportAll = false;
  let entryDate = toLocalDate(/* @__PURE__ */ new Date());
  let debitQuery = "";
  let creditQuery = "";
  let amount = "";
  let description = "";
  let debitInput;
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
  sums = {
    Asset: [],
    Liability: [],
    Income: [],
    Expense: []
  };
  totals = {
    Asset: Math.round(sums.Asset?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Liability: Math.round(sums.Liability?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Income: Math.round(sums.Income?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0),
    Expense: Math.round(sums.Expense?.reduce((acc, item) => acc + (Number(item.value) || 0), 0) || 0)
  };
  [].filter((a) => a.is_leaf);
  return `<h1 class="page-title" data-svelte-h="svelte-11exuoa">Transactions</h1> <p class="page-subtitle" data-svelte-h="svelte-qoq1lg">Journal entries and filters.</p> ${``} <div class="panel"><div class="toolbar"><label>Import Excel: 
      <input type="file" accept=".xlsx,.xls"></label> <button class="button" data-svelte-h="svelte-1d3uwqb">Export Excel</button> <label class="meta"><input type="checkbox"${add_attribute("checked", exportAll, 1)}>
       Export all</label> ${``} ${``}</div></div> <div class="panel"><div class="toolbar entry-form"><label>Date: 
      <input type="date"${add_attribute("value", entryDate, 0)}></label> <div class="autocomplete"><label data-svelte-h="svelte-93b3m6">Debit: </label> <input type="text" placeholder="Type to search"${add_attribute("this", debitInput, 0)}${add_attribute("value", debitQuery, 0)}> ${``}</div> <label>Amount: 
      <input type="number" step="0.01"${add_attribute("value", amount, 0)}></label> <label>Desc: 
      <input type="text"${add_attribute("value", description, 0)}></label> <div class="autocomplete"><label data-svelte-h="svelte-370heb">Credit: </label> <input type="text" placeholder="Type to search"${add_attribute("value", creditQuery, 0)}> ${``}</div> <button class="button" data-svelte-h="svelte-1qco16o">Add</button> ${``} ${``}</div></div> <div class="toolbar"><button class="button" data-svelte-h="svelte-xecaum">Prev 12</button> <button class="button" data-svelte-h="svelte-1xnoe69">Next 12</button> <label>Period: 
    <select><option value="current_month" data-svelte-h="svelte-ifagp3">Current Month</option><option value="ytd" data-svelte-h="svelte-ne2kh5">Year to Date</option><option value="all" data-svelte-h="svelte-421o1o">All</option><option value="custom" data-svelte-h="svelte-tc3t8p">Custom Range</option></select></label> ${``} <label>Account: 
    <select><option value="all" data-svelte-h="svelte-aq5lji">All Accounts</option>${``}</select></label> <span class="meta">Total: ${escape(0)} entries</span></div> <div class="tabs">${each(months, (m) => {
    return `<button${add_attribute("class", `tab ${activeMonth === m.key ? "active" : ""}`, 0)}>${escape(m.label)} </button>`;
  })}</div> <div class="split"><div>${validate_component(Table, "Table").$$render($$result, { columns, rows: [] }, {}, {})} <div class="toolbar"><button class="button" ${"disabled"}>Prev Page</button> <span class="meta">Page ${escape(1)} / ${escape(1)}</span> <button class="button" ${"disabled"}>Next Page</button></div></div> <div><div class="table-wrap"><table class="table"><thead><tr><th>Asset <span class="meta">(${escape(formatInr(totals.Asset))})</span></th> <th>Liability <span class="meta">(${escape(formatInr(totals.Liability))})</span></th> <th>Income <span class="meta">(${escape(formatInr(totals.Income))})</span></th> <th>Expense <span class="meta">(${escape(formatInr(totals.Expense))})</span></th></tr></thead> <tbody><tr><td>${each([], (item) => {
    return `<div class="list-row"><span>${escape(item.name)}</span> <span class="num">${escape(formatInr(item.value))}</span> </div>`;
  })}</td> <td>${each([], (item) => {
    return `<div class="list-row"><span>${escape(item.name)}</span> <span class="num">${escape(formatInr(item.value))}</span> </div>`;
  })}</td> <td>${each([], (item) => {
    return `<div class="list-row"><span>${escape(item.name)}</span> <span class="num">${escape(formatInr(item.value))}</span> </div>`;
  })}</td> <td>${each([], (item) => {
    return `<div class="list-row"><span>${escape(item.name)}</span> <span class="num">${escape(formatInr(item.value))}</span> </div>`;
  })}</td></tr></tbody></table></div></div></div>`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-5FXa6Ule.js.map
