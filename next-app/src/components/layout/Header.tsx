'use client';

import { ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    title?: string | React.ReactNode;
    subtitle?: string;
    showBack?: boolean;
    onBack?: () => void;
    showRefresh?: boolean;
    onRefresh?: () => void;
}

export default function Header({
    title = 'NKR',
    subtitle = 'Complements',
    showBack = false,
    onBack,
    showRefresh = false,
    onRefresh,
}: HeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.push('/');
        }
    };

    const handleRefresh = () => {
        if (onRefresh) {
            onRefresh();
        } else {
            window.location.reload();
        }
    };

    return (
        <header className="bg-slate-900/90 backdrop-blur-md shadow-sm p-4 z-50 sticky top-0">
            <div className="max-w-3xl mx-auto relative flex justify-between items-center h-8">
                {/* Left Side */}
                <div className="flex items-center gap-3 z-10">
                    {showBack && (
                        <button
                            onClick={handleBack}
                            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition"
                            aria-label="Volver"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Center Title */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <h1 className="text-xl font-bold text-white flex items-center gap-1 whitespace-nowrap">
                        {title}
                        {subtitle && <span className="text-indigo-300">{subtitle}</span>}
                    </h1>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-3 z-10">
                    {showRefresh && (
                        <button
                            onClick={handleRefresh}
                            className="text-xs text-slate-300 hover:text-slate-100 p-2 rounded-full hover:bg-slate-800/20 transition"
                            aria-label="Recargar"
                        >
                            <ArrowPathIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
