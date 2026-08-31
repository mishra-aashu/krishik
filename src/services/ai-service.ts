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
      ? ['qwen/qwen3.8-27b', 'groq/compound']
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

export interface PhysicalSoilAnalysis {
  soilTypeEn: string;
  soilTypeHi: string;
  soilColorEn: string;
  soilColorHi: string;
  moistureEn: string;
  moistureHi: string;
  organicMatterEn: string;
  organicMatterHi: string;
  suggestedCropsEn: string;
  suggestedCropsHi: string;
  observationsEn: string;
  observationsHi: string;
}

export interface SoilAnalysisResult {
  isReportCard: boolean;
  pH: number | null;
  nitrogen: number | null;
  phosphorus: number | null;
  potassium: number | null;
  organicCarbon: number | null;
  physicalSoil: PhysicalSoilAnalysis | null;
  estimatedPh: 'acidic' | 'neutral' | 'alkaline' | null;
  estimatedN: 'low' | 'medium' | 'high' | null;
  estimatedP: 'low' | 'medium' | 'high' | null;
  estimatedK: 'low' | 'medium' | 'high' | null;
  estimatedOc: 'low' | 'medium' | 'high' | null;
}

export async function extractSoilHealthCardData(
  imageBase64: string,
  language?: 'en' | 'hi'
): Promise<SoilAnalysisResult> {
  const isHindi = language === 'hi';
  
  const systemPrompt = `You are a specialized agricultural vision system and soil analyst.
Your task is to analyze the uploaded image, which can be EITHER:
1. A Soil Health Card (मृदा स्वास्थ्य कार्ड) / Soil Test Lab Report sheet (with numbers, tables, text parameters).
2. A direct photo of field soil / dirt.

First, determine if the image is a report card or sheet: set "isReportCard" to true. If it is a photo of physical soil/dirt/field, set "isReportCard" to false.

If isReportCard is true:
- Extract pH, Nitrogen (N in kg/ha), Phosphorus (P in kg/ha), Potassium (K in kg/ha), and Organic Carbon (OC in %).
- If any parameter is missing or unreadable, set it to null.
- If parameters are written as ratings/text (e.g. "Low", "Medium", "High"), map them to:
  - Nitrogen: low -> 200, medium -> 400, high -> 600
  - Phosphorus: low -> 8, medium -> 16, high -> 25
  - Potassium: low -> 90, medium -> 200, high -> 300
  - Organic Carbon: low -> 0.3, medium -> 0.6, high -> 0.9

If isReportCard is false (direct photo of soil):
- Analyze the soil color, type, moisture, and general health from the image.
- Set the "physicalSoil" object fields. You MUST populate BOTH English and Hindi fields:
  - "soilTypeEn": Estimated soil type in English (e.g. "Loamy soil", "Black clayey soil", "Sandy loam soil", "Red laterite soil").
  - "soilTypeHi": Estimated soil type in Hindi (e.g. "दोमट मिट्टी", "काली चिकनी मिट्टी", "बलुई दोमट मिट्टी", "लाल लैटेराइट मिट्टी").
  - "soilColorEn": Estimated color in English (e.g. "Dark Brown", "Blackish", "Reddish Brown", "Yellowish Light Gray").
  - "soilColorHi": Estimated color in Hindi (e.g. "गहरा भूरा", "काला", "लाल-भूरा", "पीला-हल्का धूसर").
  - "moistureEn": Estimated moisture in English (e.g. "Dry", "Moist / Damp", "Highly Wet / Waterlogged").
  - "moistureHi": Estimated moisture in Hindi (e.g. "सूखी मिट्टी", "नम / गीली मिट्टी", "अत्यधिक गीली / जलभराव").
  - "organicMatterEn": General organic status in English (e.g. "Low", "Medium", "High").
  - "organicMatterHi": General organic status in Hindi (e.g. "कम", "मध्यम", "अधिक").
  - "suggestedCropsEn": Highly suitable crops for this soil in English (e.g. "Wheat, Maize, Soybean, Mustard"). Provide rich, detailed suggestions.
  - "suggestedCropsHi": Highly suitable crops for this soil in Hindi (e.g. "गेहूं, मक्का, सोयाबीन, सरसों"). Provide rich, detailed suggestions.
  - "observationsEn": Brief practical farming advice for this soil in English (e.g. "Add organic compost/manure, ensure proper drainage, crop rotation"). Provide rich, actionable advice.
  - "observationsHi": Brief practical farming advice for this soil in Hindi (e.g. "जैविक खाद/कंपोस्ट मिलाएं, जल निकासी की उचित व्यवस्था करें, फसल चक्र अपनाएं"). Provide rich, actionable advice.
- Set estimated simple categories based on visual properties:
  - "estimatedPh": 'acidic' (if red/laterite soil), 'alkaline' (if salty/white crust), otherwise 'neutral'.
  - "estimatedOc": 'low' (if light colored/sandy), 'high' (if dark, compost-rich), otherwise 'medium'.
  - "estimatedN": 'low', 'medium', or 'high'.
  - "estimatedP": 'low', 'medium', or 'high'.
  - "estimatedK": 'low', 'medium', or 'high'.

Also, for report cards, map the extracted numeric parameters to the matching estimated categories:
- pH: < 6.0 -> 'acidic', > 8.2 -> 'alkaline', else 'neutral'
- Nitrogen: < 280 -> 'low', > 560 -> 'high', else 'medium'
- Phosphorus: < 11 -> 'low', > 22 -> 'high', else 'medium'
- Potassium: < 110 -> 'low', > 280 -> 'high', else 'medium'
- Organic Carbon: < 0.5 -> 'low', > 0.75 -> 'high', else 'medium'

Return ONLY a raw JSON object with this exact structure:
{
  "isReportCard": boolean,
  "pH": number or null,
  "nitrogen": number or null,
  "phosphorus": number or null,
  "potassium": number or null,
  "organicCarbon": number or null,
  "physicalSoil": {
    "soilTypeEn": "string",
    "soilTypeHi": "string",
    "soilColorEn": "string",
    "soilColorHi": "string",
    "moistureEn": "string",
    "moistureHi": "string",
    "organicMatterEn": "string",
    "organicMatterHi": "string",
    "suggestedCropsEn": "string",
    "suggestedCropsHi": "string",
    "observationsEn": "string",
    "observationsHi": "string"
  } or null,
  "estimatedPh": "acidic" or "neutral" or "alkaline" or null,
  "estimatedN": "low" or "medium" or "high" or null,
  "estimatedP": "low" or "medium" or "high" or null,
  "estimatedK": "low" or "medium" or "high" or null,
  "estimatedOc": "low" or "medium" or "high" or null
}`;

  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

  if (GEMINI_API_KEY) {
    try {
      console.log('[AI OCR Service] Using Google Gemini API');
      let mimeType = 'image/jpeg';
      let rawBase64 = '';

      const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        rawBase64 = match[2];
      } else {
        rawBase64 = imageBase64;
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: 'Analyze this soil image.' },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: rawBase64
                  }
                }
              ]
            }],
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: 'OBJECT',
                properties: {
                  isReportCard: { type: 'BOOLEAN' },
                  pH: { type: 'NUMBER' },
                  nitrogen: { type: 'NUMBER' },
                  phosphorus: { type: 'NUMBER' },
                  potassium: { type: 'NUMBER' },
                  organicCarbon: { type: 'NUMBER' },
                  physicalSoil: {
                    type: 'OBJECT',
                    properties: {
                      soilType: { type: 'STRING' },
                      soilColor: { type: 'STRING' },
                      moisture: { type: 'STRING' },
                      organicMatter: { type: 'STRING' },
                      suggestedCrops: { type: 'STRING' },
                      observations: { type: 'STRING' }
                    },
                    required: ['soilType', 'soilColor', 'moisture', 'organicMatter', 'suggestedCrops', 'observations']
                  },
                  estimatedPh: { type: 'STRING' },
                  estimatedN: { type: 'STRING' },
                  estimatedP: { type: 'STRING' },
                  estimatedK: { type: 'STRING' },
                  estimatedOc: { type: 'STRING' }
                },
                required: ['isReportCard']
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
        isReportCard: !!parsed.isReportCard,
        pH: typeof parsed.pH === 'number' ? parsed.pH : null,
        nitrogen: typeof parsed.nitrogen === 'number' ? parsed.nitrogen : null,
        phosphorus: typeof parsed.phosphorus === 'number' ? parsed.phosphorus : null,
        potassium: typeof parsed.potassium === 'number' ? parsed.potassium : null,
        organicCarbon: typeof parsed.organicCarbon === 'number' ? parsed.organicCarbon : null,
        physicalSoil: parsed.physicalSoil || null,
        estimatedPh: parsed.estimatedPh || null,
        estimatedN: parsed.estimatedN || null,
        estimatedP: parsed.estimatedP || null,
        estimatedK: parsed.estimatedK || null,
        estimatedOc: parsed.estimatedOc || null,
      };
    } catch (error) {
      console.error('[AI OCR Service] Gemini error, falling back to Groq:', error);
    }
  }

  // Fallback to Groq API
  try {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this soil image.' },
          {
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
            }
          }
        ]
      }
    ];

    const modelName = 'qwen/qwen3.8-27b';
    console.log(`[AI OCR Service] Attempting Groq with model: ${modelName}`);
    
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || '';
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(content);
    return {
      isReportCard: !!parsed.isReportCard,
      pH: typeof parsed.pH === 'number' ? parsed.pH : null,
      nitrogen: typeof parsed.nitrogen === 'number' ? parsed.nitrogen : null,
      phosphorus: typeof parsed.phosphorus === 'number' ? parsed.phosphorus : null,
      potassium: typeof parsed.potassium === 'number' ? parsed.potassium : null,
      organicCarbon: typeof parsed.organicCarbon === 'number' ? parsed.organicCarbon : null,
      physicalSoil: parsed.physicalSoil || null,
      estimatedPh: parsed.estimatedPh || null,
      estimatedN: parsed.estimatedN || null,
      estimatedP: parsed.estimatedP || null,
      estimatedK: parsed.estimatedK || null,
      estimatedOc: parsed.estimatedOc || null,
    };
  } catch (error) {
    console.error('[AI OCR Service] Error extracting soil card data with Groq:', error);
    throw error;
  }
}
