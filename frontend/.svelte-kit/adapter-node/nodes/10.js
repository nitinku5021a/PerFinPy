

export const index = 10;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/transactions/_page.svelte.js')).default;
export const imports = ["_app/immutable/nodes/10.CzNlnIO6.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.ULOKnR4R.js","_app/immutable/chunks/each.D6YF6ztN.js","_app/immutable/chunks/format.j6oJxotq.js","_app/immutable/chunks/period.ClbncGIq.js","_app/immutable/chunks/Table.BhUXh0nk.js"];
export const stylesheets = [];
export const fonts = [];
