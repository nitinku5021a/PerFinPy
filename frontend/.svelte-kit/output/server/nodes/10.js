

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/networth/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/10.dYPziJYR.js","_app/immutable/chunks/scheduler.C6UDcrJm.js","_app/immutable/chunks/index.DW00sc4t.js","_app/immutable/chunks/api.DuEoMS5X.js","_app/immutable/chunks/NetworthMatrixTable.BzW_22C_.js","_app/immutable/chunks/each.BwZyVpAr.js","_app/immutable/chunks/format.CT4jziiX.js"];
export const stylesheets = [];
export const fonts = [];
