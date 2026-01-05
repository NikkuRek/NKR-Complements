'use client';

import { Transaction, Account } from '@/types/denarius';
import { format } from 'date-fns';
import {
    CalendarIcon,
    ArchiveBoxIcon,
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
            {/* Delete Background Layer */}
            {/* Actions Background Layer */}
            <div className="absolute inset-y-0 right-0 w-full rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-end px-4 gap-3 mb-3">
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
                className="group relative overflow-hidden rounded-2xl glass-panel p-4 border border-white/5 shadow-lg mb-3"
                style={{ backgroundColor: '#1e293b' }} // Ensure opacity blocks background
                drag="x"
                dragConstraints={{ left: -140, right: 0 }}
                onDragEnd={handleDragEnd}
                animate={controls}
                whileTap={{ cursor: "grabbing" }}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.2 }}
            >
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-r ${style.gradient} opacity-40`} />

                <div className="relative z-10 flex items-center gap-4">
                    {/* Icon Box */}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${style.bg} ${style.color} shadow-inner bg-opacity-50 backdrop-blur-md border ${style.border}`}>
                        <Icon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-3">
                            <h4 className="font-bold text-white truncate text-[11px] leading-tight flex-1 min-w-0" title={tx.description}>
                                {tx.description}
                            </h4>
                            <span className={`font-mono font-bold text-[11px] ${style.color} whitespace-nowrap flex-shrink-0`}>
                                {isExpense ? '-' : (isBucketMove ? '' : '+')}{getCurrencySymbol(displayCurrency)}{formatNumberWithLocale(displayAmount)}
                            </span>
                        </div>

                        <div className="mt-1.5 space-y-1">
                            <div className="flex items-center text-[9px] text-slate-400 font-medium">
                                <CalendarIcon className="w-3 h-3 mr-1 opacity-70" />
                                {format(new Date(tx.date), 'dd MMM, HH:mm')}
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                {(bucket || sourceBucket) && (
                                    <span className="flex items-center text-[9px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
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

                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-800/50 rounded text-slate-500 font-mono border border-white/5">
                                    {formatType(tx.type)}
                                </span>
                            </div>
                        </div>
                    </div>


                </div>
            </motion.div>
        </div>
    );
}
