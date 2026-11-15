const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer"
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Demonstration catalogue. Prices are enforced by the server, never by the browser.
const PRODUCT_CATALOG = Object.freeze({
  profile_theme: 10,
  project_badge: 25
});

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function base64urlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function verifyAtDevToken(request, env) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || !env.JWT_SECRET || env.JWT_SECRET.length < 32) {
    return null;
  }

  const parts = authorization.slice(7).split(".");
  if (parts.length !== 3) return null;

  try {
    const header = JSON.parse(decoder.decode(base64urlToBytes(parts[0])));
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64urlToBytes(parts[2]),
      encoder.encode(parts[0] + "." + parts[1])
    );
    if (!valid) return null;

    const claims = JSON.parse(decoder.decode(base64urlToBytes(parts[1])));
    const now = Math.floor(Date.now() / 1000);
    if (typeof claims.sub !== "string" || !claims.sub || !Number.isInteger(claims.exp) || claims.exp <= now) {
      return null;
    }

    // Confirm that the signed identity still exists in the shared AtDev Cloud database.
    const user = await env.DB.prepare("SELECT id, email FROM users WHERE id = ?")
      .bind(claims.sub)
      .first();

    return user ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
}

async function readJson(request) {
  const raw = await request.text();
  if (raw.length > 16384) throw Object.assign(new Error("Request body is too large."), { status: 413 });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("A valid JSON body is required."), { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw Object.assign(new Error("A JSON object is required."), { status: 400 });
  }
  return body;
}

function validIdempotencyKey(value) {
  return typeof value === "string" && /^[a-zA-Z0-9._:-]{8,128}$/.test(value);
}

async function getOrCreateWallet(env, ownerId) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO wallets (id, owner_id, balance, status, created_at, updated_at) VALUES (?, ?, 0, 'active', ?, ?)"
  ).bind(crypto.randomUUID(), ownerId, now, now).run();

  return env.DB.prepare(
    "SELECT id, owner_id, balance, status, created_at, updated_at FROM wallets WHERE owner_id = ?"
  ).bind(ownerId).first();
}

async function findIdempotentTransaction(env, walletId, key, type, amount, source) {
  const existing = await env.DB.prepare(
    "SELECT id, type, amount, source, balance_after FROM wallet_transactions WHERE wallet_id = ? AND idempotency_key = ?"
  ).bind(walletId, key).first();

  if (!existing) return null;
  if (existing.type !== type || existing.amount !== amount || existing.source !== source) {
    return { conflict: true };
  }
  return { transaction: existing, replayed: true };
}

async function applyCredit(env, wallet, { amount, source, referenceId, idempotencyKey }) {
  const replay = await findIdempotentTransaction(env, wallet.id, idempotencyKey, "credit", amount, source);
  if (replay) return replay.conflict ? { error: "Idempotency key was already used for a different operation.", status: 409 } : replay;

  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE wallets SET balance = balance + ?, updated_at = ? WHERE id = ? AND status = 'active'"
      ).bind(amount, now, wallet.id),
      env.DB.prepare(
        "INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_after, source, reference_id, idempotency_key, created_at) " +
        "SELECT ?, id, 'credit', ?, balance, ?, ?, ?, ? FROM wallets WHERE id = ? AND changes() = 1"
      ).bind(transactionId, amount, source, referenceId || null, idempotencyKey, now, wallet.id)
    ]);

    if (!results[0].meta.changes) {
      return { error: "Wallet is suspended or unavailable.", status: 409 };
    }
  } catch (error) {
    const duplicate = await findIdempotentTransaction(env, wallet.id, idempotencyKey, "credit", amount, source);
    if (duplicate && !duplicate.conflict) return duplicate;
    throw error;
  }

  const updated = await env.DB.prepare("SELECT balance FROM wallets WHERE id = ?").bind(wallet.id).first();
  return {
    transaction: { id: transactionId, type: "credit", amount, source, balance_after: updated.balance },
    replayed: false
  };
}

async function applySpend(env, wallet, { amount, source, referenceId, idempotencyKey }) {
  const replay = await findIdempotentTransaction(env, wallet.id, idempotencyKey, "spend", amount, source);
  if (replay) return replay.conflict ? { error: "Idempotency key was already used for a different operation.", status: 409 } : replay;

  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const results = await env.DB.batch([
      env.DB.prepare(
        "UPDATE wallets SET balance = balance - ?, updated_at = ? WHERE id = ? AND status = 'active' AND balance >= ?"
      ).bind(amount, now, wallet.id, amount),
      env.DB.prepare(
        "INSERT INTO wallet_transactions (id, wallet_id, type, amount, balance_after, source, reference_id, idempotency_key, created_at) " +
        "SELECT ?, id, 'spend', ?, balance, ?, ?, ?, ? FROM wallets WHERE id = ? AND changes() = 1"
      ).bind(transactionId, amount, source, referenceId || null, idempotencyKey, now, wallet.id)
    ]);

    if (!results[0].meta.changes) {
      const current = await env.DB.prepare("SELECT balance, status FROM wallets WHERE id = ?").bind(wallet.id).first();
      if (!current || current.status !== "active") return { error: "Wallet is suspended or unavailable.", status: 409 };
      return { error: "Insufficient credits.", status: 409, balance: current.balance };
    }
  } catch (error) {
    const duplicate = await findIdempotentTransaction(env, wallet.id, idempotencyKey, "spend", amount, source);
    if (duplicate && !duplicate.conflict) return duplicate;
    throw error;
  }

  const updated = await env.DB.prepare("SELECT balance FROM wallets WHERE id = ?").bind(wallet.id).first();
  return {
    transaction: { id: transactionId, type: "spend", amount, source, balance_after: updated.balance },
    replayed: false
  };
}

