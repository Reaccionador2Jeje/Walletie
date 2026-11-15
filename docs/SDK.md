# Walletie SDK and integration protocol

Walletie is the single source of truth for AtDev virtual-credit balances. Products integrate through the HTTPS API; JavaScript and TypeScript applications can use the official SDK in `src/client.js`.

## Compatibility principles

- One AtDev identity maps to one Walletie wallet.
- **Current V1 limitation:** the host product must supply an AtDev Cloud HS256 access token through `getAccessToken`. AtDev Accounts OIDC/RS256 and Joynexa ID sessions are not accepted yet; see [identity compatibility](IDENTITY.md).
- Walletie derives the owner from the signed token. A client must never send an arbitrary owner ID to read or spend credits.
- Product prices and SKU permissions are enforced by Walletie, not by the browser.
- Credit grants are server-to-server only. The public SDK deliberately has no grant method and must never contain the service token.
- A retry of the same spend must reuse its idempotency key.
- Credits are virtual, have no monetary value, and cannot be withdrawn, transferred externally, or redeemed for cash.

## JavaScript / TypeScript

During development inside this repository:

```js
import { Walletie } from "./src/client.js";

const walletie = new Walletie({
  baseUrl: "https://walletie.example.com",
  // Current V1 requires an AtDev Cloud bearer token. Other identity providers need a bridge first.
  getAccessToken: async () => authSession.getAccessToken()
});

const wallet = await walletie.getWallet();
const history = await walletie.getTransactions({ limit: 20 });

// SKU is public; amount is always selected by the Walletie server.
const purchase = await walletie.spend("profile_theme");
```

The SDK does not store tokens in localStorage, sessionStorage, cookies, or files. The host application owns authentication and token lifecycle. Pass a function that obtains the current token when a request is made. In V1, that token must be issued by AtDev Cloud; the SDK callback alone does not translate Joynexa ID or OIDC tokens.

For retry-safe flows, create and retain an idempotency key for the lifetime of one logical purchase:

```js
import { Walletie, createIdempotencyKey } from "./src/client.js";

const key = createIdempotencyKey();
await walletie.spend("profile_theme", { idempotencyKey: key });
// If the network response is lost, retry with the SAME key.
```

## Any language / platform

The REST API is language-neutral. Products written in Go, Rust, Python, C/C++, Memingo, or another language can call the same HTTPS endpoints:

- `GET /v1/wallet`
- `GET /v1/wallet/transactions?limit=25`
- `POST /v1/wallet/spend`

User routes require `Authorization: Bearer <AtDev Cloud access token>`. The spend JSON body contains only `sku` and `idempotency_key`; clients cannot set a price, balance, owner, or transaction type.

Example request:

```http
POST /v1/wallet/spend
Authorization: Bearer <AtDev Cloud access token>
Content-Type: application/json

{
  "sku": "profile_theme",
  "idempotency_key": "joynexa-purchase-unique-0001"
}
```

## Trusted backend credit grants

Only a trusted product backend may call `POST /internal/v1/credits` using the private `WALLETIE_SERVICE_TOKEN`. The token must be stored as a server secret and must never be shipped to a browser, mobile app, desktop client, game, SDK, or public repository.

A grant request includes `owner_id`, `amount`, `source`, and `idempotency_key`. The backend must validate the event that earned the credits before calling Walletie. Each product should receive its own service identity/credential when the service-auth model is expanded; do not share credentials among client applications.

## Errors and retries

The SDK throws `WalletieError` with `status`, `code`, and `details`. A 409 can mean insufficient balance, a suspended wallet, or an idempotency conflict. Do not generate a new key automatically when retrying a request whose outcome is unknown; reuse the original key.

## Security checklist

- Use HTTPS only.
- Obtain identity tokens from the official AtDev authentication flow.
- Never ask users to paste tokens into product forms as a permanent integration strategy.
- Never expose `JWT_SECRET` or `WALLETIE_SERVICE_TOKEN`.
- Never trust client-reported prices, XP, achievements, game time, or reward eligibility.
- Validate reward events on the trusted product backend.
- Keep Walletie optional: core product functionality must not be paywalled by default.
