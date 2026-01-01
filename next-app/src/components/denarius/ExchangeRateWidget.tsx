import { useState, useEffect } from 'react';

interface ExchangeRateWidgetProps {
    currency: 'USD' | 'USDT';
    rate: number;
    loading: boolean;
    onFetchRate: () => void;
    onRateChange: (value: number) => void;
}

export default function ExchangeRateWidget({
    currency,
    rate,
    loading,
    onFetchRate,
    onRateChange,
}: ExchangeRateWidgetProps) {
    const [tempRate, setTempRate] = useState(String(rate));

    useEffect(() => {
        setTempRate(String(rate));
    }, [rate]);

    const handleSubmit = () => {
        const val = parseFloat(tempRate);
        if (!isNaN(val)) {
            onRateChange(val);
        } else {
            setTempRate(String(rate));
        }
    };

    const colorClass = currency === 'USD' ? 'text-indigo-400' : 'text-emerald-400';

    return (
        <div className="glass-panel px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-black/20">
            <span className="text-slate-400 font-semibold">{currency}</span>
            <div className="h-3 w-[1px] bg-slate-700"></div>
            <div className="h-3 w-[1px] bg-slate-700"></div>
            <input
                type="number"
                value={tempRate}
                onChange={(e) => setTempRate(e.target.value)}
                onBlur={handleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className={`w-16 bg-transparent text-right font-mono ${colorClass} outline-none placeholder-slate-600`}
                placeholder="0.00"
                step="0.01"
            />
            <button
                onClick={onFetchRate}
                disabled={loading}
                className={`${colorClass} hover:text-white transition-colors disabled:opacity-50`}
            >
                <i className={`fas fa-sync-alt text-[10px] ${loading ? 'animate-spin' : ''}`}></i>
            </button>
        </div>
    );
}
