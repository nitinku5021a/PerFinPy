

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/ledger/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/8.C5b8X2se.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.DGTdb-oI.js","_app/immutable/chunks/format.j6oJxotq.js","_app/immutable/chunks/period.ClbncGIq.js","_app/immutable/chunks/Table.De_8zej4.js","_app/immutable/chunks/each.D6YF6ztN.js"];
export const stylesheets = [];
export const fonts = [];
