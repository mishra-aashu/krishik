export interface FarmProfile {
  state: string;
  soilType: string;
  crop: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Model fallback chains — verified against account's available models
const MODEL_CHAINS = {
  smart: [
    'groq/compound',           // Groq's agentic compound system (full)
    'openai/gpt-oss-120b',     // OpenAI open-weight flagship
    'qwen/qwen3.8-27b',        // Qwen 27B fallback
  ],
  fast: [
    'groq/compound-mini',      // Groq's fast compound system
    'qwen/qwen3.8-27b',        // Qwen 27B fallback
  ],
} as const;

export type ModelMode = 'smart' | 'fast';

export async function sendMessageToGroq(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  farmProfile: FarmProfile,
  mode: ModelMode = 'fast'
): Promise<string> {
  const systemMessage = `You are "Krishik Mitra" (कृषिक मित्र), an expert agricultural AI assistant designed to help Indian farmers.
Your goal is to provide scientific, practical, and highly localized farming solutions.

Farmer's Context:
- State / Region: ${farmProfile.state || 'Not specified'}
- Soil Type: ${farmProfile.soilType || 'Not specified'}
- Active Crop: ${farmProfile.crop || 'Not specified'}

Instructions:
1. Provide precise diagnostic steps and actionable advice (fertilizer dosage, watering frequency, organic pest controls, sowing depth, harvesting times).
2. Format your response beautifully using markdown: bold text, clear headings (using ###), and bullet points or numbered lists.
3. Offer organic/bio-fertilizer options alongside recommended chemical remedies.
4. Keep the tone warm, respectful, and empowering.
5. Respond in the exact same language and script (Devanagari, Roman/Latin, etc.) that the user used to ask their question. If the user writes in Hindi Devanagari (हिंदी), respond in Hindi. If they write in Hinglish (Hindi words written in English letters, e.g. 'fasal me pani kab dale'), respond in natural Hinglish. If they write in English, respond in English. If they write in any other regional Indian language (e.g. Punjabi, Marathi, Telugu, Bengali), respond in that same language and script.

Strict Rule: Do not hallucinate. If you are unsure about a pest disease, crop behavior, or local weather conditions, advise the farmer to consult their local Krishi Vigyan Kendra (KVK) or Kisan Call Centre (1800-180-1551).`;

  // Truncate individual messages and enforce a total payload character budget
  const MAX_CHARS_PER_MSG = 1500;
  const MAX_TOTAL_CHARS = 16000;

  const truncateMsg = (content: string) =>
    content.length > MAX_CHARS_PER_MSG
      ? content.slice(0, MAX_CHARS_PER_MSG) + '\n... [truncated/छोटा किया गया]'
      : content;

  // Take only the most recent messages, then trim oldest if still over budget
  let trimmedHistory = chatHistory.slice(-8).map(msg => ({
    role: msg.role,
    content: truncateMsg(msg.content),
  }));

  const systemChars = systemMessage.length;
  while (trimmedHistory.length > 1) {
    const totalChars = systemChars + trimmedHistory.reduce((sum, m) => sum + m.content.length, 0);
    if (totalChars <= MAX_TOTAL_CHARS) break;
    trimmedHistory = trimmedHistory.slice(1);
  }

  const messagesPayload = [
    { role: 'system', content: systemMessage },
    ...trimmedHistory,
  ];

  // Try each model in the fallback chain
  const modelsToTry = MODEL_CHAINS[mode];
  let lastError: Error | null = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];

    try {
      const bodyPayload = JSON.stringify({
        model: modelId,
        messages: messagesPayload,
        temperature: 0.7,
        max_tokens: 1024,
      });

      console.log(`[Groq] Attempt ${i + 1}/${modelsToTry.length} — model: ${modelId}, payload: ${bodyPayload.length} chars, messages: ${messagesPayload.length}`);

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: bodyPayload,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.warn(`[Groq] Model ${modelId} failed [${response.status}]: ${errorText.slice(0, 200)}`);

        // If there's a next model to try, continue; otherwise throw
        let errorMessage = `Status ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData?.error?.message) errorMessage = errorData.error.message;
        } catch {}

        lastError = new Error(errorMessage);
        continue; // try next model
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        lastError = new Error('Empty response from model');
        continue;
      }

      if (i > 0) {
        console.log(`[Groq] ✓ Fallback to ${modelId} succeeded`);
      }

      return content;
    } catch (error: any) {
      console.warn(`[Groq] Model ${modelId} threw:`, error.message);
      lastError = error;
      continue; // try next model
    }
  }

  // All models failed
  throw lastError || new Error('All models failed. Please try again later.');
}
