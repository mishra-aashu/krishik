export const AGRONOMY_PRESETS = {
  'Wheat (गेहूं)': { seed: 40, seedUnit: 'kg', n: 50, p: 20, k: 15, waterRounds: 5, waterVolume: 150000 },
  'Paddy (धान)': { seed: 8, seedUnit: 'kg (Nursery)', n: 60, p: 24, k: 20, waterRounds: 10, waterVolume: 350000 },
  'Sugarcane (गन्ना)': { seed: 2500, seedUnit: 'kg (Setts)', n: 100, p: 50, k: 40, waterRounds: 12, waterVolume: 450000 },
  'Potato (आलू)': { seed: 1000, seedUnit: 'kg (Tubers)', n: 60, p: 40, k: 60, waterRounds: 7, waterVolume: 200000 },
  'Cotton (कपास)': { seed: 2, seedUnit: 'kg', n: 60, p: 30, k: 30, waterRounds: 5, waterVolume: 180000 },
  'Mustard (सरसों)': { seed: 2, seedUnit: 'kg', n: 32, p: 16, k: 12, waterRounds: 2, waterVolume: 70000 },
  'Maize (मक्का)': { seed: 8, seedUnit: 'kg', n: 48, p: 24, k: 16, waterRounds: 6, waterVolume: 180000 },
  'Soybean (सोयाबीन)': { seed: 30, seedUnit: 'kg', n: 10, p: 32, k: 16, waterRounds: 4, waterVolume: 120000 },
  'Onion (प्याज)': { seed: 4, seedUnit: 'kg', n: 40, p: 20, k: 40, waterRounds: 10, waterVolume: 220000 },
  'Garlic (लहसुन)': { seed: 200, seedUnit: 'kg (Cloves)', n: 40, p: 30, k: 30, waterRounds: 8, waterVolume: 200000 },
  'Tomato (टमाटर)': { seed: 0.15, seedUnit: 'kg', n: 48, p: 32, k: 32, waterRounds: 9, waterVolume: 240000 },
  'Chilli (मिर्च)': { seed: 0.2, seedUnit: 'kg', n: 40, p: 24, k: 24, waterRounds: 8, waterVolume: 200000 },
  'Ginger (अदरक)': { seed: 600, seedUnit: 'kg (Rhizomes)', n: 30, p: 20, k: 25, waterRounds: 12, waterVolume: 300000 },
  'Turmeric (हल्दी)': { seed: 800, seedUnit: 'kg (Rhizomes)', n: 48, p: 24, k: 36, waterRounds: 12, waterVolume: 320000 },
  'Groundnut (मूंगफली)': { seed: 40, seedUnit: 'kg (Pods)', n: 10, p: 20, k: 15, waterRounds: 4, waterVolume: 140000 },
  'Gram (चना)': { seed: 30, seedUnit: 'kg', n: 8, p: 16, k: 12, waterRounds: 2, waterVolume: 80000 },
  'Pea (मटर)': { seed: 35, seedUnit: 'kg', n: 10, p: 20, k: 15, waterRounds: 3, waterVolume: 100000 },
  'Pigeon Pea (अरहर)': { seed: 6, seedUnit: 'kg', n: 8, p: 16, k: 12, waterRounds: 2, waterVolume: 90000 },
  'Mung Bean (मूंग)': { seed: 8, seedUnit: 'kg', n: 8, p: 16, k: 8, waterRounds: 2, waterVolume: 80000 },
  'Black Gram (उड़द)': { seed: 8, seedUnit: 'kg', n: 8, p: 16, k: 8, waterRounds: 2, waterVolume: 80000 },
  'Lentil (मसूर)': { seed: 15, seedUnit: 'kg', n: 8, p: 16, k: 8, waterRounds: 2, waterVolume: 80000 },
  'Pearl Millet (बाजरा)': { seed: 2, seedUnit: 'kg', n: 32, p: 16, k: 12, waterRounds: 3, waterVolume: 100000 },
  'Finger Millet (रागी)': { seed: 4, seedUnit: 'kg', n: 24, p: 12, k: 12, waterRounds: 4, waterVolume: 110000 },
  'Sorghum (ज्वार)': { seed: 4, seedUnit: 'kg', n: 32, p: 16, k: 16, waterRounds: 3, waterVolume: 110000 },
  'Barley (जौ)': { seed: 35, seedUnit: 'kg', n: 24, p: 12, k: 12, waterRounds: 3, waterVolume: 110000 },
  'Sesame (तिल)': { seed: 2, seedUnit: 'kg', n: 16, p: 10, k: 10, waterRounds: 2, waterVolume: 70000 },
  'Sunflower (सूरजमुखी)': { seed: 3, seedUnit: 'kg', n: 24, p: 24, k: 12, waterRounds: 5, waterVolume: 140000 },
  'Cauliflower (फूलगोभी)': { seed: 0.25, seedUnit: 'kg', n: 48, p: 32, k: 32, waterRounds: 8, waterVolume: 220000 },
  'Cabbage (पत्तागोभी)': { seed: 0.25, seedUnit: 'kg', n: 48, p: 32, k: 32, waterRounds: 8, waterVolume: 220000 },
  'Brinjal (बैंगन)': { seed: 0.15, seedUnit: 'kg', n: 40, p: 24, k: 24, waterRounds: 8, waterVolume: 200000 },
  'Okra (भिंडी)': { seed: 4, seedUnit: 'kg', n: 32, p: 20, k: 20, waterRounds: 6, waterVolume: 150000 }
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

export function calculateStandardDosage(
  landArea: string,
  landUnit: 'acre' | 'bigha',
  crop: string
): StandardDosage | null {
  const area = parseFloat(landArea) || 0;
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
  const area = parseFloat(landArea) || 0;
  const cropPreset = AGRONOMY_PRESETS[crop as keyof typeof AGRONOMY_PRESETS];
  if (!cropPreset) return null;

  const areaMultiplier = landUnit === 'acre' ? area : area / 1.6;
  const baseN = Math.round(cropPreset.n * areaMultiplier * 10) / 10;
  const baseP = Math.round(cropPreset.p * areaMultiplier * 10) / 10;
  const baseK = Math.round(cropPreset.k * areaMultiplier * 10) / 10;

  // 1. pH Interpretation
  const pHVal = parseFloat(soilPh);
  let pHRating: 'acidic' | 'alkaline' | 'neutral' | null = null;
  let pHAmendingTipEn = 'Healthy soil pH. No chemical amendments needed.';
  let pHAmendingTipHi = 'स्वस्थ मिट्टी पीएच। किसी रासायनिक सुधारक की आवश्यकता नहीं है।';

  if (!isNaN(pHVal)) {
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

  // 2. Organic Carbon Interpretation
  const ocVal = parseFloat(soilOc);
  let ocRating: 'low' | 'medium' | 'high' | null = null;
  let ocTipEn = 'Medium Organic Carbon. Good soil health.';
  let ocTipHi = 'मध्यम जैविक कार्बन। मिट्टी का स्वास्थ्य अच्छा है।';

  if (!isNaN(ocVal)) {
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
  const nVal = parseFloat(soilN);
  let nRating: 'low' | 'medium' | 'high' | null = null;
  let nFactor = 1.0;
  if (!isNaN(nVal)) {
    if (nVal < 280) {
      nRating = 'low';
      nFactor = 1.3;
    } else if (nVal > 560) {
      nRating = 'high';
      nFactor = 0.7;
    } else {
      nRating = 'medium';
      nFactor = 1.0;
    }
  }

  const pVal = parseFloat(soilP);
  let pRating: 'low' | 'medium' | 'high' | null = null;
  let pFactor = 1.0;
  if (!isNaN(pVal)) {
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

  const kVal = parseFloat(soilK);
  let kRating: 'low' | 'medium' | 'high' | null = null;
  let kFactor = 1.0;
  if (!isNaN(kVal)) {
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
  if (isNaN(nVal) && ocRating === 'low') {
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
    pHVal: isNaN(pHVal) ? null : pHVal,
    pHRating,
    pHAmendingTipEn,
    pHAmendingTipHi,
    ocVal: isNaN(ocVal) ? null : ocVal,
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
