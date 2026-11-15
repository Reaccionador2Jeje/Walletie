# Walletie API V1

Base URL: the deployed Walletie Worker URL.

All responses use JSON unless noted otherwise. Authenticated user routes require:

```http
Authorization: Bearer <AtDev Cloud JWT>
```

The JWT must be signed with the same `JWT_SECRET` configured in AtDev Cloud. Walletie verifies the signature and confirms the user still exists in the shared AtDev Cloud D1 database.

## GET /health

Returns Worker and D1 health. No authentication required.

## GET /v1/wallet

Returns the signed-in user's wallet. A wallet is created with zero credits on first access.

Example:

```json
{
  "wallet": {
    "id": "wallet-id",
    "balance": 0,
    "status": "active",
    "unit": "ATDEV_CREDITS",
    "monetary_value": false,
    "created_at": "2026-11-15T12:00:00.000Z"
  }
}
```

## GET /v1/wallet/transactions

Returns the user's newest transactions.

- `limit`: optional integer, from 1 to 100 (default 25).
- `before`: optional timestamp cursor for older records.

## POST /v1/wallet/spend

Spends credits on a catalogue SKU. The amount is looked up by Walletie on the server; clients cannot submit a price.

Request:

```json
{
  "sku": "profile_theme",
  "idempotency_key": "theme-order-000001"
}
```

Demo catalogue:

| SKU | Price |
|---|---:|
| `profile_theme` | 10 credits |
| `project_badge` | 25 credits |

These are development examples and should be replaced or connected to approved AtDev product entitlements before production use.

## POST /internal/v1/credits

Backend-to-backend route for granting credits. It is not a user endpoint and must never be called from browser code.

Required header:

```http
x-walletie-service-token: <WALLETIE_SERVICE_TOKEN>
```

Request:

```json
{
  "owner_id": "AtDev-user-id",
  "amount": 100,
  "source": "joynexa.reward",
  "reference_id": "reward-event-123",
  "idempotency_key": "joynexa-reward-123"
}
```

The target user must already exist in AtDev Cloud. The amount must be an integer from 1 to 100000.

## Idempotency

Every mutation requires an idempotency key. Repeating the same operation with the same key returns the original transaction. Reusing a key for a different operation returns HTTP 409.

## Error responses

Errors have this shape:

```json
{ "error": "Description" }
```

Common statuses: 400 invalid request, 401 authentication failure, 404 missing user/resource, 409 insufficient balance or idempotency conflict, 413 oversized body, 500 unexpected server error.

## Not supported in V1

- Real money or monetary conversion.
- Deposits, withdrawals, cash redemption, or external transfers.
- User-to-user transfers.
- Client-side balance edits.
