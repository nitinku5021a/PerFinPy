function getApiBaseUrl() {
  if (process.env.API_BASE_URL) return process.env.API_BASE_URL;
  const isProd = process.env.NODE_ENV === "production";
  const defaultPort = isProd ? "8001" : "5000";
  let host = process.env.BACKEND_HOST || "127.0.0.1";
  const port = process.env.BACKEND_PORT || defaultPort;
  if (host === "0.0.0.0" || host === "::" || host === "[::]") {
    host = "127.0.0.1";
  }
  return `http://${host}:${port}`;
}
const handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/api")) {
    const API_BASE_URL = getApiBaseUrl();
    const targetUrl = API_BASE_URL + event.url.pathname.replace(/^\/api/, "") + event.url.search;
    const request = event.request;
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    const init = {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? void 0 : request.body
    };
    if (init.body) {
      init.duplex = "half";
    }
    try {
      const upstream = await fetch(targetUrl, init);
      return new Response(upstream.body, {
        status: upstream.status,
        headers: upstream.headers
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upstream fetch failed";
      return new Response(message, { status: 502 });
    }
  }
  return resolve(event);
};
export {
  handle
};
