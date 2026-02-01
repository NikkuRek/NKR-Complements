'use client';

import { useState, useEffect } from 'react';
import { Account, AccountType, Currency, Transaction, Bucket, TransactionType } from '@/types/denarius';
import Link from 'next/link';
import { ArrowRightIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { getCurrencySymbol, formatNumberWithLocale } from '@/lib/currency';
import ConfirmModal from '@/components/ui/ConfirmModal';
import DatePicker from '@/components/ui/DatePicker';
import AssetAccountItem from '@/components/denarius/AssetAccountItem';
import AccountModal from '@/components/ui/AccountModal';
import TransactionModal from './TransactionModal';
import SettleModal from './SettleModal';
import ExchangeRateWidget from './ExchangeRateWidget';
import { CheckIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';


interface AccountsViewProps {
    accounts: Account[];
    onCreateAccount: (
        name: string,
        type: string,
        currency: Currency,
        initialBalance: number,
        startDate?: string | null,
        dueDate?: string | null
    ) => Promise<void>;
    onUpdateAccount?: (id: string, values: Partial<Account>) => Promise<void>;
    onDeleteAccount: (id: string) => Promise<void>;
    getTransactionsByAccount: (accountId: string, limit?: number) => Promise<Transaction[]>;

    // New props for transactions
    buckets?: Bucket[];
    onAddTransaction?: (
        amount: number,
        type: TransactionType,
        accountId: number | null,
        bucketId: number | null,
        description: string,
        targetAmount?: number,
        date?: string
    ) => Promise<void>;

    rates?: {
        USD: number;
        USDT: number;
    };
    loadingRates?: {
        USD: boolean;
        USDT: boolean;
    };
    onFetchUsdRate?: () => Promise<void>;
    onFetchUsdtRate?: () => Promise<void>;
    onSetRate?: (currency: 'USD' | 'USDT', value: number) => void;
}

export default function AccountsView({
    accounts,
    onCreateAccount,
    onUpdateAccount,
    onDeleteAccount,
    getTransactionsByAccount,
    buckets = [],
    onAddTransaction,
    rates = { USD: 1, USDT: 1 },
    loadingRates = { USD: false, USDT: false },
    onFetchUsdRate,
    onFetchUsdtRate,
    onSetRate,
}: AccountsViewProps) {
    // State management
    const [manageVisible, setManageVisible] = useState<{ [key: string]: boolean }>({
        ASSET: false,
        RECEIVABLE: false,
        LIABILITY: false,
    });
    const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');

    // Form states for each account type
    const [newAccountData, setNewAccountData] = useState<{
        [key: string]: {
            name: string;
            init: string;
            currency: Currency;
            startDate?: string;
            dueDate?: string;
        };
    }>({
        ASSET: { name: '', init: '', currency: 'USD' },
        RECEIVABLE: { name: '', init: '', currency: 'USD', startDate: '', dueDate: '' },
        LIABILITY: { name: '', init: '', currency: 'USD', startDate: '', dueDate: '' },
    });

    const [loading, setLoading] = useState(false);

    // Edit ASSET state
    const [editAssetModalOpen, setEditAssetModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Account | null>(null);
    const [editAssetData, setEditAssetData] = useState({ name: '', balance: '', currency: 'USD' as Currency });

    // State for ConfirmModal
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingType, setDeletingType] = useState<string>('');
    const [deletingName, setDeletingName] = useState<string>('');

    // Edit RECEIVABLE state
    const [expandedReceivable, setExpandedReceivable] = useState<string | null>(null);

    // Filter states
    const [showArchivedReceivables, setShowArchivedReceivables] = useState(false);
    const [showArchivedLiabilities, setShowArchivedLiabilities] = useState(false);
    const [showAllAssets, setShowAllAssets] = useState(false);

    // Filter accounts by type
    const assetAccounts = accounts.filter(a => a.type === 'ASSET');

    // Sort Asset Accounts by Normalized USD Value (High to Low)
    const sortedAssets = [...assetAccounts].sort((a, b) => {
        const getUsdValue = (acc: Account) => {
            const bal = Number(acc.balance);
            if (acc.currency === 'USD') return bal;
            if (acc.currency === 'USDT') return bal; // Assuming 1:1 for sorting simplicity or use rate logic if strict
            if (acc.currency === 'VES') return bal / (rates.USD || 1);
            return bal;
        };
        return getUsdValue(b) - getUsdValue(a);
    });

    // Receivables Logic:
    const rawReceivables = accounts.filter(a => a.type === 'RECEIVABLE');
    const activeReceivables = rawReceivables.filter(a => Math.abs(Number(a.balance)) > 0.01);
    const archivedReceivables = rawReceivables.filter(a => Math.abs(Number(a.balance)) <= 0.01);
    const receivableAccounts = showArchivedReceivables ? archivedReceivables : activeReceivables;

    // Liabilities Logic:
    const rawLiabilities = accounts.filter(a => a.type === 'LIABILITY');
    const activeLiabilities = rawLiabilities.filter(a => Math.abs(Number(a.balance)) > 0.01);
    const archivedLiabilities = rawLiabilities.filter(a => Math.abs(Number(a.balance)) <= 0.01);
    const liabilityAccounts = showArchivedLiabilities ? archivedLiabilities : activeLiabilities;

    const [editReceivableModalOpen, setEditReceivableModalOpen] = useState(false);
    const [editingReceivable, setEditingReceivable] = useState<Account | null>(null);
    const [editReceivableData, setEditReceivableData] = useState({ name: '', balance: '', currency: 'USD' as Currency, startDate: '', dueDate: '' });

    // Edit LIABILITY state
    const [expandedLiability, setExpandedLiability] = useState<string | null>(null);
    const [editLiabilityModalOpen, setEditLiabilityModalOpen] = useState(false);
    const [editingLiability, setEditingLiability] = useState<Account | null>(null);
    const [editLiabilityData, setEditLiabilityData] = useState({ name: '', balance: '', currency: 'USD' as Currency, startDate: '', dueDate: '' });

    // Settle Modal State
    const [settleModalOpen, setSettleModalOpen] = useState(false);
    const [settlingAccount, setSettlingAccount] = useState<{ account: Account, type: 'LIABILITY' | 'RECEIVABLE' } | null>(null);
    const [transactionModalOpen, setTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [transferModalOpen, setTransferModalOpen] = useState(false);
    const [transferSource, setTransferSource] = useState('');
    const [transferTarget, setTransferTarget] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferRate, setTransferRate] = useState(''); // Manual rate override allowed
    const [transferInputMode, setTransferInputMode] = useState<'SOURCE' | 'TARGET'>('SOURCE');

    // Local state for rate editing to fix decimal input issues
    const [tempRates, setTempRates] = useState({ USD: String(rates.USD), USDT: String(rates.USDT) });

    useEffect(() => {
        setTempRates({
            USD: String(rates.USD),
            USDT: String(rates.USDT)
        });
    }, [rates]);

    const handleRateChange = (currency: 'USD' | 'USDT', value: string) => {
        setTempRates(prev => ({ ...prev, [currency]: value }));
    };

    const handleRateSubmit = (currency: 'USD' | 'USDT') => {
        const val = parseFloat(tempRates[currency]);
        if (!isNaN(val) && onSetRate) {
            onSetRate(currency, val);
        } else {
            setTempRates(prev => ({ ...prev, [currency]: String(rates[currency]) }));
        }
    };

    // Toggle manager visibility
    const toggleManager = (type: string) => {
        setManageVisible(prev => ({ ...prev, [type]: !prev[type] }));
    };

    // Handle create account
    const handleCreateAccount = async (type: string) => {
        const data = newAccountData[type];
        if (!data.name.trim()) return;

        setLoading(true);
        try {
            await onCreateAccount(
                data.name,
                type,
                data.currency,
                parseFloat(data.init) || 0,
                data.startDate || null,
                data.dueDate || null
            );

            // AUTO-TRANSACTION LOGIC
            const initAmount = parseFloat(data.init);
            if ((type === 'RECEIVABLE' || type === 'LIABILITY') && initAmount > 0) {
                const bankAccount = accounts.find(a => String(a.id) === '1');
                
                if (bankAccount && onAddTransaction) {
                    // Calculate Amount in Bank Currency
                    let finalAmount = initAmount;
                    
                    if (data.currency !== bankAccount.currency) {
                        const getRate = (curr: Currency) => {
                            if (curr === 'USD') return rates.USD;
                            if (curr === 'USDT') return rates.USDT;
                            return 1; // VES or 1:1 fallback
                        };
                        
                        // Convert Source to VES
                        let valInVes = initAmount;
                        if (data.currency !== 'VES') {
                            valInVes = initAmount * getRate(data.currency);
                        }

                        // Convert VES to Target (Bank)
                        if (bankAccount.currency === 'VES') {
                            finalAmount = valInVes;
                        } else {
                            finalAmount = valInVes / getRate(bankAccount.currency);
                        }
                    }

                    const isReceivable = type === 'RECEIVABLE';
                    const txType = isReceivable ? 'EXPENSE' : 'INCOME';
                    const actionText = isReceivable ? 'Gasto' : 'Ingreso';
                    const desc = isReceivable ? `Préstamo otorgado: ${data.name}` : `Préstamo recibido: ${data.name}`;

                    // Small timeout to allow UI to update or just feel natural
                    setTimeout(async () => {
                         if (window.confirm(`¿Desea registrar automáticamente el ${actionText} en la Cuenta Principal (ID 1)?\n\nMonto: ${bankAccount.currency} ${formatNumberWithLocale(finalAmount)}`)) {
                            // Using ID 1 for Account and Bucket as requested
                            await onAddTransaction(
                                finalAmount,
                                txType,
                                1, 
                                1, 
                                desc
                            );
                        }
                    }, 100);
                }
            }

            // Reset form
            setNewAccountData(prev => ({
                ...prev,
                [type]: type === 'ASSET'
                    ? { name: '', init: '', currency: 'USD' }
                    : { name: '', init: '', currency: 'USD', startDate: '', dueDate: '' },
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Handle delete account
    const handleDelete = async (id: string) => {
        setLoading(true);
        try {
            await onDeleteAccount(id);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Update form data
    const updateFormData = (type: string, field: string, value: string) => {
        setNewAccountData(prev => ({
            ...prev,
            [type]: { ...prev[type], [field]: value },
        }));
    };

    // Handle edit ASSET
    const handleEditAsset = async () => {
        if (!editingAsset || !editAssetData.name.trim() || !onUpdateAccount) return;

        setLoading(true);
        try {
            await onUpdateAccount(editingAsset.id, {
                name: editAssetData.name,
                balance: parseFloat(editAssetData.balance) || editingAsset.balance,
                currency: editAssetData.currency,
            });
            setEditAssetModalOpen(false);
            setEditingAsset(null);
            setEditAssetData({ name: '', balance: '', currency: 'USD' });
        } catch (error) {
            console.error(error);
            alert('Error al actualizar la cuenta');
        } finally {
            setLoading(false);
        }
    };

    // Helper: Convert date to YYYY-MM-DD format for MySQL
    const formatDateForMySQL = (dateString: string): string | null => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    // Helper: Format date for display
    const formatDateDisplay = (dateString?: string | null) => {
        if (!dateString) return null;
        // Ajustar para evitar problemas de zona horaria con fechas YYYY-MM-DD
        const date = new Date(dateString);
        // Sumar minutos de offset para compensar si es necesario, o simplemente mostrar UTC slice
        // Una forma segura para YYYY-MM-DD es:
        return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleDateString();
    };

    // Handle edit RECEIVABLE
    const handleEditReceivable = async () => {
        if (!editingReceivable || !editReceivableData.name.trim() || !onUpdateAccount) return;

        setLoading(true);
        try {
            await onUpdateAccount(editingReceivable.id, {
                name: editReceivableData.name,
                balance: parseFloat(editReceivableData.balance) || editingReceivable.balance,
                currency: editReceivableData.currency,
                start_date: formatDateForMySQL(editReceivableData.startDate),
                due_date: formatDateForMySQL(editReceivableData.dueDate),
            });
            setEditReceivableModalOpen(false);
            setEditingReceivable(null);
            setEditReceivableData({ name: '', balance: '', currency: 'USD', startDate: '', dueDate: '' });
        } catch (error) {
            console.error(error);
            alert('Error al actualizar el préstamo');
        } finally {
            setLoading(false);
        }
    };

    // Handle edit LIABILITY
    const handleEditLiability = async () => {
        if (!editingLiability || !editLiabilityData.name.trim() || !onUpdateAccount) return;

        setLoading(true);
        try {
            await onUpdateAccount(editingLiability.id, {
                name: editLiabilityData.name,
                balance: parseFloat(editLiabilityData.balance) || editingLiability.balance,
                currency: editLiabilityData.currency,
                start_date: formatDateForMySQL(editLiabilityData.startDate),
                due_date: formatDateForMySQL(editLiabilityData.dueDate),
            });
            setEditLiabilityModalOpen(false);
            setEditingLiability(null);
            setEditLiabilityData({ name: '', balance: '', currency: 'USD', startDate: '', dueDate: '' });
        } catch (error) {
            console.error(error);
            alert('Error al actualizar la deuda');
        } finally {
            setLoading(false);
        }
    };

    // Handle Save Transaction
    const handleSaveTransaction = async (amount: number, accountId: number, bucketId: number | null, description: string, targetAmount?: number, date?: string) => {
        if (!onAddTransaction) return;
        await onAddTransaction(amount, transactionType, accountId, bucketId, description, targetAmount, date);
    };

    // Calculate default rate when transfer details change
    useEffect(() => {
        if (transferModalOpen && transferSource && transferTarget) {
            // Reset input mode to SOURCE when opening or changing targets
            if (!transferAmount) setTransferInputMode('SOURCE');

            const source = accounts.find(a => String(a.id) === transferSource);
            const target = accounts.find(a => String(a.id) === transferTarget);

            if (source && target && source.currency !== target.currency) {
                const sCurr = source.currency;
                const tCurr = target.currency;

                let defaultRate = 1;

                // VES <-> USD/USDT
                if (sCurr === 'VES' && tCurr === 'USD') defaultRate = rates.USD;
                else if (sCurr === 'USD' && tCurr === 'VES') defaultRate = rates.USD;
                else if (sCurr === 'VES' && tCurr === 'USDT') defaultRate = rates.USDT;
                else if (sCurr === 'USDT' && tCurr === 'VES') defaultRate = rates.USDT;
                else if (sCurr === 'USD' && tCurr === 'USDT') defaultRate = 1;
                else if (sCurr === 'USDT' && tCurr === 'USD') defaultRate = 1;

                setTransferRate(String(defaultRate));
            } else {
                setTransferRate('1');
            }
        }
    }, [transferSource, transferTarget, transferModalOpen, rates]); // Added rates back to dependency to keep it current

    // Calculate Final Amounts based on Input Mode
    const getCalculatedTransferAmounts = () => {
        const val = parseFloat(transferAmount);
        const rateVal = parseFloat(transferRate);

        if (!val) return { sVal: 0, tVal: 0 };
        const sourceAcc = accounts.find(a => String(a.id) === transferSource);
        const targetAcc = accounts.find(a => String(a.id) === transferTarget);

        if (!sourceAcc || !targetAcc) return { sVal: 0, tVal: 0 };

        const sCurr = sourceAcc.currency;
        const tCurr = targetAcc.currency;

        if (sCurr === tCurr) return { sVal: val, tVal: val };
        if (!rateVal || isNaN(rateVal)) return { sVal: 0, tVal: 0 };

        const isSourceVes = sCurr === 'VES';
        const isTargetVes = tCurr === 'VES';

        // Case 1: VES -> Foreign (Divisor Rate)
        if (isSourceVes && !isTargetVes) {
            if (transferInputMode === 'SOURCE') { // Input Bs
                return { sVal: val, tVal: val / rateVal };
            } else { // Input Foreign
                return { sVal: val * rateVal, tVal: val };
            }
        }

        // Case 2: Foreign -> VES (Multiplier Rate)
        if (!isSourceVes && isTargetVes) {
            if (transferInputMode === 'SOURCE') { // Input Foreign
                return { sVal: val, tVal: val * rateVal };
            } else { // Input Bs
                return { sVal: val / rateVal, tVal: val };
            }
        }

        // Fallback (e.g., USD <-> USDT, or other non-VES cross-currency if rates were different)
        // For USD <-> USDT, rate is usually 1, so this simplifies.
        if (transferInputMode === 'SOURCE') {
            return { sVal: val, tVal: val * rateVal };
        } else {
            return { sVal: val / rateVal, tVal: val };
        }
    };

    const { sVal, tVal } = getCalculatedTransferAmounts();
    const safeTargetVal = Number(tVal.toFixed(2));

    // Handle Transfer Execution
    const executeTransfer = async () => {
        if (!onAddTransaction || !transferSource || !transferTarget || !transferAmount) return;

        const sourceAcc = accounts.find(a => String(a.id) === transferSource);
        const targetAcc = accounts.find(a => String(a.id) === transferTarget);
        if (!sourceAcc || !targetAcc) return;

        if (isNaN(sVal) || sVal <= 0) {
            alert("Monto inválido");
            return;
        }

        const isCross = sourceAcc.currency !== targetAcc.currency;
        if (isCross && (!parseFloat(transferRate) || isNaN(parseFloat(transferRate)))) {
            alert("Tasa de cambio inválida");
            return;
        }

        if (isNaN(safeTargetVal) || safeTargetVal <= 0) {
            alert("Error en cálculo de conversión");
            return;
        }

        setLoading(true);
        try {
            // Outflow (Always Source Currency Amount)
            await onAddTransaction(
                sVal,
                'TRANSFER_OUT',
                Number(transferSource),
                null,
                `Transferencia enviada a ${targetAcc.name}`
            );

            // Inflow (Always Target Currency Amount)
            await onAddTransaction(
                safeTargetVal,
                'TRANSFER_IN',
                Number(transferTarget),
                null,
                `Transferencia recibida de ${sourceAcc.name}`
            );

            setTransferModalOpen(false);
            setTransferAmount('');
            setTransferSource('');
            setTransferTarget('');
            setTransferInputMode('SOURCE');
        } catch (err) {
            console.error(err);
            alert("Error al realizar la transferencia");
        } finally {
            setLoading(false);
        }
    };


    // Handle Settle (Pay Debt / Collect Loan)
    const handleSettle = async (
        amount: number,
        sourceAccountId: number,
        targetAccountId: number,
        description: string,
        type: 'LIABILITY' | 'RECEIVABLE',
        targetAmount?: number // New optional param for cross-currency
    ) => {
        if (!onAddTransaction) return;

        // Prevent settling with same account (should not happen via UI but good safety)
        if (sourceAccountId === targetAccountId) {
            alert("No se puede utilizar la misma cuenta de origen y destino.");
            return;
        }

        // If targetAmount not provided, assume same amount (same currency)
        const tAmount = targetAmount !== undefined ? targetAmount : amount;

        setLoading(true);
        console.log('handleSettle Called:', { amount, tAmount, sourceAccountId, targetAccountId, type });
        try {
            if (type === 'LIABILITY') {
                // Paying a Debt:
                // 1. Expense from Asset (Source) - Real money leaving bank (Source Amount)
                const descSource = `${description}`;
                console.log('Tx 1 (Source Bank):', { amount, type: 'EXPENSE', accountId: sourceAccountId, desc: descSource });
                // Link to General Bucket (ID: 1)
                await onAddTransaction(amount, 'EXPENSE', sourceAccountId, 1, descSource);

                // 2. Expense from Liability (Target) - Adjustment to reduce debt balance (Target Amount)
                const descTarget = `Ajuste de Deuda (Pago Realizado)`;
                console.log('Tx 2 (Target Debt):', { amount: tAmount, type: 'EXPENSE', accountId: targetAccountId, desc: descTarget });
                await onAddTransaction(tAmount, 'EXPENSE', targetAccountId, null, descTarget);
            } else {
                // Collecting a Loan:
                // 1. Expense from Receivable (Target - the debt account) - Reduces positive balance (Target Amount)
                const descTarget = `Ajuste de Préstamo (Cobro Realizado)`;
                console.log('Tx 1 (Target Loan):', { amount: tAmount, type: 'EXPENSE', accountId: targetAccountId, desc: descTarget });
                await onAddTransaction(tAmount, 'EXPENSE', targetAccountId, null, descTarget);

                // 2. Income to Asset (Source - where money lands) (Source Amount)
                const descSource = `${description}`;
                console.log('Tx 2 (Source Bank):', { amount, type: 'INCOME', accountId: sourceAccountId, desc: descSource });
                // Link to General Bucket (ID: 1)
                await onAddTransaction(amount, 'INCOME', sourceAccountId, 1, descSource);
            }
            setSettleModalOpen(false);
            setSettlingAccount(null);
        } catch (error) {
            console.error(error);
            alert('Error al registrar operación');
        } finally {
            setLoading(false);
        }
    };

    // Get icon and color styles based on account type and currency
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


    // Calculate totals with currency conversion
    const calculateTotals = () => {
        let assets = 0;
        let receivables = 0;
        let liabilities = 0;

        const convert = (amount: number, currency: Currency) => {
            if (currency === displayCurrency) return amount;

            // From VES
            if (currency === 'VES') {
                if (displayCurrency === 'USD') return amount / rates.USD;
                if (displayCurrency === 'USDT') return amount / rates.USDT; // Assuming direct conversion VES -> USDT is roughly VES/USD_Rate? No wait, usually rateUSDT is VES/USDT.
            }

            // From USD
            if (currency === 'USD') {
                if (displayCurrency === 'VES') return amount * rates.USD;
                if (displayCurrency === 'USDT') return (amount * rates.USD) / rates.USDT; // (Amount * VES/USD) / VES/USDT = USDT
            }

            // From USDT
            if (currency === 'USDT') {
                if (displayCurrency === 'VES') return amount * rates.USDT;
                if (displayCurrency === 'USD') return (amount * rates.USDT) / rates.USD;
            }

            return amount;
        };

        accounts.forEach(account => {
            const val = convert(Number(account.balance), account.currency);

            if (account.type === 'ASSET') assets += val;
            else if (account.type === 'RECEIVABLE') receivables += Math.abs(val);
            else if (account.type === 'LIABILITY') liabilities += Math.abs(val);
        });

        const equity = assets + receivables - liabilities;
        return { assets, receivables, liabilities, equity };
    };

    const totals = calculateTotals();


    return (
        <div id="view-home" className="space-y-6 animate-fade-in">
            {/* TASAS DE CAMBIO (Pills Style) */}
            <div className="flex gap-3 justify-center text-xs">
                {/* USD Widget */}
                <ExchangeRateWidget
                    currency="USD"
                    rate={rates.USD}
                    loading={loadingRates.USD}
                    onFetchRate={onFetchUsdRate || (() => { })}
                    onRateChange={(val) => onSetRate && onSetRate('USD', val)}
                />

                {/* USDT Widget */}
                <ExchangeRateWidget
                    currency="USDT"
                    rate={rates.USDT}
                    loading={loadingRates.USDT}
                    onFetchRate={onFetchUsdtRate || (() => { })}
                    onRateChange={(val) => onSetRate && onSetRate('USDT', val)}
                />
            </div>

            {/* BALANCE GENERAL (Hero Card) */}
            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#2e2a5b] to-[#0f172a] p-6 shadow-2xl border border-white/10 group">
                {/* Decorative blurred blobs */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-indigo-500 rounded-full opacity-10 blur-3xl group-hover:opacity-20 transition duration-700"></div>
                <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 bg-blue-500 rounded-full opacity-5 blur-3xl"></div>

                <div className="flex justify-between items-start mb-2 relative z-10">
                    <p className="text-indigo-200/70 text-xs font-medium uppercase tracking-wider">Patrimonio Neto</p>
                    {/* Selector de moneda */}
                    <div className="relative">
                        <select
                            value={displayCurrency}
                            onChange={(e) => setDisplayCurrency(e.target.value as Currency)}
                            className="appearance-none bg-black/20 text-white text-[10px] font-bold uppercase rounded-lg py-1 px-3 pr-6 focus:outline-none cursor-pointer border border-white/10 hover:bg-black/30 transition-colors"
                        >
                            <option value="USD" className="bg-slate-900">USD</option>
                            <option value="VES" className="bg-slate-900">VES</option>
                            <option value="USDT" className="bg-slate-900">USDT</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-300">
                            <i className="fas fa-chevron-down text-[8px]"></i>
                        </div>
                    </div>
                </div>

                <h2 className="text-4xl font-mono font-bold text-white mb-6 relative z-10 tracking-tight">
                    {getCurrencySymbol(displayCurrency)}{formatNumberWithLocale(totals.equity)}
                </h2>

                <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-4 relative z-10">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1 text-emerald-400/80">
                            <i className="fas fa-arrow-up text-[10px]"></i>
                            <p className="text-[9px] uppercase tracking-wide font-bold">Activos</p>
                        </div>
                        <p className="font-mono font-medium text-white text-xs">
                            {getCurrencySymbol(displayCurrency)}{formatNumberWithLocale(totals.assets)}
                        </p>
                    </div>
                    <div className="text-center border-l border-white/5">
                        <div className="flex items-center justify-center gap-1 mb-1 text-blue-400/80">
                            <i className="far fa-clock text-[10px]"></i>
                            <p className="text-[9px] uppercase tracking-wide font-bold">Cobrar</p>
                        </div>
                        <p className="font-mono font-medium text-white text-xs">
                            {getCurrencySymbol(displayCurrency)}{formatNumberWithLocale(totals.receivables)}
                        </p>
                    </div>
                    <div className="text-center border-l border-white/5">
                        <div className="flex items-center justify-center gap-1 mb-1 text-rose-400/80">
                            <i className="fas fa-arrow-down text-[10px]"></i>
                            <p className="text-[9px] uppercase tracking-wide font-bold">Deudas</p>
                        </div>
                        <p className="font-mono font-medium text-white text-xs">
                            {getCurrencySymbol(displayCurrency)}{formatNumberWithLocale(totals.liabilities)}
                        </p>
                    </div>
                </div>
            </section>

            {/* ACCIONES RÁPIDAS (Icon Row) */}
            <div className="grid grid-cols-3 gap-3">
                <Button
                    variant="success"
                    className="!rounded-2xl !p-4 flex-col items-center justify-center gap-2 h-auto"
                    onClick={() => {
                        setTransactionType('INCOME');
                        setTransactionModalOpen(true);
                    }}
                >
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <i className="fas fa-plus text-white text-sm"></i>
                    </div>
                    <span className="text-[10px] font-medium text-white/90">Ingreso</span>
                </Button>

                <Button
                    variant="danger"
                    className="!rounded-2xl !p-4 flex-col items-center justify-center gap-2 h-auto"
                    onClick={() => {
                        setTransactionType('EXPENSE');
                        setTransactionModalOpen(true);
                    }}
                >
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <i className="fas fa-minus text-white text-sm"></i>
                    </div>
                    <span className="text-[10px] font-medium text-white/90">Gasto</span>
                </Button>

                <Button
                    variant="primary" // Using primary for "Move"
                    className="!rounded-2xl !p-4 flex-col items-center justify-center gap-2 h-auto bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50"
                    onClick={() => setTransferModalOpen(true)}
                >
                    <div className="w-10 h-10 rounded-full bg-indigo-500/90 flex items-center justify-center group-hover:bg-indigo-500/20 transition">
                        <i className="fas fa-exchange-alt text-white text-sm"></i>
                    </div>
                    <span className="text-[10px] font-medium text-white/90">Mover</span>
                </Button>
            </div>

            {/* SECCIONES DE CUENTAS */}

            {/* Activos */}
            <section className="space-y-3">
                <div className="flex justify-between items-end px-1">
                    <h3 className="font-bold text-white text-sm">Cuentas</h3>
                    <button
                        onClick={() => toggleManager('ASSET')}
                        className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 hover:scale-105 transition"
                    >
                        <i className="fas fa-plus text-sm"></i>
                    </button>
                </div>

                {/* Lista Dinámica */}
                <div className="space-y-3">
                    {assetAccounts.length === 0 ? (
                        <p className="text-center text-slate-500 py-4 text-sm">No hay cuentas</p>
                    ) : (
                        <>
                            {sortedAssets.slice(0, showAllAssets ? undefined : 3).map((account) => (
                                <AssetAccountItem
                                    key={account.id}
                                    account={account}
                                    onDelete={handleDelete}
                                    onEdit={(account) => {
                                        setEditingAsset(account);
                                        setEditAssetData({
                                            name: account.name,
                                            balance: String(account.balance),
                                            currency: account.currency,
                                        });
                                        setEditAssetModalOpen(true);
                                    }}
                                    getTransactions={getTransactionsByAccount}
                                />
                            ))}

                            {assetAccounts.length > 3 && (
                                <button
                                    onClick={() => setShowAllAssets(!showAllAssets)}
                                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition flex items-center justify-center gap-2"
                                >
                                    {showAllAssets ? (
                                        <>
                                            <i className="fas fa-chevron-up"></i> Ver menos
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-chevron-down"></i> Ver más ({assetAccounts.length - 3})
                                        </>
                                    )}
                                </button>
                            )}
                        </>
                    )}
                </div>


            </section>

            {/* Préstamos */}
            <section className="space-y-3">
                <div className="flex justify-between items-end px-1">
                    <h3 className="font-bold text-white text-sm">Préstamos {showArchivedReceivables && '(Archivados)'}</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowArchivedReceivables(!showArchivedReceivables)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${showArchivedReceivables
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'
                                }`}
                            title={showArchivedReceivables ? "Ver Activos" : "Ver Archivados (Pagados)"}
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toggleManager('RECEIVABLE')}
                            className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 hover:scale-105 transition"
                        >
                            <i className="fas fa-plus text-sm"></i>
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {receivableAccounts.length === 0 ? (
                        <p className="text-center text-slate-500 py-4 text-sm">No hay préstamos</p>
                    ) : (
                        receivableAccounts.map((account) => {
                            const styles = getAccountStyles('RECEIVABLE');
                            const isExpanded = expandedReceivable === account.id;
                            return (
                                <div key={account.id} className={`glass-panel p-3 border ${styles.borderColor} rounded-xl shadow-sm hover:bg-slate-800 transition-colors`}>
                                    <div
                                        className="flex justify-between items-center cursor-pointer"
                                        onClick={() => setExpandedReceivable(isExpanded ? null : account.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.iconColor}`}>
                                                <i className={`fas ${styles.icon}`}></i>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-white mb-1">{account.name}</h4>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                                        {account.currency}
                                                    </span>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                                                        {account.start_date && (
                                                            <span><i className="fas fa-calendar-check mr-1"></i>{formatDateDisplay(account.start_date)}</span>
                                                        )}
                                                        {account.due_date && (
                                                            <span><i className="fas fa-flag-checkered mr-1"></i>{formatDateDisplay(account.due_date)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-lg ${Number(account.balance) < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                                                {getCurrencySymbol(account.currency)} {formatNumberWithLocale(Number(account.balance))}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSettlingAccount({ account, type: 'RECEIVABLE' });
                                                    setSettleModalOpen(true);
                                                }}
                                                className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition ml-2 backdrop-blur-sm"
                                                title="Registrar Cobro"
                                            >
                                                <CurrencyDollarIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                                            <div className="mb-4 text-xs space-y-2">
                                                <div className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg">
                                                    <span className="text-slate-400">Inicio</span>
                                                    <span className="text-slate-200 font-mono">{formatDateDisplay(account.start_date) || '-'}</span>
                                                </div>
                                                {account.due_date && (
                                                    <div className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
                                                        <span className="text-slate-400">Vencimiento</span>
                                                        <span className="text-orange-300 font-mono">{formatDateDisplay(account.due_date)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingReceivable(account);
                                                        setEditReceivableData({
                                                            name: account.name,
                                                            balance: String(account.balance),
                                                            currency: account.currency,
                                                            startDate: account.start_date || '',
                                                            dueDate: account.due_date || '',
                                                        });
                                                        setEditReceivableModalOpen(true);
                                                    }}
                                                    className="w-8 h-8 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 flex items-center justify-center transition"
                                                    title="Editar préstamo"
                                                >
                                                    <i className="fas fa-pen text-sm"></i>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingId(account.id);
                                                        setDeletingName(account.name);
                                                        setDeletingType('Préstamo');
                                                    }}
                                                    className="w-8 h-8 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 flex items-center justify-center transition"
                                                    title="Eliminar préstamo"
                                                >
                                                    <i className="fas fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>


            </section>

            {/* Deudas */}
            <section className="space-y-3">
                <div className="flex justify-between items-end px-1">
                    <h3 className="font-bold text-white text-sm">Deudas {showArchivedLiabilities && '(Archivadas)'}</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowArchivedLiabilities(!showArchivedLiabilities)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition ${showArchivedLiabilities
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'
                                }`}
                            title={showArchivedLiabilities ? "Ver Activas" : "Ver Archivadas (Pagadas)"}
                        >
                            <ArchiveBoxIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toggleManager('LIABILITY')}
                            className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/20 hover:scale-105 transition"
                        >
                            <i className="fas fa-plus text-sm"></i>
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {liabilityAccounts.length === 0 ? (
                        <p className="text-center text-slate-500 py-4 text-sm">No hay deudas</p>
                    ) : (
                        liabilityAccounts.map((account) => {
                            const styles = getAccountStyles('LIABILITY');
                            const isExpanded = expandedLiability === account.id;
                            return (
                                <div key={account.id} className={`glass-panel p-3 border ${styles.borderColor} rounded-xl shadow-sm hover:bg-slate-800 transition-colors`}>
                                    <div
                                        className="flex justify-between items-center cursor-pointer"
                                        onClick={() => setExpandedLiability(isExpanded ? null : account.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${styles.iconColor}`}>
                                                <i className={`fas ${styles.icon}`}></i>
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-medium text-white mb-1">{account.name}</h4>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
                                                        {account.currency}
                                                    </span>
                                                    <div className="text-[10px] text-slate-400 mt-0.5 flex gap-2">
                                                        {account.start_date && (
                                                            <span><i className="fas fa-calendar-check mr-1"></i>{formatDateDisplay(account.start_date)}</span>
                                                        )}
                                                        {account.due_date && (
                                                            <span><i className="fas fa-flag-checkered mr-1"></i>{formatDateDisplay(account.due_date)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-bold text-lg ${Number(account.balance) < 0 ? 'text-rose-500' : 'text-rose-400'}`}>
                                                {getCurrencySymbol(account.currency)} {formatNumberWithLocale(Number(account.balance))}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSettlingAccount({ account, type: 'LIABILITY' });
                                                    setSettleModalOpen(true);
                                                }}
                                                className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center hover:bg-rose-500/30 transition ml-2 backdrop-blur-sm"
                                                title="Registrar Pago"
                                            >
                                                <CheckIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-4 pt-4 border-t border-slate-700/50">
                                            <div className="mb-4 text-xs space-y-2">
                                                <div className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg">
                                                    <span className="text-slate-400">Inicio</span>
                                                    <span className="text-slate-200 font-mono">{formatDateDisplay(account.start_date) || '-'}</span>
                                                </div>
                                                {account.due_date && (
                                                    <div className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
                                                        <span className="text-slate-400">Pago Estimado</span>
                                                        <span className="text-orange-300 font-mono">{formatDateDisplay(account.due_date)}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingLiability(account);
                                                        setEditLiabilityData({
                                                            name: account.name,
                                                            balance: String(account.balance),
                                                            currency: account.currency,
                                                            startDate: account.start_date || '',
                                                            dueDate: account.due_date || '',
                                                        });
                                                        setEditLiabilityModalOpen(true);
                                                    }}
                                                    className="w-8 h-8 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 flex items-center justify-center transition"
                                                    title="Editar deuda"
                                                >
                                                    <i className="fas fa-pen text-sm"></i>
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletingId(account.id);
                                                        setDeletingName(account.name);
                                                        setDeletingType('Deuda');
                                                    }}
                                                    className="w-8 h-8 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 flex items-center justify-center transition"
                                                    title="Eliminar deuda"
                                                >
                                                    <i className="fas fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>


            </section>

            {/* MODAL ASSET */}
            <AccountModal
                isOpen={manageVisible.ASSET}
                onClose={() => toggleManager('ASSET')}
                title="Nueva Cuenta"
            >
                <div className="space-y-4">
                    <input
                        type="text"
                        value={newAccountData.ASSET.name}
                        onChange={(e) => updateFormData('ASSET', 'name', e.target.value)}
                        placeholder="Nombre (ej. Banco)"
                        className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={newAccountData.ASSET.init}
                            onChange={(e) => updateFormData('ASSET', 'init', e.target.value)}
                            placeholder="Saldo Inicial"
                            step="0.01"
                            className="w-2/3 input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                        <select
                            value={newAccountData.ASSET.currency}
                            onChange={(e) => updateFormData('ASSET', 'currency', e.target.value)}
                            className="w-1/3 input-modern p-4 rounded-xl text-white bg-slate-800"
                        >
                            <option className="bg-slate-800" value="USD">USD</option>
                            <option className="bg-slate-800" value="VES">VES</option>
                            <option className="bg-slate-800" value="USDT">USDT</option>
                        </select>
                    </div>
                    <button
                        onClick={() => handleCreateAccount('ASSET')}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Creando...' : 'Crear Cuenta'}
                    </button>
                </div>
            </AccountModal>

            {/* MODAL RECEIVABLE */}
            <AccountModal
                isOpen={manageVisible.RECEIVABLE}
                onClose={() => toggleManager('RECEIVABLE')}
                title="Nuevo Préstamo"
            >
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Inicio</label>
                            <DatePicker
                                id="receivable-start-date"
                                value={newAccountData.RECEIVABLE.startDate}
                                onChange={(date) => updateFormData('RECEIVABLE', 'startDate', date)}
                                placeholder="Hoy"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Vencimiento</label>
                            <DatePicker
                                id="receivable-due-date"
                                value={newAccountData.RECEIVABLE.dueDate}
                                onChange={(date) => updateFormData('RECEIVABLE', 'dueDate', date)}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>
                    <input
                        type="text"
                        value={newAccountData.RECEIVABLE.name}
                        onChange={(e) => updateFormData('RECEIVABLE', 'name', e.target.value)}
                        placeholder="Deudor"
                        className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={newAccountData.RECEIVABLE.init}
                            onChange={(e) => updateFormData('RECEIVABLE', 'init', e.target.value)}
                            placeholder="Monto"
                            step="0.01"
                            className="w-2/3 input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                        <select
                            value={newAccountData.RECEIVABLE.currency}
                            onChange={(e) => updateFormData('RECEIVABLE', 'currency', e.target.value)}
                            className="w-1/3 input-modern p-4 rounded-xl text-white bg-slate-800"
                        >
                            <option className="bg-slate-800" value="USD">USD</option>
                            <option className="bg-slate-800" value="VES">VES</option>
                        </select>
                    </div>
                    <button
                        onClick={() => handleCreateAccount('RECEIVABLE')}
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Creando...' : 'Guardar'}
                    </button>
                </div>
            </AccountModal>

            {/* MODAL LIABILITY */}
            <AccountModal
                isOpen={manageVisible.LIABILITY}
                onClose={() => toggleManager('LIABILITY')}
                title="Nueva Deuda"
            >
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Inicio</label>
                            <DatePicker
                                id="liability-start-date"
                                value={newAccountData.LIABILITY.startDate}
                                onChange={(date) => updateFormData('LIABILITY', 'startDate', date)}
                                placeholder="Hoy"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Pago</label>
                            <DatePicker
                                id="liability-due-date"
                                value={newAccountData.LIABILITY.dueDate}
                                onChange={(date) => updateFormData('LIABILITY', 'dueDate', date)}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>
                    <input
                        type="text"
                        value={newAccountData.LIABILITY.name}
                        onChange={(e) => updateFormData('LIABILITY', 'name', e.target.value)}
                        placeholder="Acreedor"
                        className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={newAccountData.LIABILITY.init}
                            onChange={(e) => updateFormData('LIABILITY', 'init', e.target.value)}
                            placeholder="Monto"
                            step="0.01"
                            className="w-2/3 input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                        <select
                            value={newAccountData.LIABILITY.currency}
                            onChange={(e) => updateFormData('LIABILITY', 'currency', e.target.value)}
                            className="w-1/3 input-modern p-4 rounded-xl text-white bg-slate-800"
                        >
                            <option className="bg-slate-800" value="USD">USD</option>
                            <option className="bg-slate-800" value="VES">VES</option>
                        </select>
                    </div>
                    <button
                        onClick={() => handleCreateAccount('LIABILITY')}
                        disabled={loading}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Creando...' : 'Guardar'}
                    </button>
                </div>
            </AccountModal>

            {/* MODAL EDITAR ASSET */}
            <AccountModal
                isOpen={editAssetModalOpen}
                onClose={() => {
                    setEditAssetModalOpen(false);
                    setEditingAsset(null);
                    setEditAssetData({ name: '', balance: '', currency: 'USD' });
                }}
                title="Editar Cuenta"
            >
                <div className="space-y-4">
                    <input
                        type="text"
                        value={editAssetData.name}
                        onChange={(e) => setEditAssetData({ ...editAssetData, name: e.target.value })}
                        placeholder="Nombre de la cuenta"
                        className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={editAssetData.balance}
                            onChange={(e) => setEditAssetData({ ...editAssetData, balance: e.target.value })}
                            placeholder="Balance"
                            step="0.01"
                            className="w-2/3 input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                        <select
                            value={editAssetData.currency}
                            onChange={(e) => setEditAssetData({ ...editAssetData, currency: e.target.value as Currency })}
                            className="w-1/3 input-modern p-4 rounded-xl text-white bg-slate-800"
                        >
                            <option className="bg-slate-800" value="USD">USD</option>
                            <option className="bg-slate-800" value="VES">VES</option>
                            <option className="bg-slate-800" value="USDT">USDT</option>
                        </select>
                    </div>
                    <button
                        onClick={handleEditAsset}
                        disabled={!editAssetData.name.trim() || loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </AccountModal>

            {/* MODAL EDITAR RECEIVABLE (Préstamo) */}
            <AccountModal
                isOpen={editReceivableModalOpen}
                onClose={() => {
                    setEditReceivableModalOpen(false);
                    setEditingReceivable(null);
                    setEditReceivableData({ name: '', balance: '', currency: 'USD', startDate: '', dueDate: '' });
                }}
                title="Editar Préstamo"
            >
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Inicio</label>
                            <DatePicker
                                id="edit-receivable-start"
                                value={editReceivableData.startDate}
                                onChange={(date) => setEditReceivableData({ ...editReceivableData, startDate: date })}
                                placeholder="Hoy"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Vencimiento</label>
                            <DatePicker
                                id="edit-receivable-due"
                                value={editReceivableData.dueDate}
                                onChange={(date) => setEditReceivableData({ ...editReceivableData, dueDate: date })}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>
                    <input
                        type="text"
                        value={editReceivableData.name}
                        onChange={(e) => setEditReceivableData({ ...editReceivableData, name: e.target.value })}
                        placeholder="Deudor"
                        className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={editReceivableData.balance}
                            onChange={(e) => setEditReceivableData({ ...editReceivableData, balance: e.target.value })}
                            placeholder="Monto"
                            step="0.01"
                            className="w-2/3 input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                        <select
                            value={editReceivableData.currency}
                            onChange={(e) => setEditReceivableData({ ...editReceivableData, currency: e.target.value as Currency })}
                            className="w-1/3 input-modern p-4 rounded-xl text-white bg-slate-800"
                        >
                            <option className="bg-slate-800" value="USD">USD</option>
                            <option className="bg-slate-800" value="VES">VES</option>
                        </select>
                    </div>
                    <button
                        onClick={handleEditReceivable}
                        disabled={!editReceivableData.name.trim() || loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </AccountModal>

            {/* MODAL EDITAR LIABILITY (Deuda) */}
            <AccountModal
                isOpen={editLiabilityModalOpen}
                onClose={() => {
                    setEditLiabilityModalOpen(false);
                    setEditingLiability(null);
                    setEditLiabilityData({ name: '', balance: '', currency: 'USD', startDate: '', dueDate: '' });
                }}
                title="Editar Deuda"
            >
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Inicio</label>
                            <DatePicker
                                id="edit-liability-start"
                                value={editLiabilityData.startDate}
                                onChange={(date) => setEditLiabilityData({ ...editLiabilityData, startDate: date })}
                                placeholder="Hoy"
                            />
                        </div>
                        <div className="w-1/2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1">Pago</label>
                            <DatePicker
                                id="edit-liability-due"
                                value={editLiabilityData.dueDate}
                                onChange={(date) => setEditLiabilityData({ ...editLiabilityData, dueDate: date })}
                                placeholder="Opcional"
                            />
                        </div>
                    </div>
                    <input
                        type="text"
                        value={editLiabilityData.name}
                        onChange={(e) => setEditLiabilityData({ ...editLiabilityData, name: e.target.value })}
                        placeholder="Acreedor"
                        className="w-full input-modern p-4 rounded-xl text-white placeholder-slate-500"
                    />
                    <div className="flex gap-2">
                        <input
                            type="number"
                            value={editLiabilityData.balance}
                            onChange={(e) => setEditLiabilityData({ ...editLiabilityData, balance: e.target.value })}
                            placeholder="Monto"
                            step="0.01"
                            className="w-2/3 input-modern p-4 rounded-xl text-white placeholder-slate-500"
                        />
                        <select
                            value={editLiabilityData.currency}
                            onChange={(e) => setEditLiabilityData({ ...editLiabilityData, currency: e.target.value as Currency })}
                            className="w-1/3 input-modern p-4 rounded-xl text-white bg-slate-800"
                        >
                            <option className="bg-slate-800" value="USD">USD</option>
                            <option className="bg-slate-800" value="VES">VES</option>
                        </select>
                    </div>
                    <button
                        onClick={handleEditLiability}
                        disabled={!editLiabilityData.name.trim() || loading}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </AccountModal>

            {/* NUEVOS MODALES DE TRANSACCIONES */}
            <TransactionModal
                isOpen={transactionModalOpen}
                onClose={() => setTransactionModalOpen(false)}
                type={transactionType}
                accounts={accounts.filter(a => a.type === 'ASSET')}
                buckets={buckets || []}
                rates={rates}
                onSave={handleSaveTransaction}
                onRequestSettle={() => {
                    setTransactionModalOpen(false);
                    setSettlingAccount(null);
                    setSettleModalOpen(true);
                }}
            />

            <AccountModal
                isOpen={transferModalOpen}
                onClose={() => {
                    setTransferModalOpen(false);
                    setTransferSource('');
                    setTransferTarget('');
                    setTransferAmount('');
                    setTransferRate('');
                }}
                title="Mover Dinero"
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
                                {assetAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                                ))}
                            </select>
                            {transferSource && (() => {
                                const acc = assetAccounts.find(a => String(a.id) === transferSource);
                                return acc ? (
                                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                                        Disp: {getCurrencySymbol(acc.currency)}{formatNumberWithLocale(Number(acc.balance))}
                                    </p>
                                ) : null;
                            })()}
                        </div>
                        <div className="text-slate-500 pt-4"><ArrowRightIcon className="w-5 h-5" /></div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hasta</label>
                            <select
                                value={transferTarget}
                                onChange={(e) => setTransferTarget(e.target.value)}
                                className="w-full input-modern p-3 rounded-xl text-white bg-slate-800 text-sm"
                            >
                                <option value="">Seleccionar...</option>
                                {assetAccounts.filter(a => String(a.id) !== transferSource).map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
                                Monto en {transferInputMode === 'SOURCE'
                                    ? ((acc) => acc?.currency || 'Origen')(accounts.find(a => String(a.id) === transferSource))
                                    : ((acc) => acc?.currency || 'Destino')(accounts.find(a => String(a.id) === transferTarget))
                                }
                            </label>

                            {transferSource && transferTarget &&
                                accounts.find(a => String(a.id) === transferSource)?.currency !== accounts.find(a => String(a.id) === transferTarget)?.currency && (
                                    <button
                                        onClick={() => setTransferInputMode(prev => prev === 'SOURCE' ? 'TARGET' : 'SOURCE')}
                                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded transition"
                                    >
                                        <i className="fas fa-exchange-alt"></i>
                                        Cambiar a {transferInputMode === 'SOURCE'
                                            ? ((acc) => acc?.currency || 'Destino')(accounts.find(a => String(a.id) === transferTarget))
                                            : ((acc) => acc?.currency || 'Origen')(accounts.find(a => String(a.id) === transferSource))
                                        }
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
                    {transferSource && transferTarget &&
                        accounts.find(a => String(a.id) === transferSource)?.currency !== accounts.find(a => String(a.id) === transferTarget)?.currency && (
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-dashed border-slate-700 space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tasa de Cambio</label>
                                    <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                        Conversion
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* The instruction seems to have misplaced a code snippet here.
                                        Assuming the intent was to modify the handleSaveTransaction function,
                                        but the provided "Code Edit" snippet was inserted into the JSX.
                                        I will revert the JSX to its original state and note that the
                                        handleSaveTransaction function is not present in the provided content
                                        to apply the requested change.
                                    */}
                                    <input
                                        type="number"
                                        value={transferRate}
                                        onChange={(e) => setTransferRate(e.target.value)}
                                        step="0.01"
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg py-2 px-3 text-right font-mono text-white focus:border-indigo-500 outline-none"
                                        placeholder="Tasa..."
                                    />
                                    <span className="text-xs font-mono text-slate-500">
                                        {((acc) => (acc?.currency === 'VES' || accounts.find(a => String(a.id) === transferTarget)?.currency === 'VES') ? 'Bs' : '')(accounts.find(a => String(a.id) === transferSource))}
                                    </span>
                                </div>

                                {/* Preview Calculated Amount */}
                                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                                    <span className="text-xs text-slate-500">
                                        {transferInputMode === 'SOURCE' ? 'Se recibirá en destino:' : 'Se enviará desde el origen:'}
                                    </span>
                                    <span className="font-mono font-bold text-emerald-400">
                                        {transferInputMode === 'SOURCE'
                                            ? ((acc) => `${getCurrencySymbol(acc?.currency || 'USD')} ${formatNumberWithLocale(Number(tVal.toFixed(2)))}`)(accounts.find(a => String(a.id) === transferTarget))
                                            : ((acc) => `${getCurrencySymbol(acc?.currency || 'USD')} ${formatNumberWithLocale(Number(sVal.toFixed(2)))}`)(accounts.find(a => String(a.id) === transferSource))
                                        }
                                    </span>
                                </div>
                            </div>
                        )}

                    <button
                        onClick={executeTransfer}
                        disabled={!transferSource || !transferTarget || !transferAmount || loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? 'Transfiriendo...' : 'Confirmar Transferencia'}
                    </button>
                </div>
            </AccountModal >

            <ConfirmModal
                isOpen={!!deletingId}
                onClose={() => setDeletingId(null)}
                onConfirm={() => {
                    if (deletingId) handleDelete(deletingId);
                    setDeletingId(null);
                }}
                title={`Eliminar ${deletingType}`}
                message={`¿Estás seguro de que quieres eliminar "${deletingName}"? esta acción no se puede deshacer.`}
                confirmText="Sí, eliminar"
            />
            <SettleModal
                isOpen={settleModalOpen}
                onClose={() => setSettleModalOpen(false)}
                account={settlingAccount?.account || null}
                assetAccounts={assetAccounts}
                liabilityAccounts={liabilityAccounts}
                receivableAccounts={receivableAccounts}
                onSettle={handleSettle}
                rates={rates}
            />
        </div >
    );
}
