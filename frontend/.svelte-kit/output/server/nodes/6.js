

export const index = 6;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/investments/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/6.rSD26z5C.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.DGTdb-oI.js","_app/immutable/chunks/each.D6YF6ztN.js","_app/immutable/chunks/format.j6oJxotq.js","_app/immutable/chunks/investmentMetrics.xWwPcmhB.js"];
export const stylesheets = [];
export const fonts = [];
