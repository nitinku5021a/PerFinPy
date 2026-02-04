import type { Handle } from "@sveltejs/kit";

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5000";

export const handle: Handle = async ({ event, resolve }) => {
  if (event.url.pathname.startsWith("/api")) {
    const targetUrl =
      API_BASE_URL +
      event.url.pathname.replace(/^\/api/, "") +
      event.url.search;

    const request = event.request;
    const headers = new Headers(request.headers);
    headers.delete("content-length");

    const init: RequestInit & { duplex?: "half" } = {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : request.body
    };
    if (init.body) {
      init.duplex = "half";
    }

    const upstream = await fetch(targetUrl, init);
    return new Response(upstream.body, {
      status: upstream.status,
      headers: upstream.headers
    });
  }

  return resolve(event);
};
