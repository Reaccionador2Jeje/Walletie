# AtDev ecosystem compatibility matrix

Walletie is the shared virtual-credit service for the AtDev ecosystem. Compatibility means a product can authenticate with AtDev identity and call the Walletie HTTPS API. It does **not** mean every product must charge credits or add a paid feature.

The repository list below reflects projects found in the connected GitHub account during the initial integration pass. New repositories should be added when discovered.

| Repository | Integration role | Priority | Notes |
|---|---|---:|---|
| [Walletie](https://github.com/Reaccionador2Jeje/Walletie) | Central wallet and ledger | Core | Owns balances, transactions, catalogue, and service authorization. |
| [atdev-cloud](https://github.com/Reaccionador2Jeje/atdev-cloud) | Identity and trusted backend | Core | Issues identity tokens and may grant validated rewards from server-side events. |
| [Joynexa](https://github.com/Reaccionador2Jeje/Joynexa) | Gaming client / reward provider | High | Wallet display, optional virtual cosmetics, and server-validated game rewards. |
| [atdev-accounts](https://github.com/Reaccionador2Jeje/atdev-accounts) | Identity integration | High | Should share or delegate to the canonical AtDev identity; must not create a second wallet. |
| [LibreCoding](https://github.com/Reaccionador2Jeje/LibreCoding) | Learning rewards | Optional | Could grant non-purchasable participation/achievement credits after server validation. Learning remains free. |
| [Memingo](https://github.com/Reaccionador2Jeje/Memingo) | Language ecosystem | Optional | Possible community achievements or optional creator rewards. |
| [Node.mgo-](https://github.com/Reaccionador2Jeje/Node.mgo-) | Runtime ecosystem | Optional | No direct wallet dependency; integrations belong in trusted services or companion apps. |
| [Memingo-IDE](https://github.com/Reaccionador2Jeje/Memingo-IDE) | Developer tool | Optional | Optional profile cosmetics or community rewards only; editor remains usable without credits. |
| [MemeCode](https://github.com/Reaccionador2Jeje/MemeCode) | Developer agent | Optional | No wallet access for the local agent by default. A companion service may integrate later. |
| [Void-Memingo](https://github.com/Reaccionador2Jeje/Void-Memingo) | OS/tooling project | Optional | No core dependency; future community reward integration only. |
| [DistroBoxer](https://github.com/Reaccionador2Jeje/DistroBoxer) | System utility | Optional | Core distro management must not depend on credits. |
| [NEXORA](https://github.com/Reaccionador2Jeje/NEXORA) | Terminal environment | Optional | No core dependency; optional ecosystem profile/reward integration. |
| [FileRadar](https://github.com/Reaccionador2Jeje/FileRadar) | Desktop utility | Optional | File analysis remains free and local; no wallet requirement. |
| [Atdev-OS-Hub](https://github.com/Reaccionador2Jeje/Atdev-OS-Hub) | Community platform | Optional | Could support optional creator/community rewards. |
| [openweb-linux](https://github.com/Reaccionador2Jeje/openweb-linux) | Browser-based OS demo | Optional | No wallet dependency; avoid adding authentication to a standalone demo without a product need. |
| [AtDev DB](https://github.com/Reaccionador2Jeje/atdev-db) | Data infrastructure | Infrastructure | Walletie currently uses the existing AtDev Cloud D1 database. AtDev DB should not own or mutate Walletie balances. A future adapter may expose read-only analytics, never direct ledger writes. |

## Integration tiers

### Tier 1 — Identity and platform
AtDev Cloud and AtDev Accounts provide a canonical identity contract. Walletie validates signed identity tokens and checks that the account exists. Do not create product-specific wallet tables.

### Tier 2 — User-facing products
Joynexa and future apps may show a user's balance and transaction history, and request purchases by server-defined SKU. Product backends may request grants after validating a reward event.

### Tier 3 — Developer tools and utilities
Memingo, IDEs, runtimes, terminals, operating-system tools, and file utilities remain fully usable without Walletie. They may add optional integrations only when there is a clear user benefit.

## Definition of compatible

A product is Walletie-compatible when it:
1. Uses the canonical AtDev identity flow.
2. Calls Walletie over HTTPS rather than editing wallet tables.
3. Uses a server-defined SKU for spending.
4. Reuses idempotency keys for retries.
5. Keeps service credentials on trusted servers only.
6. Does not make core/free functionality depend on credits.

A product is **integrated** only after its code, tests, and authentication flow have actually been connected. Listing it in this matrix means planned compatibility, not completed integration.
