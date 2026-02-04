import adapter from "@sveltejs/adapter-node";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      out: "build"
    }),
    csrf: {
      // Allow API proxy POSTs when host/origin mismatches (e.g., 0.0.0.0 vs 127.0.0.1)
      checkOrigin: false
    }
  }
};

export default config;
