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

const getGroqApiKeys = (): string[] => {
  const keys = [
    process.env.EXPO_PUBLIC_GROQ_API_KEY,
    process.env.EXPO_PUBLIC_GROQ_API_KEY_2,
    process.env.EXPO_PUBLIC_GROQ_API_KEY_3,
    process.env.EXPO_PUBLIC_GROQ_API_KEY_4,
  ].filter(Boolean) as string[];
  return keys.length > 0 ? keys : [''];
};

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Model fallback chains — strictly active, non-decommissioned Groq models
const MODEL_CHAINS = {
  smart: [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'deepseek-r1-distill-llama-70b',
  ],
  fast: [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
  ],
} as const;

export type ModelMode = 'smart' | 'fast';

export async function sendMessageToGroq(
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
  farmProfile: FarmProfile,
  mode: ModelMode = 'fast',
  imageBase64?: string
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
6. If the user provides a photo of their crop, analyze the image to identify symptoms, pests, or disease infestations and prescribe specific organic and chemical treatments.

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

  const messagesPayload: any[] = [
    { role: 'system', content: systemMessage },
    ...trimmedHistory.map((msg, idx) => {
      if (idx === trimmedHistory.length - 1 && msg.role === 'user' && imageBase64) {
        return {
          role: 'user',
          content: [
            { type: 'text', text: msg.content || 'Analyze this crop image.' },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        };
      }
      return msg;
    })
  ];

  // Try each model in the fallback chain (add vision model if image is present)
  let modelsToTry: string[] = [...MODEL_CHAINS[mode]];
  if (imageBase64) {
    modelsToTry = ['llama-3.2-11b-vision-preview', ...modelsToTry];
  }
  const apiKeys = getGroqApiKeys();
  let lastError: Error | null = null;

  for (const apiKey of apiKeys) {
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelId = modelsToTry[i];

      try {
        const bodyPayload = JSON.stringify({
          model: modelId,
          messages: messagesPayload,
          temperature: 0.7,
          max_tokens: 1024,
        });

        console.log(`[Groq] Attempting model: ${modelId}, payload: ${bodyPayload.length} chars`);

        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: bodyPayload,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => '');
          console.warn(`[Groq] Model ${modelId} failed [${response.status}]: ${errorText.slice(0, 150)}`);

          let errorMessage = `Status ${response.status}`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData?.error?.message) errorMessage = errorData.error.message;
          } catch {}

          lastError = new Error(errorMessage);
          continue; // try next model / next key
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          lastError = new Error('Empty response from model');
          continue;
        }

        return content;
      } catch (error: any) {
        console.warn(`[Groq] Model ${modelId} threw:`, error.message);
        lastError = error;
        continue;
      }
    }
  }

  // All online models failed — generate intelligent localized fallback response
  console.warn('[Groq] All online models failed. Providing intelligent localized fallback response.');
  
  const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user')?.content.toLowerCase() || '';

  if (lastUserMsg.includes('जीवामृत') || lastUserMsg.includes('jeevamrut')) {
    return `💡 **जीवामृत (देसी सूक्ष्मजीव खाद)**:
• **सामग्री**: 10kg देशी गाय का गोबर, 10L गोमूत्र, 2kg गुड़, 2kg बेसन, 1 मुट्ठी खेत की मिट्टी, 200L पानी।
• **बनाने का तरीका**: ड्रम में सभी सामग्री मिलाकर 5-7 दिन तक छाया में सड़ने दें। रोज सुबह-शाम डंडे से चलाएं।
• **प्रयोग**: 1 एकड़ खेत में सिंचाई के पानी के साथ चलाएं या 10% घोल बनाकर छिड़काव करें।`;
  }

  if (lastUserMsg.includes('इल्ली') || lastUserMsg.includes('कीड़ा') || lastUserMsg.includes('pest') || lastUserMsg.includes('caterpillar')) {
    return `💡 **इल्ली व कीट नियंत्रण (देसी जुगाड़)**:
• **नीमास्त्र या अग्न्यास्त्र**: 10L गोमूत्र में 5kg नीम की पत्ती और 1kg तीखी मिर्च पीसकर 48 घंटे रखें।
• **प्रयोग**: 15 लीटर पंप में 500ml मिलाकर छिड़काव करें।
• **पीले चिपचिपे कार्ड**: 1 एकड़ में 10-12 पीले ग्रीस लगे बोर्ड लगाएं।`;
  }

  if (lastUserMsg.includes('बोतल') || lastUserMsg.includes('ड्रिप') || lastUserMsg.includes('drip') || lastUserMsg.includes('water')) {
    return `💡 **बोतल ड्रिप सिंचाई जुगाड़**:
• 2 लीटर की पुरानी प्लास्टिक बोतल का पेंदा काटें।
• ढक्कन में छोटा छेद करके कॉटन की बत्ती लगाएं।
• पौधे की जड़ के पास 4 इंच गहरा गाड़कर पानी भर दें। 2-3 दिन तक बूंद-बूंद पानी मिलता रहेगा।`;
  }

  if (lastUserMsg.includes('दीमक') || lastUserMsg.includes('termite')) {
    return `💡 **दीमक का देसी इलाज**:
• 1 एकड़ में 50 किग्रा नीम की खली मिट्टी में मिलाएं।
• बुआई के समय 5 लीटर मट्ठा (छाछ) में 1 किग्रा हींग घोलकर खेत में डालें। दीमक तुरंत भाग जाएगी।`;
  }

  return `🌾 **कृषिक मित्र देसी सलाह**:
1. **जैविक छिड़काव**: 10 दिन पुराना खट्टा मट्ठा (छाछ) 1:10 के अनुपात में पानी मिलाकर फसल पर छिड़कें। यह फफूंद व कीटों से सुरक्षा देता है।
2. **उर्वरक प्रबंधन**: एनपीके का असंतुलित प्रयोग न करें। देशी गोबर खाद या वर्मीकंपोस्ट का प्रयोग करें।
3. **सिंचाई**: सुबह या शाम के ठंडे समय में ही सिंचाई करें।`;
}
