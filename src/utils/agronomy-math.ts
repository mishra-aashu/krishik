// ICAR Recommended Dose of Fertilizer (RDF) per ACRE
// Source: ICAR Package of Practices, State Agricultural Universities
// Conversion: ICAR standard is per hectare; values below = RDF(kg/ha) ÷ 2.47
// Seed rates are per acre. Water volume in liters per acre per season.
export const AGRONOMY_PRESETS = {
  'Wheat (गेहूं)':       { seed: 40,   seedUnit: 'kg',             n: 49, p: 24, k: 16, waterRounds: 5,  waterVolume: 150000 },  // RDF: 120:60:40 kg/ha
  'Paddy (धान)':        { seed: 8,    seedUnit: 'kg (Nursery)',    n: 49, p: 24, k: 24, waterRounds: 10, waterVolume: 350000 },  // RDF: 120:60:60 kg/ha
  'Sugarcane (गन्ना)':   { seed: 2500, seedUnit: 'kg (Setts)',     n: 101,p: 40, k: 40, waterRounds: 12, waterVolume: 450000 },  // RDF: 250:100:100 kg/ha
  'Potato (आलू)':       { seed: 1000, seedUnit: 'kg (Tubers)',    n: 61, p: 40, k: 61, waterRounds: 7,  waterVolume: 200000 },  // RDF: 150:100:150 kg/ha
  'Cotton (कपास)':      { seed: 2,    seedUnit: 'kg',             n: 49, p: 24, k: 24, waterRounds: 5,  waterVolume: 180000 },  // RDF: 120:60:60 kg/ha
  'Mustard (सरसों)':     { seed: 2,    seedUnit: 'kg',             n: 32, p: 16, k: 16, waterRounds: 2,  waterVolume: 70000 },   // RDF: 80:40:40 kg/ha
  'Maize (मक्का)':      { seed: 8,    seedUnit: 'kg',             n: 49, p: 24, k: 16, waterRounds: 6,  waterVolume: 180000 },  // RDF: 120:60:40 kg/ha
  'Soybean (सोयाबीन)':  { seed: 30,   seedUnit: 'kg',             n: 10, p: 32, k: 16, waterRounds: 4,  waterVolume: 120000 },  // RDF: 25:80:40 kg/ha
  'Onion (प्याज)':       { seed: 4,    seedUnit: 'kg',             n: 40, p: 20, k: 40, waterRounds: 10, waterVolume: 220000 },  // RDF: 100:50:100 kg/ha
  'Garlic (लहसुन)':      { seed: 200,  seedUnit: 'kg (Cloves)',    n: 40, p: 24, k: 32, waterRounds: 8,  waterVolume: 200000 },  // RDF: 100:60:80 kg/ha
  'Tomato (टमाटर)':     { seed: 0.15, seedUnit: 'kg',             n: 49, p: 32, k: 32, waterRounds: 9,  waterVolume: 240000 },  // RDF: 120:80:80 kg/ha
  'Chilli (मिर्च)':       { seed: 0.2,  seedUnit: 'kg',             n: 40, p: 24, k: 24, waterRounds: 8,  waterVolume: 200000 },  // RDF: 100:60:60 kg/ha
  'Ginger (अदरक)':      { seed: 600,  seedUnit: 'kg (Rhizomes)',  n: 30, p: 20, k: 24, waterRounds: 12, waterVolume: 300000 },  // RDF: 75:50:60 kg/ha
  'Turmeric (हल्दी)':    { seed: 800,  seedUnit: 'kg (Rhizomes)',  n: 24, p: 16, k: 32, waterRounds: 12, waterVolume: 320000 },  // RDF: 60:40:80 kg/ha
  'Groundnut (मूंगफली)': { seed: 40,   seedUnit: 'kg (Pods)',      n: 10, p: 16, k: 18, waterRounds: 4,  waterVolume: 140000 },  // RDF: 25:40:45 kg/ha
  'Gram (चना)':         { seed: 30,   seedUnit: 'kg',             n: 8,  p: 16, k: 8,  waterRounds: 2,  waterVolume: 80000 },   // RDF: 20:40:20 kg/ha
  'Pea (मटर)':          { seed: 35,   seedUnit: 'kg',             n: 10, p: 20, k: 16, waterRounds: 3,  waterVolume: 100000 },  // RDF: 25:50:40 kg/ha
  'Pigeon Pea (अरहर)':  { seed: 6,    seedUnit: 'kg',             n: 8,  p: 20, k: 8,  waterRounds: 2,  waterVolume: 90000 },   // RDF: 20:50:20 kg/ha
  'Mung Bean (मूंग)':    { seed: 8,    seedUnit: 'kg',             n: 8,  p: 16, k: 8,  waterRounds: 2,  waterVolume: 80000 },   // RDF: 20:40:20 kg/ha
  'Black Gram (उड़द)':   { seed: 8,    seedUnit: 'kg',             n: 8,  p: 16, k: 8,  waterRounds: 2,  waterVolume: 80000 },   // RDF: 20:40:20 kg/ha
  'Lentil (मसूर)':       { seed: 15,   seedUnit: 'kg',             n: 8,  p: 16, k: 8,  waterRounds: 2,  waterVolume: 80000 },   // RDF: 20:40:20 kg/ha
  'Pearl Millet (बाजरा)':{ seed: 2,    seedUnit: 'kg',             n: 32, p: 16, k: 16, waterRounds: 3,  waterVolume: 100000 },  // RDF: 80:40:40 kg/ha
  'Finger Millet (रागी)':{ seed: 4,    seedUnit: 'kg',             n: 20, p: 12, k: 10, waterRounds: 4,  waterVolume: 110000 },  // RDF: 50:30:25 kg/ha
  'Sorghum (ज्वार)':     { seed: 4,    seedUnit: 'kg',             n: 32, p: 16, k: 16, waterRounds: 3,  waterVolume: 110000 },  // RDF: 80:40:40 kg/ha
  'Barley (जौ)':        { seed: 35,   seedUnit: 'kg',             n: 24, p: 12, k: 12, waterRounds: 3,  waterVolume: 110000 },  // RDF: 60:30:30 kg/ha
  'Sesame (तिल)':       { seed: 2,    seedUnit: 'kg',             n: 16, p: 12, k: 10, waterRounds: 2,  waterVolume: 70000 },   // RDF: 40:30:25 kg/ha
  'Sunflower (सूरजमुखी)':{ seed: 3,    seedUnit: 'kg',             n: 24, p: 24, k: 12, waterRounds: 5,  waterVolume: 140000 },  // RDF: 60:60:30 kg/ha
  'Cauliflower (फूलगोभी)':{ seed: 0.25,seedUnit: 'kg',             n: 49, p: 32, k: 32, waterRounds: 8,  waterVolume: 220000 },  // RDF: 120:80:80 kg/ha
  'Cabbage (पत्तागोभी)': { seed: 0.25, seedUnit: 'kg',             n: 49, p: 32, k: 32, waterRounds: 8,  waterVolume: 220000 },  // RDF: 120:80:80 kg/ha
  'Brinjal (बैंगन)':     { seed: 0.15, seedUnit: 'kg',             n: 40, p: 24, k: 24, waterRounds: 8,  waterVolume: 200000 },  // RDF: 100:60:60 kg/ha
  'Okra (भिंडी)':        { seed: 4,    seedUnit: 'kg',             n: 32, p: 20, k: 20, waterRounds: 6,  waterVolume: 150000 }   // RDF: 80:50:50 kg/ha
};

