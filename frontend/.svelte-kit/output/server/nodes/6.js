

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/investments/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/6.zeEhVMy9.js","_app/immutable/chunks/scheduler.C6UDcrJm.js","_app/immutable/chunks/index.DW00sc4t.js","_app/immutable/chunks/each.BwZyVpAr.js","_app/immutable/chunks/api.DuEoMS5X.js","_app/immutable/chunks/format.CT4jziiX.js","_app/immutable/chunks/investmentMetrics.xWwPcmhB.js"];
export const stylesheets = [];
export const fonts = [];
