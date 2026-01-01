import React, { useState, useEffect } from 'react';
import AccountModal from '@/components/ui/AccountModal';
import { Account, Bucket, TransactionType, Currency } from '@/types/denarius';
import { getCurrencySymbol, formatNumberWithLocale } from '@/lib/currency';
import { BanknotesIcon } from '@heroicons/react/24/outline';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'INCOME' | 'EXPENSE';
    accounts: Account[];
    buckets: Bucket[];
    rates: { USD: number; USDT: number };
    onSave: (amount: number, accountId: number, bucketId: number | null, description: string, targetAmount?: number) => Promise<void>;
    onRequestSettle?: () => void;
}

export default function TransactionModal({
    isOpen,
    onClose,
    type,
    accounts,
    buckets,
    rates,
    onSave,
    onRequestSettle,
}: TransactionModalProps) {
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('');
    const [bucketId, setBucketId] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [autoBucketAmount, setAutoBucketAmount] = useState<string | null>(null);

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setBucketId('');
            setAutoBucketAmount(null);
            // Pre-select first account if available
            if (accounts.length > 0 && !accountId) {
                setAccountId(accounts[0].id);
            }
        }
    }, [isOpen, accounts, accountId]); // Added accountId to dependencies to prevent infinite loop if accountId is already set

    // Auto-calculate bucket amount on change
    useEffect(() => {
        if (!amount || !accountId || !bucketId) {
            setAutoBucketAmount(null);
            return;
        }

        const acc = accounts.find(a => String(a.id) === accountId);
        const buck = buckets.find(b => String(b.id) === bucketId);

        if (!acc || !buck || acc.currency === buck.currency) {
            setAutoBucketAmount(null);
            return;
        }

        const val = parseFloat(amount);
        if (isNaN(val)) return;

        // Conversion Logic: Account -> Bucket
        // Spending FROM Account (Source Value) -> TO Bucket (Target Value? No, Expenses reduce both).
        // If I spend 100 VES from VES Account, I am reducing X USD from USD Bucket.
        // So we need to convert VES Amount -> USD Amount.

        // Base currency map (simplified for VES/USD/USDT)
        let valInVes = val;
        // 1. Convert Account Amount to VES
        if (acc.currency === 'USD') valInVes = val * rates.USD;
        else if (acc.currency === 'USDT') valInVes = val * rates.USDT;
        // else VES is already VES

        // 2. Convert VES to Bucket Currency
        let bucketVal = valInVes;
        if (buck.currency === 'USD') bucketVal = valInVes / rates.USD;
        else if (buck.currency === 'USDT') bucketVal = valInVes / rates.USDT;
        else if (buck.currency === 'VES') bucketVal = valInVes;

        setAutoBucketAmount(bucketVal.toFixed(2));

    }, [amount, accountId, bucketId, accounts, buckets, rates]);

    const handleSubmit = async () => {
        if (!amount || !accountId || !description.trim()) return;

        setLoading(true);
        try {
            await onSave(
                parseFloat(amount),
                parseInt(accountId),
                bucketId ? parseInt(bucketId) : null,
                description,
                autoBucketAmount ? parseFloat(autoBucketAmount) : undefined
            );
            onClose();
        } catch (error) {
            console.error(error);
            alert('Error al guardar la transacción');
        } finally {
            setLoading(false);
        }
    };


    const selectedAccount = accounts.find(a => a.id === accountId);
    const currencySymbol = selectedAccount ? getCurrencySymbol(selectedAccount.currency) : '$';

    return (
        <AccountModal
            isOpen={isOpen}
            onClose={onClose}
            title={type === 'INCOME' ? 'Registrar Ingreso' : 'Registrar Gasto'}
        >
            <div className="space-y-4">
                {/* Account Selection */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Cuenta</label>
                    <select
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        className="w-full input-modern p-3 rounded-xl text-white bg-slate-800 border border-slate-700 focus:border-indigo-500"
                    >
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name} ({getCurrencySymbol(acc.currency)} {formatNumberWithLocale(Number(acc.balance))})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Monto</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                                {currencySymbol}
                            </span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full input-modern p-3 pl-10 rounded-xl text-white placeholder-slate-600 font-mono text-lg"
                            />
                        </div>
                        {onRequestSettle && (
                            <button
                                onClick={onRequestSettle}
                                className="bg-slate-700 hover:bg-slate-600 text-indigo-400 p-3 rounded-xl transition flex items-center justify-center border border-slate-600"
                                title="Pagar Deuda / Cobrar Préstamo"
                            >
                                <BanknotesIcon className="w-6 h-6" />
                            </button>
                        )}
                    </div>
                    {autoBucketAmount && (
                        <div className="mt-2 text-xs text-indigo-300 bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20">
                            Se usaran {getCurrencySymbol(buckets.find(b => String(b.id) === bucketId)?.currency || 'USD')} {formatNumberWithLocale(parseFloat(autoBucketAmount))} del bucket.
                        </div>
                    )}
                </div>

                {/* Description */}
                <div>
                    <div className="flex justify-between mb-1 ml-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Descripción</label>
                        <div className="flex gap-2">
                            {['Comida', 'Pasaje', 'Cashea', 'Servicios', 'Ocio'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => setDescription(tag)}
                                    className="text-[10px] bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-0.5 rounded transition"
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descripción del movimiento..."
                        className="w-full input-modern p-3 rounded-xl text-white placeholder-slate-600"
                    />
                </div>

                {/* Bucket Selection (Optional) */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Bucket (Opcional)</label>
                    <select
                        value={bucketId}
                        onChange={(e) => setBucketId(e.target.value)}
                        className="w-full input-modern p-3 rounded-xl text-white bg-slate-800 border border-slate-700 focus:border-indigo-500"
                    >
                        <option value="">Sin Bucket</option>
                        {buckets.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!amount || !accountId || !description.trim() || loading}
                    className={`w-full font-bold py-4 rounded-2xl shadow-lg transition transform active:scale-95 disabled:opacity-50 ${type === 'INCOME'
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20 text-white'
                        }`}
                >
                    {loading ? 'Guardando...' : (type === 'INCOME' ? 'Registrar Ingreso' : 'Registrar Gasto')}
                </button>
            </div>
        </AccountModal>
    );
}
