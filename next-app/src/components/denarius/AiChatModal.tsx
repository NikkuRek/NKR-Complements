'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Account, Bucket } from '@/types/denarius';

interface AiChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    buckets: Bucket[];
    onAddTransaction: (
        amount: number,
        type: 'INCOME' | 'EXPENSE',
        accountId: number | null,
        bucketId: number | null,
        description: string
    ) => Promise<void>;
}

export default function AiChatModal({ isOpen, onClose, accounts, buckets, onAddTransaction }: AiChatModalProps) {
    const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
        { role: 'ai', text: '¡Hola! Soy tu asistente. Dime qué transacciones deseas registrar. Ejemplo: "Añade un gasto de 15 dolares en comida de la cuenta Efectivo".' }
    ]);
    const [isRecording, setIsRecording] = useState(false);
    const [loading, setLoading] = useState(false);
    const [textInput, setTextInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'es-ES';

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                handleUserMessage(transcript);
            };

            recognitionRef.current.onerror = (event: any) => {
                if (event.error === 'network') {
                    console.warn('Speech recognition network error: Microphone unavailable. Fallback to text.');
                    setMessages(prev => [...prev, { role: 'ai', text: 'Error de red en el micrófono. Por favor asegúrate de tener conexión, o usa el cuadro de texto abajo para escribir.' }]);
                } else if (event.error !== 'no-speech') {
                    console.warn('Speech recognition error', event.error);
                    setMessages(prev => [...prev, { role: 'ai', text: 'El reconocimiento falló (' + event.error + '). Intenta usar el cuadro de texto.' }]);
                }
                setIsRecording(false);
                setLoading(false);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };
        }
        return () => {
             if (recognitionRef.current) {
                 recognitionRef.current.stop();
             }
        }
    }, [accounts, buckets]); // re-bind if context updates

    const handleUserMessage = async (text: string) => {
        setMessages(prev => [...prev, { role: 'user', text }]);
        setLoading(true);

        try {
            const resultText = await processWithGemini(text);
            setMessages(prev => [...prev, { role: 'ai', text: resultText }]);
        } catch (error: any) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, { role: 'ai', text: 'Hubo un error al procesar tu solicitud: ' + error.message }]);
        } finally {
            setLoading(false);
        }
    };

    const processWithGemini = async (userInput: string): Promise<string> => {
        const systemPrompt = `
Eres un asistente que registra transacciones en un sistema financiero. 
El usuario te dirá una o varias transacciones por voz.
Cuentas disponibles: ${accounts.map(a => `ID: ${a.id}, Nombre: ${a.name}, Tipo: ${a.type}`).join(' | ')}
Categorías (Buckets) disponibles: ${buckets.map(b => `ID: ${b.id}, Nombre: ${b.name}`).join(' | ')}

Instrucciones:
1. Identifica cuántas transacciones pide el usuario.
2. Para cada una, extrae: 
   - mount (número positivo)
   - type ('INCOME' o 'EXPENSE')
   - accountId (ID numérico de la cuenta que más se acerque al nombre mencionado. Si no menciona, usa la primera cuenta ASSET (ID: ${accounts.find(a => a.type === 'ASSET')?.id || 'null'}).
   - bucketId (ID numérico de la categoría que más se acerque. Opcional, si no, usa null. Ej: la categoría de comida es una de las disponibles).
   - description (Una breve descripción de la transacción).
3. Responde **ÚNICAMENTE** con un JSON array de objetos. Sin markdown, sin explicaciones, sólo el JSON puro. Formato requerido:
[
  { "amount": 15, "type": "EXPENSE", "accountId": 1, "bucketId": 3, "description": "Compra de comida" }
]
`;

        const apiUrl = process.env.NEXT_PUBLIC_DENARIUS_API || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, userInput })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Error al conectar con el servidor.');
        }

        const data = await response.json();
        let aiRsp = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        // Clean JSON formatting if any
        aiRsp = aiRsp.replace(/```json/g, '').replace(/```/g, '').trim();
        
        let txsToProcess = [];
        try {
            txsToProcess = JSON.parse(aiRsp);
        } catch (e) {
            return "No pude entender las transacciones. Por favor intenta ser más claro.";
        }

        if (!Array.isArray(txsToProcess) || txsToProcess.length === 0) {
            return "No se detectaron transacciones en tu mensaje.";
        }

        let processedCount = 0;
        for (const tx of txsToProcess) {
            if (tx.amount && tx.type && tx.accountId) {
                await onAddTransaction(tx.amount, tx.type, tx.accountId, tx.bucketId || null, tx.description || 'Por voz');
                processedCount++;
            }
        }

        return `Se registraron ${processedCount} transacción(es) exitosamente.`;
    };

    const startRecording = () => {
        if (!recognitionRef.current) {
            alert('Tu navegador no soporta reconocimiento de voz.');
            return;
        }
        setIsRecording(true);
        recognitionRef.current.start();
    };

    const stopRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsRecording(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-lg font-bold text-white flex items-center">
                        <span className="text-fuchsia-400 mr-2">
                           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" /></svg>
                        </span>
                        Asistente de IA
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white mt-1"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
                
                <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-1">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-fuchsia-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-slate-800 text-slate-200 rounded-bl-none flex items-center space-x-2">
                                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="shrink-0 pt-3 border-t border-white/5 space-y-2">
                     <div className="flex bg-slate-800 rounded-xl overflow-hidden focus-within:ring-2 ring-fuchsia-500/50 transition-shadow">
                        <input 
                            type="text" 
                            value={textInput} 
                            onChange={(e) => setTextInput(e.target.value)} 
                            onKeyDown={(e) => { 
                                if (e.key === 'Enter' && textInput.trim()) { 
                                    handleUserMessage(textInput.trim()); 
                                    setTextInput(''); 
                                } 
                            }}
                            placeholder="Escribe tu instrucción aquí..." 
                            className="bg-transparent text-white px-4 py-3 w-full outline-none placeholder-slate-500 text-sm"
                            disabled={isRecording || loading}
                        />
                        <button 
                            onClick={() => { 
                                if (textInput.trim()) { 
                                    handleUserMessage(textInput.trim()); 
                                    setTextInput(''); 
                                } 
                            }}
                            disabled={!textInput.trim() || loading || isRecording}
                            className="px-4 text-fuchsia-400 hover:bg-fuchsia-500/20 disabled:opacity-50 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                        </button>
                    </div>

                     <button 
                        onMouseDown={startRecording} 
                        onMouseUp={stopRecording} 
                        onTouchStart={startRecording} 
                        onTouchEnd={stopRecording}
                        className={`w-full py-3 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${isRecording ? 'bg-fuchsia-600/20 shadow-[0_0_15px_rgba(192,38,211,0.5)] border-fuchsia-500' : 'bg-slate-800 hover:bg-slate-700 border-transparent'} border shadow-lg`}
                    >
                        <span className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-5 h-5 ${isRecording ? 'text-fuchsia-400 animate-pulse' : 'text-slate-400'}`}><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" /><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" /></svg>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">
                                {isRecording ? 'Escuchando...' : 'Mantén pulsado para hablar'}
                            </span>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

