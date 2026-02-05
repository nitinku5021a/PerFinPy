

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/2.BjKNH_zU.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.DGTdb-oI.js"];
export const stylesheets = [];
export const fonts = [];
