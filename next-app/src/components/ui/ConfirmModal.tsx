import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirmar',
    message = '¿Estás seguro de realizar esta acción?',
    confirmText = 'Sí, eliminar',
    cancelText = 'Cancelar',
    type = 'danger'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-xs glass-panel rounded-2xl p-6 border border-white/10 shadow-2xl text-center transform transition-all scale-100">
                <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${type === 'danger' ? 'bg-rose-900/20 text-rose-500' :
                        type === 'warning' ? 'bg-amber-900/20 text-amber-500' :
                            'bg-slate-800 text-indigo-400'
                    }`}>
                    <ExclamationTriangleIcon className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 mb-6">{message}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-sm transition"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold shadow-lg transition ${type === 'danger' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20' :
                                type === 'warning' ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20' :
                                    'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
