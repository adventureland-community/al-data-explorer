/**
 * Adventure Land proxy for Cloudflare Workers
 *
 * Deployed URL: https://al-proxy.thmsn.workers.dev
 *
 * Proxies adventure.land player/character HTML for gear import on
 * https://aldata.adventureland.community (local npm start uses /al).
 */

const AL_UPSTREAM = "https://adventure.land";

const ALLOWED_ORIGINS = new Set([
  "https://aldata.adventureland.community",
  "http://localhost:3000",
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...cors,
    },
  });
}

function text(message, status, cors = {}) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      ...cors,
    },
  });
}

export default {
  async fetch(request) {
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "GET") {
      return text("Method not allowed", 405, cors);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/" || path === "") {
      return json(
        {
          ok: true,
          endpoints: ["/player/:name", "/character/:name"],
        },
        200,
        cors,
      );
    }

    if (!/^\/(player|character)\/[^/]+$/.test(path)) {
      return text("Not found", 404, cors);
    }

    try {
      const upstream = await fetch(`${AL_UPSTREAM}${path}`, {
        headers: {
          Accept: "text/html",
          "User-Agent": "al-data-explorer-proxy/1.0",
        },
      });

      const html = await upstream.text();
      return new Response(html, {
        status: upstream.status,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...cors,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json({ error: message }, 502, cors);
    }
  },
};
