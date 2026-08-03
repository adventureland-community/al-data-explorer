/**
 * Adventure Land HTML proxy for Cloudflare Workers
 *
 * Deployed URL: https://al-proxy.thmsn.workers.dev
 *
 * Thin forwarder only: fetches adventure.land HTML and adds CORS for
 * https://aldata.adventureland.community (local npm start still uses /al).
 * Parsing stays in al-data-explorer (useImportPlayer / useImportCharacter).
 *
 * How to deploy (dashboard copy-paste):
 * 1. https://dash.cloudflare.com → Workers & Pages → Create → Create Worker
 * 2. Name it `al-proxy` (account subdomain `thmsn`) and deploy the stub once
 * 3. Edit code → replace everything with this file → Deploy
 * 4. Test (should return HTML, not JSON):
 *    https://al-proxy.thmsn.workers.dev/player/thmsn
 *    https://al-proxy.thmsn.workers.dev/character/MoulinRogue
 *
 * Production hooks call these URLs, then parse locally.
 * Local `npm start` keeps using setupProxy.js `/al/...`.
 */

const UPSTREAM = "https://adventure.land";

const ALLOWED_ORIGIN = "https://aldata.adventureland.community";

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
      return text("Not found. Use /player/:name or /character/:name", 404, cors);
    }

    try {
      const upstream = await fetch(`${UPSTREAM}${path}`, {
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

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin === ALLOWED_ORIGIN) {
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGIN;
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
