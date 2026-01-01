// Account types
export type AccountType = 'ASSET' | 'LIABILITY' | 'RECEIVABLE';

// Transaction types
export type TransactionType =
    | 'INCOME'
    | 'EXPENSE'
    | 'TRANSFER_IN'
    | 'TRANSFER_OUT'
    | 'bucket_move';

// Currency types
export type Currency = 'USD' | 'VES' | 'USDT';

// Account interface
export interface Account {
    id: string;
    name: string;
    type: AccountType;
    currency: Currency;
    balance: number;
    start_date: string | null;
    due_date: string | null;
    created_at: string;
}

// Bucket interface
export interface Bucket {
    id: string;
    name: string;
    balance: number;
    currency: Currency;
    created_at: string;
}

// Transaction interface
export interface Transaction {
    id: string;
    date: string;
    amount: number;
    type: TransactionType;
    account_id: number | null;
    bucket_id: number | null;
    source_bucket_id: number | null;
    description: string;
    target_amount?: number;
    created_at: string;
}

// Wishlist item interface
export interface WishlistItem {
    id: string;
    product_name: string;
    price: number;
    currency: Currency;
    details: string | null;
    created_at: string;
}

// Balance sheet interface
export interface BalanceSheet {
    assets: number;
    liabilities: number;
    receivables: number;
    equity: number;
}

// Transaction filters
export interface TransactionFilters {
    search?: string;
    start?: string;
    end?: string;
    type?: 'ALL' | 'INCOME' | 'EXPENSE';
    bucket?: string;
    min?: string;
    max?: string;
}
