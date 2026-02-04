

export const index = 4;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/dashboard/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/4.p9vSlYWU.js","_app/immutable/chunks/scheduler.DXwQMlsl.js","_app/immutable/chunks/index.BwbdioCG.js","_app/immutable/chunks/format.j6oJxotq.js"];
export const stylesheets = [];
export const fonts = [];
