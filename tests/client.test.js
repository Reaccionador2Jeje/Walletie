import test from "node:test";
import assert from "node:assert/strict";
import { Walletie, WalletieError } from "../src/client.js";

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; }
  };
}

test("getWallet uses the current AtDev bearer token", async () => {
  let captured;
  const client = new Walletie({
    baseUrl: "https://walletie.example.com/",
    getAccessToken: async () => "test-access-token",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return response({ wallet: { balance: 42 } });
    }
  });

  const result = await client.getWallet();
  assert.equal(result.wallet.balance, 42);
  assert.equal(captured.url, "https://walletie.example.com/v1/wallet");
  assert.equal(captured.options.headers.authorization, "Bearer test-access-token");
  assert.equal(captured.options.cache, "no-store");
});

test("getTransactions builds bounded pagination parameters", async () => {
  let requestedUrl = "";
  const client = new Walletie({
    baseUrl: "https://walletie.example.com",
    getAccessToken: () => "token",
    fetchImpl: async (url) => {
      requestedUrl = url;
      return response({ transactions: [], limit: 100 });
    }
  });

  await client.getTransactions({ limit: 500, before: "2026-11-15T12:00:00.000Z" });
  const url = new URL(requestedUrl);
  assert.equal(url.searchParams.get("limit"), "100");
  assert.equal(url.searchParams.get("before"), "2026-11-15T12:00:00.000Z");
});

test("spend sends only a SKU and a reusable idempotency key", async () => {
  let captured;
  const client = new Walletie({
    baseUrl: "https://walletie.example.com",
    getAccessToken: () => "token",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return response({ transaction: { amount: 10 }, replayed: false });
    }
  });

  await client.spend("profile_theme", { idempotencyKey: "purchase-test-0001" });
  assert.equal(captured.url, "https://walletie.example.com/v1/wallet/spend");
  assert.equal(captured.options.method, "POST");
  assert.deepEqual(JSON.parse(captured.options.body), {
    sku: "profile_theme",
    idempotency_key: "purchase-test-0001"
  });
  assert.equal(captured.options.headers["idempotency-key"], "purchase-test-0001");
});

test("missing authentication fails before making a network request", async () => {
  let called = false;
  const client = new Walletie({
    baseUrl: "https://walletie.example.com",
    getAccessToken: () => null,
    fetchImpl: async () => {
      called = true;
      return response({});
    }
  });

  await assert.rejects(client.getWallet(), error =>
    error instanceof WalletieError && error.code === "AUTH_TOKEN_MISSING"
  );
  assert.equal(called, false);
});

test("HTTP errors preserve status and server message", async () => {
  const client = new Walletie({
    baseUrl: "https://walletie.example.com",
    getAccessToken: () => "token",
    fetchImpl: async () => response({ error: "Insufficient credits." }, 409)
  });

  await assert.rejects(client.getWallet(), error =>
    error instanceof WalletieError &&
    error.status === 409 &&
    error.message === "Insufficient credits."
  );
});


test("allows HTTP only for localhost development", () => {
  assert.doesNotThrow(() => new Walletie({
    baseUrl: "http://localhost:8787",
    getAccessToken: () => "token",
    fetchImpl: async () => response({})
  }));
  assert.throws(() => new Walletie({
    baseUrl: "http://walletie.example.com",
    getAccessToken: () => "token",
    fetchImpl: async () => response({})
  }), /HTTPS except for local loopback/);
});
