import React, { useState, useEffect } from 'react';
import AccountModal from '@/components/ui/AccountModal';
import { Account } from '@/types/denarius';
import { getCurrencySymbol, formatNumberWithLocale } from '@/lib/currency';
import { ArrowDownIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface SettleModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: Account | null; // The liability or receivable account. If null, user must select.
    assetAccounts: Account[]; // Source accounts for payment
    liabilityAccounts?: Account[]; // Needed if account is null
    receivableAccounts?: Account[]; // Needed if account is null
    onSettle: (
        amount: number,
        sourceAccountId: number,
        targetAccountId: number,
        description: string,
        type: 'LIABILITY' | 'RECEIVABLE',
        targetAmount?: number
    ) => Promise<void>;
    rates?: { USD: number; USDT: number };
}

export default function SettleModal({
    isOpen,
    onClose,
    account,
    assetAccounts,
    liabilityAccounts = [],
    receivableAccounts = [],
    onSettle,
    rates = { USD: 1, USDT: 1 },
}: SettleModalProps) {
    const [amount, setAmount] = useState(''); // Amount in TARGET currency (default behavior) or SOURCE if specified? 
    // Let's explicitly track "Source Amount" and "Target Amount"

    // Instead of a single amount, we will primarily track "Input Amount" and decide which currency it represents based on logic.
    // BUT the user request says: "colocar el monto en Bolivares" (Source) and "reste el monto en dolares" (Target).
    // So let's track `sourceAmount` (what user pays) and `rate` (exchange rate).

    const [sourceAmount, setSourceAmount] = useState('');
    const [rate, setRate] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState('');
    const [inputMode, setInputMode] = useState<'SOURCE' | 'TARGET'>('SOURCE');

    // For selection mode
    const [selectedType, setSelectedType] = useState<'LIABILITY' | 'RECEIVABLE'>('LIABILITY');
    const [selectedTargetId, setSelectedTargetId] = useState('');

    const [loading, setLoading] = useState(false);

    // Derived state
    const targetAccount = account || (selectedTargetId ? (selectedType === 'LIABILITY' ? liabilityAccounts : receivableAccounts).find(a => String(a.id) === selectedTargetId) : null);
    const selectedAsset = assetAccounts.find(a => String(a.id) === selectedAssetId);

    // Cross Currency Logic
    const isCrossCurrency = selectedAsset && targetAccount && selectedAsset.currency !== targetAccount.currency;
    const sourceCurrency = selectedAsset?.currency;
    const targetCurrency = targetAccount?.currency;

    useEffect(() => {
        if (isOpen) {
            setSourceAmount('');
            setRate('');
            setInputMode('SOURCE');

            if (account) {
                // Pre-selected account mode
                setSelectedType(account.type === 'LIABILITY' ? 'LIABILITY' : 'RECEIVABLE');
                setSelectedTargetId(String(account.id));
            } else {
                // Selection mode defaults
                setSelectedType('LIABILITY');
                setSelectedTargetId('');
            }
            // Pre-select first asset
            if (assetAccounts.length > 0) {
                setSelectedAssetId(String(assetAccounts[0].id));
            }
        }
    }, [isOpen, account, assetAccounts]);

    // Initialize Rate
    useEffect(() => {
        if (isCrossCurrency) {
            let defaultRate = 1;

            // Determine rate based on currencies
            const sCurr = sourceCurrency;
            const tCurr = targetCurrency;

            // VES <-> USD/USDT
            if (sCurr === 'VES' && tCurr === 'USD') defaultRate = rates.USD;
            else if (sCurr === 'USD' && tCurr === 'VES') defaultRate = rates.USD;
            else if (sCurr === 'VES' && tCurr === 'USDT') defaultRate = rates.USDT;
            else if (sCurr === 'USDT' && tCurr === 'VES') defaultRate = rates.USDT;

            setRate(String(defaultRate));
        }
    }, [isCrossCurrency, sourceCurrency, targetCurrency, rates]);


    const activeType = account ? (account.type as 'LIABILITY' | 'RECEIVABLE') : selectedType;
    const isLiability = activeType === 'LIABILITY';

    const title = isLiability ? 'Registrar Pago de Deuda' : 'Registrar Cobro de Préstamo';
    const actionLabel = isLiability ? 'Pagar desde (Origen)' : 'Depositar en (Destino)';
    const btnLabel = isLiability ? 'Confirmar Pago' : 'Confirmar Cobro';
    const btnColor = isLiability ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20';
    const targetLabel = isLiability ? 'Deuda a Pagar' : 'Préstamo a Cobrar';

    // Calculate Amounts
    const getCalculatedAmounts = () => {
        const val = parseFloat(sourceAmount);
        const rVal = parseFloat(rate);

        if (!val) return { sVal: 0, tVal: 0 };
        if (!isCrossCurrency) return { sVal: val, tVal: val };
        if (!rVal || isNaN(rVal)) return { sVal: 0, tVal: 0 };

        const isSourceVes = sourceCurrency === 'VES';
        const isTargetVes = targetCurrency === 'VES';

        // Case 1: VES -> Foreign (Divisor Rate)
        // Example: User wants to pay $10, but pays with VES.
        // Rate: 50 VES/USD.
        // Input Amount: 500 VES (Source).
        // Target Amount: 500 / 50 = $10 (Target).
        if (isSourceVes && !isTargetVes) {
            if (inputMode === 'SOURCE') { // Input Bs
                return { sVal: val, tVal: val / rVal };
            } else { // Input Foreign
                return { sVal: val * rVal, tVal: val };
            }
        }

        // Case 2: Foreign -> VES (Multiplier Rate)
        // Example: User wants to pay 500 VES debt, but pays with $10.
        // Rate: 50 VES/USD.
        // Input Amount: $10 (Source).
        // Target Amount: 10 * 50 = 500 VES (Target).
        if (!isSourceVes && isTargetVes) {
            if (inputMode === 'SOURCE') { // Input Foreign
                return { sVal: val, tVal: val * rVal };
            } else { // Input Bs
                return { sVal: val / rVal, tVal: val };
            }
        }

        // Fallback
        if (inputMode === 'SOURCE') {
            return { sVal: val, tVal: val * rVal };
        } else {
            return { sVal: val / rVal, tVal: val };
        }
    };

    const { sVal, tVal } = getCalculatedAmounts();

    const handleSettle = async () => {
        if (!sourceAmount || !selectedAssetId || !targetAccount) return;
        if (isCrossCurrency && !rate) return;

        setLoading(true);
        try {
            const description = isLiability
                ? `Pago de deuda: ${targetAccount.name}`
                : `Cobro de préstamo: ${targetAccount.name}`;

            await onSettle(
                sVal, // Used for Source Transaction
                parseInt(selectedAssetId),
                Number(targetAccount.id),
                description,
                isLiability ? 'LIABILITY' : 'RECEIVABLE',
                tVal // Used for Target Adjustment
            );
            onClose();
        } catch (error) {
            console.error(error);
            alert('Error al registrar la operación');
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = (newType: 'LIABILITY' | 'RECEIVABLE') => {
        setSelectedType(newType);
        setSelectedTargetId('');
        setSourceAmount('');
    };

    const handleTargetChange = (id: string) => {
        setSelectedTargetId(id);
        setSourceAmount('');
    };

    return (
        <AccountModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
        >
            <div className="space-y-6">

                {/* Account Selection if not provided */}
                {!account && (
                    <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 mb-4">
                        <div className="flex gap-2 mb-4 p-1 bg-slate-900 rounded-lg">
                            <button
                                onClick={() => handleTypeChange('LIABILITY')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition ${selectedType === 'LIABILITY' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Pagar Deuda
                            </button>
                            <button
                                onClick={() => handleTypeChange('RECEIVABLE')}
                                className={`flex-1 py-2 text-xs font-bold rounded-md transition ${selectedType === 'RECEIVABLE' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Cobrar Préstamo
                            </button>
                        </div>

                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
                            {targetLabel}
                        </label>
                        <select
                            value={selectedTargetId}
                            onChange={(e) => handleTargetChange(e.target.value)}
                            className="w-full input-modern p-3 rounded-xl text-white bg-slate-800 border border-slate-700 focus:border-indigo-500"
                        >
                            <option value="">Seleccionar...</option>
                            {(selectedType === 'LIABILITY' ? liabilityAccounts : receivableAccounts).map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} (Pendiente: {getCurrencySymbol(acc.currency)} {formatNumberWithLocale(Math.abs(Number(acc.balance)))})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Header Info (Only if account is selected/provided) */}
                {targetAccount && (
                    <div className="text-center">
                        {account && <p className="text-sm text-slate-400 mb-1">{isLiability ? 'Deuda con' : 'Deudor'}</p>}
                        {account && <h4 className="text-xl font-bold text-white mb-2">{targetAccount.name}</h4>}
                        <p className={`font-mono font-bold ${isLiability ? 'text-rose-400' : 'text-emerald-400'}`}>
                            Saldo Pendiente: {getCurrencySymbol(targetAccount.currency)} {formatNumberWithLocale(Math.abs(Number(targetAccount.balance)))}
                        </p>
                    </div>
                )}

                {/* Source/Target Selection */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
                        {actionLabel}
                    </label>
                    <select
                        value={selectedAssetId}
                        onChange={(e) => setSelectedAssetId(e.target.value)}
                        className="w-full input-modern p-3 rounded-xl text-white bg-slate-800 border border-slate-700 focus:border-indigo-500"
                    >
                        {assetAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name} ({getCurrencySymbol(acc.currency)} {formatNumberWithLocale(Number(acc.balance))})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-center -my-3">
                    <ArrowDownIcon className="w-5 h-5 text-slate-600" />
                </div>

                {/* Amount Input */}
                <div>
                    <div className="flex justify-between ml-1 mb-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase">
                            Monto a pagar ({inputMode === 'SOURCE' ? (sourceCurrency || '$') : (targetCurrency || '$')})
                        </label>
                        {isCrossCurrency && (
                            <button
                                onClick={() => setInputMode(prev => prev === 'SOURCE' ? 'TARGET' : 'SOURCE')}
                                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded transition"
                            >
                                <ArrowsRightLeftIcon className="w-3 h-3" />
                                Cambiar a {inputMode === 'SOURCE' ? targetCurrency : sourceCurrency}
                            </button>
                        )}
                    </div>

                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                            {inputMode === 'SOURCE'
                                ? (sourceCurrency ? getCurrencySymbol(sourceCurrency) : '$')
                                : (targetCurrency ? getCurrencySymbol(targetCurrency) : '$')
                            }
                        </span>
                        <input
                            type="number"
                            value={sourceAmount}
                            onChange={(e) => setSourceAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            className="w-full input-modern p-3 pl-10 rounded-xl text-white placeholder-slate-600 font-mono text-lg"
                        />
                    </div>
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
                                value={rate}
                                onChange={(e) => setRate(e.target.value)}
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
                                {inputMode === 'SOURCE' ? 'Se abonará a la deuda:' : 'Se pagará desde el origen:'}
                            </span>
                            <span className={`font-mono font-bold ${isLiability ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {inputMode === 'SOURCE'
                                    ? `${targetCurrency ? getCurrencySymbol(targetCurrency) : ''} ${formatNumberWithLocale(tVal)}`
                                    : `${sourceCurrency ? getCurrencySymbol(sourceCurrency) : ''} ${formatNumberWithLocale(sVal)}`
                                }
                            </span>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSettle}
                    disabled={!sourceAmount || !selectedAssetId || !targetAccount || (isCrossCurrency && !rate) || loading}
                    className={`w-full font-bold py-4 rounded-2xl shadow-lg transition transform active:scale-95 disabled:opacity-50 text-white ${btnColor}`}
                >
                    {loading ? 'Procesando...' : btnLabel}
                </button>
            </div>
        </AccountModal>
    );
}
