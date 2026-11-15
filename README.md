# Walletie

**Walletie** is AtDev's universal open-source virtual-credits service. It provides one shared wallet and transaction ledger for compatible AtDev products.

> Walletie credits are virtual units with no monetary value. Walletie does not support real-money deposits, withdrawals, cash redemption, or external transfers.

## V1 status

- [x] Cloudflare Worker foundation
- [x] Shared AtDev Cloud D1 binding
- [x] Wallet and transaction schema
- [x] AtDev Cloud JWT verification
- [x] Authenticated wallet and transaction endpoints
- [x] Server-priced demo catalogue and spending endpoint
- [x] Service-authenticated credit grants
- [x] Walletie dashboard
- [x] Universal JavaScript / TypeScript SDK foundation
- [x] Language-neutral REST integration protocol
- [x] AtDev repository compatibility matrix
- [ ] AtDev Cloud service-to-service integration
- [ ] AtDev Accounts OIDC validation and safe account mapping
- [ ] Joynexa integration
- [ ] Automated API and SDK integration tests
- [ ] Publish the SDK as an installable package

## Ecosystem compatibility

Walletie is designed to be compatible with every AtDev repository, but not every project needs to use credits. Gaming and community products may use optional rewards or virtual cosmetics. Developer tools, runtimes, operating-system utilities, and infrastructure remain fully usable without Walletie.

See [the AtDev integration matrix](docs/INTEGRATION_MATRIX.md) for the repository-by-repository plan and [identity compatibility](docs/IDENTITY.md) for the important current authentication limitation.

## SDK

The repository includes the JavaScript / TypeScript SDK:

```js
import { Walletie } from "@atdev/walletie";

const walletie = new Walletie({
  baseUrl: "https://walletie.example.com",
  getAccessToken: () => authSession.getAccessToken()
});

const wallet = await walletie.getWallet();
const history = await walletie.getTransactions({ limit: 20 });
```

The package is marked private while its API is being stabilized. During development, products can import `src/client.js` directly or install the repository from Git. The SDK never stores access tokens and never exposes the server-only credit grant operation.

See [SDK and integration protocol](docs/SDK.md).

## Architecture

- **Runtime:** Cloudflare Workers
- **Database:** the existing `atdev-cloud-db` D1 database
- **Identity:** AtDev Cloud JWTs, verified with the same `JWT_SECRET`
- **Ledger:** append-only wallet transaction records
- **SDK:** JavaScript / TypeScript client plus language-neutral HTTPS API

Walletie reuses AtDev Cloud's user table. It does not create a second account system.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/API.md](docs/API.md).

## Local development

1. Install Node.js and dependencies: `npm install`
2. Configure `wrangler.jsonc` with the existing AtDev Cloud D1 database ID.
3. Add local secrets in `.dev.vars` (never commit this file):
   ```dotenv
   JWT_SECRET=the_same_secret_used_by_atdev_cloud
   WALLETIE_SERVICE_TOKEN=a_separate_random_service_secret
   ```
4. Apply migrations locally: `npm run db:local`
5. Start the Worker: `npm run dev`
6. Check syntax: `npm run check`

## Cloudflare secrets

Set the same `JWT_SECRET` used by AtDev Cloud as a Worker secret for Walletie. Set a separate `WALLETIE_SERVICE_TOKEN` for trusted server-to-server credit grants. Do not put either secret in source code, frontend JavaScript, GitHub, or chat messages.

Before applying remote migrations, verify that the configured D1 database is the existing AtDev Cloud database. Walletie migrations include the existing AtDev Cloud migration history so the shared database migration tracker remains consistent.

## API overview

- `GET /health` — Worker and D1 health.
- `GET /v1/wallet` — authenticated user's wallet.
- `GET /v1/wallet/transactions` — authenticated user's transaction history.
- `POST /v1/wallet/spend` — spend credits on a server-priced catalogue item.
- `POST /internal/v1/credits` — grant credits from an authorized backend service.

All `/v1/*` user routes require an AtDev Cloud bearer token. The internal credit route requires the `x-walletie-service-token` header.

## Security model

- The server derives the user identity from a verified AtDev Cloud JWT.
- The browser cannot set balances or choose a spending amount.
- Product prices are defined server-side.
- Credit grants require a separate service credential.
- Mutations require idempotency keys.
- Balance changes and ledger entries are committed together in a D1 batch.
- Transfers, cash value, deposits, and withdrawals are intentionally unsupported.
- Core functionality across AtDev products must not be paywalled by default.

## License

MIT