async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method.toUpperCase();

  if (method === "GET" && path === "/health") {
    try {
      await env.DB.prepare("SELECT 1").first();
      return json({ service: "Walletie", status: "ok", database: "connected", mode: "virtual-credits-only" });
    } catch {
      return json({ service: "Walletie", status: "degraded", database: "unavailable" }, 503);
    }
  }

  if (method === "POST" && path === "/internal/v1/credits") {
    const supplied = request.headers.get("x-walletie-service-token") || "";
    const expected = env.WALLETIE_SERVICE_TOKEN || "";
    if (!expected || expected.length < 32 || !constantTimeEqual(supplied, expected)) {
      return json({ error: "Service authorization required." }, 401);
    }

    const body = await readJson(request);
    const { owner_id: ownerId, amount, source, reference_id: referenceId, idempotency_key: idempotencyKey } = body;
    if (typeof ownerId !== "string" || ownerId.length < 1 || ownerId.length > 128) return json({ error: "Invalid owner_id." }, 400);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) return json({ error: "amount must be an integer between 1 and 100000." }, 400);
    if (typeof source !== "string" || !/^[a-zA-Z0-9._:-]{2,80}$/.test(source)) return json({ error: "Invalid source." }, 400);
    if (referenceId !== undefined && (typeof referenceId !== "string" || referenceId.length > 128)) return json({ error: "Invalid reference_id." }, 400);
    if (!validIdempotencyKey(idempotencyKey)) return json({ error: "A valid idempotency_key is required." }, 400);

    const user = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(ownerId).first();
    if (!user) return json({ error: "AtDev user not found." }, 404);
    const wallet = await getOrCreateWallet(env, ownerId);
    const result = await applyCredit(env, wallet, { amount, source, referenceId, idempotencyKey });
    if (result.error) return json({ error: result.error }, result.status);
    return json({ ...result, wallet_id: wallet.id }, result.replayed ? 200 : 201);
  }

  if (path.startsWith("/v1/")) {
    const user = await verifyAtDevToken(request, env);
    if (!user) return json({ error: "Valid AtDev Cloud authentication is required." }, 401);

    if (method === "GET" && path === "/v1/wallet") {
      const wallet = await getOrCreateWallet(env, user.id);
      return json({
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          status: wallet.status,
          unit: "ATDEV_CREDITS",
          monetary_value: false,
          created_at: wallet.created_at
        }
      });
    }

    if (method === "GET" && path === "/v1/wallet/transactions") {
      const wallet = await getOrCreateWallet(env, user.id);
      const requestedLimit = Number(url.searchParams.get("limit") || 25);
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 25;
      const cursor = url.searchParams.get("before");
      let result;

      if (cursor) {
        result = await env.DB.prepare(
          "SELECT id, type, amount, balance_after, source, reference_id, created_at FROM wallet_transactions WHERE wallet_id = ? AND created_at < ? ORDER BY created_at DESC, id DESC LIMIT ?"
        ).bind(wallet.id, cursor, limit).all();
      } else {
        result = await env.DB.prepare(
          "SELECT id, type, amount, balance_after, source, reference_id, created_at FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC, id DESC LIMIT ?"
        ).bind(wallet.id, limit).all();
      }

      return json({ transactions: result.results, limit });
    }

    if (method === "POST" && path === "/v1/wallet/spend") {
      const body = await readJson(request);
      const sku = body.sku;
      const idempotencyKey = body.idempotency_key;
      if (typeof sku !== "string" || !Object.hasOwn(PRODUCT_CATALOG, sku)) {
        return json({ error: "Unknown product SKU." }, 400);
      }
      if (!validIdempotencyKey(idempotencyKey)) return json({ error: "A valid idempotency_key is required." }, 400);

      const wallet = await getOrCreateWallet(env, user.id);
      const amount = PRODUCT_CATALOG[sku];
      const result = await applySpend(env, wallet, {
        amount,
        source: "product:" + sku,
        referenceId: sku,
        idempotencyKey
      });
      if (result.error) return json({ error: result.error, ...(result.balance === undefined ? {} : { balance: result.balance }) }, result.status);
      return json({ ...result, wallet_id: wallet.id }, result.replayed ? 200 : 201);
    }
  }

  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const isApiPath = url.pathname === "/health" || url.pathname.startsWith("/v1/") || url.pathname.startsWith("/internal/");
      if (!isApiPath && env.ASSETS) return await env.ASSETS.fetch(request);
      return await handleApi(request, env);
    } catch (error) {
      const status = Number(error && error.status) || 500;
      if (status >= 500) {
        console.error(JSON.stringify({ level: "error", service: "walletie", message: String(error && error.message || error) }));
      }
      return json({ error: status >= 500 ? "Internal server error." : String(error.message || error) }, status);
    }
  }
};
