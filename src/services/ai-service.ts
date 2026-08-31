const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const CHOSEN_MODEL = 'groq/compound-mini'; // Using fast compound model

export interface Scheme {
  title: string;
  benefit: string;
  eligibility: string;
  documents: string;
}

export interface DiagnosisResult {
  disease: string;
  symptoms: string;
  organic: string;
  chemical: string;
}

export async function fetchDynamicSchemes(
  stateName: string,
  cropName: string,
  language: 'en' | 'hi'
): Promise<Scheme[]> {
  try {
    const langPrompt = language === 'hi'
      ? 'Return the title, benefit, eligibility, and documents fields in Hindi (Devanagari script).'
      : 'Return all fields in English.';

    const systemPrompt = `You are a database of Indian Government Agricultural Schemes.
Provide a list of the top 3-4 active government agricultural welfare schemes (both central and state-specific) available for a farmer in the state of "${stateName}" growing "${cropName}".
Include both central schemes like PM-KISAN, PMFBY and state-specific schemes (e.g. Rythu Bandhu, Namo Shetkari, Krishak Bandhu, etc. depending on the state).

You MUST respond with a raw, valid JSON array of objects. Do not include markdown code block formatting (like \`\`\`json) or any explanation. Return ONLY the JSON array.
Each object in the array must have EXACTLY the following structure:
{
  "title": "Scheme Name",
  "benefit": "Description of benefits and money/support provided",
  "eligibility": "Eligibility criteria",
  "documents": "Required documents to apply"
}

${langPrompt}`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: CHOSEN_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Give me schemes for a farmer in state: ${stateName}, crop: ${cropName}` }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';

    // Clean markdown wraps if present
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.error('[AI Schemes Service] Error fetching dynamic schemes:', error);
    throw error;
  }
}

export async function diagnoseCropDisease(
  crop: string,
  symptoms: string,
  imageBase64?: string,
  language?: 'en' | 'hi'
): Promise<DiagnosisResult> {
  const isHindi = language === 'hi';
  const langPrompt = isHindi
    ? 'Return all response values in Hindi (Devanagari script).'
    : 'Return all response values in English.';

  const systemPrompt = `You are an expert plant pathologist and AI crop disease diagnosis engine.
The farmer is growing "${crop}" and reports the following symptoms: "${symptoms || 'None described (analyze from image)'}".
Analyze this information and provide a disease diagnosis.

You MUST respond with a raw, valid JSON object. Do not include markdown formatting or any other text. Return ONLY the JSON object.
The object must have EXACTLY the following structure:
{
  "disease": "Name of the diagnosed crop disease / pest infestation",
  "symptoms": "Brief description of typical symptoms of this condition",
  "organic": "Step-by-step organic/biological treatments and preventive practices",
  "chemical": "Recommended chemical treatments, pesticide dosages, or active ingredients"
}

${langPrompt}`;

  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

  // If Gemini API Key is present, use Google Gemini 1.5 Flash Vision API
  if (GEMINI_API_KEY) {
    try {
      console.log('[AI Diagnosis Service] Using Google Gemini API');
      let mimeType = 'image/jpeg';
      let rawBase64 = '';

      const parts: any[] = [
        { text: `Crop: ${crop}\nSymptoms: ${symptoms || 'None described (analyze from image)'}` }
      ];

      if (imageBase64) {
        const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          rawBase64 = match[2];
        } else {
          rawBase64 = imageBase64;
        }
        parts.push({
          inlineData: {
            mimeType: mimeType,
            data: rawBase64
          }
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts }],
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  disease: { type: 'STRING' },
                  symptoms: { type: 'STRING' },
                  organic: { type: 'STRING' },
                  chemical: { type: 'STRING' }
                },
                required: ['disease', 'symptoms', 'organic', 'chemical']
              }
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}`);
      }

      const data = await response.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const parsed = JSON.parse(content.trim());
      return {
        disease: parsed.disease || 'Unknown Disease',
        symptoms: parsed.symptoms || symptoms || 'N/A',
        organic: parsed.organic || 'N/A',
        chemical: parsed.chemical || 'N/A'
      };
    } catch (error) {
      console.error('[AI Diagnosis Service] Gemini error, falling back to Groq:', error);
      // Fallback to Groq API if Gemini fails
    }
  }

  // Use Groq API (as primary or fallback)
  try {
    const messages: any[] = [{ role: 'system', content: systemPrompt }];

    if (imageBase64) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: `Diagnose the disease for this crop: ${crop}. Symptoms described: ${symptoms || 'None'}` },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: `Diagnose the disease for this crop: ${crop}. Symptoms described: ${symptoms || 'None'}`
      });
    }

    const modelsToTry = imageBase64
      ? ['llama-3.2-11b-vision-preview', 'groq/compound']
      : [CHOSEN_MODEL];

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        console.log(`[AI Diagnosis Service] Attempting Groq with model: ${modelName}`);
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: messages,
            temperature: 0.2,
            max_tokens: 1200,
            response_format: { type: 'json_object' }
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API returned status ${response.status} for model ${modelName}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || '';
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(content);
        return {
          disease: parsed.disease || 'Unknown Disease',
          symptoms: parsed.symptoms || symptoms || 'N/A',
          organic: parsed.organic || 'N/A',
          chemical: parsed.chemical || 'N/A'
        };
      } catch (err) {
        console.warn(`[AI Diagnosis Service] Groq model ${modelName} failed:`, err);
        lastError = err;
      }
    }
    throw lastError || new Error('All diagnosis models failed.');
  } catch (error) {
    console.error('[AI Diagnosis Service] Error diagnosing crop disease:', error);
    throw error;
  }
}
