

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/transactions/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/10.Gd4ZOHku.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.MzSWilh2.js","_app/immutable/chunks/each.D6YF6ztN.js","_app/immutable/chunks/format.j6oJxotq.js","_app/immutable/chunks/period.ClbncGIq.js","_app/immutable/chunks/Table.DJnX_olO.js"];
export const stylesheets = [];
export const fonts = [];
