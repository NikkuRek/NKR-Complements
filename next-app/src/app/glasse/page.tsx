'use client';

import Header from '@/components/layout/Header';

export default function GlassePage() {
    return (
        <div className="min-h-screen bg-slate-800 text-slate-100 flex flex-col">
            <Header title="Glasse" subtitle="Inventario" showBack={true} showRefresh={true} />

            <main className="flex-1 overflow-y-auto hide-scrollbar p-6 pb-28">
                <div className="max-w-3xl mx-auto">
                    <div className="glass-panel p-8 rounded-2xl text-center">
                        <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center rounded-full bg-gradient-to-l from-pink-600 to-pink-400">
                            <i className="fa-solid fa-cake-candles text-4xl text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">
                            Glasse - Próximamente
                        </h2>
                        <p className="text-slate-400">
                            La migración de Glasse está en progreso. Por ahora, puedes usar la
                            versión anterior en{' '}
                            <span className="text-pink-400 font-mono">
                                /frontend/apps/glasse/
                            </span>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
