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
		client: {"start":"_app/immutable/entry/start.CFr6F8Kw.js","app":"_app/immutable/entry/app.hOsf5HV7.js","imports":["_app/immutable/entry/start.CFr6F8Kw.js","_app/immutable/chunks/entry.pU_eHD8N.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/entry/app.hOsf5HV7.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.CHNVHMIA.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-H3GjoUGZ.js')),
			__memo(() => import('./chunks/1-DXh-lANw.js')),
			__memo(() => import('./chunks/2-CLDiMu3P.js')),
			__memo(() => import('./chunks/3-DO93VTMA.js')),
			__memo(() => import('./chunks/4-CY4dZVUj.js')),
			__memo(() => import('./chunks/5-BaTBMzcI.js')),
			__memo(() => import('./chunks/6-CJl_bVCa.js')),
			__memo(() => import('./chunks/7-DtLyR1qw.js')),
			__memo(() => import('./chunks/8-oQ1Elran.js')),
			__memo(() => import('./chunks/9-C2_Mzn_d.js')),
			__memo(() => import('./chunks/10-Bovs4kdl.js')),
			__memo(() => import('./chunks/11-Dl3T94I5.js')),
			__memo(() => import('./chunks/12-CFSuSE1L.js')),
			__memo(() => import('./chunks/13-BirVkI9i.js')),
			__memo(() => import('./chunks/14-Dj-KTPZ0.js'))
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
				id: "/monthly-budget",
				pattern: /^\/monthly-budget\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/networth",
				pattern: /^\/networth\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/report",
				pattern: /^\/report\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/transactions",
				pattern: /^\/transactions\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/trial-balance",
				pattern: /^\/trial-balance\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/wealth-report",
				pattern: /^\/wealth-report\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
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
