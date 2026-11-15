const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      try {
        await env.DB.prepare("SELECT 1").first();
        return json({
          service: "Walletie",
          status: "ok",
          database: "connected",
          mode: "virtual-credits-only"
        });
      } catch {
        return json({
          service: "Walletie",
          status: "degraded",
          database: "unavailable"
        }, 503);
      }
    }

    if (request.method === "GET" && url.pathname === "/") {
      return json({
        name: "Walletie",
        version: "0.1.0",
        description: "AtDev virtual credits wallet",
        policy: {
          realMoney: false,
          deposits: false,
          withdrawals: false,
          monetaryValue: false
        },
        documentation: "/docs"
      });
    }

    return json({ error: "Not found" }, 404);
  }
};
