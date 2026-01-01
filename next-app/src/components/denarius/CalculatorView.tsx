'use client';

import { useState, useEffect } from 'react';
import { Currency } from '@/types/denarius';
import { formatNumberWithLocale } from '@/lib/currency';
import { ArrowPathIcon, ArrowsUpDownIcon, CalculatorIcon } from '@heroicons/react/24/outline';

interface CalculatorViewProps {
    rates: {
        USD: number;
        USDT: number;
    };
    onRefreshRates?: () => Promise<void>;
}

export default function CalculatorView({
    rates,
    onRefreshRates,
}: CalculatorViewProps) {
    const [amount, setAmount] = useState<string>('');
    const [fromCurrency, setFromCurrency] = useState<Currency>('USD');
    const [toCurrency, setToCurrency] = useState<Currency>('VES');
    const [result, setResult] = useState<string>('0,00');
    const [rateInfo, setRateInfo] = useState<string>('');
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Run calculator whenever inputs change
    useEffect(() => {
        runCalculator();
    }, [amount, fromCurrency, toCurrency, rates]);

    const runCalculator = () => {
        const amountValue = parseFloat(amount) || 0;

        if (amountValue === 0) {
            setResult('0,00');
            setRateInfo('');
            return;
        }

        let resultValue = 0;
        let rateInfoText = '';

        if (fromCurrency === toCurrency) {
            resultValue = amountValue;
            rateInfoText = '1:1';
        } else {
            // Convert 'from' amount to base currency (USD)
            let amountInUSD: number;
            if (fromCurrency === 'USD') {
                amountInUSD = amountValue;
            } else if (fromCurrency === 'VES') {
                amountInUSD = amountValue / rates.USD;
            } else if (fromCurrency === 'USDT') {
                amountInUSD = (amountValue * rates.USDT) / rates.USD;
            } else {
                amountInUSD = amountValue;
            }

            // Convert from base (USD) to 'to' currency
            if (toCurrency === 'USD') {
                resultValue = amountInUSD;
                rateInfoText = 'Tasa base';
            } else if (toCurrency === 'VES') {
                resultValue = amountInUSD * rates.USD;
                rateInfoText = `1 USD = ${formatNumberWithLocale(rates.USD)} VES`;
            } else if (toCurrency === 'USDT') {
                resultValue = (amountInUSD * rates.USD) / rates.USDT;
                rateInfoText = `1 USD = ${formatNumberWithLocale(rates.USD / rates.USDT, 4)} USDT`;
            }
        }

        setResult(formatNumberWithLocale(resultValue));
        setRateInfo(rateInfoText);
    };

    const swapCurrencies = () => {
        const temp = fromCurrency;
        setFromCurrency(toCurrency);
        setToCurrency(temp);
    };

    const handleRefreshRates = async () => {
        if (!onRefreshRates) return;

        setIsRefreshing(true);
        try {
            await onRefreshRates();
        } catch (error) {
            console.error('Error refreshing rates:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <div id="view-calculator" className="animate-fade-in h-full flex flex-col justify-center">
            <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative bg-gradient-to-b from-slate-800/80 to-slate-900/90 backdrop-blur-xl overflow-hidden group/card">

                {/* Decorative Background Elements */}
                <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none group-hover/card:bg-indigo-500/30 transition duration-1000"></div>
                <div className="absolute bottom-[-20%] left-[-20%] w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover/card:bg-emerald-500/20 transition duration-1000"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white/[0.02] pointer-events-none select-none z-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-80 w-80 rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* Header */}
                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <CalculatorIcon className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Conversor</h3>
                    </div>
                    {onRefreshRates && (
                        <button
                            onClick={handleRefreshRates}
                            disabled={isRefreshing}
                            className="w-8 h-8 rounded-full bg-slate-800 text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all flex items-center justify-center disabled:opacity-50"
                            title="Actualizar tasas"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>

                <div className="space-y-4 relative">
                    {/* From Section */}
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 transition focus-within:border-indigo-500/50 focus-within:bg-black/30 group">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 px-1">
                            De
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-transparent text-3xl font-mono font-bold text-white placeholder-slate-700 outline-none"
                                placeholder="0"
                            />
                            <div className="relative">
                                <select
                                    value={fromCurrency}
                                    onChange={(e) => setFromCurrency(e.target.value as Currency)}
                                    className="appearance-none bg-slate-800 text-white font-bold py-2 px-4 pr-8 rounded-xl outline-none cursor-pointer border border-transparent hover:border-slate-600 transition"
                                >
                                    <option value="USD">USD</option>
                                    <option value="VES">VES</option>
                                    <option value="USDT">USDT</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Swap Button (Floating) */}
                    <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 z-10">
                        <button
                            onClick={swapCurrencies}
                            className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30 border-[6px] border-[#13161c] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
                        >
                            <ArrowsUpDownIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* To Section */}
                    <div className="bg-black/20 p-4 rounded-2xl border border-white/5 transition group hover:bg-black/30 pt-8 mt-2">
                        <div className="flex justify-between items-start mb-2 px-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">
                                A
                            </label>
                        </div>
                        <div className="flex gap-3 items-center">
                            <div className="w-full">
                                <p className="text-3xl font-mono font-bold text-emerald-400 truncate">
                                    {amount ? result : '0,00'}
                                </p>
                            </div>
                            <div className="relative">
                                <select
                                    value={toCurrency}
                                    onChange={(e) => setToCurrency(e.target.value as Currency)}
                                    className="appearance-none bg-slate-800 text-white font-bold py-2 px-4 pr-8 rounded-xl outline-none cursor-pointer border border-transparent hover:border-slate-600 transition"
                                >
                                    <option value="VES">VES</option>
                                    <option value="USD">USD</option>
                                    <option value="USDT">USDT</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Info */}
                {rateInfo && (
                    <div className="mt-6 text-center animate-fade-in">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
                            {rateInfo}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
