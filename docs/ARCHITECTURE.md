# Walletie V1 architecture

Walletie is an AtDev ecosystem virtual-credits service. Credits have no monetary value and cannot be deposited, withdrawn, redeemed for cash, or transferred outside approved AtDev products.

## Components

- **Walletie Worker:** HTTP API, validation, authorization boundary, and business rules.
- **D1:** wallet balances and append-only transaction history.
- **AtDev identity:** trusted source of the authenticated user's stable ID.
- **AtDev products:** request approved credit grants or spending through authenticated service integrations.

## Data model

- `wallets`: one wallet per AtDev user.
- `wallet_transactions`: append-only ledger of credit, spend, and administrative adjustment events.

The balance is a cached current total. The transaction ledger is the audit trail. Every mutation must be performed server-side and must create a corresponding ledger entry.

## Security requirements before enabling mutations

1. Integrate with AtDev Cloud's real authentication and verify tokens server-side.
2. Never trust a user ID, balance, amount, product price, or role supplied by the browser.
3. Restrict credit grants to authenticated, authorized service identities.
4. Require an idempotency key for every mutation.
5. Use atomic database operations and reject insufficient balances.
6. Keep transaction history append-only; corrections use compensating entries.
7. Apply rate limits and audit administrative actions.

## Initial implementation boundary

The first commit only provides the Worker foundation, database schema, and health endpoint. Wallet mutation routes remain disabled until trusted AtDev authentication and service authorization are integrated.
