# AtDev Cloud reward bridge

AtDev Cloud can act as a trusted gateway between reward-producing AtDev backends and Walletie.

## Flow

1. A product backend verifies its own event (for example, a completed lesson or game achievement).
2. That backend calls AtDev Cloud `POST /internal/v1/walletie/grants` with its private `ATDEV_REWARDS_TOKEN`.
3. AtDev Cloud forwards the grant to Walletie using `WALLETIE_SERVICE_TOKEN`.
4. Walletie validates the target user, applies idempotency, updates the balance and writes the transaction ledger.

The browser and mobile client must never receive either service token. Products must not edit Walletie's D1 tables directly.

See the [AtDev Cloud bridge documentation](https://github.com/Reaccionador2Jeje/atdev-cloud/blob/main/docs/WALLETIE_REWARD_BRIDGE.md).
