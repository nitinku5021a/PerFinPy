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
		client: {"start":"_app/immutable/entry/start.D2jpS_FA.js","app":"_app/immutable/entry/app.C9GJOkJG.js","imports":["_app/immutable/entry/start.D2jpS_FA.js","_app/immutable/chunks/entry.Ch8b7i4l.js","_app/immutable/chunks/scheduler.DXwQMlsl.js","_app/immutable/entry/app.C9GJOkJG.js","_app/immutable/chunks/scheduler.DXwQMlsl.js","_app/immutable/chunks/index.BwbdioCG.js"],"stylesheets":[],"fonts":[],"uses_env_dynamic_public":false},
		nodes: [
			__memo(() => import('./chunks/0-tzVoQGQ4.js')),
			__memo(() => import('./chunks/1-tJFd0CWj.js')),
			__memo(() => import('./chunks/2-kaOBiS-E.js')),
			__memo(() => import('./chunks/3-DBytzfsK.js')),
			__memo(() => import('./chunks/4-CGDQnG0d.js')),
			__memo(() => import('./chunks/5-DnqnhY8L.js')),
			__memo(() => import('./chunks/6-jjJ3IbE0.js')),
			__memo(() => import('./chunks/7-C7DanIMj.js')),
			__memo(() => import('./chunks/8-B8Ht5OS1.js')),
			__memo(() => import('./chunks/9-v-wUNBVb.js')),
			__memo(() => import('./chunks/10-m5ecyvmI.js'))
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
				id: "/journal-entries",
				pattern: /^\/journal-entries\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/ledger",
				pattern: /^\/ledger\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/networth",
				pattern: /^\/networth\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/transactions",
				pattern: /^\/transactions\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/trial-balance",
				pattern: /^\/trial-balance\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
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
