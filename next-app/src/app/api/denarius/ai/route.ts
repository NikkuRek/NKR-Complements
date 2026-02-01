import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Esta variable NO debe tener NEXT_PUBLIC_, para que solo viva en el servidor
const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json(
            { error: 'Server API configuration error: Missing API Key' }, 
            { status: 500 }
        );
    }

    try {
        const { prompt, history, message } = await req.json();

        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        let textResponse = '';

        if (history && history.length > 0) {
            // Modo Chat
            const chat = model.startChat({
                history: history,
            });
            const result = await chat.sendMessage(message || prompt);
            const response = await result.response;
            textResponse = response.text();
        } else {
            // Modo Generación Única (Primer análisis)
            const result = await model.generateContent(prompt);
            const response = await result.response;
            textResponse = response.text();
        }

        return NextResponse.json({ text: textResponse });

    } catch (error: any) {
        console.error('AI Service Error:', error);
        return NextResponse.json(
            { error: error.message || 'Error processing AI request' },
            { status: 500 }
        );
    }
}
