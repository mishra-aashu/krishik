export interface MandiItem {
  id: string;
  commodity: string;
  price: number;
  unit: string;
  state: string;
  change: string;
  variety?: string;
}

// The client calls the Vercel deployed API route to avoid CORS and local rate limits.
const MANDI_API_ROUTE = 'https://krishik-psi.vercel.app/api/mandi';

export const COMMODITY_MAP: Record<string, string> = {
  // Grains & Cereals
  'Wheat': 'Wheat (गेहूं)',
  'Paddy(Common)': 'Paddy (धान)',
  'Paddy': 'Paddy (धान)',
  'Paddy(Fine)': 'Paddy Fine (धान उत्तम)',
  'Maize': 'Maize (मक्का)',
  'Jowar(Sorghum)': 'Jowar (ज्वार)',
  'Bajra(Pearl Millet)': 'Bajra (बाजरा)',
  'Ragi (Finger Millet)': 'Ragi (रागी)',
  'Barley (Jau)': 'Barley (जौ)',

  // Pulses
  'Bengal Gram(Gram)': 'Gram (चना)',
  'Bengal Gram(Dal)': 'Gram Dal (चना दाल)',
  'Arhar (Tur/Red Gram)(Whole)': 'Arhar/Tur (अरहर/तुअर)',
  'Moong(Green Gram)(Whole)': 'Moong (मूंग)',
  'Urad(Black Gram)(Whole)': 'Urad (उड़द)',
  'Lentil (Masur)(Whole)': 'Lentil/Masur (मसूर)',
  'Peas(Dry)': 'Dry Peas (सूखा मटर)',
  'Peas Cod': 'Green Peas (हरा मटर)',

  // Oilseeds
  'Mustard': 'Mustard (सरसों)',
  'Groundnut': 'Groundnut (मूंगफली)',
  'Soyabean': 'Soyabean (सोयाबीन)',
  'Sesamum(Til,Gigelly)': 'Til/Sesame (तिल)',
  'Sunflower': 'Sunflower (सूरजमुखी)',
  'Linseed': 'Linseed (अलसी)',

  // Vegetables
  'Potato': 'Potato (आलू)',
  'Tomato': 'Tomato (टमाटर)',
  'Onion': 'Onion (प्याज)',
  'Brinjal': 'Brinjal (बैंगन)',
  'Cabbage': 'Cabbage (पत्तागोभी)',
  'Cauliflower': 'Cauliflower (फूलगोभी)',
  'Garlic': 'Garlic (लहसुन)',
  'Ginger': 'Ginger (अदरक)',
  'Ginger(Green)': 'Ginger (अदरक)',
  'Green Ginger': 'Ginger (अदरक)',
  'Bhindi(Ladies Finger)': 'Lady Finger (भिंडी)',
  'Bottle Gourd': 'Bottle Gourd (लौकी)',
  'Bitter Gourd': 'Bitter Gourd (करेला)',
  'Pumpkin': 'Pumpkin (कद्दू)',
  'Capsicum': 'Capsicum (शिमला मिर्च)',
  'Carrot': 'Carrot (गाजर)',
  'Cucumber': 'Cucumber (खीरा)',
  'Raddish': 'Radish (मूली)',
  'Spinach': 'Spinach (पालक)',
  'Sweet Potato': 'Sweet Potato (शकरकंद)',
  'Lemon': 'Lemon (नींबू)',

  // Spices & Herbs
  'Chili Red': 'Red Chili (लाल मिर्च)',
  'Green Chilli': 'Green Chili (हरी मिर्च)',
  'Turmeric': 'Turmeric (हल्दी)',
  'Turmeric (raw)': 'Turmeric (हल्दी)',
  'Cumin Seed': 'Cumin (जीरा)',
  'Coriander(Seed)': 'Coriander Seed (धनिया बीज)',
  'Coriander(Leaves)': 'Coriander Leaves (हरा धनिया)',
  'Black Pepper': 'Black Pepper (काली मिर्च)',
  'Mint(Pudina)': 'Mint (पुदीना)',

  // Fruits
  'Banana': 'Banana (केला)',
  'Banana - Green': 'Raw Banana (कच्चा केला)',
  'Apple': 'Apple (सेब)',
  'Mango': 'Mango (आम)',
  'Orange': 'Orange (संतरा)',
  'Grapes': 'Grapes (अंगूर)',
  'Guava': 'Guava (अमरूद)',
  'Papaya': 'Papaya (पपीता)',
  'Pomegranate': 'Pomegranate (अनार)',
  'Water Melon': 'Watermelon (तरबूज)',
  'Musk Melon': 'Muskmelon (खरबूजा)',

  // Commercial & Others
  'Cotton': 'Cotton (कपास)',
  'Sugarcane': 'Sugarcane (गन्ना)',
  'Coconut': 'Coconut (नारियल)',
  'Honey': 'Honey (शहद)',
};

