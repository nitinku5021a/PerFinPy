

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/networth/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/10.DF34-VX8.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.CHNVHMIA.js","_app/immutable/chunks/api.DuEoMS5X.js","_app/immutable/chunks/NetworthMatrixTable.MytoTF9j.js","_app/immutable/chunks/each.D6YF6ztN.js","_app/immutable/chunks/format.CT4jziiX.js"];
export const stylesheets = [];
export const fonts = [];
