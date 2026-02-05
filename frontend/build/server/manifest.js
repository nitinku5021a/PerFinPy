const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {"start":"_app/immutable/entry/start.Bewo51f5.js","app":"_app/immutable/entry/app.4syVr7qD.js","imports":["_app/immutable/entry/start.Bewo51f5.js","_app/immutable/chunks/entry.BRaLC4pH.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/entry/app.4syVr7qD.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.DGTdb-oI.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-DwWqmbqv.js')),
			__memo(() => import('./chunks/1-Pf3bTx06.js')),
			__memo(() => import('./chunks/2-C06LWbLb.js')),
			__memo(() => import('./chunks/3-DCAQBsP5.js')),
			__memo(() => import('./chunks/4-BhzG15nI.js')),
			__memo(() => import('./chunks/5-D748VN5h.js')),
			__memo(() => import('./chunks/6-BDk4TqHe.js')),
			__memo(() => import('./chunks/7-C3AMhPjH.js')),
			__memo(() => import('./chunks/8-C-9tWIrj.js')),
			__memo(() => import('./chunks/9-BKKlvPCY.js')),
			__memo(() => import('./chunks/10-BmUmfRmB.js')),
			__memo(() => import('./chunks/11-BvWRjRda.js')),
			__memo(() => import('./chunks/12-QtJXFlbO.js'))
		],
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/accounts",
				pattern: /^\/accounts\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/dashboard",
				pattern: /^\/dashboard\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/income-statement",
				pattern: /^\/income-statement\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/investments",
				pattern: /^\/investments\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/journal-entries",
				pattern: /^\/journal-entries\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/ledger",
				pattern: /^\/ledger\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/networth",
				pattern: /^\/networth\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/transactions",
				pattern: /^\/transactions\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/trial-balance",
				pattern: /^\/trial-balance\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/wealth-report",
				pattern: /^\/wealth-report\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			}
		],
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
