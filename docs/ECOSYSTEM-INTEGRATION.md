# Walletie — Ecosystem Integration

Status: planning only; current virtual-credit semantics remain unchanged.

## Boundary
Walletie credits are virtual units with no monetary value. Do not add deposits, withdrawals, cash redemption or external transfers as part of ecosystem integration.

## Integration order
1. Complete AtDev Cloud service-to-service authentication and ownership checks.
2. Define a stable service identity and auditable grant reason.
3. Add idempotency keys to grant/spend flows before retryable integrations.
4. Validate account mapping before any AtDev Accounts OIDC integration.
5. Add API and SDK integration tests before connecting Joynexa or other products.

## Security requirements
- Never trust client-supplied prices or balances.
- Enforce server-side authorization and transaction limits.
- Keep service credentials secret and scoped.
- Make transaction history auditable and append-only where possible.
- Document duplicate-request and retry behavior.