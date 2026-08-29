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

export async function sendMessageToGroq(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  farmProfile: FarmProfile,
  model: 'groq/compound-mini' | 'groq/compound' = 'groq/compound-mini',
  language: 'en' | 'hi' | 'hinglish' = 'hi'
): Promise<string> {
  const languageInstructions = {
    en: "Respond in clear English. Keep the tone professional yet friendly, encouraging, and accessible to farmers.",
    hi: "Respond only in clear Hindi (Devanagari script - हिंदी). Use common agricultural Hindi terms (like सिंचाई, खाद, कीट, उर्वरक) to ensure the farmer understands. Keep the language polite (using 'आप').",
    hinglish: "Respond in Hinglish (Hindi written in Roman/Latin alphabet, e.g., 'Aapko khet me nitrogen ki matra badhani chahiye'). Keep it readable, natural, and casual but highly informative."
  };

  const systemMessage = `You are "Krishi Mitra" (कृषि मित्र), an expert agricultural AI assistant designed to help Indian farmers.
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
5. ${languageInstructions[language]}

Strict Rule: Do not hallucinate. If you are unsure about a pest disease, crop behavior, or local weather conditions, advise the farmer to consult their local Krishi Vigyan Kendra (KVK) or Kisan Call Centre (1800-180-1551).`;

  const messagesPayload = [
    { role: 'system', content: systemMessage },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content.length > 4000 
        ? msg.content.slice(0, 4000) + '\n... [truncated for size/सीमा से अधिक होने पर छोटा किया गया]' 
        : msg.content
    }))
  ];

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messagesPayload,
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Groq API error response:", errorData);
      throw new Error(errorData?.error?.message || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response generated.';
  } catch (error: any) {
    console.error("Fetch error in sendMessageToGroq:", error);
    throw error;
  }
}
