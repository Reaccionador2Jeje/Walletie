# AtDev Billing compatibility — Walletie

**Status:** design note only. Walletie credits remain virtual units with no monetary value.

## Boundary between Billing and Walletie

Walletie is not a payment processor and must not be used to collect money, redeem cash, transfer funds externally, or pay real-money subscriptions. AtDev Billing subscriptions must be handled by a compliant external payment provider when legally and operationally available.

Walletie may optionally grant non-cash promotional credits for in-product activities, but those credits must never unlock paid subscription entitlements, be represented as currency, or be sold as a substitute for a payment method.

## Integration contract

- Keep the existing wallet ledger and service-authenticated grant model.
- Use separate namespaces for promotional credits and subscription entitlements.
- Never accept client-submitted balance changes or grant requests.
- Record grant source, reason, idempotency key, and timestamp.
- Do not store card, bank, or payment-provider credentials in Walletie.
- If Billing is unavailable, wallet transactions must continue under their existing authorization rules; no subscription state is inferred from wallet balance.

## Launch gates

Require abuse controls, replay/idempotency tests, audit logging, and clear user-facing disclosure that credits have no cash value. Real-money payment integration belongs in a separate Billing service and requires adult account-owner review of provider eligibility and legal/tax obligations.
