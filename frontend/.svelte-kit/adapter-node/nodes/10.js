

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/trial-balance/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/10.DPSxFC9y.js","_app/immutable/chunks/scheduler.DXwQMlsl.js","_app/immutable/chunks/index.BwbdioCG.js","_app/immutable/chunks/format.j6oJxotq.js","_app/immutable/chunks/Table.BaPFpwIW.js","_app/immutable/chunks/each.D6YF6ztN.js","_app/immutable/chunks/period.ClbncGIq.js"];
export const stylesheets = [];
export const fonts = [];
