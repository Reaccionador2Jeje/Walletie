import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

test("same-origin preflight is allowed automatically", async () => {
  const request = new Request("https://walletie.example.com/v1/wallet", {
    method: "OPTIONS",
    headers: { origin: "https://walletie.example.com", "access-control-request-method": "GET" }
  });
  const response = await worker.fetch(request, {});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://walletie.example.com");
});

test("configured AtDev product origins can call the SDK API", async () => {
  const request = new Request("https://walletie.example.com/v1/wallet", {
    method: "OPTIONS",
    headers: { origin: "https://joynexa.example.com", "access-control-request-method": "POST" }
  });
  const response = await worker.fetch(request, {
    WALLETIE_ALLOWED_ORIGINS: "https://joynexa.example.com, https://librecoding.example.com"
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://joynexa.example.com");
  assert.match(response.headers.get("access-control-allow-headers"), /Authorization/i);
});

test("unlisted cross-origin requests are rejected", async () => {
  const request = new Request("https://walletie.example.com/v1/wallet", {
    method: "OPTIONS",
    headers: { origin: "https://unknown.example.com", "access-control-request-method": "GET" }
  });
  const response = await worker.fetch(request, {});
  assert.equal(response.status, 403);
});
