import { c as create_ssr_component, b as subscribe, e as each, d as add_attribute, f as add_classes, g as escape, v as validate_component } from "../../chunks/ssr.js";
import { p as page } from "../../chunks/stores.js";
const Sidebar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/accounts", label: "Accounts" },
    { href: "/ledger", label: "Ledger" },
    { href: "/networth", label: "Net Worth" },
    {
      href: "/investments",
      label: "Investments"
    },
    {
      href: "/wealth-report",
      label: "Wealth Report"
    },
    {
      href: "/income-statement",
      label: "Income Statement"
    },
    {
      href: "/trial-balance",
      label: "Trial Balance"
    },
    {
      href: "/journal-entries",
      label: "Journal Entries"
    },
    {
      href: "/transactions",
      label: "Transactions"
    }
  ];
  $$unsubscribe_page();
  return `<aside class="sidebar"><div class="brand" data-svelte-h="svelte-1pfzcxj">PerFinPy</div> <nav class="nav">${each(links, (link) => {
    return `<a${add_attribute("href", link.href, 0)}${add_classes(($page.url.pathname === link.href ? "active" : "").trim())}>${escape(link.label)} </a>`;
  })}</nav></aside>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="shell">${validate_component(Sidebar, "Sidebar").$$render($$result, {}, {}, {})} <div class="main"><main class="content">${slots.default ? slots.default({}) : ``}</main></div></div>`;
});
export {
  Layout as default
};
