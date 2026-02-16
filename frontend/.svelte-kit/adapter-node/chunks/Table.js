import { c as create_ssr_component, e as each, b as add_attribute, f as escape } from "./ssr.js";
const Table = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { columns = [] } = $$props;
  let { rows = [] } = $$props;
  let { allowHtml = false } = $$props;
  let { rowClass = null } = $$props;
  if ($$props.columns === void 0 && $$bindings.columns && columns !== void 0) $$bindings.columns(columns);
  if ($$props.rows === void 0 && $$bindings.rows && rows !== void 0) $$bindings.rows(rows);
  if ($$props.allowHtml === void 0 && $$bindings.allowHtml && allowHtml !== void 0) $$bindings.allowHtml(allowHtml);
  if ($$props.rowClass === void 0 && $$bindings.rowClass && rowClass !== void 0) $$bindings.rowClass(rowClass);
  return `<div class="table-wrap"><table class="table"><thead><tr>${each(columns, (col) => {
    return `<th${add_attribute("class", col.align === "right" || col.numeric ? "num" : "", 0)}>${escape(col.header)} </th>`;
  })}</tr></thead> <tbody>${each(rows, (row, index) => {
    return `<tr${add_attribute("class", rowClass ? rowClass(row, index) : "", 0)}>${each(columns, (col) => {
      return `<td${add_attribute("class", col.align === "right" || col.numeric ? "num" : "", 0)}>${allowHtml ? `<!-- HTML_TAG_START -->${col.render(row, index)}<!-- HTML_TAG_END -->` : `${escape(col.render(row, index))}`} </td>`;
    })} </tr>`;
  })}</tbody></table></div>`;
});
export {
  Table as T
};
