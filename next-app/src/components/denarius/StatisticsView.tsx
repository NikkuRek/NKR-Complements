import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI, ChatSession } from '@google/generative-ai';
import { Account, Transaction, Bucket } from '@/types/denarius';
import { SparklesIcon, ChartBarIcon, ArrowPathIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';

interface StatisticsViewProps {
    transactions: Transaction[];
    accounts: Account[];
    buckets: Bucket[];
    apiKey: string;
}

interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export default function StatisticsView({ transactions, accounts, buckets, apiKey }: StatisticsViewProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);
    const [inputValue, setInputValue] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const generateAnalysis = async () => {
        if (!apiKey) {
            setError('API Key no configurada');
            return;
        }

        setLoading(true);
        setError(null);
        setMessages([]); // Clear previous chat

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

            const currentDate = new Date().toISOString().split('T')[0];

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

                ## 💬 Comentario de Denarius
                [Un mensaje corto, motivador y personalizado. Si el usuario compró algo innecesario, haz una broma amable pero firme. Si lo hizo bien, felicítalo].

                ---
                **Nota:** Utiliza negritas para resaltar cifras importantes. Sé directo pero amigable. No uses LaTeX, usa formato de texto estándar para monedas ($).
            `;

            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: "Hola Denarius, analiza mis finanzas actuales por favor." }],
                    },
                ],
            });

            setChatSession(chat);

            const result = await chat.sendMessage(prompt);
            const response = await result.response;
            const text = response.text();

            setMessages([{ role: 'model', text }]);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Error al generar el análisis');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!inputValue.trim() || !chatSession) return;

        const userMsg = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setLoading(true);

        try {
            const result = await chatSession.sendMessage(userMsg);
            const response = await result.response;
            const text = response.text();
            setMessages(prev => [...prev, { role: 'model', text }]);
        } catch (err: any) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'model', text: 'Error: No pude procesar tu mensaje. Intenta de nuevo.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in pb-24">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-900 border border-white/10 p-8 shadow-2xl group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition duration-1000" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition duration-1000" />

                <div className="relative z-10 flex flex-col items-center text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 mb-2 shadow-inner backdrop-blur-md">
                        <SparklesIcon className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        Denarius <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI Insights</span>
                    </h2>
                    <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                        Análisis financiero inteligente y asistente personal en tiempo real.
                    </p>
                </div>
            </div>

            {/* Action Section (Initial) */}
            {messages.length === 0 && !loading && (
                <div className="glass-panel p-8 rounded-[2rem] border border-white/5 bg-gradient-to-b from-slate-800/40 to-slate-900/40 text-center space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-white">¿Listo para tu diagnóstico?</h3>
                        <p className="text-xs text-slate-400">Denarius analizará tus últimas 50 transacciones y el estado de tus cuentas.</p>
                    </div>

                    <button
                        onClick={generateAnalysis}
                        className="group relative inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 font-bold text-white transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40"
                    >
                        <ChartBarIcon className="w-5 h-5" />
                        <span>Generar Análisis con AI</span>
                        <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
                    </button>
                    {error && <p className="text-rose-400 text-sm mt-2">{error}</p>}
                </div>
            )}

            {/* Loading State */}
            {loading && messages.length === 0 && ( // Only show full loading if no messages yet
                <div className="glass-panel p-12 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center space-y-8 min-h-[400px]">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-4 border-4 border-purple-500/30 rounded-full"></div>
                        <div className="absolute inset-4 border-4 border-b-purple-500 border-t-transparent border-l-transparent border-r-transparent rounded-full animate-spin-reverse"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <SparklesIcon className="w-8 h-8 text-white animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-2 animate-pulse">
                        <p className="text-xl font-bold text-white">Procesando Datos</p>
                        <p className="text-sm text-slate-400">Conectando con Gemini AI...</p>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && messages.length === 0 && ( // Only show full error if no messages yet
                <div className="glass-panel p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                        <ChartBarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-bold text-rose-200 mb-1">Algo salió mal</p>
                        <p className="text-sm text-rose-200/60">{error}</p>
                    </div>
                    <button
                        onClick={generateAnalysis}
                        className="px-6 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-sm font-bold transition"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Chat Interface */}
            {messages.length > 0 && (
                <div className="space-y-4 animate-slide-up">
                    <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Sesión Activa</span>
                        </div>
                        <button
                            onClick={generateAnalysis}
                            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full"
                        >
                            <ArrowPathIcon className="w-3.5 h-3.5" />
                            Reiniciar Sesión
                        </button>
                    </div>

                    <div className="space-y-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[100%] sm:max-w-[85%] rounded-[2rem] p-6 shadow-xl backdrop-blur-xl border ${msg.role === 'user'
                                            ? 'bg-indigo-600/80 border-indigo-500/30 text-white rounded-tr-none'
                                            : 'bg-[#0F172A]/80 border-white/10 text-slate-200 rounded-tl-none'
                                        }`}
                                >
                                    {msg.role === 'user' ? (
                                        <p className="whitespace-pre-wrap">{msg.text}</p>
                                    ) : (
                                        <div className="prose prose-invert prose-indigo max-w-none prose-headings:font-bold prose-p:text-slate-300 prose-strong:text-white prose-li:text-slate-300">
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({ ...props }) => <h1 className="text-2xl mb-6 pb-4 border-b border-white/10 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400" {...props} />,
                                                    h2: ({ ...props }) => <div className="mt-8 mb-4 flex items-center gap-3">
                                                        <div className="h-px flex-1 bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
                                                        <h2 className="text-lg text-indigo-300 m-0 whitespace-nowrap" {...props} />
                                                        <div className="h-px flex-1 bg-gradient-to-l from-indigo-500/50 to-transparent"></div>
                                                    </div>,
                                                    h3: ({ ...props }) => <h3 className="text-base text-white mt-6 mb-2" {...props} />,
                                                    p: ({ ...props }) => <p className="mb-4 text-sm leading-relaxed text-slate-300" {...props} />,
                                                    ul: ({ ...props }) => <ul className="space-y-3 mb-6" {...props} />,
                                                    li: ({ children, ...props }) => {
                                                        const hasEmoji = Array.isArray(children) && typeof children[0] === 'string' && /^[🟢🔴💡]/.test(children[0]);
                                                        if (hasEmoji) {
                                                            return <li className="flex items-start gap-3 text-sm bg-white/[0.03] p-3 rounded-xl border border-white/5" {...props}>{children}</li>;
                                                        }
                                                        return (
                                                            <li className="flex items-start gap-3 text-sm" {...props}>
                                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                                                <span>{children}</span>
                                                            </li>
                                                        );
                                                    },
                                                    strong: ({ ...props }) => <strong className="text-white font-bold" {...props} />,
                                                    blockquote: ({ ...props }) => <blockquote className="border-l-4 border-purple-500/50 pl-4 py-3 my-6 bg-gradient-to-r from-purple-500/10 to-transparent rounded-r-xl italic text-purple-200 text-sm" {...props} />,
                                                }}
                                            >
                                                {msg.text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-[#0F172A]/80 border border-white/10 rounded-[2rem] rounded-tl-none p-6 flex items-center gap-3">
                                    <SparklesIcon className="w-5 h-5 text-indigo-400 animate-pulse" />
                                    <span className="text-sm text-slate-400">Denarius está escribiendo...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="sticky bottom-6 mt-4">
                        <form onSubmit={handleSendMessage} className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-focus-within:opacity-75 transition duration-1000"></div>
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Pregúntale algo más a Denarius..."
                                    className="w-full bg-slate-900 text-white placeholder-slate-500 border border-white/10 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:bg-slate-800 transition shadow-xl"
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !inputValue.trim()}
                                    className="absolute right-2 p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                                >
                                    <PaperAirplaneIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
