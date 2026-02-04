

export const index = 8;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/networth/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/8.Cc6HQ3iP.js","_app/immutable/chunks/scheduler.DXwQMlsl.js","_app/immutable/chunks/index.BwbdioCG.js","_app/immutable/chunks/format.j6oJxotq.js","_app/immutable/chunks/NetworthMatrixTable.CwFbBUxZ.js","_app/immutable/chunks/each.D6YF6ztN.js"];
export const stylesheets = [];
export const fonts = [];
