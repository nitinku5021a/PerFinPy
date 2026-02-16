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
		client: {"start":"_app/immutable/entry/start.dXXbHY8o.js","app":"_app/immutable/entry/app.IFBmzfMp.js","imports":["_app/immutable/entry/start.dXXbHY8o.js","_app/immutable/chunks/entry.BVr6-D2d.js","_app/immutable/chunks/scheduler.C6UDcrJm.js","_app/immutable/chunks/index.D32uih3w.js","_app/immutable/entry/app.IFBmzfMp.js","_app/immutable/chunks/scheduler.C6UDcrJm.js","_app/immutable/chunks/index.DW00sc4t.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-PwiP8e7D.js')),
			__memo(() => import('./chunks/1-DAWxdg_8.js')),
			__memo(() => import('./chunks/2-C7WoED75.js')),
			__memo(() => import('./chunks/3-BB3RVG-B.js')),
			__memo(() => import('./chunks/4-GuNBdQPk.js')),
			__memo(() => import('./chunks/5-CZdEW2MR.js')),
			__memo(() => import('./chunks/6-CoQH6Szt.js')),
			__memo(() => import('./chunks/7-DNWRzHmw.js')),
			__memo(() => import('./chunks/8-DH3Z8Wsp.js')),
			__memo(() => import('./chunks/9-Cfui9nfo.js')),
			__memo(() => import('./chunks/10-BJxUkbhc.js')),
			__memo(() => import('./chunks/11-C2llUA8s.js')),
			__memo(() => import('./chunks/12-w4C0Q5-G.js')),
			__memo(() => import('./chunks/13-DauWoLL7.js')),
			__memo(() => import('./chunks/14-Bss_LliC.js')),
			__memo(() => import('./chunks/15-Cm9QJ0wY.js'))
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
