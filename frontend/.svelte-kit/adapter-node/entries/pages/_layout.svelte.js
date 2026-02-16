import { c as create_ssr_component, a as subscribe, e as each, b as add_attribute, d as add_classes, f as escape, v as validate_component } from "../../chunks/ssr.js";
import { p as page } from "../../chunks/stores.js";
const Sidebar = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  const primaryLinks = [
    { href: "/dashboard", label: "Dashboard" },
    {
      href: "/networth",
      label: "Balance Sheet"
    },
    {
      href: "/income-statement",
      label: "Income Statement"
    },
    {
      href: "/transactions",
      label: "Monthly Transactions"
    },
    { href: "/reminders", label: "Reminders" },
    { href: "/report", label: "Reports" }
  ];
  const otherLinks = [
    { href: "/accounts", label: "Accounts" },
    { href: "/ledger", label: "Ledger" },
    {
      href: "/investments",
      label: "Investments"
    },
    {
      href: "/monthly-budget",
      label: "Monthly Budget"
    },
    {
      href: "/wealth-report",
      label: "Wealth Report"
    },
    {
      href: "/trial-balance",
      label: "Trial Balance"
    },
    {
      href: "/journal-entries",
      label: "Journal Entries"
    }
  ];
  $$unsubscribe_page();
  return `<aside class="sidebar"><div class="brand" data-svelte-h="svelte-1pfzcxj">PerFinPy</div> <nav class="nav">${each(primaryLinks, (link) => {
    return `<a${add_attribute("href", link.href, 0)}${add_classes(($page.url.pathname === link.href ? "active" : "").trim())}>${escape(link.label)} </a>`;
  })} <div class="nav-section" data-svelte-h="svelte-1uxwnkt">Others</div> ${each(otherLinks, (link) => {
    return `<a${add_attribute("href", link.href, 0)}${add_classes(($page.url.pathname === link.href ? "active" : "").trim())}>${escape(link.label)} </a>`;
  })}</nav></aside>`;
});
const Layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<div class="${["shell", ""].join(" ").trim()}"><header class="mobile-header"><button class="menu-btn" data-svelte-h="svelte-11gexqf">☰</button> <div class="brand" data-svelte-h="svelte-1pfzcxj">PerFinPy</div> <div style="width: 24px;"></div> </header> <div class="sidebar-overlay"></div> ${validate_component(Sidebar, "Sidebar").$$render($$result, {}, {}, {})} <div class="main"><main class="content">${slots.default ? slots.default({}) : ``}</main></div></div>`;
});
export {
  Layout as default
};
