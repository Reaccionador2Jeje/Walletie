export interface WalletieOptions {
  /** HTTPS base URL of the Walletie Worker. */
  baseUrl: string;
  /** Return the current AtDev Cloud access token; do not persist it in the SDK. */
  getAccessToken: () => string | Promise<string>;
  /** Optional Fetch-compatible implementation for tests or custom runtimes. */
  fetchImpl?: typeof fetch;
}

export interface WalletieWallet {
  wallet: {
    id: string;
    balance: number;
    status: "active" | "suspended";
    unit: "ATDEV_CREDITS";
    monetary_value: false;
    created_at: string;
  };
}

export interface WalletieTransaction {
  id: string;
  type: "credit" | "spend" | "adjustment";
  amount: number;
  balance_after: number;
  source: string;
  reference_id: string | null;
  created_at: string;
}

export interface WalletieTransactions {
  transactions: WalletieTransaction[];
  limit: number;
}

export interface WalletieSpendResult {
  transaction: {
    id: string;
    type: "spend";
    amount: number;
    source: string;
    balance_after: number;
  };
  replayed: boolean;
  wallet_id: string;
}

export interface WalletieSpendOptions {
  /** Reuse the same key when retrying the same logical purchase. */
  idempotencyKey?: string;
}

export class WalletieError extends Error {
  status: number;
  code: string;
  details: unknown;
}

export function createIdempotencyKey(): string;

export class Walletie {
  constructor(options: WalletieOptions);
  getWallet(): Promise<WalletieWallet>;
  getTransactions(options?: { limit?: number; before?: string }): Promise<WalletieTransactions>;
  spend(sku: string, options?: WalletieSpendOptions): Promise<WalletieSpendResult>;
}

export default Walletie;
