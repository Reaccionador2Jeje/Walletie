# Walletie identity compatibility

## Current V1 authentication

Walletie currently accepts **AtDev Cloud HS256 access tokens only**. It verifies the signature with the shared JWT_SECRET, checks expiry and subject, then confirms that the subject exists in the AtDev Cloud D1 users table.

This is a working integration contract for products that already authenticate through AtDev Cloud. It is not yet a universal AtDev SSO implementation.

## Existing identity systems

AtDev has more than one account system today:

- **AtDev Cloud** issues HS256 bearer tokens backed by its D1 users table. This is the identity provider supported by Walletie V1.
- **AtDev Accounts** is a separate OIDC provider. Its access/ID tokens use RS256 and its own issuer, JWKS, and account database.
- **Joynexa ID** currently has its own account backend and session flow.

These systems must not be treated as interchangeable. A Joynexa session token or AtDev Accounts OIDC token cannot be passed to Walletie V1 unless Walletie explicitly supports and validates that issuer and token format.

## Target architecture: AtDev Accounts OIDC

The long-term ecosystem direction is to make AtDev Accounts the shared SSO provider and have Walletie trust a configured OIDC issuer.

Before enabling this:
1. Define the canonical immutable AtDev account subject (sub) and issuer.
2. Decide how existing AtDev Cloud and Joynexa accounts are linked to that subject. Never link accounts by an unverified email match.
3. Add explicit Walletie OIDC validation: signature from the configured JWKS, exact issuer, expected audience, expiry, and subject.
4. Add a migration-safe identity mapping so existing wallet owners keep their balances and ledger history.
5. Support key rotation and cache JWKS safely.
6. Add tests for wrong issuer, wrong audience, expired tokens, invalid signatures, unknown subjects, and account-linking conflicts.

The current D1 wallets.owner_id references the AtDev Cloud users table. A move to OIDC subjects therefore requires a planned schema migration and verified account mapping. Do not simply remove the foreign key or change owner IDs: that could orphan existing wallets.

## SDK contract

The SDK accepts a getAccessToken() callback so products do not need to store credentials inside Walletie. Until OIDC support and account mapping are implemented, this callback must return a valid AtDev Cloud V1 access token.

## Integration status

- AtDev Cloud: supported token format; trusted reward-grant integration is still pending.
- Joynexa: not authenticated to Walletie yet; requires a verified account-linking/SSO bridge.
- AtDev Accounts: target OIDC identity provider; Walletie RS256/JWKS support is not implemented yet.
- Other repositories: protocol-compatible over HTTPS, but must obtain a supported AtDev identity token before user-scoped API calls work.
