/**
 * Walletie SDK for AtDev products.
 * The SDK only exposes user-scoped wallet operations. Credit grants remain
 * server-to-server operations and are intentionally not available here.
 */

export class WalletieError extends Error {
  constructor(message, { status = 0, code = "WALLETIE_ERROR", details = null } = {}) {
    super(message);
    this.name = "WalletieError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function createIdempotencyKey() {
  if (!globalThis.crypto || typeof globalThis.crypto.randomUUID !== "function") {
    throw new WalletieError(
      "A secure randomUUID implementation is required. Provide your own idempotencyKey.",
      { code: "SECURE_RANDOM_UNAVAILABLE" }
    );
  }
  return globalThis.crypto.randomUUID();
}

export class Walletie {
  constructor({ baseUrl, getAccessToken, fetchImpl = globalThis.fetch } = {}) {
    if (typeof baseUrl !== "string") {
      throw new TypeError("Walletie baseUrl must be a valid HTTPS URL.");
    }
    let parsedBaseUrl;
    try {
      parsedBaseUrl = new URL(baseUrl);
    } catch {
      throw new TypeError("Walletie baseUrl must be a valid HTTPS URL.");
    }
    const localHttp = parsedBaseUrl.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsedBaseUrl.hostname);
    if (parsedBaseUrl.protocol !== "https:" && !localHttp) {
      throw new TypeError("Walletie requires HTTPS except for local loopback development.");
    }
    if (typeof getAccessToken !== "function") {
      throw new TypeError("getAccessToken must be an async function supplied by the host app.");
    }
    if (typeof fetchImpl !== "function") {
      throw new TypeError("A Fetch-compatible implementation is required.");
    }

    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.getAccessToken = getAccessToken;
    this.fetchImpl = fetchImpl;
  }

  async request(path, { method = "GET", body, idempotencyKey } = {}) {
    const token = await this.getAccessToken();
    if (typeof token !== "string" || token.length === 0) {
      throw new WalletieError("The host application did not provide an AtDev access token.", {
        status: 401,
        code: "AUTH_TOKEN_MISSING"
      });
    }

    const headers = {
      accept: "application/json",
      authorization: `Bearer ${token}`
    };
    if (body !== undefined) headers["content-type"] = "application/json";
    if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        method,
        headers,
        cache: "no-store",
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (error) {
      throw new WalletieError("Could not connect to Walletie.", {
        code: "NETWORK_ERROR",
        details: { cause: String(error) }
      });
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new WalletieError(
        payload && typeof payload.error === "string" ? payload.error : `Walletie request failed (${response.status}).`,
        {
          status: response.status,
          code: payload && typeof payload.code === "string" ? payload.code : "HTTP_ERROR",
          details: payload
        }
      );
    }

    return payload;
  }

  getWallet() {
    return this.request("/v1/wallet");
  }

  getTransactions({ limit = 25, before } = {}) {
    const params = new URLSearchParams();
    params.set("limit", String(Math.min(Math.max(Number(limit) || 25, 1), 100)));
    if (before) params.set("before", before);
    return this.request(`/v1/wallet/transactions?${params.toString()}`);
  }

  spend(sku, { idempotencyKey = createIdempotencyKey() } = {}) {
    if (typeof sku !== "string" || sku.length === 0) {
      throw new TypeError("A server-defined product SKU is required.");
    }
    if (typeof idempotencyKey !== "string" || idempotencyKey.length < 8) {
      throw new TypeError("A valid idempotencyKey is required.");
    }
    return this.request("/v1/wallet/spend", {
      method: "POST",
      body: { sku, idempotency_key: idempotencyKey },
      idempotencyKey
    });
  }
}

export default Walletie;
