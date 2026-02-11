

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/dashboard/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/4.BQNVKpFL.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.CHNVHMIA.js","_app/immutable/chunks/format.CiBvMxZZ.js","_app/immutable/chunks/financeMetrics.Df6I7JDk.js","_app/immutable/chunks/each.D6YF6ztN.js"];
export const stylesheets = [];
export const fonts = [];
