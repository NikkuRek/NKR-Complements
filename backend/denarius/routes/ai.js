const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { systemPrompt, userInput } = req.body;

        const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'API Key de Gemini no configurada en el servidor.' });
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
        return res.json(data);
    } catch (error) {
        console.error('API /ai error:', error);
        return res.status(500).json({ error: error.message || 'Error interno del servidor' });
    }
});

module.exports = router;
