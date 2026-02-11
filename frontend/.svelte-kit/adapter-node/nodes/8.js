

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/ledger/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/8.o7cOZH_c.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.CHNVHMIA.js","_app/immutable/chunks/format.CiBvMxZZ.js","_app/immutable/chunks/period.ClbncGIq.js","_app/immutable/chunks/Table.BEi4urFf.js","_app/immutable/chunks/each.D6YF6ztN.js"];
export const stylesheets = [];
export const fonts = [];
