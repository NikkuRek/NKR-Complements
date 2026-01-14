'use client';

import { useState } from 'react';
import { Transaction, Account } from '@/types/denarius';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    ArrowsRightLeftIcon,
    BanknotesIcon
} from '@heroicons/react/24/outline';
import { formatNumberWithLocale } from '@/lib/currency';
import ConfirmModal from '@/components/ui/ConfirmModal';
import AccountModal from '@/components/ui/AccountModal';
import DatePicker from '@/components/ui/DatePicker';
import TransactionItem from './TransactionItem';

interface TransactionsViewProps {
    transactions: Transaction[];
    buckets?: any[];
    accounts?: Account[];
    onDeleteTransaction: (id: string) => Promise<void>;
    onUpdateTransaction?: (id: string, values: Partial<Transaction>) => Promise<void>;
}

export default function TransactionsView({
    transactions,
    buckets = [],
    accounts = [],
    onDeleteTransaction,
    onUpdateTransaction
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

    // Edit State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState<Partial<Transaction> & { id: string, time?: string }>({
        id: '',
        amount: 0,
        description: '',
        date: '',
        time: ''
    });
    const [loading, setLoading] = useState(false);

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

    const handleEditClick = (tx: Transaction) => {
        const txDate = new Date(tx.date);
        let timeStr = '00:00';
        try {
             // Try to extract time from ISO string if present
             const parts = txDate.toISOString().split('T');
             if (parts.length > 1) {
                 timeStr = parts[1].substring(0, 5);
             }
        } catch (e) {
            console.error(e);
        }

        setEditData({
            id: tx.id,
            amount: Number(tx.amount),
            description: tx.description,
            date: txDate.toISOString().split('T')[0], // Format for input date YYYY-MM-DD
            time: timeStr
        });
        setEditModalOpen(true);
    };

    const handleUpdateSubmit = async () => {
        if (!onUpdateTransaction || !editData.id) return;
        setLoading(true);
        try {
            let finalDateStr = undefined;
            if (editData.date) {
                const [y, m, d] = editData.date.toString().split('-').map(Number);
                const [hours, minutes] = (editData.time || '00:00').split(':').map(Number);
                const finalDate = new Date();
                finalDate.setFullYear(y);
                finalDate.setMonth(m - 1);
                finalDate.setDate(d);
                finalDate.setHours(hours || 0);
                finalDate.setMinutes(minutes || 0);
                finalDate.setSeconds(0);
                finalDateStr = finalDate.toISOString();
            }

            await onUpdateTransaction(editData.id, {
                amount: editData.amount,
                description: editData.description,
                date: finalDateStr
            });
            setEditModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
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

    const counts = filteredTransactions.reduce((acc, tx) => {
        if (tx.type.includes('TRANSFER') || tx.type === 'bucket_move') {
            acc.transfers++;
        } else if (tx.type.includes('INCOME')) {
            acc.income++;
        } else if (tx.type.includes('EXPENSE')) {
            acc.expenses++;
        }
        return acc;
    }, { income: 0, expenses: 0, transfers: 0 });

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-blue-500/20">
                <h3 className="text-xl font-bold text-white">Historial</h3>
                <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                        {counts.income > 0 && (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">
                                {counts.income}
                            </span>
                        )}
                        {counts.expenses > 0 && (
                            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg">
                                {counts.expenses}
                            </span>
                        )}
                        {counts.transfers > 0 && (
                            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
                                {counts.transfers}
                            </span>
                        )}
                    </div>
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
                            <DatePicker
                                id="filter-start-date"
                                value={filters.startDate}
                                onChange={(date) =>
                                    setFilters({ ...filters, startDate: date })
                                }
                                placeholder="DD/MM/AAAA"
                            />
                        </div>
                        <div>
                            <label className="text-[9px] uppercase font-bold text-slate-500 ml-1 mb-1 block">
                                Hasta
                            </label>
                            <DatePicker
                                id="filter-end-date"
                                value={filters.endDate}
                                onChange={(date) =>
                                    setFilters({ ...filters, endDate: date })
                                }
                                placeholder="DD/MM/AAAA"
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
            <div className="space-y-6 pb-24">
                {filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                            <BanknotesIcon className="w-12 h-12 text-slate-600" />
                        </div>
                        <p className="text-slate-400 font-medium">No hay transacciones</p>
                        <p className="text-xs text-slate-500 mt-1">Ajusta los filtros o crea un movimiento</p>
                    </div>
                ) : (
                    Object.entries(
                        filteredTransactions.reduce((groups, tx) => {
                            // Convert UTC timestamp to Local Date String (YYYY-MM-DD) for grouping
                            // This ensures that 9PM on the 12th stays on the 12th, doesn't jump to 13th (UTC)
                            const dateObj = new Date(tx.date);
                            // Subtract timezone offset to get "Local ISO"
                            const localIso = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString();
                            const dateKey = localIso.split('T')[0];
                            
                            if (!groups[dateKey]) {
                                groups[dateKey] = [];
                            }
                            groups[dateKey].push(tx);
                            return groups;
                        }, {} as Record<string, Transaction[]>)
                    )
                        .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                        .map(([date, txs]) => {
                            // Date header logic
                            const [year, month, day] = date.split('-').map(Number);
                            const dateObj = new Date(year, month - 1, day); 

                            const today = new Date();
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);

                            let headerText = format(dateObj, "EEEE, d 'de' MMMM", { locale: es });
                            headerText = headerText.charAt(0).toUpperCase() + headerText.slice(1);

                            if (dateObj.toDateString() === today.toDateString()) {
                                headerText = 'Hoy';
                            } else if (dateObj.toDateString() === yesterday.toDateString()) {
                                headerText = 'Ayer';
                            }

                            // Calculate daily total
                            const dailyTotal = txs.reduce((sum, tx) => {
                                const amount = Number(tx.amount);
                                if (tx.type.includes('INCOME') || tx.type.includes('TRANSFER_IN')) return sum + amount;
                                return sum - amount;
                            }, 0);

                            return (
                                <div key={date} className="space-y-2">
                                    {/* Header */}
                                    <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_var(--glow-color,transparent)] ${dailyTotal >= 0 ? 'bg-emerald-400 [--glow-color:theme(colors.emerald.500/0.3)]' : 'bg-rose-400 [--glow-color:theme(colors.rose.500/0.3)]'}`} />
                                            <h3 className="text-sm text-slate-200 capitalize tracking-wide drop-shadow-md font-bold">
                                            {headerText}
                                            </h3>
                                        </div>
                                        <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-md transition-all duration-300 ${dailyTotal >= 0 ? 'text-emerald-300 underline' : 'text-rose-300 underline'}`}>
                                            {dailyTotal > 0 ? '+' : dailyTotal < 0 ? '' : ''}{formatNumberWithLocale(dailyTotal)}
                                        </span>
                                    </div>

                                    {/* Transactions */}
                                    <div className="space-y-3 px-2">
                                        {txs.map((tx, index) => (
                                            <TransactionItem
                                                key={tx.id}
                                                tx={tx}
                                                buckets={buckets}
                                                accounts={accounts}
                                                onDelete={handleDeleteClick}
                                                onEdit={handleEditClick}
                                                index={index}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                )}
            </div>

            {/* Edit Modal */}
            <AccountModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title="Editar Transacción"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Descripción</label>
                        <input
                            type="text"
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            placeholder="Descripción"
                            className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Monto</label>
                        <input
                            type="number"
                            value={editData.amount}
                            onChange={(e) => setEditData({ ...editData, amount: parseFloat(e.target.value) })}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Fecha</label>
                            <input
                                type="date"
                                value={editData.date ? String(editData.date) : ''}
                                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                                className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500 [color-scheme:dark]"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Hora</label>
                            <input
                                type="time"
                                value={editData.time || ''}
                                onChange={(e) => setEditData({ ...editData, time: e.target.value })}
                                className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500 [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleUpdateSubmit}
                        disabled={loading || !editData.description || !editData.amount}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition transform active:scale-95 disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </AccountModal>

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
