import React, { useState, useEffect } from 'react';
import AccountModal from '@/components/ui/AccountModal';
import { Account, Bucket, TransactionType, Currency } from '@/types/denarius';
import { getCurrencySymbol, formatNumberWithLocale } from '@/lib/currency';
import { BanknotesIcon } from '@heroicons/react/24/outline';
import DatePicker from '@/components/ui/DatePicker';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'INCOME' | 'EXPENSE';
    accounts: Account[];
    buckets: Bucket[];
    rates: { USD: number; USDT: number };
    onSave: (amount: number, accountId: number, bucketId: number | null, description: string, targetAmount?: number, date?: string) => Promise<void>;
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
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('');
    const [bucketId, setBucketId] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [bucketAmount, setBucketAmount] = useState('');

    // Reset form when opening
    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setBucketId('');
            setBucketAmount('');
            // Set default date to today in YYYY-MM-DD
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            setDate(`${year}-${month}-${day}`);
            
            // Set default time to now HH:mm
            const hours = String(today.getHours()).padStart(2, '0');
            const minutes = String(today.getMinutes()).padStart(2, '0');
            setTime(`${hours}:${minutes}`);
            
            // Pre-select first account if available
            if (accounts.length > 0 && !accountId) {
                setAccountId(accounts[0].id);
            }
        }
    }, [isOpen, accounts, accountId]); // Added accountId to dependencies to prevent infinite loop if accountId is already set

    // Auto-calculate bucket amount on change
    useEffect(() => {
        if (!amount || !accountId || !bucketId) {
            setBucketAmount('');
            return;
        }

        const acc = accounts.find(a => String(a.id) === accountId);
        const buck = buckets.find(b => String(b.id) === bucketId);

        if (!acc || !buck || acc.currency === buck.currency) {
            setBucketAmount('');
            return;
        }

        const val = parseFloat(amount);
        if (isNaN(val)) return;

        // Conversion Logic: Account -> Bucket
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

        setBucketAmount(bucketVal.toFixed(2));

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
                bucketAmount ? parseFloat(bucketAmount) : undefined,
                date ? (() => {
                    const [y, m, d] = date.split('-').map(Number);
                    const [hours, minutes] = time.split(':').map(Number);
                    const now = new Date();
                    now.setFullYear(y);
                    now.setMonth(m - 1);
                    now.setDate(d);
                    now.setHours(hours || 0);
                    now.setMinutes(minutes || 0);
                    now.setSeconds(0);
                    return now.toISOString();
                })() : undefined
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
                {/* Date & Time Picker (Row) */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Fecha</label>
                        <DatePicker 
                            id="transaction-date"
                            value={date}
                            onChange={setDate}
                            placeholder="Fecha"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Hora</label>
                        <input 
                            type="time" 
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full input-modern p-3 rounded-xl text-white bg-slate-800 border border-slate-700 focus:border-indigo-500 [color-scheme:dark]"
                        />
                    </div>
                </div>

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
                    {/* Cross Currency Input */}
                    {accountId && bucketId && accounts.find(a => String(a.id) === accountId)?.currency !== buckets.find(b => String(b.id) === bucketId)?.currency && (
                        <div className="animate-fade-in relative bg-slate-800/50 p-3 rounded-xl border border-dashed border-slate-700/50">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                Monto en {buckets.find(b => String(b.id) === bucketId)?.currency || 'Bucket'} (Deducción)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-sm">
                                    {getCurrencySymbol(buckets.find(b => String(b.id) === bucketId)?.currency || 'USD')}
                                </span>
                                <input
                                    type="number"
                                    value={bucketAmount}
                                    onChange={(e) => setBucketAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 pl-8 pr-3 font-mono text-white focus:border-indigo-500 outline-none text-right"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Description */}
                <div>
                    <div className="flex justify-between mb-1 ml-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">Descripción</label>
                        <div className="flex gap-2">
                            {['Comida', 'Pasaje', 'Cashea', 'Ruta', 'Vamos'].map(tag => (
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
                    disabled={!amount || !accountId || !description.trim() || !date || loading}
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
