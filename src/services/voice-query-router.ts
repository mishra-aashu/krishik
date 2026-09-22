import { sendMessageToGroq, type FarmProfile } from './chat-service';
import { fetchWeatherData, getWeatherCondition } from './weather-service';
import { fetchLiveMandiPrices, type MandiItem } from './mandi-service';
import { LocalStorage } from '@/utils/storage';
import { type LiveLocationData } from './location-service';
import { detectScriptAndLanguage } from './multilingual-voice-engine';

export interface VoiceQueryResult {
  text: string;
  source: 'weather' | 'mandi' | 'ai';
  title?: string;
}

const COMMODITY_MAP: Record<string, string[]> = {
  'गेहूं': ['गेहूं', 'gehu', 'wheat', 'gehun'],
  'धान': ['धान', 'चावल', 'dhan', 'paddy', 'rice', 'chawal'],
  'सरसों': ['सरसों', 'sarso', 'sarson', 'mustard'],
  'कपास': ['कपास', 'रूई', 'kapas', 'cotton'],
  'गन्ना': ['गन्ना', 'ganna', 'sugarcane'],
  'आलू': ['आलू', 'aaloo', 'aalu', 'potato'],
  'मक्का': ['मक्का', 'makka', 'maize', 'corn'],
  'चना': ['चना', 'chana', 'gram', 'chane'],
};

/**
 * Routes user's spoken voice query to Weather, Mandi, or AI
 * and formats a spoken-friendly vernacular answer.
 */
export async function processVoiceQuery(
  query: string,
  profile: FarmProfile,
  language: 'hi' | 'en' = 'hi'
): Promise<VoiceQueryResult> {
  const lower = query.toLowerCase().trim();
  const { containsDevanagari, script } = detectScriptAndLanguage(query);
  const isEnglishQuery =
    (language === 'en' && !containsDevanagari) ||
    (!containsDevanagari && script === 'latin');

  // 1. Weather Intent Check
  const isWeatherIntent =
    lower.includes('मौसम') ||
    lower.includes('बारिश') ||
    lower.includes('पानी गिरेगा') ||
    lower.includes('तापमान') ||
    lower.includes('धूप') ||
    lower.includes('weather') ||
    lower.includes('rain') ||
    lower.includes('temp');

  if (isWeatherIntent) {
    try {
      let target: string | { latitude: number; longitude: number } = profile.state || 'Bihar';
      const savedGpsStr = await LocalStorage.getItem('user_live_location');
      if (savedGpsStr) {
        try {
          const gps: LiveLocationData = JSON.parse(savedGpsStr);
          if (gps.latitude && gps.longitude) {
            target = { latitude: gps.latitude, longitude: gps.longitude };
          }
        } catch {}
      }

      const weather = await fetchWeatherData(target);
      const cond = getWeatherCondition(weather.weatherCode, weather.isDay);
      const conditionName = isEnglishQuery ? cond.en : cond.hi;
      const rainProb = weather.daily7d && weather.daily7d.length > 0 ? weather.daily7d[0].precProb : 10;

      let speechText = '';
      if (!isEnglishQuery) {
        speechText = `आज आपके इलाके में ${conditionName} है। तापमान ${weather.temp} डिग्री सेल्सियस है और हवा में नमी ${weather.humidity} प्रतिशत है। `;
        if (rainProb > 40) {
          speechText += `आज वर्षा की संभावना लगभग ${rainProb} प्रतिशत बनी हुई है, इसलिए सतर्क रहें।`;
        } else {
          speechText += `आज बारिश की कोई बड़ी संभावना नहीं है, मौसम खेती के लिए अनुकूल है।`;
        }
      } else {
        speechText = `Current weather in your area is ${conditionName} with a temperature of ${weather.temp}°C and ${weather.humidity}% humidity. Rain probability is around ${rainProb}%.`;
      }

      return {
        text: speechText,
        source: 'weather',
        title: isEnglishQuery ? 'Weather Report' : 'मौसम रिपोर्ट',
      };
    } catch (err) {
      console.warn('[VoiceRouter] Weather fetch failed, falling back to AI:', err);
    }
  }

  // 2. Mandi Price Intent Check
  const isMandiIntent =
    lower.includes('मंडी') ||
    lower.includes('भाव') ||
    lower.includes('रेट') ||
    lower.includes('कीमत') ||
    lower.includes('दाम') ||
    lower.includes('mandi') ||
    lower.includes('rate') ||
    lower.includes('price');

  if (isMandiIntent) {
    try {
      const stateName = profile.state || 'Bihar';
      const prices = await fetchLiveMandiPrices(stateName);

      if (prices && prices.length > 0) {
        // Check if user asked for a specific commodity
        let matchedItem: MandiItem | undefined;
        for (const [standardName, keywords] of Object.entries(COMMODITY_MAP)) {
          if (keywords.some((kw) => lower.includes(kw))) {
            matchedItem = prices.find((p) => p.commodity.toLowerCase().includes(standardName));
            if (matchedItem) break;
          }
        }

        let speechText = '';
        if (matchedItem) {
          const rawName = matchedItem.commodity.split('(')[0].trim();
          const cleanName = !isEnglishQuery ? (matchedItem.commodity.split('(')[1]?.replace(')', '').trim() || rawName) : rawName;
          speechText = !isEnglishQuery
            ? `आज ${stateName} की मंडी में ${cleanName} का भाव ${matchedItem.price} रुपये प्रति ${matchedItem.unit} चल रहा है।`
            : `Today in ${stateName} Mandi, ${rawName} is trading at ₹${matchedItem.price} per ${matchedItem.unit}.`;
        } else {
          // Top 2 commodities
          const p1 = prices[0];
          const p2 = prices[1] || prices[0];
          speechText = !isEnglishQuery
            ? `आज ${stateName} की मंडी में ${p1.commodity.split('(')[0].trim()} का भाव ${p1.price} रुपये और ${p2.commodity.split('(')[0].trim()} का भाव ${p2.price} रुपये प्रति क्विंटल चल रहा है।`
            : `Today in ${stateName} Mandi, ${p1.commodity.split('(')[0].trim()} is ₹${p1.price} and ${p2.commodity.split('(')[0].trim()} is ₹${p2.price} per quintal.`;
        }

        return {
          text: speechText,
          source: 'mandi',
          title: isEnglishQuery ? 'Mandi Rates' : 'मंडी भाव',
        };
      }
    } catch (err) {
      console.warn('[VoiceRouter] Mandi fetch failed, falling back to AI:', err);
    }
  }

  // 3. Agricultural Advisory / Crop Pest / Disease / General AI
  const prompt = [
    {
      role: 'user' as const,
      content: isEnglishQuery
        ? `${query}\n\n[Please provide a direct, simple, conversational response in English. First give a direct 2-3 sentence answer, then highlight key practical steps so a farmer listening to audio can easily understand.]`
        : `${query}\n\n[कृपया सरल, स्पष्ट और बातचीत की हिंदी भाषा में 2 से 3 वाक्यों में पहले सीधा उत्तर दें, फिर मुख्य उपाय बताएं ताकि किसान सुनकर आसानी से समझ सके।]`,
    },
  ];

  const aiAnswer = await sendMessageToGroq(prompt, profile, 'fast');

  return {
    text: aiAnswer,
    source: 'ai',
    title: isEnglishQuery ? 'Krishik Mitra Advice' : 'कृषिक मित्र सलाह',
  };
}
