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
		client: {"start":"_app/immutable/entry/start.BxaEaO26.js","app":"_app/immutable/entry/app.C7jbNSSE.js","imports":["_app/immutable/entry/start.BxaEaO26.js","_app/immutable/chunks/entry.BEkCzBC8.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/entry/app.C7jbNSSE.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.ULOKnR4R.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-CVxWxnoV.js')),
			__memo(() => import('./chunks/1-Dx6eE4Yp.js')),
			__memo(() => import('./chunks/2-8axk7yzu.js')),
			__memo(() => import('./chunks/3-CrfJ_is0.js')),
			__memo(() => import('./chunks/4-DLRcdA4C.js')),
			__memo(() => import('./chunks/5-g0uRIKfU.js')),
			__memo(() => import('./chunks/6-CcCawfkd.js')),
			__memo(() => import('./chunks/7-BTnNLDYO.js')),
			__memo(() => import('./chunks/8--rzhkmrw.js')),
			__memo(() => import('./chunks/9-B1UCq7QB.js')),
			__memo(() => import('./chunks/10-D9wKm-0F.js')),
			__memo(() => import('./chunks/11-DD1XwcVG.js')),
			__memo(() => import('./chunks/12-D-Q5mV4u.js'))
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