export interface StandardDosage {
  seed: number;
  seedUnit: string;
  n: number;
  p: number;
  k: number;
  waterRounds: number;
  waterVolume: number;
}

export interface SoilAnalysis {
  pHVal: number | null;
  pHRating: 'acidic' | 'alkaline' | 'neutral' | null;
  pHAmendingTipEn: string;
  pHAmendingTipHi: string;
  
  ocVal: number | null;
  ocRating: 'low' | 'medium' | 'high' | null;
  ocTipEn: string;
  ocTipHi: string;

  nRating: 'low' | 'medium' | 'high' | null;
  pRating: 'low' | 'medium' | 'high' | null;
  kRating: 'low' | 'medium' | 'high' | null;

  nFactor: number;
  pFactor: number;
  kFactor: number;

  baseN: number;
  baseP: number;
  baseK: number;

  targetN: number;
  targetP: number;
  targetK: number;

  fertilizerSource: 'dap' | 'ssp';
  primaryWeight: number; // DAP or SSP in kg
  ureaWeight: number; // Urea in kg
  mopWeight: number; // MOP in kg

  primaryBags: number;
  ureaBags: number;
  mopBags: number;
}

/**
 * Clean and parse floating-point numbers safely from user text input.
 * Handles commas, trailing spaces, and enforces optional min/max bounds.
 */