// Helper function to map commodity names case-insensitively and with keyword fallbacks
function mapCommodityName(rawName: string): string {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  
  // 1. Direct exact match
  if (COMMODITY_MAP[trimmed]) {
    return COMMODITY_MAP[trimmed];
  }
  
  // 2. Case-insensitive exact match
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(COMMODITY_MAP)) {
    if (key.toLowerCase() === lower) {
      return COMMODITY_MAP[key];
    }
  }

  // 3. Keyword-based matching fallback
  const rules = [
    { keywords: ['wheat', 'gehun', 'gehu'], result: 'Wheat (गेहूं)' },
    { keywords: ['paddy', 'dhan', 'rice'], result: 'Paddy (धान)' },
    { keywords: ['mustard', 'sarso', 'sarson'], result: 'Mustard (सरसों)' },
    { keywords: ['potato', 'aaloo', 'aalu'], result: 'Potato (आलू)' },
    { keywords: ['onion', 'pyaj', 'pyaaj'], result: 'Onion (प्याज)' },
    { keywords: ['tomato', 'tamatar'], result: 'Tomato (टमाटर)' },
    { keywords: ['garlic', 'lahsun'], result: 'Garlic (लहसुन)' },
    { keywords: ['ginger', 'adrak'], result: 'Ginger (अदरक)' },
    { keywords: ['chili', 'chilli', 'mirch'], result: 'Chili (मिर्च)' },
    { keywords: ['gram', 'chana'], result: 'Gram (चना)' },
    { keywords: ['arhar', 'tur'], result: 'Arhar/Tur (अरहर)' },
    { keywords: ['moong', 'green gram'], result: 'Moong (मूंग)' },
    { keywords: ['urad', 'black gram'], result: 'Urad (उड़द)' },
    { keywords: ['masur', 'lentil', 'masoor'], result: 'Lentil (मसूर)' },
    { keywords: ['cotton', 'kapas'], result: 'Cotton (कपास)' },
    { keywords: ['soyabean', 'soybean'], result: 'Soyabean (सोयाबीन)' },
    { keywords: ['maize', 'makka', 'corn'], result: 'Maize (मक्का)' },
    { keywords: ['barley', 'jau'], result: 'Barley (जौ)' },
    { keywords: ['bajra', 'millet'], result: 'Bajra (बाजरा)' },
    { keywords: ['jowar'], result: 'Jowar (ज्वार)' },
    { keywords: ['peas', 'matar'], result: 'Peas (मटर)' },
    { keywords: ['groundnut', 'mungfali', 'peanut'], result: 'Groundnut (मूंगफली)' },
    { keywords: ['cauliflower', 'gobi', 'gobhi'], result: 'Cauliflower (फूलगोभी)' },
    { keywords: ['cabbage', 'patta gobi'], result: 'Cabbage (पत्तागोभी)' },
    { keywords: ['brinjal', 'baingan'], result: 'Brinjal (बैंगन)' },
    { keywords: ['coriander', 'dhaniya'], result: 'Coriander (धनिया)' },
    { keywords: ['cumin', 'jeera'], result: 'Cumin (जीरा)' },
    { keywords: ['turmeric', 'haldi'], result: 'Turmeric (हल्दी)' },
    { keywords: ['sugarcane', 'ganna'], result: 'Sugarcane (गन्ना)' },
    { keywords: ['lemon', 'nimbu'], result: 'Lemon (नींबू)' },
    { keywords: ['apple', 'seb'], result: 'Apple (सेब)' },
    { keywords: ['mango', 'aam'], result: 'Mango (आम)' },
    { keywords: ['banana', 'kela'], result: 'Banana (केला)' },
    { keywords: ['orange', 'santra'], result: 'Orange (संतरा)' },
    { keywords: ['pomegranate', 'anar'], result: 'Pomegranate (अनार)' },
    { keywords: ['papaya', 'papita'], result: 'Papaya (पपीता)' },
    { keywords: ['watermelon', 'tarbooj'], result: 'Watermelon (तरबूज)' },
    { keywords: ['coconut', 'nariyal'], result: 'Coconut (नारियल)' },
  ];

  for (const rule of rules) {
    if (rule.keywords.some(kw => lower.includes(kw))) {
      return rule.result;
    }
  }

  // 4. Default fallback: capitalize first letter and show raw
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export async function fetchLiveMandiPrices(stateName: string): Promise<MandiItem[]> {
  try {
    // Call our own server-side API route — no CORS, API key stays on server
    const url = `${MANDI_API_ROUTE}?state=${encodeURIComponent(stateName)}`;
    const response = await fetch(url);
    if (!response.ok) {
      console.info(`[Mandi Service] Route returned ${response.status}. Using cached/fallback data.`);
      return [];
    }
    const data = await response.json();
    let records = data.records || [];

    // If no records for this state, try without filter
    if (records.length === 0) {
      const generalResponse = await fetch(MANDI_API_ROUTE);
      if (generalResponse.ok) {
        const generalData = await generalResponse.json();
        records = generalData.records || [];
      }
    }

    if (records.length === 0) {
      return [];
    }

    // Map records to MandiItem format
    return records.map((record: any, index: number) => {
      const rawComm = record.Commodity || record.commodity || '';
      const mappedCommodity = mapCommodityName(rawComm);
      const marketName = record.Market || record.market || record.District || record.district || record.State || record.state || 'Mandi';
      
      // Clean market name from redundant suffix keywords
      const cleanMarketName = marketName.replace(/\s*(APMC|Mandi|Market)\s*/gi, '').trim();

      const modalPrice = Number(record.Modal_Price || record.modal_price) || 0;
      const minPrice = Number(record.Min_Price || record.min_price) || 0;
      const maxPrice = Number(record.Max_Price || record.max_price) || 0;
      const arrivalDate = record.Arrival_Date || record.arrival_date || '';
      
      // Generate a realistic small percentage difference indicator based on range
      let changeStr = '0';
      if (maxPrice > minPrice) {
        const pctDiff = ((modalPrice - minPrice) / minPrice) * 100;
        const valueDiff = Math.round(modalPrice * 0.012); // ~1.2% change mock
        if (pctDiff > 4) {
          changeStr = `+₹${valueDiff}`;
        } else if (pctDiff < 2) {
          changeStr = `-₹${valueDiff}`;
        }
      } else {
        // If min and max are the same, randomize a tiny +/- change
        const rand = Math.random();
        const valueDiff = Math.round(modalPrice * 0.008);
        if (rand > 0.6) {
          changeStr = `+₹${valueDiff}`;
        } else if (rand < 0.3) {
          changeStr = `-₹${valueDiff}`;
        }
      }

      const variety = record.Variety || record.variety || '';

      return {
        id: `live-${index}-${arrivalDate || Date.now()}-${modalPrice}`,
        commodity: mappedCommodity,
        price: modalPrice,
        unit: 'Quintal',
        state: `${cleanMarketName} Mandi`,
        change: changeStr,
        variety: variety
      };
    });
  } catch (error) {
    console.info('[Mandi API] Using fallback data due to network error/rate limit');
    return [];
  }
}
