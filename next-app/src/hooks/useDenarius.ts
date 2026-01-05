'use client';

import { useState, useEffect } from 'react';
import { denariusApi } from '@/lib/api';
import {
    Account,
    Bucket,
    Transaction,
    WishlistItem,
    BalanceSheet,
    TransactionFilters,
    Currency,
    TransactionType,
} from '@/types/denarius';

interface DenariusData {
    accounts: Account[];
    buckets: Bucket[];
    transactions: Transaction[];
    wishlist: WishlistItem[];
}

export function useDenarius() {
    const [data, setData] = useState<DenariusData>({
        accounts: [],
        buckets: [],
        transactions: [],
        wishlist: [],
    });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [accounts, buckets, transactions, wishlist] = await Promise.all([
                denariusApi.get<Account[]>('/accounts'),
                denariusApi.get<Bucket[]>('/buckets'),
                denariusApi.get<Transaction[]>('/transactions'),
                denariusApi.get<WishlistItem[]>('/wishlist'),
            ]);

            setData({ accounts, buckets, transactions, wishlist });
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Account operations
    const createAccount = async (
        name: string,
        type: string,
        currency: Currency,
        initialBalance: number = 0,
        startDate: string | null = null,
        dueDate: string | null = null
    ) => {
        const payload = {
            name,
            type,
            currency,
            balance: 0,
            start_date: startDate || null,
            due_date: dueDate || null,
        };

        try {
            const created = await denariusApi.post<Account>('/accounts', payload);

            if (initialBalance && initialBalance > 0) {
                if (type === 'ASSET') {
                    // For ASSET accounts, create an INCOME transaction
                    await addTransaction(
                        initialBalance,
                        'INCOME',
                        parseInt(created.id),
                        null,
                        'Saldo Inicial'
                    );
                } else if (type === 'RECEIVABLE' || type === 'LIABILITY') {
                    // For RECEIVABLE/LIABILITY, update balance directly
                    await denariusApi.put(`/accounts/${created.id}`, {
                        balance: initialBalance
                    });
                    await fetchData();
                }
            } else {
                await fetchData();
            }
        } catch (error) {
            console.error('Error creating account:', error);
            throw error;
        }
    };

    const updateAccount = async (id: string, values: Partial<Account>) => {
        try {
            await denariusApi.put(`/accounts/${id}`, values);
            await fetchData();
        } catch (error) {
            console.error('Error updating account:', error);
            throw error;
        }
    };

    const deleteAccount = async (id: string) => {
        try {
            await denariusApi.delete(`/accounts/${id}`);
            await fetchData();
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    };

    // Bucket operations
    const createBucket = async (name: string, currency: Currency, initialBalance: number = 0) => {
        try {
            const created = await denariusApi.post<Bucket>('/buckets', {
                name,
                currency,
                balance: 0,
            });

            if (initialBalance && initialBalance > 0) {
                await addTransaction(
                    parseFloat(String(initialBalance)),
                    'INCOME',
                    null,
                    parseInt(created.id),
                    'Fondo Inicial'
                );
            } else {
                await fetchData();
            }
        } catch (error) {
            console.error('Error creating bucket:', error);
            throw error;
        }
    };

    const updateBucket = async (id: string, values: Partial<Bucket>) => {
        try {
            await denariusApi.put(`/buckets/${id}`, values);
            await fetchData();
        } catch (error) {
            console.error('Error updating bucket:', error);
            throw error;
        }
    };

    const deleteBucket = async (id: string) => {
        try {
            await denariusApi.delete(`/buckets/${id}`);
            await fetchData();
        } catch (error) {
            console.error('Error deleting bucket:', error);
            throw error;
        }
    };

    const transferBucket = async (sourceBucketId: number, targetBucketId: number, amount: number, targetAmount?: number) => {
        try {
            await denariusApi.post('/transactions', {
                date: new Date().toISOString(),
                amount: parseFloat(String(amount)),
                type: 'bucket_move',
                account_id: null,
                bucket_id: targetBucketId,
                source_bucket_id: sourceBucketId,
                description: 'Transferencia entre presupuestos',
                target_amount: targetAmount !== undefined ? parseFloat(String(targetAmount)) : undefined
            });
            await fetchData();
        } catch (error) {
            console.error('Error transferring between buckets:', error);
            throw error;
        }
    };

    // Transaction operations
    const addTransaction = async (
        amount: number,
        type: TransactionType,
        accountId: number | null,
        bucketId: number | null,
        description: string,
        targetAmount?: number
    ) => {
        amount = parseFloat(String(amount));

        if ((type === 'INCOME' || type === 'EXPENSE') && accountId !== null) {
            // Debugging logs
            console.log('addTransaction Debug:', { accountId, type, accountsCount: data.accounts.length });

            const account = data.accounts.find((a) => String(a.id) === String(accountId));

            console.log('Found account:', account);

            if (!account || (account.type !== 'ASSET' && account.type !== 'LIABILITY' && account.type !== 'RECEIVABLE')) {
                console.error(
                    'Para ingresos/egresos, seleccione una cuenta de tipo ASSET, LIABILITY o RECEIVABLE.',
                    { accountId, foundAccount: account }
                );
                return;
            }
        }

        try {
            await denariusApi.post('/transactions', {
                date: new Date().toISOString(),
                amount,
                type,
                account_id: accountId,
                bucket_id: bucketId,
                source_bucket_id: null,
                description,
                target_amount: targetAmount
            });
            await fetchData();
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    };

    const updateTransaction = async (id: string, values: Partial<Transaction>) => {
        try {
            await denariusApi.put(`/transactions/${id}`, values);
            await fetchData();
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    };

    const deleteTransaction = async (id: string) => {
        try {
            await denariusApi.delete(`/transactions/${id}`);
            await fetchData();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    };

    const getTransactionsByAccount = async (accountId: string, limit: number = 5) => {
        try {
            const transactions = await denariusApi.get<Transaction[]>('/transactions', {
                account_id: accountId,
                limit: String(limit),
            });
            // Double-check: Strict frontend filtering to avoid "ghost" transactions from other accounts
            return transactions.filter(tx => String(tx.account_id) === String(accountId));
        } catch (error) {
            console.error('Error fetching transactions for account:', error);
            return [];
        }
    };

    // Wishlist operations
    const addWishlistItem = async (
        product_name: string,
        price: number,
        currency: Currency,
        details: string
    ) => {
        try {
            await denariusApi.post('/wishlist', {
                product_name,
                price,
                currency,
                details,
            });
            await fetchData();
        } catch (error) {
            console.error('Error adding wishlist item:', error);
            throw error;
        }
    };

    const updateWishlistItem = async (
        id: string,
        data: Partial<WishlistItem>
    ) => {
        try {
            await denariusApi.put(`/wishlist/${id}`, data);
            await fetchData();
        } catch (error) {
            console.error('Error updating wishlist item:', error);
            throw error;
        }
    };

    const deleteWishlistItem = async (id: string) => {
        try {
            await denariusApi.delete(`/wishlist/${id}`);
            await fetchData();
        } catch (error) {
            console.error('Error deleting wishlist item:', error);
            throw error;
        }
    };

    // Balance sheet calculation
    const getBalanceSheet = (
        globalCurrency: Currency,
        rateUSD: number,
        rateUSDT: number
    ): BalanceSheet => {
        const convert = (amount: number, currency: Currency) => {
            if (currency === globalCurrency) return amount;
            if (globalCurrency === 'VES') {
                if (currency === 'USD') return amount * rateUSD;
                if (currency === 'USDT') return amount * rateUSDT;
            }
            if (globalCurrency === 'USD') {
                if (currency === 'VES') return amount / rateUSD;
                if (currency === 'USDT') return (amount * rateUSDT) / rateUSD;
            }
            if (globalCurrency === 'USDT') {
                if (currency === 'VES') return amount / rateUSDT;
                if (currency === 'USD') return (amount * rateUSD) / rateUSDT;
            }
            return amount;
        };

        let assets = 0,
            liabilities = 0,
            receivables = 0;

        data.accounts.forEach((acc) => {
            const val = convert(acc.balance, acc.currency);
            console.log(`Account: ${acc.name}, Type: ${acc.type}, Balance: ${acc.balance}, Currency: ${acc.currency}, Converted to ${globalCurrency}: ${val}, Rate USD: ${rateUSD}, Rate USDT: ${rateUSDT}`);
            if (acc.type === 'ASSET') assets += val;
            else if (acc.type === 'LIABILITY') liabilities += Math.abs(val);
            else if (acc.type === 'RECEIVABLE') receivables += Math.abs(val);
        });

        const equity = assets + receivables - liabilities;
        console.log(`Balance Sheet in ${globalCurrency}: Assets=${assets}, Liabilities=${liabilities}, Receivables=${receivables}, Equity=${equity}`);
        return { assets, liabilities, receivables, equity };
    };

    // Transaction filtering
    const filterTransactions = (filters: TransactionFilters): Transaction[] => {
        return data.transactions.filter((tx) => {
            if (
                filters.search &&
                !tx.description.toLowerCase().includes(filters.search.toLowerCase())
            )
                return false;

            const txDate = new Date(tx.date);

            if (filters.start) {
                const [y, m, d] = filters.start.split('-').map(Number);
                if (txDate < new Date(y, m - 1, d)) return false;
            }

            if (filters.end) {
                const [y, m, d] = filters.end.split('-').map(Number);
                const ed = new Date(y, m - 1, d);
                ed.setHours(23, 59, 59, 999);
                if (txDate > ed) return false;
            }

            if (filters.type !== 'ALL') {
                if (
                    filters.type === 'INCOME' &&
                    !(tx.type.includes('INCOME') || tx.type.includes('TRANSFER_IN'))
                )
                    return false;
                if (
                    filters.type === 'EXPENSE' &&
                    !(tx.type.includes('EXPENSE') || tx.type.includes('TRANSFER_OUT'))
                )
                    return false;
            }

            if (filters.bucket !== 'ALL')
                if (String(tx.bucket_id) !== filters.bucket) return false;

            if (filters.min && tx.amount < parseFloat(filters.min)) return false;
            if (filters.max && tx.amount > parseFloat(filters.max)) return false;

            return true;
        });
    };

    return {
        ...data,
        loading,
        fetchData,
        createAccount,
        updateAccount,
        deleteAccount,
        createBucket,
        updateBucket,
        deleteBucket,
        transferBucket,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addWishlistItem,
        updateWishlistItem,
        deleteWishlistItem,
        getBalanceSheet,
        filterTransactions,
        getTransactionsByAccount,
    };
}