export function parseSanitizedFloat(
  valStr: string | null | undefined,
  min?: number,
  max?: number
): number | null {
  if (valStr === null || valStr === undefined) return null;
  const cleaned = valStr.toString().trim().replace(/,/g, '.');
  if (cleaned === '') return null;
  const parsed = parseFloat(cleaned);
  if (isNaN(parsed)) return null;
  if (min !== undefined && parsed < min) return null;
  if (max !== undefined && parsed > max) return null;
  return parsed;
}

export function calculateStandardDosage(
  landArea: string,
  landUnit: 'acre' | 'bigha',
  crop: string
): StandardDosage | null {
  const area = parseSanitizedFloat(landArea, 0.1, 1000);
  if (area === null) return null;

  const cropPreset = AGRONOMY_PRESETS[crop as keyof typeof AGRONOMY_PRESETS];
  if (!cropPreset) return null;

  const areaMultiplier = landUnit === 'acre' ? area : area / 1.6;
  return {
    seed: Math.round(cropPreset.seed * areaMultiplier * 10) / 10,
    seedUnit: cropPreset.seedUnit,
    n: Math.round(cropPreset.n * areaMultiplier * 10) / 10,
    p: Math.round(cropPreset.p * areaMultiplier * 10) / 10,
    k: Math.round(cropPreset.k * areaMultiplier * 10) / 10,
    waterRounds: cropPreset.waterRounds,
    waterVolume: Math.round(cropPreset.waterVolume * areaMultiplier)
  };
}

