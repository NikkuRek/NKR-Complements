'use client';

import { Transaction, Account } from '@/types/denarius';
import { format } from 'date-fns';
import {
    TrashIcon,
    PencilIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';
import { formatNumberWithLocale, getCurrencySymbol } from '@/lib/currency';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { useRef, useState } from 'react';

interface TransactionItemProps {
    tx: Transaction;
    buckets: any[];
    accounts: Account[];
    onDelete: (id: string) => void;
    onEdit?: (tx: Transaction) => void;
    index: number;
}

export default function TransactionItem({
    tx,
    buckets,
    accounts,
    onDelete,
    onEdit,
    index
}: TransactionItemProps) {
    const controls = useAnimation();
    const containerRef = useRef<HTMLDivElement>(null);

    const bucket = buckets.find(b => String(b.id) === String(tx.bucket_id));
    const sourceBucket = buckets.find(b => String(b.id) === String(tx.source_bucket_id));

    const getTransactionStyle = (type: string, description: string) => {
        const firstWord = description.trim().split(' ')[0].toLowerCase();
        const isTransferDescription = firstWord === 'transferencia';

        // Income / Transfer In
        if (type.includes('INCOME') || type.includes('TRANSFER_IN')) {
            return {
                icon: isTransferDescription ? ArrowsRightLeftIcon : ArrowDownIcon,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
                gradient: 'from-emerald-900/10 to-transparent'
            };
        }
        // Expense / Transfer Out
        if (type.includes('EXPENSE') || type.includes('TRANSFER_OUT')) {
            return {
                icon: isTransferDescription ? ArrowsRightLeftIcon : ArrowUpIcon,
                color: 'text-rose-400',
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/20',
                gradient: 'from-rose-900/10 to-transparent'
            };
        }
        // Default (Internal Move, etc.)
        return {
            icon: ArrowsRightLeftIcon,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            gradient: 'from-blue-900/10 to-transparent'
        };
    };

    const style = getTransactionStyle(tx.type, tx.description);
    const Icon = style.icon;
    const isExpense = tx.type.includes('EXPENSE') || tx.type.includes('OUT');
    const isBucketMove = tx.type === 'bucket_move';

    let displayAmount = Number(tx.amount);
    let displayCurrency = accounts.find(a => String(a.id) === String(tx.account_id))?.currency || 'USD';

    if (isBucketMove) {
        displayAmount = Number(tx.target_amount ?? tx.amount);
        if (bucket) displayCurrency = bucket.currency;
    } else if (bucket && !tx.account_id) {
        displayCurrency = bucket.currency;
    }

    const formatType = (type: string) => {
        const map: Record<string, string> = {
            'INCOME': 'Ingreso',
            'EXPENSE': 'Gasto',
            'TRANSFER_IN': 'Transferencia',
            'TRANSFER_OUT': 'Transferencia',
            'bucket_move': 'Mov. de Presupuestos'
        };
        return map[type] || type;
    };

    const [isOpen, setIsOpen] = useState(false);

    const handleDragEnd = async (event: any, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        // Reveal threshold (dragged far enough)
        if (offset < -100) {
            await controls.start({ x: -140 }); // Keep open wider for 2 buttons
            setIsOpen(true);
        } else {
            await controls.start({ x: 0 }); // Close
            setIsOpen(false);
        }
    };

    const handleContainerClick = () => {
        if (isOpen) {
            controls.start({ x: 0 });
            setIsOpen(false);
        } else {
            controls.start({ x: -140 });
            setIsOpen(true);
        }
    };

    return (
        <div
            className="relative overflow-visible"
            ref={containerRef}
            onClick={handleContainerClick}
        >
            {/* Actions Background Layer */}
            <div className="absolute inset-y-0 right-0 w-full rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-end px-4 gap-3 mb-2">
                {onEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(tx);
                            controls.start({ x: 0 });
                        }}
                        className="flex flex-col items-center justify-center text-blue-400 gap-1 p-2 hover:bg-blue-500/10 rounded-xl transition"
                    >
                        <PencilIcon className="w-5 h-5" />
                        <span className="text-[9px] font-bold">Editar</span>
                    </button>
                )}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(tx.id);
                        controls.start({ x: 0 });
                    }}
                    className="flex flex-col items-center justify-center text-rose-400 gap-1 p-2 hover:bg-rose-500/10 rounded-xl transition"
                >
                    <TrashIcon className="w-5 h-5" />
                    <span className="text-[9px] font-bold">Eliminar</span>
                </button>
            </div>

            {/* Draggable Content */}
            <motion.div
                className="group relative overflow-hidden rounded-2xl glass-panel p-3 border border-white/5 shadow-md mb-2"
                style={{ backgroundColor: '#1e293b' }}
                drag="x"
                dragConstraints={{ left: -140, right: 0 }}
                onDragEnd={handleDragEnd}
                animate={controls}
                whileTap={{ cursor: "grabbing" }}
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2 }}
            >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${style.gradient} opacity-20`} />

                <div className="relative z-10 flex items-center gap-3">
                    {/* Icon Box */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bg} ${style.color} shadow-inner bg-opacity-50 backdrop-blur-md border ${style.border}`}>
                        <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-white truncate text-xs leading-tight pr-2" title={tx.description}>
                                {tx.description}
                            </h4>
                            <div className={`text-xs font-mono font-bold px-2 py-1.5 justify-center items-center rounded-md transition-all duration-300 ${isExpense ? 'text-rose-300 bg-rose-500/10 border-rose-500/20' : 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'} bg-black/30 border backdrop-blur-sm`}>
                                {isExpense ? '-' : (isBucketMove ? '' : '+')}{getCurrencySymbol(displayCurrency)}{formatNumberWithLocale(displayAmount)}
                            </div>
                        </div>

                        {/* Secondary Amount line */}
                        {tx.target_amount && tx.bucket_id && tx.account_id && Number(tx.target_amount) !== Number(tx.amount) && (
                            <div className="text-[9px] text-slate-500 font-mono text-right -mt-0.5 mb-0.5">
                                ({getCurrencySymbol(bucket?.currency || 'USD')}{formatNumberWithLocale(Number(tx.target_amount))})
                            </div>
                        )}

                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-500 font-medium">
                                {format(new Date(tx.date), 'HH:mm')}
                            </span>

                            {/* Unified Badge Row */}
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                {(bucket || sourceBucket) && (
                                    <span className="flex items-center text-[9px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 truncate max-w-[120px]">
                                        {sourceBucket ? (
                                            <>
                                                {sourceBucket.name}
                                                <span className="mx-0.5 opacity-50">&rarr;</span>
                                                {bucket ? bucket.name : '?'}
                                            </>
                                        ) : (
                                            bucket?.name
                                        )}
                                    </span>
                                )}

                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 rounded text-slate-500 border border-white/5 truncate">
                                    {formatType(tx.type)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div >
        </div >
    );
}
