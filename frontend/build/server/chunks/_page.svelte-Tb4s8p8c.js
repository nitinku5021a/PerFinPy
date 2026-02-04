import { c as create_ssr_component, f as add_attribute, v as validate_component } from './ssr-CnIX4tEz.js';
import { N as NetworthMatrixTable } from './NetworthMatrixTable-CYn4hnJR.js';
import { f as formatInr } from './format-BOhbCv64.js';

function isDisplayedNonZero(val) {
  const num = Number(val) || 0;
  return Math.round(num) !== 0;
}
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let latestKey;
  let filteredGroups;
  let data = [];
  let months = [];
  let showZero = false;
  latestKey = months.length ? months[0].key : null;
  filteredGroups = !latestKey ? data : data.map((g) => {
    const parents = (g.parents || []).map((p) => {
      const accounts = (p.accounts || []).filter((a) => {
        return months.some((mm) => {
          const val = a.monthly_balances?.[mm.key] ?? 0;
          return isDisplayedNonZero(val);
        });
      });
      const keepParent = months.some((m) => {
        const val = p.monthly_balances?.[m.key] ?? 0;
        return isDisplayedNonZero(val);
      }) || accounts.length > 0;
      return keepParent ? { ...p, accounts } : null;
    }).filter(Boolean);
    return { ...g, parents };
  }).filter((g) => g.parents && g.parents.length > 0);
  return `<h1 class="page-title" data-svelte-h="svelte-vgf76k">Net Worth</h1> <p class="page-subtitle" data-svelte-h="svelte-1m62oqs">Last 12 months across asset and liability groups.</p> ${``} <div class="toolbar"><label><input type="checkbox"${add_attribute("checked", showZero, 1)}>
     Show zero balances (latest month)</label> <button class="button" ${"disabled"}>Prev 12</button> <button class="button" ${"disabled"}>Next 12</button></div> ${validate_component(NetworthMatrixTable, "NetworthMatrixTable").$$render(
    $$result,
    {
      groups: filteredGroups,
      months,
      formatValue: formatInr,
      drillMode: "upto",
      networthLabel: "NETWORTH",
      networthByMonth: (() => {
        const assets = data?.find((g) => g.group === "Assets");
        const liabilities = data?.find((g) => g.group === "Liabilities");
        if (!assets || !liabilities) return null;
        return Object.fromEntries(months.map((m) => [
          m.key,
          (assets.monthly_balances?.[m.key] || 0) + (liabilities.monthly_balances?.[m.key] || 0)
        ]));
      })()
    },
    {},
    {}
  )}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-Tb4s8p8c.js.map
