import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY;
console.log('[Genkit] Inicializando com API key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NÃO DEFINIDA');

export const ai = genkit({
  plugins: [googleAI({ apiKey })],
  model: 'googleai/gemini-2.0-flash',
});
