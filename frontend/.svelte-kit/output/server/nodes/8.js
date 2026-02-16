

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/ledger/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/8.CTPz65yg.js","_app/immutable/chunks/scheduler.C6UDcrJm.js","_app/immutable/chunks/index.DW00sc4t.js","_app/immutable/chunks/api.DuEoMS5X.js","_app/immutable/chunks/period.ClbncGIq.js","_app/immutable/chunks/format.CT4jziiX.js","_app/immutable/chunks/Table.BMMGwPpr.js","_app/immutable/chunks/each.BwZyVpAr.js"];
export const stylesheets = [];
export const fonts = [];
