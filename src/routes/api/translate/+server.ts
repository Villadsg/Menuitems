// src/routes/your-route/+server.ts
import { json } from '@sveltejs/kit';
import * as deepl from 'deepl-node';

/** Initialize the DeepL translator with your API key */
const translator = new deepl.Translator('41ea25a3-4a88-4345-9ed9-40a99dcda151:fx');

export async function POST({ request }) {
  try {
    const { text, targetLang } = await request.json();

    if (!text || !targetLang) {
      return json({ error: 'Missing text or target language' }, { status: 400 });
    }

    /** Use the translator to translate the text */
    const result = await translator.translateText(text, null, targetLang);

    /** Return the translation as JSON */
    return json({ translation: result.text });
  } catch (error) {
    /** Handle errors and return a 500 status code */
    return json({ error: error.message }, { status: 500 });
  }
}
