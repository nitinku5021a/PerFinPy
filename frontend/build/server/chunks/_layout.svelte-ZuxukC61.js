import { c as create_ssr_component, v as validate_component, b as subscribe, e as each, d as escape, f as add_attribute, g as add_classes } from './ssr-CnIX4tEz.js';
import { p as page } from './stores-CNXKyW6F.js';
import './exports-CTha0ECg.js';

const Sidebar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/accounts", label: "Accounts" },
    { href: "/ledger", label: "Ledger" },
    { href: "/networth", label: "Net Worth" },
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
const Header = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let title;
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
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
  title = titles[$page.url.pathname] || "PerFinPy";
  $$unsubscribe_page();
  return `<header class="header"><div class="header-title">${escape(title)}</div> <div class="header-meta" data-svelte-h="svelte-1vv4n1n">INR</div></header>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="shell">${validate_component(Sidebar, "Sidebar").$$render($$result, {}, {}, {})} <div class="main">${validate_component(Header, "Header").$$render($$result, {}, {}, {})} <main class="content">${slots.default ? slots.default({}) : ``}</main></div></div>`;
});

export { Layout as default };
//# sourceMappingURL=_layout.svelte-ZuxukC61.js.map
