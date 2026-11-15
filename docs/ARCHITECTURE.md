# Walletie V1 architecture

Walletie is the virtual-credits wallet for the AtDev ecosystem. Credits have no monetary value and cannot be deposited, withdrawn, redeemed for cash, or transferred outside approved AtDev products.

## Components

- **Walletie Worker:** HTTP API, JWT verification, validation, and wallet business rules.
- **AtDev Cloud D1:** shared identity database plus Walletie-specific wallet and ledger tables.
- **AtDev Cloud identity:** source of user accounts and HS256 JWTs.
- **AtDev products:** future trusted backend integrations that may grant credits through the internal service endpoint.

## Shared identity and database

Walletie binds its `DB` binding to the existing `atdev-cloud-db` D1 database. It does not create a second users table or separate login system.

The `JWT_SECRET` Worker secret must match the secret used by AtDev Cloud. Walletie verifies the JWT signature, checks expiration, and confirms the subject still exists in the shared `users` table.

The migrations directory includes the existing AtDev Cloud migration history followed by a uniquely named Walletie migration. This keeps the D1 migration tracker aligned when multiple Workers share the same database.

## Data model

- `wallets`: one wallet per AtDev user.
- `wallet_transactions`: ledger of credit, spend, and administrative adjustment events.

The balance is a cached current total. The transaction ledger is the audit trail. Every balance mutation is performed server-side and paired with a ledger insert in one D1 batch.

## API boundaries

- User routes under `/v1/*` require a valid AtDev Cloud JWT.
- Credit grants use `POST /internal/v1/credits` and a separate `WALLETIE_SERVICE_TOKEN`.
- Spending accepts a product SKU, not a client-supplied price. Walletie resolves the price from its server-side catalogue.
- No transfer, deposit, withdrawal, cash conversion, or real-money feature exists.

## Security requirements

1. Never trust a user ID, balance, amount, product price, or role supplied by the browser.
2. Keep both Worker secrets out of source control and frontend code.
3. Require an idempotency key for every mutation.
4. Use atomic database operations and reject insufficient balances.
5. Keep transaction history append-only; corrections use compensating entries.
6. Restrict service credentials to trusted backend integrations.
7. Add rate limiting, monitoring, and integration tests before broad production use.

## Current implementation boundary

The Worker API, D1 schema, and responsive dashboard are implemented. The dashboard holds the supplied AtDev JWT in page memory only. The catalogue contains two demo SKUs. AtDev Cloud has not yet been connected as a credit-granting service.
