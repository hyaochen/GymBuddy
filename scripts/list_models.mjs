import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
    try {
        // In newer SDK versions, listModels is an async iterator or returns a list
        const result = await genAI.listModels();
        console.log("Available Models:");
        // The result might have a 'models' property or be the array itself depending on version
        const models = result.models || result;
        if (Array.isArray(models)) {
            models.forEach(model => {
                console.log(`- ${model.name} (Methods: ${model.supportedGenerationMethods.join(', ')})`);
            });
        } else {
            console.log("Unexpected result format:", typeof result);
        }
    } catch (error) {
        console.error("Error listing models:", error.message);
    }
}

listModels();