export function calculateSoilDosage(
  landArea: string,
  landUnit: 'acre' | 'bigha',
  crop: string,
  soilPh: string,
  soilN: string,
  soilP: string,
  soilK: string,
  soilOc: string,
  fertilizerSource: 'dap' | 'ssp'
): SoilAnalysis | null {
  const area = parseSanitizedFloat(landArea, 0.1, 1000);
  if (area === null) return null;

  const cropPreset = AGRONOMY_PRESETS[crop as keyof typeof AGRONOMY_PRESETS];
  if (!cropPreset) return null;

  const areaMultiplier = landUnit === 'acre' ? area : area / 1.6;
  const baseN = Math.round(cropPreset.n * areaMultiplier * 10) / 10;
  const baseP = Math.round(cropPreset.p * areaMultiplier * 10) / 10;
  const baseK = Math.round(cropPreset.k * areaMultiplier * 10) / 10;

  // 1. pH Interpretation (Valid range: 3.5 - 10.5)
  const pHVal = parseSanitizedFloat(soilPh, 3.5, 10.5);
  let pHRating: 'acidic' | 'alkaline' | 'neutral' | null = null;
  let pHAmendingTipEn = 'Healthy soil pH. No chemical amendments needed.';
  let pHAmendingTipHi = 'स्वस्थ मिट्टी पीएच। किसी रासायनिक सुधारक की आवश्यकता नहीं है।';

  if (pHVal !== null) {
    if (pHVal < 6.0) {
      pHRating = 'acidic';
      pHAmendingTipEn = 'Acidic soil. Apply Lime (CaCO3) to neutralize.';
      pHAmendingTipHi = 'अम्लीय मिट्टी। उदासीन करने के लिए चूना (Lime) का प्रयोग करें।';
    } else if (pHVal > 8.2) {
      pHRating = 'alkaline';
      pHAmendingTipEn = 'Alkaline soil. Apply Gypsum (CaSO4) to reduce alkalinity.';
      pHAmendingTipHi = 'क्षारीय मिट्टी। क्षारीयता को कम करने के लिए जिप्सम (Gypsum) का प्रयोग करें।';
    } else {
      pHRating = 'neutral';
    }
  }

  // 2. Organic Carbon Interpretation (Valid range: 0.0 - 5.0 %)
  const ocVal = parseSanitizedFloat(soilOc, 0.0, 5.0);
  let ocRating: 'low' | 'medium' | 'high' | null = null;
  let ocTipEn = 'Medium Organic Carbon. Good soil health.';
  let ocTipHi = 'मध्यम जैविक कार्बन। मिट्टी का स्वास्थ्य अच्छा है।';

  if (ocVal !== null) {
    if (ocVal < 0.5) {
      ocRating = 'low';
      ocTipEn = 'Low Organic Carbon. Apply farmyard manure or organic compost.';
      ocTipHi = 'कम जैविक कार्बन। गोबर की खाद या जैविक कम्पोस्ट का प्रयोग करें।';
    } else if (ocVal > 0.75) {
      ocRating = 'high';
      ocTipEn = 'High Organic Carbon. Highly fertile organic matter.';
      ocTipHi = 'उच्च जैविक कार्बन। अत्यधिक उपजाऊ जैविक पदार्थ।';
    } else {
      ocRating = 'medium';
    }
  }

  // 3. NPK Correction Factors
  const nVal = parseSanitizedFloat(soilN, 0, 1000);
  let nRating: 'low' | 'medium' | 'high' | null = null;
  let nFactor = 1.0;
  if (nVal !== null) {
    if (nVal < 240) {
      nRating = 'low';
      nFactor = 1.3;
    } else if (nVal > 480) {
      nRating = 'high';
      nFactor = 0.7;
    } else {
      nRating = 'medium';
      nFactor = 1.0;
    }
  }

  const pVal = parseSanitizedFloat(soilP, 0, 500);
  let pRating: 'low' | 'medium' | 'high' | null = null;
  let pFactor = 1.0;
  if (pVal !== null) {
    if (pVal < 11) {
      pRating = 'low';
      pFactor = 1.3;
    } else if (pVal > 22) {
      pRating = 'high';
      pFactor = 0.7;
    } else {
      pRating = 'medium';
      pFactor = 1.0;
    }
  }

  const kVal = parseSanitizedFloat(soilK, 0, 1000);
  let kRating: 'low' | 'medium' | 'high' | null = null;
  let kFactor = 1.0;
  if (kVal !== null) {
    if (kVal < 110) {
      kRating = 'low';
      kFactor = 1.3;
    } else if (kVal > 280) {
      kRating = 'high';
      kFactor = 0.7;
    } else {
      kRating = 'medium';
      kFactor = 1.0;
    }
  }

  // If Nitrogen is missing but OC is low, adjust Nitrogen baseline by +30%
  if (nVal === null && ocRating === 'low') {
    nFactor = 1.3;
  }

  // Target targets
  const targetN = Math.round(baseN * nFactor * 10) / 10;
  const targetP = Math.round(baseP * pFactor * 10) / 10;
  const targetK = Math.round(baseK * kFactor * 10) / 10;

  // Commercial Prescriptions calculations
  let primaryWeight = 0; // DAP or SSP
  let ureaWeight = 0;
  let mopWeight = 0;

  if (fertilizerSource === 'dap') {
    // DAP: 18% N, 46% P2O5
    primaryWeight = Math.round((targetP / 0.46) * 10) / 10;
    const nFromDap = primaryWeight * 0.18;
    // Urea: 46% N
    ureaWeight = Math.round((Math.max(0, targetN - nFromDap) / 0.46) * 10) / 10;
  } else {
    // SSP: 16% P2O5
    primaryWeight = Math.round((targetP / 0.16) * 10) / 10;
    // Urea: 46% N
    ureaWeight = Math.round((targetN / 0.46) * 10) / 10;
  }

  // MOP: 60% K2O
  mopWeight = Math.round((targetK / 0.6) * 10) / 10;

  // Bag sizes: Urea = 45kg, DAP/SSP/MOP = 50kg
  const primaryBags = Math.round((primaryWeight / 50) * 10) / 10;
  const ureaBags = Math.round((ureaWeight / 45) * 10) / 10;
  const mopBags = Math.round((mopWeight / 50) * 10) / 10;

  return {
    pHVal,
    pHRating,
    pHAmendingTipEn,
    pHAmendingTipHi,
    ocVal,
    ocRating,
    ocTipEn,
    ocTipHi,
    nRating,
    pRating,
    kRating,
    nFactor,
    pFactor,
    kFactor,
    baseN,
    baseP,
    baseK,
    targetN,
    targetP,
    targetK,
    fertilizerSource,
    primaryWeight,
    ureaWeight,
    mopWeight,
    primaryBags,
    ureaBags,
    mopBags
  };
}
