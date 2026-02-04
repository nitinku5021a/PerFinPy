import { c as create_ssr_component, b as subscribe, d as escape } from './ssr-CnIX4tEz.js';
import { p as page } from './stores-CNXKyW6F.js';
import './exports-CTha0ECg.js';

const Error = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $page, $$unsubscribe_page;
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  $$unsubscribe_page();
  return `<h1>${escape($page.status)}</h1> <p>${escape($page.error?.message)}</p>`;
});

export { Error as default };
//# sourceMappingURL=error.svelte-Bzu3WaTR.js.map
