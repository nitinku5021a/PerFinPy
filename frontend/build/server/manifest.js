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
		client: {"start":"_app/immutable/entry/start.BXIcOP6r.js","app":"_app/immutable/entry/app.B_lMbsug.js","imports":["_app/immutable/entry/start.BXIcOP6r.js","_app/immutable/chunks/entry.DCHRB2Wd.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/entry/app.B_lMbsug.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.MzSWilh2.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-C1-5Qhke.js')),
			__memo(() => import('./chunks/1-CTWYp9Qq.js')),
			__memo(() => import('./chunks/2-0-OAZk2M.js')),
			__memo(() => import('./chunks/3-Bz4WU2Nd.js')),
			__memo(() => import('./chunks/4-oUUb4CZW.js')),
			__memo(() => import('./chunks/5-CFmtHNdz.js')),
			__memo(() => import('./chunks/6-C-AiMz6s.js')),
			__memo(() => import('./chunks/7-DMDmhAbq.js')),
			__memo(() => import('./chunks/8-OFnWQhyY.js')),
			__memo(() => import('./chunks/9-B9lmKDQN.js')),
			__memo(() => import('./chunks/10-BaWiEovM.js')),
			__memo(() => import('./chunks/11-DsXKTP9a.js')),
			__memo(() => import('./chunks/12-CmUQXIOs.js'))
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
