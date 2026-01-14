'use client';

import { useState, useEffect } from 'react';
import { Account, AccountType, Currency, Transaction } from '@/types/denarius';
import { getCurrencySymbol, formatNumberWithLocale } from '@/lib/currency';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface AssetAccountItemProps {
    account: Account;
    onDelete: (id: string) => void;
    onEdit?: (account: Account) => void;
    getTransactions: (accountId: string, limit?: number) => Promise<Transaction[]>;
}

const getAccountStyles = (type: AccountType, currency?: Currency) => {
    let iconColor = 'bg-slate-800 text-slate-400';
    let icon = 'fa-wallet';
    let borderColor = 'border-slate-700';

    if (type === 'ASSET' && currency) {
        if (currency === 'USD') {
            iconColor = 'bg-blue-500/20 text-blue-400';
            icon = 'fa-dollar-sign';
            borderColor = 'border-blue-500/30';
        } else if (currency === 'VES') {
            iconColor = 'bg-indigo-500/20 text-indigo-400';
            icon = 'fa-money-bill-wave';
            borderColor = 'border-indigo-500/30';
        } else if (currency === 'USDT') {
            iconColor = 'bg-emerald-500/20 text-emerald-400';
            icon = 'fa-coins';
            borderColor = 'border-emerald-500/30';
        }
    } else if (type === 'LIABILITY') {
        iconColor = 'bg-rose-500/20 text-rose-400';
        icon = 'fa-file-invoice-dollar';
        borderColor = 'border-rose-500/30';
    } else if (type === 'RECEIVABLE') {
        iconColor = 'bg-emerald-500/20 text-emerald-400';
        icon = 'fa-hand-holding-dollar';
        borderColor = 'border-emerald-500/30';
    }

    return { iconColor, icon, borderColor };
};

export default function AssetAccountItem({ account, onDelete, onEdit, getTransactions }: AssetAccountItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const styles = getAccountStyles('ASSET', account.currency);

    const fetchTransactions = async () => {
        if (account.type !== 'ASSET') return;
        setLoading(true);
        try {
            const fetchedTransactions = await getTransactions(account.id, 10);
            setTransactions(fetchedTransactions);
        } catch (error) {
            console.error("Failed to fetch transactions", error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        const newExpandedState = !isExpanded;
        setIsExpanded(newExpandedState);
        if (newExpandedState && account.type === 'ASSET') {
            fetchTransactions();
        }
    };

    return (
        <div className={`glass-panel p-3 border ${styles.borderColor} rounded-xl shadow-sm hover:bg-slate-800 transition-colors`}>
            <div className="flex justify-between items-center cursor-pointer" onClick={handleToggle}>
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.iconColor}`}>
                        <i className={`fas ${styles.icon}`}></i>
                    </div>
                    <div>
                        <h4 className="text-sm font-medium text-white mb-1">{account.name}</h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                            {account.currency}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`font-bold text-lg ${Number(account.balance) < 0 ? 'text-rose-500' : 'text-white'}`}>
                        {getCurrencySymbol(account.currency)} {formatNumberWithLocale(Number(account.balance))}
                    </span>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <div className="flex justify-end gap-2 mb-4">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(account);
                            }}
                            className="w-8 h-8 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 flex items-center justify-center transition"
                            title="Editar cuenta"
                        >
                            <i className="fas fa-pen text-sm"></i>
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsDeleteModalOpen(true);
                            }}
                            className="w-8 h-8 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 flex items-center justify-center transition"
                            title="Eliminar cuenta"
                        >
                            <i className="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                    {loading ? (
                        <div className="flex justify-center items-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : transactions.length > 0 ? (
                        <div className="space-y-2 text-sm">
                            <h5 className="text-xs text-slate-400 font-bold uppercase mb-2">Últimos Movimientos</h5>
                            {transactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center text-slate-300">
                                    <div className='flex items-center gap-2'>
                                        <span className="text-slate-500 text-xs">{new Date(tx.date).toLocaleDateString('es-VE', { timeZone: 'UTC' })}</span>
                                        <p>{tx.description}</p>
                                    </div>
                                    <span className={`${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {tx.type === 'INCOME' ? '+' : '-'}
                                        {getCurrencySymbol(account.currency)} {formatNumberWithLocale(Number(tx.amount))}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 text-sm py-4">
                            No hay transacciones recientes.
                        </p>
                    )}
                </div>
            )}
            {isDeleteModalOpen && (
                <ConfirmModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={() => onDelete(account.id)}
                    title="Eliminar Cuenta"
                    message={`¿Estás seguro de que quieres eliminar la cuenta "${account.name}"? Esta acción no se puede deshacer.`}
                    confirmText="Sí, eliminar"
                />
            )}
        </div>
    );
}
