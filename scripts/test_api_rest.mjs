import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function testText() {
    console.log("Testing text generation (Gemini 1.5 Flash)...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: "Hello, list 3 colors." }] }]
            })
        });
        const data = await response.json();
        if (data.candidates) {
            console.log("Text API OK:", data.candidates[0].content.parts[0].text);
        } else {
            console.error("Text API Error:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}

async function testImagen() {
    console.log("\nTesting image generation (Imagen 3.0)...");
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: "A clean line art of a barbell." }]
            })
        });
        const data = await response.json();
        if (data.predictions) {
            console.log("Imagen API OK! Received predictions.");
        } else {
            console.error("Imagen API Error:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Imagen Fetch failed:", e.message);
    }
}

testText().then(testImagen);
