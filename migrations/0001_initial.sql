-- Walletie V1: AtDev ecosystem credits only; no monetary value.
-- owner_id comes from the trusted AtDev identity layer.

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'spend', 'adjustment')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  source TEXT NOT NULL,
  reference_id TEXT,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  UNIQUE (wallet_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_history
  ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_source
  ON wallet_transactions(source, reference_id);
