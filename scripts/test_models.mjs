import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModels() {
    const models = [
        "imagen-3.0-generate-001",
        "imagen-3.0-fast-generate-001",
        "gemini-1.5-flash", // to check if it has specialized methods
    ];

    for (const modelName of models) {
        console.log(`Testing model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            // Try to list methods or generate a tiny test
            const result = await model.generateContent("A simple red circle line art");
            const response = await result.response;
            console.log(`- ${modelName} responded. Parts: ${response.candidates[0].content.parts.length}`);
        } catch (error) {
            console.log(`- ${modelName} failed: ${error.message.substring(0, 100)}...`);
        }
    }
}

testModels();
