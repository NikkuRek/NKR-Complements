'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import { PlusIcon, ArrowsRightLeftIcon, ArchiveBoxIcon, PencilIcon, TrashIcon, EyeIcon, BoltIcon } from '@heroicons/react/24/outline'; // Added EyeIcon
import { Bucket, Currency, Account } from '@/types/denarius';
import AccountModal from '@/components/ui/AccountModal';
import { getCurrencySymbol, formatNumberWithLocale } from '@/lib/currency';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface BudgetsViewProps {
    buckets: Bucket[];
    accounts: Account[]; // Added accounts
    onCreateBucket: (name: string, currency: Currency, initialBalance: number) => Promise<void>;
    onUpdateBucket?: (id: string, values: Partial<Bucket>) => Promise<void>;
    onDeleteBucket: (id: string) => Promise<void>;
    onTransferBucket?: (sourceBucketId: number, targetBucketId: number, amount: number, targetAmount?: number) => Promise<void>;
    rates?: { USD: number; USDT: number };
}

export default function BudgetsView({
    buckets,
    accounts = [], // Default empty
    onCreateBucket,
    onUpdateBucket,
    onDeleteBucket,
    onTransferBucket,
    rates = { USD: 1, USDT: 1 },
}: BudgetsViewProps) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [bucketName, setBucketName] = useState('');
    const [bucketCurrency, setBucketCurrency] = useState<Currency>('USD');
    const [initialBalance, setInitialBalance] = useState('');
    const [loading, setLoading] = useState(false);

    // View Mode State
    const [viewMode, setViewMode] = useState<'ORIGINAL' | 'VES' | 'USD' | 'USDT'>('ORIGINAL');
    const [showViewMenu, setShowViewMenu] = useState(false);
    const viewMenuRef = useRef<HTMLDivElement>(null);

    // Transfer state
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [transferSource, setTransferSource] = useState('');
    const [transferTarget, setTransferTarget] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferRate, setTransferRate] = useState('');
    const [transferInputMode, setTransferInputMode] = useState<'SOURCE' | 'TARGET'>('SOURCE');

    // Edit state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({ id: '', name: '', balance: '', currency: 'USD' as Currency });

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingName, setDeletingName] = useState('');
    const [editName, setEditName] = useState('');
    const [editBalance, setEditBalance] = useState('');
    const [editCurrency, setEditCurrency] = useState<Currency>('USD');

    // Cover Deficit State
    const [coverDeficitData, setCoverDeficitData] = useState<{ source: Bucket; target: Bucket; sAmount: number; tAmount: number } | null>(null);

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
                setShowViewMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Conversion Helper
    const convertAmount = (amount: number, currency: Currency): { value: number, symbol: string } => {
        if (viewMode === 'ORIGINAL') {
            return { value: amount, symbol: getCurrencySymbol(currency) };
        }

        const target = viewMode as Currency;

        if (currency === target) {
            return { value: amount, symbol: getCurrencySymbol(target) };
        }

        // 1. Convert source to Base (VES)
        let valInVes = amount;
        if (currency === 'USD') {
            valInVes = amount * rates.USD;
        } else if (currency === 'USDT') {
            valInVes = amount * rates.USDT;
        } else if (currency === 'VES') {
            valInVes = amount;
        }

        // 2. Convert Base (VES) to Target
        let finalVal = valInVes;
        if (target === 'USD') {
            finalVal = valInVes / rates.USD;
        } else if (target === 'USDT') {
            finalVal = valInVes / rates.USDT;
        }
        // If target is VES, finalVal is already correct

        return { value: finalVal, symbol: getCurrencySymbol(target) };
    };

    // Calculate total funds in buckets (Respecting View Mode)
    const calculateTotal = (items: { balance: number | string, currency?: string }[]) => {
        return items.reduce((acc, curr) => {
            const amount = Number(curr.balance);
            const currency = (curr.currency || 'USD') as Currency;

            // For Totals, if 'ORIGINAL', we normalize to USD (Default behavior)
            // If specific view mode, we convert to that mode.
            if (viewMode === 'ORIGINAL') {
                let val = amount;
                if (currency === 'VES' && rates.USD) val = val / rates.USD;
                return acc + val;
            } else {
                return acc + convertAmount(amount, currency).value;
            }
        }, 0);
    };

    const totalFunds = calculateTotal(buckets);
    const totalAssets = calculateTotal(accounts.filter(a => a.type === 'ASSET'));

    // Bank Account Display (ID 1)
    const bankAccount = accounts.find(a => String(a.id) === '1');
    const bankDisplay = bankAccount ? convertAmount(Number(bankAccount.balance), bankAccount.currency) : null;

    // Determine Symbol for Totals
    const totalSymbol = viewMode === 'ORIGINAL' ? '$' : getCurrencySymbol(viewMode as Currency);


    const handleCreate = async () => {
        if (!bucketName.trim()) return;

        setLoading(true);
        try {
            await onCreateBucket(bucketName, bucketCurrency, parseFloat(initialBalance) || 0);
            setBucketName('');
            setBucketCurrency('USD');
            setInitialBalance('');
            setCreateModalOpen(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        setDeletingId(id);
        setDeletingName(name);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        setLoading(true);
        try {
            await onDeleteBucket(deletingId);
        } catch (error) {
            console.error(error);
        }
        setDeletingId(null);
        setLoading(false);
    };

    // Helper for cross currency
    const getSourceAndTarget = () => {
        const s = buckets.find(b => String(b.id) === transferSource);
        const t = buckets.find(b => String(b.id) === transferTarget);
        return { source: s, target: t };
    };

    const { source, target } = getSourceAndTarget();
    const isCrossCurrency = source && target && source.currency !== target.currency;
    const sourceCurrency = source?.currency;
    const targetCurrency = target?.currency;

    // Auto-populate rate
    useEffect(() => {
        if (isCrossCurrency) {
            let defaultRate = 1;
            const sCurr = sourceCurrency;
            const tCurr = targetCurrency;

            // VES <-> USD/USDT
            if (sCurr === 'VES' && tCurr === 'USD') defaultRate = rates.USD;
            else if (sCurr === 'USD' && tCurr === 'VES') defaultRate = rates.USD;
            else if (sCurr === 'VES' && tCurr === 'USDT') defaultRate = rates.USDT;
            else if (sCurr === 'USDT' && tCurr === 'VES') defaultRate = rates.USDT;

            // Auto update only if rate isn't manually set? 
            // For now, always update on currency change which is standard.
            setTransferRate(String(defaultRate));
        }
    }, [transferSource, transferTarget, isCrossCurrency, sourceCurrency, targetCurrency, rates]);

    // Calculate Final Amounts based on Input Mode
    const getCalculatedAmounts = () => {
        const val = parseFloat(transferAmount);
        const rVal = parseFloat(transferRate);

        if (!val) return { sVal: 0, tVal: 0 };
        if (!isCrossCurrency) return { sVal: val, tVal: val };
        if (!rVal || isNaN(rVal)) return { sVal: 0, tVal: 0 };

        const isSourceVes = sourceCurrency === 'VES';
        const isTargetVes = targetCurrency === 'VES';

        // Case 1: VES -> USD (Divisor Rate)
        if (isSourceVes && !isTargetVes) {
            if (transferInputMode === 'SOURCE') { // Input is Bs
                return { sVal: val, tVal: val / rVal };
            } else { // Input is USD
                return { sVal: val * rVal, tVal: val };
            }
        }

        // Case 2: USD -> VES (Multiplier Rate)
        if (!isSourceVes && isTargetVes) {
            if (transferInputMode === 'SOURCE') { // Input is USD
                return { sVal: val, tVal: val * rVal };
            } else { // Input is Bs
                return { sVal: val / rVal, tVal: val };
            }
        }

        // Fallback
        if (transferInputMode === 'SOURCE') {
            return { sVal: val, tVal: val * rVal };
        } else {
            return { sVal: val / rVal, tVal: val };
        }
    };

    const { sVal, tVal } = getCalculatedAmounts();

    const handleTransfer = async () => {
        if (!transferSource || !transferTarget || !transferAmount || !onTransferBucket) return;
        if (isCrossCurrency && !transferRate) return;

        setLoading(true);
        try {
            await onTransferBucket(
                parseInt(transferSource),
                parseInt(transferTarget),
                sVal,
                tVal
            );
            // Close modal and reset form
            setTransferModalOpen(false);
            setTransferSource('');
            setTransferTarget('');
            setTransferAmount('');
            setTransferRate('');
            setTransferInputMode('SOURCE');
        } catch (error) {
            console.error(error);
            alert('Error al transferir entre presupuestos');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async () => {
        if (!editData.id || !editName.trim() || !onUpdateBucket) return;

        setLoading(true);
        try {
            await onUpdateBucket(editData.id, {
                name: editName,
                balance: parseFloat(editBalance) || 0,
                currency: editCurrency
            });
            setEditModalOpen(false);
            setEditData({ id: '', name: '', balance: '', currency: 'USD' });
            setEditName('');
            setEditBalance('');
            setEditCurrency('USD');
        } catch (error) {
            console.error(error);
            alert('Error al actualizar el presupuesto');
        } finally {
            setLoading(false);
        }
    };

    const handleCoverDeficit = (targetBucket: Bucket) => {
        const sourceBucket = buckets.find(b => String(b.id) === '1');
        
        if (!sourceBucket) {
             alert('No se encontró el Bucket ID 1 (Principal) para cubrir el déficit.');
             return;
        }
        
        if (String(sourceBucket.id) === String(targetBucket.id)) return;

        const deficit = Math.abs(Number(targetBucket.balance));
        if (deficit === 0) return;

        // Calculate source amount (conversion logic)
        let sourceAmount = deficit;
        
        // Convert to shared base (VES)
        let valInVes = deficit;
        if (targetBucket.currency === 'USD') valInVes = deficit * rates.USD;
        else if (targetBucket.currency === 'USDT') valInVes = deficit * rates.USDT;
        // if VES, valInVes = deficit

        // Convert base to source currency
        if (sourceBucket.currency === 'USD') sourceAmount = valInVes / rates.USD;
        else if (sourceBucket.currency === 'USDT') sourceAmount = valInVes / rates.USDT;
        else sourceAmount = valInVes; // VES

        setCoverDeficitData({
            source: sourceBucket,
            target: targetBucket,
            sAmount: sourceAmount,
            tAmount: deficit
        });
    };

    const executeCoverDeficit = async () => {
        if (!coverDeficitData || !onTransferBucket) return;
        
        setLoading(true);
        try {
            await onTransferBucket(
                Number(coverDeficitData.source.id), 
                Number(coverDeficitData.target.id), 
                coverDeficitData.sAmount, 
                coverDeficitData.tAmount
            );
        } catch (error) {
            console.error(error);
            alert('Error al realizar la transferencia automática');
        } finally {
            setLoading(false);
            setCoverDeficitData(null);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header & Stats */}
            <div className="flex items-center justify-between px-2">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        Presupuestos
                    </h3>
                    <div className="text-xs font-medium space-y-0.5 mt-1">
                        <p className="text-slate-400">
                            Fondos totales: <span className="text-emerald-400 font-mono">{totalSymbol}{formatNumberWithLocale(totalFunds)}</span>
                        </p>
                        <p className="text-slate-400">
                            Activos Totales: <span className="text-blue-400 font-mono">{totalSymbol}{formatNumberWithLocale(totalAssets)}</span>
                        </p>
                        {bankAccount && bankDisplay && (
                            <p className="text-slate-400">
                                {bankAccount.name}: <span className="text-indigo-400 font-mono">{bankDisplay.symbol}{formatNumberWithLocale(bankDisplay.value)}</span>
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* View Mode Button */}
                    <div className="relative" ref={viewMenuRef}>
                        <button
                            onClick={() => setShowViewMenu(!showViewMenu)}
                            className="w-10 h-10 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center border border-white/5 hover:bg-slate-700 hover:text-white transition"
                            title="Cambiar Vista de Moneda"
                        >
                            <EyeIcon className="w-5 h-5" />
                        </button>

                        {showViewMenu && (
                            <div className="absolute right-0 top-12 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 w-32 p-1 flex flex-col gap-1">
                                <button
                                    onClick={() => { setViewMode('ORIGINAL'); setShowViewMenu(false); }}
                                    className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'ORIGINAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    Predeterminado
                                </button>
                                <button
                                    onClick={() => { setViewMode('VES'); setShowViewMenu(false); }}
                                    className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'VES' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    Bs.
                                </button>
                                <button
                                    onClick={() => { setViewMode('USD'); setShowViewMenu(false); }}
                                    className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'USD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    USD
                                </button>
                                <button
                                    onClick={() => { setViewMode('USDT'); setShowViewMenu(false); }}
                                    className={`text-left px-3 py-2 rounded-lg text-xs font-bold transition ${viewMode === 'USDT' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                                >
                                    USDT
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setTransferModalOpen(true)}
                        className="w-10 h-10 rounded-2xl bg-slate-800 text-blue-400 flex items-center justify-center border border-white/5 hover:bg-slate-700 hover:text-white transition"
                        title="Transferir entre buckets"
                    >
                        <ArrowsRightLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition"
                    >
                        <PlusIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Buckets Grid */}
            {buckets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                        <ArchiveBoxIcon className="w-12 h-12 text-slate-600" />
                    </div>
                    <p className="text-slate-400 font-medium">No hay presupuestos</p>
                    <p className="text-xs text-slate-500 mt-1">Crea categorías para organizar tu dinero</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4 pb-24">
                    {buckets.map((bucket, index) => {
                        const display = convertAmount(Number(bucket.balance), bucket.currency);
                        return (
                            <div
                                key={bucket.id}
                                className="group relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-md p-4 border border-white/5 shadow-lg hover:border-blue-500/30 transition-all duration-300 animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Decorative Background Icon */}
                                <ArchiveBoxIcon className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 group-hover:text-blue-500/10 group-hover:scale-110 transition-all duration-500" />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="text-sm font-bold text-white truncate max-w-[70%]">
                                            {bucket.name}
                                        </h4>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditData({ id: bucket.id, name: bucket.name, balance: bucket.balance.toString(), currency: bucket.currency || 'USD' });
                                                    setEditName(bucket.name);
                                                    setEditBalance(bucket.balance.toString());
                                                    setEditCurrency(bucket.currency || 'USD');
                                                    setEditModalOpen(true);
                                                }}
                                                className="w-6 h-6 rounded-full text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 flex items-center justify-center transition"
                                            >
                                                <PencilIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-auto">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Disponible</p>
                                        <div className="flex justify-between items-end">
                                            <p className="text-xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                                                {display.symbol}{formatNumberWithLocale(display.value)}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                {Number(bucket.balance) < 0 && String(bucket.id) !== '1' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleCoverDeficit(bucket);
                                                        }}
                                                        className="w-6 h-6 rounded-full text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 flex items-center justify-center transition"
                                                        title="Cubrir Déficit con Bucket ID 1"
                                                    >
                                                        <BoltIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(bucket.id, bucket.name);
                                                    }}
                                                    className="w-6 h-6 rounded-full text-slate-600 hover:text-rose-400 transition"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <AccountModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Nuevo Presupuesto"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Nombre</label>
                        <input
                            type="text"
                            value={bucketName}
                            onChange={(e) => setBucketName(e.target.value)}
                            placeholder="Categoría (ej. Comida, Ahorro)"
                            className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Moneda</label>
                        <select
                            value={bucketCurrency}
                            onChange={(e) => setBucketCurrency(e.target.value as Currency)}
                            className="w-full input-modern p-4 rounded-xl text-white bg-slate-800"
                        >
                            <option value="USD">USD</option>
                            <option value="VES">VES</option>
                            <option value="USDT">USDT</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Fondo Inicial</label>
                        <input
                            type="number"
                            value={initialBalance}
                            onChange={(e) => setInitialBalance(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        disabled={loading || !bucketName.trim()}
                        className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition transform active:scale-95 disabled:opacity-50 mt-2"
                    >
                        {loading ? 'Creando...' : 'Crear Presupuesto'}
                    </button>
                </div>
            </AccountModal>

            {/* Edit Modal */}
            <AccountModal
                isOpen={editModalOpen}
                onClose={() => {
                    setEditModalOpen(false);
                    setEditData({ id: '', name: '', balance: '', currency: 'USD' });
                    setEditName('');
                    setEditBalance('');
                    setEditCurrency('USD');
                }}
                title="Editar Presupuesto"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Nombre</label>
                        <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Nombre del presupuesto"
                            className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Balance</label>
                        <input
                            type="number"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Moneda</label>
                        <select
                            value={editCurrency}
                            onChange={(e) => setEditCurrency(e.target.value as Currency)}
                            className="w-full input-modern p-4 rounded-xl text-white bg-slate-800"
                        >
                            <option value="USD">USD</option>
                            <option value="VES">VES</option>
                            <option value="USDT">USDT</option>
                        </select>
                    </div>
                    <button
                        onClick={handleEdit}
                        disabled={!editName.trim() || loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </AccountModal>

            {/* Transfer Modal */}
            <AccountModal
                isOpen={transferModalOpen}
                onClose={() => {
                    setTransferModalOpen(false);
                    setTransferSource('');
                    setTransferTarget('');
                    setTransferAmount('');
                    setTransferRate('');
                    setTransferInputMode('SOURCE');
                }}
                title="Mover Fondos"
            >
                <div className="space-y-6">
                    {/* Source & Target */}
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desde</label>
                            <select
                                value={transferSource}
                                onChange={(e) => setTransferSource(e.target.value)}
                                className="w-full input-modern p-3 rounded-xl text-white bg-slate-800 text-sm"
                            >
                                <option value="">Seleccionar...</option>
                                {buckets.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>
                                ))}
                            </select>
                            {source && (
                                <p className="text-[10px] text-slate-400 mt-1 text-right">
                                    Disp: {getCurrencySymbol(source.currency)}{formatNumberWithLocale(Number(source.balance))}
                                </p>
                            )}
                        </div>
                        <div className="text-slate-500 pt-4"><ArrowsRightLeftIcon className="w-5 h-5" /></div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hacia</label>
                            <select
                                value={transferTarget}
                                onChange={(e) => setTransferTarget(e.target.value)}
                                className="w-full input-modern p-3 rounded-xl text-white bg-slate-800 text-sm"
                            >
                                <option value="">Seleccionar...</option>
                                {buckets.filter(b => String(b.id) !== transferSource).map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                                Monto en {transferInputMode === 'SOURCE' ? (sourceCurrency || 'Origen') : (targetCurrency || 'Destino')}
                            </label>

                            {isCrossCurrency && (
                                <button
                                    onClick={() => setTransferInputMode(prev => prev === 'SOURCE' ? 'TARGET' : 'SOURCE')}
                                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded transition"
                                >
                                    <ArrowsRightLeftIcon className="w-3 h-3" />
                                    Cambiar a {transferInputMode === 'SOURCE' ? targetCurrency : sourceCurrency}
                                </button>
                            )}
                        </div>
                        <input
                            type="number"
                            value={transferAmount}
                            onChange={(e) => setTransferAmount(e.target.value)}
                            step="0.01"
                            placeholder="0.00"
                            className="w-full input-modern p-4 rounded-xl text-2xl font-bold text-white placeholder-slate-700 text-center font-mono"
                            required
                        />
                    </div>

                    {/* Rate Input (Only if Cross Currency) */}
                    {isCrossCurrency && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-dashed border-slate-700 space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Tasa de Cambio</label>
                                <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                    Conversion
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={transferRate}
                                    onChange={(e) => setTransferRate(e.target.value)}
                                    step="0.01"
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-right font-mono text-white focus:border-indigo-500 outline-none"
                                    placeholder="Tasa..."
                                />
                                <span className="text-xs font-mono text-slate-500">
                                    {sourceCurrency === 'VES' || targetCurrency === 'VES' ? 'Bs' : ''}
                                </span>
                            </div>

                            {/* Preview Calculated Target Amount */}
                            <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                                <span className="text-xs text-slate-500">
                                    {transferInputMode === 'SOURCE' ? 'Se abonará al presupuesto:' : 'Se descontará del origen:'}
                                </span>
                                <span className="font-mono font-bold text-emerald-400">
                                    {transferInputMode === 'SOURCE'
                                        ? `${targetCurrency ? getCurrencySymbol(targetCurrency) : ''} ${formatNumberWithLocale(tVal)}`
                                        : `${sourceCurrency ? getCurrencySymbol(sourceCurrency) : ''} ${formatNumberWithLocale(sVal)}`
                                    }
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        onClick={handleTransfer}
                        disabled={!transferSource || !transferTarget || !transferAmount || (isCrossCurrency && !transferRate) || loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Transfiriendo...' : 'Confirmar Movimiento'}
                    </button>
                </div>
            </AccountModal>

            <ConfirmModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={confirmDelete}
                title="Eliminar Presupuesto"
                message={`¿Estás seguro de que quieres eliminar la categoría "${deletingName}"? Los fondos volverán a la cuenta principal.`}
                confirmText="Sí, eliminar"
            />

            <ConfirmModal
                isOpen={!!coverDeficitData}
                onClose={() => setCoverDeficitData(null)}
                onConfirm={executeCoverDeficit}
                title="Cubrir Déficit"
                message={coverDeficitData 
                    ? `¿Deseas cubrir el déficit de "${coverDeficitData.target.name}"? Se transferirán ${getCurrencySymbol(coverDeficitData.source.currency)}${formatNumberWithLocale(coverDeficitData.sAmount)} desde "${coverDeficitData.source.name}".`
                    : ''
                }
                confirmText="Confirmar Transferencia"
            />
        </div>
    );
}
