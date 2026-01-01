import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Account, Transaction, Bucket } from '@/types/denarius';
import { SparklesIcon, ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

interface StatisticsViewProps {
    transactions: Transaction[];
    accounts: Account[];
    buckets: Bucket[];
    apiKey: string;
}

export default function StatisticsView({ transactions, accounts, buckets, apiKey }: StatisticsViewProps) {
    const [analysis, setAnalysis] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const generateAnalysis = async () => {
        if (!apiKey) {
            setError('API Key no configurada');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

            // Prepare summary data
            const recentTransactions = transactions.slice(0, 50).map(t => ({
                date: t.date,
                amount: t.amount,
                type: t.type,
                description: t.description,
                category: buckets.find(b => Number(b.id) === t.bucket_id)?.name || 'Varios'
            }));

            const accountSummary = accounts.map(a => ({
                name: a.name,
                type: a.type,
                balance: a.balance,
                currency: a.currency
            }));

            let exchangeRate = 301; // Fallback default
            try {
                const rateResponse = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
                if (rateResponse.ok) {
                    const rateData = await rateResponse.json();
                    if (rateData.promedio) {
                        exchangeRate = rateData.promedio;
                    }
                }
            } catch (e) {
                console.warn('Error fetching exchange rate, using default:', e);
            }

            const currentDate = new Date().toISOString().split('T')[0]; // Fecha actual YYYY-MM-DD

            const prompt = `
                # ROL
                Eres "Denarius AI", un asesor financiero personal experto, empático y altamente analítico. Tu objetivo es optimizar el flujo de caja del usuario, priorizar su liquidez y ayudarle a cumplir metas financieras sin sacrificar su calidad de vida.

                # CONTEXTO DEL USUARIO
                - Fecha Actual: ${currentDate}
                - Moneda Local: VES (Bolívares)
                - Tasa de Cambio Referencial: 1 USD = ${exchangeRate} VES (Aproximadamente)
                - Perfil: Desarrollador joven, primera experiencia profesional, maneja economía bimonetaria (USD/VES).

                # DATOS A ANALIZAR
                1. RESUMEN DE CUENTAS: 
                ${JSON.stringify(accountSummary)}

                2. PRESUPUESTOS (BUCKETS/SOBRES): 
                ${JSON.stringify(buckets)}

                3. ÚLTIMOS MOVIMIENTOS: 
                ${JSON.stringify(recentTransactions)}

                # INSTRUCCIONES DE ANÁLISIS (PROCESO INTERNO)
                Antes de generar la respuesta, realiza los siguientes cálculos mentalmente:
                1. **Normalización:** Convierte todos los saldos en VES a USD usando la tasa provista para tener una visión unificada del patrimonio neto.
                2. **Cálculo de Supervivencia:** Calcula cuántos días faltan para la próxima quincena (asume pagos los días 15 y 30/31). Divide el "Saldo Disponible" entre los días restantes para obtener el "Presupuesto Diario Seguro".
                3. **Detección de Fugas:** Identifica gastos hormiga recurrentes en las transacciones (ej. comida rápida, comisiones, juegos) y súmalos.
                4. **Análisis de Deuda:** Revisa los "Liabilities" (Pasivos). Si hay deudas vencidas o próximas a vencer, márcalas como PRIORIDAD CRÍTICA.

                # FORMATO DE RESPUESTA (MARKDOWN)
                Debes responder estrictamente en Español con el siguiente formato:

                ## 📊 Diagnóstico Rápido
                * **Patrimonio Neto Total:** [Monto en USD]
                * **Días hasta el próximo pago:** [Número] días.
                * **Presupuesto Diario Sugerido:** [Monto] USD/día (para llegar a fin de mes/quincena).

                ## 🚦 Semáforo Financiero
                * 🟢 **Lo Bueno:** [Menciona 1 hábito positivo o logro reciente basado en los datos, ej. pago de deudas].
                * 🔴 **Atención:** [Menciona gastos innecesarios detectados o deudas pendientes urgentes].

                ## 💡 Plan de Acción (Estrategia)
                Basado en tu situación actual, te recomiendo distribuir tu dinero así:
                1.  **Prioridad 1 (Intocable):** [Monto] para [Gasto Fijo inminente detectado].
                2.  **Deudas:** [Instrucción específica sobre qué deuda pagar primero].
                3.  **Ajuste de Gastos:** [Consejo específico sobre dónde cortar gastos, ej. "Baja el gasto en X categoría"].

                ## � Comentario de Denarius
                [Un mensaje corto, motivador y personalizado. Si el usuario compró algo innecesario, haz una broma amable pero firme. Si lo hizo bien, felicítalo].

                ---
                **Nota:** Utiliza negritas para resaltar cifras importantes. Sé directo pero amigable. No uses LaTeX, usa formato de texto estándar para monedas ($).
            `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();
            setAnalysis(text);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al generar el análisis');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-white/10 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>

                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-white/20">
                        <SparklesIcon className="w-10 h-10 text-yellow-300" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-indigo-200">
                            Denarius AI
                        </h2>
                        <p className="text-indigo-200/80 text-sm mt-1 max-w-sm">
                            Tu asistente financiero personal impulsado por inteligencia artificial.
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Section */}
            {!analysis && !loading && (
                <div className="flex justify-center">
                    <button
                        onClick={generateAnalysis}
                        className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 font-bold text-white transition-all duration-200 bg-indigo-600 font-lg rounded-2xl hover:bg-indigo-500 hover:scale-105 shadow-lg shadow-indigo-600/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
                    >
                        <ChartBarIcon className="w-6 h-6 transition-transform group-hover:rotate-12" />
                        <span>Generar Nuevo Análisis</span>
                        <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100 blur-lg"></div>
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                    <div className="relative w-20 h-20">
                        <div className="absolute inset-0 border-t-2 border-r-2 border-indigo-400 rounded-full animate-spin"></div>
                        <div className="absolute inset-2 border-l-2 border-b-2 border-purple-400 rounded-full animate-spin-reverse"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <SparklesIcon className="w-6 h-6 text-yellow-200 animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-lg font-medium text-white">Analizando tus finanzas...</p>
                        <p className="text-sm text-slate-400">Esto puede tomar unos segundos</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 p-6 rounded-2xl text-center space-y-3 backdrop-blur-sm">
                    <p className="font-medium">{error}</p>
                    <button
                        onClick={generateAnalysis}
                        className="text-white bg-rose-500/20 hover:bg-rose-500/30 px-4 py-2 rounded-lg text-sm transition"
                    >
                        Intentar de nuevo
                    </button>
                </div>
            )}

            {/* Analysis Result */}
            {analysis && (
                <div className="space-y-4 animate-slide-up">
                    <div className="glass-panel rounded-3xl border border-white/10 shadow-2xl overflow-hidden bg-slate-900/60 backdrop-blur-xl">
                        {/* Content Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Reporte Generado</span>
                            </div>
                            <button
                                onClick={generateAnalysis}
                                className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full"
                            >
                                <ArrowPathIcon className="w-3.5 h-3.5" />
                                Regenerar
                            </button>
                        </div>

                        {/* Markdown Content */}
                        <div className="p-6 sm:p-8">
                            <div className="prose prose-invert prose-indigo max-w-none">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent mb-6 pb-2 border-b border-white/10" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-xl font-semibold text-indigo-300 mt-8 mb-4 flex items-center gap-2" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-lg font-semibold text-white mt-6 mb-3" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-slate-300 leading-relaxed mb-4" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="space-y-2 mb-6" {...props} />,
                                        li: ({ node, ...props }) => <li className="flex items-start gap-2 text-slate-300" {...props}><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" /><span>{props.children}</span></li>,
                                        strong: ({ node, ...props }) => <strong className="text-white font-semibold" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-500/50 pl-4 py-1 my-4 bg-indigo-500/5 rounded-r-lg" {...props} />,
                                    }}
                                >
                                    {analysis}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] text-slate-500">
                            Generado con Gemini 1.5 Flash • La información puede no ser exacta
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
