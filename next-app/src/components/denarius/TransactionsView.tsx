'use client';

import { useState } from 'react';
import { Transaction, Account } from '@/types/denarius';
import { format } from 'date-fns';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ArchiveBoxIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    ArrowsRightLeftIcon,
    TrashIcon,
    CalendarIcon,
    BanknotesIcon
} from '@heroicons/react/24/outline';
import { formatNumberWithLocale, getCurrencySymbol } from '@/lib/currency';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface TransactionsViewProps {
    transactions: Transaction[];
    buckets?: any[];
    accounts?: Account[];
    onDeleteTransaction: (id: string) => Promise<void>;
}

export default function TransactionsView({
    transactions,
    buckets = [],
    accounts = [],
    onDeleteTransaction,
}: TransactionsViewProps) {
    const [filters, setFilters] = useState({
        search: '',
        type: 'ALL' as 'ALL' | 'INCOME' | 'EXPENSE',
        bucket: 'ALL',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
    });
    const [showFilters, setShowFilters] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Set date filter presets
    const setFilterDate = (range: 'week' | 'fortnight' | 'month') => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        let startDate = new Date(now);
        let endDate = new Date(now);

        if (range === 'week') {
            const day = now.getDay();
            startDate.setDate(now.getDate() - day + (day === 0 ? -6 : 1));
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
        } else if (range === 'fortnight') {
            if (now.getDate() <= 15) {
                startDate.setDate(1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 15);
            } else {
                startDate.setDate(16);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }
        } else if (range === 'month') {
            startDate.setDate(1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        const fmt = (d: Date) => d.toISOString().split('T')[0];
        setFilters({
            ...filters,
            startDate: fmt(startDate),
            endDate: fmt(endDate),
        });
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            search: '',
            type: 'ALL',
            bucket: 'ALL',
            startDate: '',
            endDate: '',
            minAmount: '',
            maxAmount: '',
        });
    };

    // Apply filters
    const filteredTransactions = transactions.filter((tx) => {
        // Search filter
        if (
            filters.search &&
            !tx.description.toLowerCase().includes(filters.search.toLowerCase())
        )
            return false;

        // Type filter
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

        // Date range filter
        if (filters.startDate) {
            const txDate = new Date(tx.date);
            txDate.setHours(0, 0, 0, 0);
            const start = new Date(filters.startDate);
            if (txDate < start) return false;
        }
        if (filters.endDate) {
            const txDate = new Date(tx.date);
            txDate.setHours(0, 0, 0, 0);
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (txDate > end) return false;
        }

        // Amount range filter
        const amount = Number(tx.amount);
        if (filters.minAmount && amount < Number(filters.minAmount)) return false;
        if (filters.maxAmount && amount > Number(filters.maxAmount)) return false;

        // Bucket filter
        if (filters.bucket !== 'ALL' && tx.bucket_id?.toString() !== filters.bucket) return false;

        // Hide purely internal adjustments from this main list to avoid "Visual Duplication" confusion for the user.
        // These can still be seen if they check the specific Account balance, but for "Spending History", it looks like double spending.
        if (tx.description.includes('Ajuste de Deuda') || tx.description.includes('Ajuste de Préstamo')) {
            return false;
        }

        return true;
    });

    const getTransactionStyle = (type: string) => {
        if (type.includes('INCOME') || type.includes('TRANSFER_IN')) {
            return {
                icon: ArrowDownIcon,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
                gradient: 'from-emerald-900/10 to-transparent'
            };
        }
        if (type.includes('EXPENSE') || type.includes('TRANSFER_OUT')) {
            return {
                icon: ArrowUpIcon,
                color: 'text-rose-400',
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/20',
                gradient: 'from-rose-900/10 to-transparent'
            };
        }
        return {
            icon: ArrowsRightLeftIcon,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            gradient: 'from-blue-900/10 to-transparent'
        };
    };

    const formatType = (type: string) => {
        const map: Record<string, string> = {
            'INCOME': 'Ingreso',
            'EXPENSE': 'Gasto',
            'TRANSFER_IN': 'Transferencia',
            'TRANSFER_OUT': 'Transferencia'
        };
        return map[type] || type;
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        try {
            await onDeleteTransaction(deletingId);
        } catch (error) {
            console.error(error);
        }
        setDeletingId(null);
    };

    // Calculate total
    const total = filteredTransactions.reduce((sum, tx) => {
        const amount = Number(tx.amount);
        if (tx.type.includes('INCOME') || tx.type.includes('TRANSFER_IN')) {
            return sum + amount;
        } else {
            return sum - amount;
        }
    }, 0);

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-bold text-white">Historial</h3>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                        ${formatNumberWithLocale(total)}
                    </span>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${showFilters
                            ? 'bg-primary-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                    >
                        <FunnelIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
                <div className="glass-panel p-4 rounded-xl space-y-3 animate-fade-in">
                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters({ ...filters, search: e.target.value })
                            }
                            placeholder="Buscar..."
                            className="w-full input-modern pl-9 pr-4 py-3 rounded-xl text-sm text-white placeholder-slate-500"
                        />
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 mb-1 block">
                                Desde
                            </label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, startDate: e.target.value })
                                }
                                className="w-full input-modern p-2 rounded-xl text-xs text-white"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 mb-1 block">
                                Hasta
                            </label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) =>
                                    setFilters({ ...filters, endDate: e.target.value })
                                }
                                className="w-full input-modern p-2 rounded-xl text-xs text-white"
                            />
                        </div>
                    </div>

                    {/* Date Presets */}
                    <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
                        <button
                            onClick={() => setFilterDate('week')}
                            className="flex-1 py-1.5 text-[10px] rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition"
                        >
                            Semana
                        </button>
                        <button
                            onClick={() => setFilterDate('fortnight')}
                            className="flex-1 py-1.5 text-[10px] rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition"
                        >
                            Quincena
                        </button>
                        <button
                            onClick={() => setFilterDate('month')}
                            className="flex-1 py-1.5 text-[10px] rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition"
                        >
                            Mes
                        </button>
                    </div>

                    {/* Type and Bucket */}
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={filters.type}
                            onChange={(e) =>
                                setFilters({ ...filters, type: e.target.value as any })
                            }
                            className="w-full input-modern p-2 rounded-xl text-xs text-white"
                        >
                            <option value="ALL">Tipo: Todos</option>
                            <option value="INCOME">Ingresos</option>
                            <option value="EXPENSE">Gastos</option>
                        </select>
                        <select
                            value={filters.bucket}
                            onChange={(e) =>
                                setFilters({ ...filters, bucket: e.target.value })
                            }
                            className="w-full input-modern p-2 rounded-xl text-xs text-white"
                        >
                            <option value="ALL">Presupuesto: Todas</option>
                            {buckets.map((bucket) => (
                                <option key={bucket.id} value={bucket.id}>
                                    {bucket.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Amount Range */}
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="number"
                            value={filters.minAmount}
                            onChange={(e) =>
                                setFilters({ ...filters, minAmount: e.target.value })
                            }
                            placeholder="Min $"
                            step="0.01"
                            className="w-full input-modern p-2 rounded-xl text-xs text-white placeholder-slate-500"
                        />
                        <input
                            type="number"
                            value={filters.maxAmount}
                            onChange={(e) =>
                                setFilters({ ...filters, maxAmount: e.target.value })
                            }
                            placeholder="Max $"
                            step="0.01"
                            className="w-full input-modern p-2 rounded-xl text-xs text-white placeholder-slate-500"
                        />
                    </div>

                    {/* Clear Filters */}
                    <button
                        onClick={clearFilters}
                        className="w-full py-2 text-xs text-rose-400 font-bold hover:text-rose-300 transition"
                    >
                        Limpiar todo
                    </button>
                </div>
            )}

            {/* Transactions List */}
            <div className="space-y-3 pb-24">
                {filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                            <BanknotesIcon className="w-12 h-12 text-slate-600" />
                        </div>
                        <p className="text-slate-400 font-medium">No hay transacciones</p>
                        <p className="text-xs text-slate-500 mt-1">Ajusta los filtros o crea un movimiento</p>
                    </div>
                ) : (
                    filteredTransactions.map((tx, index) => {
                        const bucket = buckets.find(b => String(b.id) === String(tx.bucket_id));
                        const sourceBucket = buckets.find(b => String(b.id) === String(tx.source_bucket_id));
                        const style = getTransactionStyle(tx.type);
                        const Icon = style.icon;
                        const isExpense = tx.type.includes('EXPENSE') || tx.type.includes('OUT');
                        const isBucketMove = tx.type === 'bucket_move';

                        // Determine Display Amount and Currency
                        let displayAmount = Number(tx.amount);
                        let displayCurrency = accounts.find(a => String(a.id) === String(tx.account_id))?.currency || 'USD';

                        if (isBucketMove) {
                            displayAmount = Number(tx.target_amount ?? tx.amount);
                            if (bucket) displayCurrency = bucket.currency;
                        } else if (bucket && !tx.account_id) {
                            // If dealing with pure bucket logic (rare without account, but possible in future)
                            displayCurrency = bucket.currency;
                        }

                        return (
                            <div
                                key={tx.id}
                                className="group relative overflow-hidden rounded-2xl glass-panel p-4 border border-white/5 shadow-lg transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:border-white/10 animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Gradient Background */}
                                <div className={`absolute inset-0 bg-gradient-to-r ${style.gradient} opacity-40 transition-opacity group-hover:opacity-60`}></div>

                                <div className="relative z-10 flex items-center gap-4">
                                    {/* Icon Box */}
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${style.bg} ${style.color} shadow-inner bg-opacity-50 backdrop-blur-md border ${style.border}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-white truncate pr-2 text-sm leading-tight flex items-center gap-2">
                                                {tx.description}
                                            </h4>
                                            <span className={`font-mono font-bold text-sm ${style.color} whitespace-nowrap`}>
                                                {isExpense ? '-' : (isBucketMove ? '' : '+')}{getCurrencySymbol(displayCurrency)}{formatNumberWithLocale(displayAmount)}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                            <span className="flex items-center text-[10px] text-slate-400 font-medium">
                                                <CalendarIcon className="w-3 h-3 mr-1 opacity-70" />
                                                {format(new Date(tx.date), 'dd MMM, HH:mm')}
                                            </span>

                                            {(bucket || sourceBucket) && (
                                                <span className="flex items-center text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                                    <ArchiveBoxIcon className="w-3 h-3 mr-1" />
                                                    {sourceBucket ? (
                                                        <>
                                                            {sourceBucket.name}
                                                            <span className="mx-1 opacity-50">&rarr;</span>
                                                            {bucket ? bucket.name : '?'}
                                                        </>
                                                    ) : (
                                                        bucket?.name
                                                    )}
                                                </span>
                                            )}

                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-800/50 rounded text-slate-500 font-mono border border-white/5">
                                                {formatType(tx.type)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Delete Action (visible on hover) */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(tx.id); }}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-rose-500 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm self-center border border-transparent hover:border-rose-400/30 hover:shadow-lg hover:shadow-rose-500/20"
                                        title="Eliminar transacción"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>


            <ConfirmModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={confirmDelete}
                title="Eliminar Transacción"
                message="¿Estás seguro de que quieres eliminar esta transacción? Se revertirán los cambios en los balances."
                confirmText="Sí, eliminar"
            />
        </div >
    );
}
