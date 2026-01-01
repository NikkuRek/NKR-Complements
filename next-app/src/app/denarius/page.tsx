'use client';

import { useState, useEffect } from 'react';
import { useDenarius } from '@/hooks/useDenarius';
import Header from '@/components/layout/Header';
import AccountsView from '@/components/denarius/AccountsView';
import BudgetsView from '@/components/denarius/BudgetsView';
import TransactionsView from '@/components/denarius/TransactionsView';
import WishlistView from '@/components/denarius/WishlistView';
import CalculatorView from '@/components/denarius/CalculatorView';
import StatisticsView from '@/components/denarius/StatisticsView';
import {
    BanknotesIcon,
    ArchiveBoxIcon,
    ArrowsRightLeftIcon,
    HeartIcon,
    CalculatorIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const DOLAR_API_URL = process.env.NEXT_PUBLIC_DOLAR_API_URL || 'https://ve.dolarapi.com/v1/dolares';

type View = 'accounts' | 'budgets' | 'transactions' | 'wishlist' | 'calculator' | 'statistics';

export default function DenariusPage() {
    const [currentView, setCurrentView] = useState<View>('accounts');
    const [rates, setRates] = useState({ USD: 1, USDT: 1 });
    const [loadingRates, setLoadingRates] = useState({ USD: false, USDT: false });
    const denarius = useDenarius();

    // Fetch USD official rate
    const fetchUsdOfficial = async (silent: boolean = false) => {
        setLoadingRates(prev => ({ ...prev, USD: true }));
        try {
            const res = await fetch(`${DOLAR_API_URL}/oficial`);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const val = parseFloat(data?.promedio);
            if (!val || isNaN(val)) throw new Error('Tasa no válida');
            setRates(prev => ({ ...prev, USD: val }));
            console.log('Tasa oficial cargada:', val);
        } catch (err) {
            console.error('Error al obtener tasa oficial:', err);
            if (!silent) {
                alert('No se pudo obtener la tasa oficial del dólar.');
            }
        } finally {
            setLoadingRates(prev => ({ ...prev, USD: false }));
        }
    };

    // Fetch USDT paralelo rate
    const fetchUsdtParalelo = async (silent: boolean = false) => {
        setLoadingRates(prev => ({ ...prev, USDT: true }));
        try {
            const res = await fetch(`${DOLAR_API_URL}/paralelo`);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const val = parseFloat(data?.promedio);
            if (!val || isNaN(val)) throw new Error('Tasa no válida');
            setRates(prev => ({ ...prev, USDT: val }));
            console.log('Tasa paralelo cargada:', val);
        } catch (err) {
            console.error('Error al obtener tasa paralelo:', err);
            if (!silent) {
                alert('No se pudo obtener la tasa paralelo (USDT).');
            }
        } finally {
            setLoadingRates(prev => ({ ...prev, USDT: false }));
        }
    };

    // Refresh both rates
    const refreshRates = async (silent: boolean = false) => {
        await Promise.all([
            fetchUsdOfficial(silent),
            fetchUsdtParalelo(silent)
        ]);
    };

    // Dynamic Title Update
    useEffect(() => {
        const titles: Record<View, string> = {
            accounts: 'Denarius - Cuentas',
            budgets: 'Denarius - Presupuestos',
            transactions: 'Denarius - Transacciones',
            wishlist: 'Denarius - Wishlist',
            calculator: 'Denarius - Conversor',
            statistics: 'Denarius - Estadísticas',
        };
        document.title = titles[currentView] || 'Denarius';
    }, [currentView]);

    // Auto-fetch rates on component mount (page load/refresh)
    useEffect(() => {
        refreshRates(true); // Silent mode: don't show alerts on auto-fetch
        denarius.fetchData(); // Fetch initial data for denarius hook
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array means this runs once on mount

    const navItems = [
        { id: 'accounts' as View, label: 'Cuentas', icon: BanknotesIcon },
        { id: 'budgets' as View, label: 'Presupuesto', icon: ArchiveBoxIcon },
        {
            id: 'transactions' as View,
            label: 'Transacciones',
            icon: ArrowsRightLeftIcon,
        },
        { id: 'wishlist' as View, label: 'Wishlist', icon: HeartIcon },
        { id: 'calculator' as View, label: 'Conversor', icon: CalculatorIcon },
        { id: 'statistics' as View, label: 'Insights AI', icon: ChartBarIcon },
    ];

    return (
        <div className="min-h-screen bg-slate-800 text-slate-100 flex flex-col">
            {/* ... Header ... */}
            <Header
                title={
                    <span>
                        Dena<span className="text-blue-500">rius</span>
                    </span>
                }
                subtitle=""
                showBack={true}
                showRefresh={true}
                onRefresh={denarius.fetchData}
            />

            <main className="flex-1 overflow-y-auto hide-scrollbar p-6 pb-28">
                <div className="max-w-3xl mx-auto">
                    {denarius.loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
                        </div>
                    ) : (
                        <>
                            {currentView === 'accounts' && (
                                <AccountsView
                                    accounts={denarius.accounts}
                                    onCreateAccount={denarius.createAccount}
                                    onUpdateAccount={denarius.updateAccount}
                                    onDeleteAccount={denarius.deleteAccount}
                                    getTransactionsByAccount={denarius.getTransactionsByAccount}
                                    rates={rates}
                                    loadingRates={loadingRates}
                                    onFetchUsdRate={fetchUsdOfficial}
                                    onFetchUsdtRate={fetchUsdtParalelo}
                                    onSetRate={(currency: 'USD' | 'USDT', value: number) => {
                                        setRates(prev => ({ ...prev, [currency]: value }));
                                    }}
                                    buckets={denarius.buckets}
                                    onAddTransaction={denarius.addTransaction}
                                />
                            )}
                            {currentView === 'budgets' && (
                                <BudgetsView
                                    buckets={denarius.buckets}
                                    onCreateBucket={denarius.createBucket}
                                    onUpdateBucket={denarius.updateBucket}
                                    onDeleteBucket={denarius.deleteBucket}
                                    onTransferBucket={denarius.transferBucket}
                                    rates={rates}
                                    accounts={denarius.accounts}
                                />
                            )}
                            {currentView === 'transactions' && (
                                <TransactionsView
                                    transactions={denarius.transactions}
                                    buckets={denarius.buckets}
                                    accounts={denarius.accounts}
                                    onDeleteTransaction={denarius.deleteTransaction}
                                />
                            )}
                            {currentView === 'wishlist' && (
                                <WishlistView
                                    wishlist={denarius.wishlist}
                                    onAddItem={denarius.addWishlistItem}
                                    onUpdateItem={denarius.updateWishlistItem}
                                    onDeleteItem={denarius.deleteWishlistItem}
                                />
                            )}
                            {currentView === 'calculator' && (
                                <CalculatorView
                                    rates={rates}
                                    onRefreshRates={refreshRates}
                                />
                            )}
                            {currentView === 'statistics' && (
                                <StatisticsView
                                    transactions={denarius.transactions}
                                    accounts={denarius.accounts}
                                    buckets={denarius.buckets}
                                    apiKey={GEMINI_API_KEY}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>
            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 z-20">
                <div className="max-w-3xl mx-auto grid grid-cols-6 gap-1 p-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setCurrentView(item.id)}
                                className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition ${isActive
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                <Icon className="w-5 h-5" />
                                <span className="text-xs font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
