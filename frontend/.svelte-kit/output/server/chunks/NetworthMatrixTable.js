import { c as create_ssr_component, e as each, g as escape, d as add_attribute } from "./ssr.js";
function monthEnd(key) {
  const [y, m] = key.split("-");
  const endDay = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
  const mm = String(Number(m)).padStart(2, "0");
  const dd = String(endDay).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}
const NetworthMatrixTable = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { groups = [] } = $$props;
  let { months = [] } = $$props;
  let { formatValue = (val) => val ?? "" } = $$props;
  let { networthByMonth = null } = $$props;
  let { networthLabel = "NETWORTH" } = $$props;
  let { drillMode = null } = $$props;
  function valueHref(accountId, monthKey) {
    if (!accountId || !drillMode) return null;
    if (drillMode === "month") {
      return `/journal-entries?account_id=${accountId}&mode=month&month=${monthKey}`;
    }
    if (drillMode === "upto") {
      return `/journal-entries?account_id=${accountId}&mode=upto&end=${monthEnd(monthKey)}`;
    }
    return null;
  }
  if ($$props.groups === void 0 && $$bindings.groups && groups !== void 0) $$bindings.groups(groups);
  if ($$props.months === void 0 && $$bindings.months && months !== void 0) $$bindings.months(months);
  if ($$props.formatValue === void 0 && $$bindings.formatValue && formatValue !== void 0) $$bindings.formatValue(formatValue);
  if ($$props.networthByMonth === void 0 && $$bindings.networthByMonth && networthByMonth !== void 0) $$bindings.networthByMonth(networthByMonth);
  if ($$props.networthLabel === void 0 && $$bindings.networthLabel && networthLabel !== void 0) $$bindings.networthLabel(networthLabel);
  if ($$props.drillMode === void 0 && $$bindings.drillMode && drillMode !== void 0) $$bindings.drillMode(drillMode);
  return `<div class="matrix-wrap"><table class="matrix-table"><thead><tr><th class="sticky-col sticky-col-1" data-svelte-h="svelte-5o8ssu">Account</th> ${each(months, (m) => {
    return `<th class="num">${escape(m.label)}</th>`;
  })}</tr></thead> <tbody>${networthByMonth ? `<tr class="networth-row"><td class="sticky-col sticky-col-1 networth-label">${escape(networthLabel)}</td> ${each(months, (m) => {
    return `<td class="num networth-value">${escape(formatValue(networthByMonth[m.key]))}</td>`;
  })}</tr>` : ``} ${each(groups, (group, gi) => {
    return `<tr class="group-row"><td class="sticky-col sticky-col-1 group-indent">${escape(group.group)}</td> ${each(months, (m) => {
      return `<td class="num">${escape(formatValue(group.monthly_balances?.[m.key]))}</td>`;
    })}</tr> ${each(group.parents, (parent) => {
      return `<tr${add_attribute("class", `parent-row ${gi % 2 === 0 ? "group-alt-a" : "group-alt-b"}`, 0)}><td class="sticky-col sticky-col-1 parent-indent">${parent.account_id ? `<a class="drill-link"${add_attribute("href", `/journal-entries?account_id=${parent.account_id}`, 0)}>${escape(parent.name)}</a>` : `${escape(parent.name)}`}</td> ${each(months, (m) => {
        return `<td class="num">${valueHref(parent.account_id, m.key) ? `<a class="drill-link"${add_attribute("href", valueHref(parent.account_id, m.key), 0)}>${escape(formatValue(parent.monthly_balances?.[m.key]))} </a>` : `${escape(formatValue(parent.monthly_balances?.[m.key]))}`} </td>`;
      })}</tr> ${each(parent.accounts, (acc) => {
        return `<tr${add_attribute("class", gi % 2 === 0 ? "group-alt-a" : "group-alt-b", 0)}><td class="sticky-col sticky-col-1 account-indent">${acc.account_id ? `<a class="drill-link"${add_attribute("href", `/journal-entries?account_id=${acc.account_id}`, 0)}>${escape(acc.name)}</a>` : `${escape(acc.name)}`}</td> ${each(months, (m) => {
          return `<td class="num">${valueHref(acc.account_id, m.key) ? `<a class="drill-link"${add_attribute("href", valueHref(acc.account_id, m.key), 0)}>${escape(formatValue(acc.monthly_balances?.[m.key]))} </a>` : `${escape(formatValue(acc.monthly_balances?.[m.key]))}`} </td>`;
        })} </tr>`;
      })}`;
    })}`;
  })}</tbody></table></div>`;
});
export {
  NetworthMatrixTable as N
};
