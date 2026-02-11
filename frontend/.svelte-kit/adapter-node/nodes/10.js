

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/networth/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/10.yV-9huwu.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.CHNVHMIA.js","_app/immutable/chunks/format.CiBvMxZZ.js","_app/immutable/chunks/NetworthMatrixTable.MytoTF9j.js","_app/immutable/chunks/each.D6YF6ztN.js"];
export const stylesheets = [];
export const fonts = [];
