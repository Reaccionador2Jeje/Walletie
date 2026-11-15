# Walletie

**Walletie** is AtDev's open-source virtual credits wallet. It lets users receive, spend, and track credits inside approved AtDev products.

> Walletie credits have no monetary value. Walletie does not support real money, deposits, withdrawals, cash redemption, or external transfers.

## V1 status

- [x] Cloudflare Worker foundation
- [x] Shared AtDev Cloud D1 binding
- [x] Wallet and transaction schema
- [x] AtDev Cloud JWT verification
- [x] Authenticated wallet and transaction endpoints
- [x] Server-priced demo catalogue and spending endpoint
- [x] Service-authenticated credit grants
- [ ] Walletie dashboard
- [ ] AtDev Cloud service-to-service integration
- [ ] Automated integration tests

## Architecture

- **Runtime:** Cloudflare Workers
- **Database:** the existing `atdev-cloud-db` D1 database
- **Identity:** AtDev Cloud JWTs, verified with the same `JWT_SECRET`
- **Ledger:** append-only wallet transaction records

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

## License

MIT
