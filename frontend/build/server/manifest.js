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
		client: {"start":"_app/immutable/entry/start.BGuZvUka.js","app":"_app/immutable/entry/app.Br8fXv4n.js","imports":["_app/immutable/entry/start.BGuZvUka.js","_app/immutable/chunks/entry.BvEFBvmG.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/entry/app.Br8fXv4n.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.BnBtPA1B.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-FFQ4crC4.js')),
			__memo(() => import('./chunks/1-fuh-rgwO.js')),
			__memo(() => import('./chunks/2-B2NDJQIx.js')),
			__memo(() => import('./chunks/3-VBH_PY5w.js')),
			__memo(() => import('./chunks/4-Dck0Gu-q.js')),
			__memo(() => import('./chunks/5-DJ2m5H_d.js')),
			__memo(() => import('./chunks/6-BswSeTFm.js')),
			__memo(() => import('./chunks/7-B3FKMkd1.js')),
			__memo(() => import('./chunks/8-DTb75TuB.js')),
			__memo(() => import('./chunks/9-BPhj3KIQ.js')),
			__memo(() => import('./chunks/10-Dr26bx39.js')),
			__memo(() => import('./chunks/11-D6ooYNhw.js')),
			__memo(() => import('./chunks/12-CIqp3hXU.js'))
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
