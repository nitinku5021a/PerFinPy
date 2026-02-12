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
		client: {"start":"_app/immutable/entry/start.CpBfeqJO.js","app":"_app/immutable/entry/app.LI1MXVul.js","imports":["_app/immutable/entry/start.CpBfeqJO.js","_app/immutable/chunks/entry.DKnIrrsE.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/entry/app.LI1MXVul.js","_app/immutable/chunks/scheduler.WTed_iOu.js","_app/immutable/chunks/index.CHNVHMIA.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-CdVM_7b1.js')),
			__memo(() => import('./chunks/1-DMcEjByH.js')),
			__memo(() => import('./chunks/2-CLDiMu3P.js')),
			__memo(() => import('./chunks/3-BM4412BT.js')),
			__memo(() => import('./chunks/4-DOSafGQq.js')),
			__memo(() => import('./chunks/5-YLABy0kd.js')),
			__memo(() => import('./chunks/6-B1dlY3Fr.js')),
			__memo(() => import('./chunks/7-IrZD5Z9A.js')),
			__memo(() => import('./chunks/8-DRkGiiOr.js')),
			__memo(() => import('./chunks/9-MDEpDCP5.js')),
			__memo(() => import('./chunks/10-Bm0gGpcO.js')),
			__memo(() => import('./chunks/11-CBWyrv1J.js')),
			__memo(() => import('./chunks/12-CP2jhFBd.js')),
			__memo(() => import('./chunks/13-jcbr9GQe.js')),
			__memo(() => import('./chunks/14-DSe3bJT6.js')),
			__memo(() => import('./chunks/15-BCsAMDw8.js'))
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
				id: "/reminders",
				pattern: /^\/reminders\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/report",
				pattern: /^\/report\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/transactions",
				pattern: /^\/transactions\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/trial-balance",
				pattern: /^\/trial-balance\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/wealth-report",
				pattern: /^\/wealth-report\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
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
