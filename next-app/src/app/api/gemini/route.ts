import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { systemPrompt, userInput } = await req.json();

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'API Key de Gemini no configurada en el servidor.' }, { status: 500 });
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ parts: [{ text: userInput }] }]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Error de Gemini API: ${err}`);
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('API /gemini error:', error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
    }
}
