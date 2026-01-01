'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 flex flex-col">
            <Header title="NKR" subtitle="Complements" showRefresh={true} />

            <main className="flex-1 overflow-y-auto hide-scrollbar p-6 pb-28 relative">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-accent-pink/10 rounded-full blur-3xl" />
                </div>

                <section className="animate-fade-in mt-6 max-w-3xl mx-auto relative z-10">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">Bienvenido</h2>
                        <p className="text-slate-400">Selecciona una aplicación para comenzar</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Glasse Card */}
                        <Link
                            href="/glasse"
                            className="group relative"
                        >
                            <div className="glass-panel p-6 rounded-2xl card-hover gradient-overlay">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-pink-600 to-pink-400 shadow-lg shadow-pink-500/30">
                                        <i className="fa-solid fa-cake-candles text-3xl text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-xl text-white mb-1 group-hover:text-pink-300 transition">
                                            Glasse
                                        </h3>
                                        <span className="badge badge-success">Inventario</span>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Gestión completa de inventario de tortas con historial de ventas, reservas y seguimiento de stock.
                                </p>
                                <div className="mt-4 flex items-center text-sm text-pink-400 group-hover:translate-x-2 transition-transform">
                                    Abrir aplicación
                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>

                        {/* Denarius Card */}
                        <Link
                            href="/denarius"
                            className="group relative"
                        >
                            <div className="glass-panel p-6 rounded-2xl card-hover gradient-overlay">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-primary-400 shadow-lg shadow-primary-500/30">
                                        <i className="fas fa-wallet text-3xl text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-xl text-white mb-1 group-hover:text-primary-300 transition">
                                            Dena
                                        </h3>
                                        <h3 className="font-bold text-xl text-blue-500 mb-1 group-hover:text-primary-300 transition">
                                            rius
                                        </h3>
                                    </div>
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">
                                    Sistema avanzado de finanzas personales con soporte multimoneda, presupuestos y tracking de gastos.
                                </p>
                                <div className="mt-4 flex items-center text-sm text-primary-400 group-hover:translate-x-2 transition-transform">
                                    Abrir aplicación
                                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
