/**
 * PM-Kisan & Government Agricultural Subsidy Finder Service
 * Krishik Mitra App
 *
 * Features dynamic season calculation, live Groq AI scheme fetcher,
 * benefit math, search filter, and RSS news with offline fallback.
 */

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL_CHAIN = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
];

export type SchemeCategory = 'dbt' | 'insurance' | 'machinery' | 'irrigation' | 'solar' | 'loan';

export type SchemeState =
  | 'All'
  | 'Bihar'
  | 'Uttar Pradesh'
  | 'Madhya Pradesh'
  | 'Maharashtra'
  | 'Rajasthan'
  | 'Gujarat'
  | 'Punjab'
  | string;

export interface GovScheme {
  id: string;
  nameHi: string;
  nameEn: string;
  category: SchemeCategory;
  state: SchemeState;
  subsidyPercentage: number;
  maxBenefitAmount: string;
  maxLandAcres: number;
  descriptionHi: string;
  descriptionEn: string;
  eligibilityHi: string;
  eligibilityEn: string;
  documentsHi: string[];
  documentsEn: string[];
  stepsHi: string[];
  stepsEn: string[];
  officialUrl: string;
  helplinePhone: string;
  activeDeadline?: string;
  seasonTag?: string;
}

export interface BenefitCalculation {
  totalEstimatedSavings: number;
  eligibleSchemesCount: number;
  formattedSavingsHi: string;
  formattedSavingsEn: string;
  currentSeasonHi: string;
  currentSeasonEn: string;
  fiscalYear: string;
  breakDown: Array<{
    schemeId: string;
    schemeNameHi: string;
    schemeNameEn: string;
    estimatedAmount: number;
    noteHi: string;
    noteEn: string;
  }>;
}

export interface SchemeNewsItem {
  id: string;
  titleHi: string;
  titleEn: string;
  date: string;
  source: string;
  summaryHi: string;
  summaryEn: string;
  url: string;
}

/**
 * Dynamically calculate current agricultural season and fiscal year based on real time.
 */
export function getCurrentSeasonInfo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1 to 12

  let seasonHi = '';
  let seasonEn = '';
  let activeInstallmentNo = 19;

  // Agricultural season calculation
  if (month >= 6 && month <= 10) {
    seasonHi = `खरीफ सीजन ${year}`;
    seasonEn = `Kharif Season ${year}`;
  } else if (month >= 11 || month <= 3) {
    const nextYr = (year + 1) % 100;
    seasonHi = `रबी सीजन ${year}-${nextYr}`;
    seasonEn = `Rabi Season ${year}-${nextYr}`;
  } else {
    seasonHi = `जायद/ग्रीष्मकालीन सीजन ${year}`;
    seasonEn = `Zaid/Summer Season ${year}`;
  }

  // Fiscal year (e.g. 2026-27 if month >= 4)
  const fyStart = month >= 4 ? year : year - 1;
  const fyEnd = (fyStart + 1) % 100;
  const fiscalYear = `${fyStart}-${fyEnd < 10 ? '0' + fyEnd : fyEnd}`;

  // Estimate active PM-Kisan installment number dynamically (started in 2019, 3 installments/yr)
  const baseYear = 2019;
  const elapsedYears = year - baseYear;
  const monthInstallmentOffset = Math.floor(month / 4);
  activeInstallmentNo = Math.max(18, elapsedYears * 3 + monthInstallmentOffset + 1);

  // Dynamic next application deadline (e.g. end of current month)
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  const monthNameEn = now.toLocaleString('en-US', { month: 'short' });
  const deadlineDateStr = `${lastDayOfMonth} ${monthNameEn} ${year}`;

  return {
    seasonHi,
    seasonEn,
    fiscalYear,
    activeInstallmentNo,
    currentYear: year,
    deadlineDateStr,
  };
}

/**
 * Comprehensive static base database with dynamic season/year parameterization.
 */
export function getBaseSchemesDatabase(): GovScheme[] {
  const season = getCurrentSeasonInfo();

  return [
    {
      id: 'pm-kisan',
      nameHi: `पीएम-किसान सम्मान निधि योजना (${season.activeInstallmentNo}वीं किश्त)`,
      nameEn: `PM-KISAN Samman Nidhi (${season.activeInstallmentNo}th Installment)`,
      category: 'dbt',
      state: 'All',
      subsidyPercentage: 100,
      maxBenefitAmount: '₹6,000 / वर्ष',
      maxLandAcres: 99,
      descriptionHi: `छोटे और सीमांत किसानों को सीधी आय सहायता प्रदान करने के लिए केंद्र सरकार की प्रमुख योजना (वित्त वर्ष ${season.fiscalYear})। प्रति वर्ष ₹6,000 की राशि तीन समान किश्तों (₹2,000 प्रत्येक) में सीधे बैंक खाते में ट्रांसफर की जाती है।`,
      descriptionEn: `Central government flagship scheme providing direct income support of ₹6,000 per year (FY ${season.fiscalYear}) to landholding farmer families in 3 equal installments of ₹2,000 directly into bank accounts.`,
      eligibilityHi:
        'भारत के सभी भूमिधारक किसान परिवार जिनके नाम पर वैध कृषि भूमि पंजीकृत है (आयकरदाताओं व संस्थागत पदधारकों को छोड़कर)।',
      eligibilityEn:
        'All landholding farmer families in India with registered agricultural land in their name (excluding income taxpayers and high-ranking institutional position holders).',
      documentsHi: [
        'आधार कार्ड (Aadhaar Card)',
        'भू-अभिलेख / खतौनी (Land Record LPC/Khatauni)',
        'बैंक खाता पासबुक (Bank Passbook)',
        'आधार से लिंक मोबाइल नंबर (Aadhaar-linked Mobile)',
      ],
      documentsEn: [
        'Aadhaar Card',
        'Land Record / Khasra-Khatauni',
        'Bank Account Passbook',
        'Aadhaar-linked Mobile Number',
      ],
      stepsHi: [
        '1. pmkisan.gov.in पोर्टल पर जाएं और "New Farmer Registration" विकल्प चुनें।',
        '2. अपना आधार नंबर, राज्य और मोबाइल नंबर दर्ज कर OTP से सत्यापित करें।',
        '3. अपने गांव, खसरा-खतौनी संख्या और बैंक पासबुक विवरण भरें।',
        '4. भूमि स्वामित्व दस्तावेज अपलोड करें और आवेदन सबमिट करें।',
      ],
      stepsEn: [
        '1. Go to pmkisan.gov.in and click "New Farmer Registration".',
        '2. Enter your Aadhaar number, State, and mobile number to verify via OTP.',
        '3. Fill details of land ownership (Khasra/Khatauni) and bank account.',
        '4. Upload PDF copy of land LPC/Khatauni and submit application.',
      ],
      officialUrl: 'https://pmkisan.gov.in',
      helplinePhone: '155261',
      activeDeadline: season.deadlineDateStr,
      seasonTag: season.seasonEn,
    },
    {
      id: 'pmfby',
      nameHi: `प्रधानमंत्री फसल बीमा योजना (${season.seasonHi})`,
      nameEn: `PM Fasal Bima Yojana (${season.seasonEn})`,
      category: 'insurance',
      state: 'All',
      subsidyPercentage: 90,
      maxBenefitAmount: '₹1.5 लाख / हेक्टेयर तक',
      maxLandAcres: 20,
      descriptionHi: `प्राकृतिक आपदाओं (सूखा, बाढ़, ओलावृष्टि) और कीट/बीमारियों से फसल नुकसान पर 90% तक सरकारी सुरक्षा। ${season.seasonHi} के लिए किसानों का प्रीमियम केवल 1.5% - 2% है।`,
      descriptionEn: `Comprehensive crop insurance for ${season.seasonEn} against natural calamities, unseasonal rainfall, drought, and pest attacks with up to 90% premium subsidized by Govt. Farmers pay only 1.5%-2% premium.`,
      eligibilityHi:
        'अधिसूचित क्षेत्रों में खरीफ, रबी या बागवानी फसलें उगाने वाले सभी ऋणी एवं गैर-ऋणी किसान।',
      eligibilityEn:
        'All loanee and non-loanee farmers growing notified Kharif, Rabi, or commercial crops in notified areas.',
      documentsHi: [
        'आधार कार्ड',
        'बुआई प्रमाण पत्र (Patwari/Panchayat Sowing Certificate)',
        'भूमि स्वामित्व प्रमाण पत्र / LPC',
        'बैंक खाता पासबुक',
      ],
      documentsEn: [
        'Aadhaar Card',
        'Sowing Certificate from Patwari or Panchayat',
        'Land Ownership LPC / Jamabandi',
        'Bank Account Passbook',
      ],
      stepsHi: [
        '1. pmfby.gov.in पोर्टल या CSC केंद्र पर "Farmer Corner" चुनें।',
        '2. अपना राज्य, मौसम (रबी/खरीफ), और फसल का चयन कर प्रीमियम कैलकुलेटर देखें।',
        '3. बुआई प्रमाण पत्र और जमीन की खतौनी अपलोड करें।',
        '4. नाममात्र प्रीमियम का ऑनलाइन भुगतान कर पावती रसीद डाउनलोड करें।',
      ],
      stepsEn: [
        '1. Visit pmfby.gov.in or Common Service Center (CSC) and select "Farmer Corner".',
        '2. Choose state, crop, season, and view calculated premium.',
        '3. Upload Patwari sowing certificate and land records.',
        '4. Pay nominal premium online and download insurance receipt.',
      ],
      officialUrl: 'https://pmfby.gov.in',
      helplinePhone: '14447',
      activeDeadline: season.deadlineDateStr,
      seasonTag: season.seasonEn,
    },
    {
      id: 'pm-kusum',
      nameHi: `पीएम-कुसुम सोलर पंप योजना (${season.currentYear})`,
      nameEn: `PM-KUSUM Solar Pump Scheme (${season.currentYear})`,
      category: 'solar',
      state: 'All',
      subsidyPercentage: 75,
      maxBenefitAmount: '₹2.50 लाख तक सब्सिडी',
      maxLandAcres: 10,
      descriptionHi:
        'सिंचाई के लिए off-grid सोलर पंप (3 HP से 10 HP) लगाने पर 60% से 75% तक की केंद्र व राज्य सरकार सब्सिडी। डीजल खर्च की पूरी बचत और 25 साल तक मुफ्त सौर ऊर्जा।',
      descriptionEn:
        'Solar pump subsidy of 60% to 75% for installing 3 HP to 10 HP solar irrigation pumps. Completely eliminates diesel cost with 25 years of free solar energy for crops.',
      eligibilityHi:
        'कृषि योग्य भूमि रखने वाले किसान, किसान समूह, या पंचायतें जहाँ सिंचाई हेतु बिजली कनेक्शन उपलब्ध नहीं है।',
      eligibilityEn:
        'Farmers, farmer groups, or cooperatives with agricultural land needing off-grid solar irrigation.',
      documentsHi: [
        'आधार कार्ड',
        'भूमि खतौनी / LPC',
        'बैंक खाता विवरण',
        'पासपोर्ट साइज फोटो',
      ],
      documentsEn: [
        'Aadhaar Card',
        'Land LPC / Khasra Record',
        'Bank Account Passbook',
        'Passport Size Photo',
      ],
      stepsHi: [
        '1. राज्य ऊर्जा विकास एजेंसी या pmkusum.mnre.gov.in पोर्टल पर जाएं।',
        '2. "सोलर पंप आवेदन" चुनें और पंप की क्षमता (3HP / 5HP / 7.5HP / 10HP) दर्ज करें।',
        '3. जमीन के कागजात और आधार अपलोड करें।',
        '4. 10% किसान अंशदान का ऑनलाइन चालान जमा करें।',
      ],
      stepsEn: [
        '1. Visit pmkusum.mnre.gov.in or state renewable energy portal.',
        '2. Choose "Solar Pump Application" and select required HP capacity.',
        '3. Upload land records and Aadhaar.',
        '4. Pay 10% farmer share online to generate booking receipt.',
      ],
      officialUrl: 'https://pmkusum.mnre.gov.in',
      helplinePhone: '18001803333',
      activeDeadline: season.deadlineDateStr,
    },
    {
      id: 'pmksy-drip',
      nameHi: `प्रधानमंत्री कृषि सिंचाई योजना (ड्रिप व स्प्रिंकलर 80% सब्सिडी)`,
      nameEn: `PMKSY Subsidized Micro Irrigation (Drip & Sprinkler)`,
      category: 'irrigation',
      state: 'All',
      subsidyPercentage: 80,
      maxBenefitAmount: '₹80,000 / हेक्टेयर तक',
      maxLandAcres: 12.5,
      descriptionHi:
        'ड्रिप (टपक) और स्प्रिंकलर (फव्वारा) सिंचाई प्रणाली पर 70% से 80% तक सब्सिडी। जल संरक्षण के साथ 40-50% उर्वरक बचत एवं 30% तक उपज वृद्धि।',
      descriptionEn:
        '70% to 80% subsidy on Drip and Sprinkler micro-irrigation systems under Per Drop More Crop (PMKSY), saving up to 50% water & fertilizer.',
      eligibilityHi:
        'सभी किसान जिनके पास कृषि भूमि और जल स्रोत (बोरवेल/तालाब/कुआं) उपलब्ध है।',
      eligibilityEn:
        'All farmers having agricultural land with functional water source (borewell/pond/well).',
      documentsHi: [
        'आधार कार्ड',
        'भू-स्वामित्व प्रमाण पत्र (LPC/Khatauni)',
        'जल स्रोत उपलब्धता प्रमाण पत्र',
        'बैंक पासबुक',
      ],
      documentsEn: [
        'Aadhaar Card',
        'Land Record LPC / Khatauni',
        'Water Source Availability Proof',
        'Bank Account Passbook',
      ],
      stepsHi: [
        '1. राज्य उद्यानिकी / कृषि विभाग पोर्टल पर ऑनलाइन आवेदन करें।',
        '2. अधिकृत ड्रिप कंपनी और फसल (फल, सब्जी, गन्ना, आदि) का चयन करें।',
        '3. सहायक कृषि अधिकारी द्वारा खेत का सत्यापन होगा।',
        '4. ड्रिप स्थापना के बाद अनुदान राशि सीधे बैंक खाते में ट्रांसफर की जाएगी।',
      ],
      stepsEn: [
        '1. Register online on state horticulture / PMKSY portal.',
        '2. Select approved micro-irrigation vendor and crop type.',
        '3. On-field verification by Horticulture Officer.',
        '4. Direct benefit transfer credited to bank after installation.',
      ],
      officialUrl: 'https://pmksy.gov.in',
      helplinePhone: '18001801551',
    },
    {
      id: 'smam-machinery',
      nameHi: `कृषि यांत्रीकरण योजना (SMAM - ट्रैक्टर व हार्वेस्टर 50% अनुदान)`,
      nameEn: `SMAM Agricultural Mechanization (Tractor & Harvester Subsidy)`,
      category: 'machinery',
      state: 'All',
      subsidyPercentage: 50,
      maxBenefitAmount: '₹1.25 लाख से ₹5.0 लाख तक',
      maxLandAcres: 25,
      descriptionHi:
        'ट्रैक्टर, पावर टिलर, रोटावेटर, रीपर, और कंबाइन हार्वेस्टर खरीदने पर 40% से 50% तक अनुदान। कस्टम हायरिंग सेंटर (CHC) स्थापित करने पर 80% तक वित्तीय सहायता।',
      descriptionEn:
        '40% to 50% subsidy on buying farm machinery (Tractors, Rotavators, Power Tillers, Reapers, Harvesters) under Sub-Mission on Agricultural Mechanization (SMAM).',
      eligibilityHi:
        'व्यक्तिगत किसान, कस्टम हायरिंग सेंटर (CHC), किसान उत्पादक संगठन (FPO) और स्वयं सहायता समूह।',
      eligibilityEn:
        'Individual farmers, Custom Hiring Centers (CHCs), Farmer Producer Organizations (FPOs), and SHGs.',
      documentsHi: [
        'आधार कार्ड',
        'भूमि खतौनी / जमाबंदी',
        'अधिकृत विक्रेता से कोटेशन (Quotation Bill)',
        'बैंक पासबुक',
      ],
      documentsEn: [
        'Aadhaar Card',
        'Land Record / Jamabandi',
        'Quotation Bill from authorized dealer',
        'Bank Passbook',
      ],
      stepsHi: [
        '1. agrimachinery.nic.in पोर्टल पर "Farmer Registration" करें।',
        '2. अपने जिले में उपलब्ध कृषि यंत्र का चयन कर डीलर का कोटेशन अपलोड करें।',
        '3. ड्रा/अनुमोदन प्रक्रिया पूर्ण होने के बाद स्वीकृति पत्र डाउनलोड करें।',
        '4. यंत्र खरीदकर भौतिक सत्यापन के बाद खाते में सब्सिडी प्राप्त करें।',
      ],
      stepsEn: [
        '1. Register on agrimachinery.nic.in.',
        '2. Select target equipment and upload dealer quotation bill.',
        '3. Download sanction letter after district lottery/approval.',
        '4. Purchase machinery and submit physical verification report for DBT.',
      ],
      officialUrl: 'https://agrimachinery.nic.in',
      helplinePhone: '18001801551',
    },
    {
      id: 'kisan-credit-card',
      nameHi: `किसान क्रेडिट कार्ड (KCC - 4% कम ब्याज ऋण योजना ${season.currentYear})`,
      nameEn: `Kisan Credit Card (KCC Low-Interest Loan ${season.currentYear})`,
      category: 'loan',
      state: 'All',
      subsidyPercentage: 3,
      maxBenefitAmount: '₹3.0 लाख लोन (4% ब्याज दर)',
      maxLandAcres: 50,
      descriptionHi:
        'फसल खेती, खाद-बीज खरीदने और पशुपालन हेतु ₹3 लाख तक का सस्ता कृषि ऋण केवल 4% वार्षिक ब्याज पर (ससमय भुगतान पर 3% ब्याज छूट)। ₹1.6 लाख तक बिना गिरवी (Collateral free)।',
      descriptionEn:
        'Agricultural credit up to ₹3 Lakhs at a subsidized 4% interest rate (3% interest subvention for prompt repayment). Collateral-free up to ₹1.6 Lakhs.',
      eligibilityHi:
        'सभी किसान, पट्टेदार, बटाईदार, पशुपालक, डेरी किसान एवं मत्स्य पालक।',
      eligibilityEn:
        'All farmers, tenant farmers, sharecroppers, dairy farmers, and fisheries owners.',
      documentsHi: [
        'आधार कार्ड एवं पैन कार्ड',
        'भूमि LPC / खतौनी प्रति',
        '2 पासपोर्ट साइज फोटो',
        'किसी अन्य बैंक में बकाया न होने का घोषणा पत्र',
      ],
      documentsEn: [
        'Aadhaar Card & PAN Card',
        'Land Record LPC / Khatauni Copy',
        '2 Passport Size Photographs',
        'Self-declaration of no default with other banks',
      ],
      stepsHi: [
        '1. अपने निकटतम राष्ट्रीयकृत या ग्रामीण बैंक शाखा में जाएं या pmkisan.gov.in से KCC फॉर्म डाउनलोड करें।',
        '2. फॉर्म में अपनी भूमि का रकबा और प्रस्तावित फसलों का विवरण भरें।',
        '3. आधार, फोटो और खतौनी लगाकर बैंक में जमा करें।',
        '4. बैंक 14 दिनों के भीतर सीमा स्वीकृत कर KCC कार्ड जारी करता है।',
      ],
      stepsEn: [
        '1. Visit nearest nationalized/rural bank or download single-page KCC form from PM-Kisan portal.',
        '2. Fill land acreage and crop details.',
        '3. Attach Aadhaar, photo, and Khatauni land copy and submit.',
        '4. Bank processes application and issues KCC card within 14 working days.',
      ],
      officialUrl: 'https://pmkisan.gov.in/KCC.aspx',
      helplinePhone: '1800115526',
    },
    {
      id: 'bihar-diesel-yantra',
      nameHi: `बिहार कृषि डीजल अनुदान एवं कृषि यंत्र योजना`,
      nameEn: `Bihar Krishi Diesel Subsidy & Yantra Yojana`,
      category: 'dbt',
      state: 'Bihar',
      subsidyPercentage: 75,
      maxBenefitAmount: '₹750 / एकड़ डीजल + 80% यंत्र सब्सिडी',
      maxLandAcres: 8,
      descriptionHi:
        'बिहार सरकार द्वारा सिंचाई हेतु ₹75/लीटर (₹750/एकड़/सिंचाई) डीजल अनुदान एवं कृषि यंत्रों पर 80% तक की भारी सब्सिडी (dbtagriculture.bihar.gov.in)।',
      descriptionEn:
        'Bihar State Govt subsidy offering ₹75/litre (up to ₹750/acre per irrigation cycle) diesel subsidy and up to 80% subsidy on farm implements.',
      eligibilityHi:
        'बिहार राज्य के पंजीकृत किसान (स्वयं की भूमि रखने वाले तथा वास्तविक खेतिहर/बटाईदार किसान)।',
      eligibilityEn:
        'Registered farmers of Bihar state (both land owning farmers and verified tenant farmers).',
      documentsHi: [
        'बिहार DBT किसान पंजीकरण संख्या (13 अंक)',
        'पेट्रोल पंप की डिजिटल डीजल रसीद',
        'भूमि खतौनी / LPC या स्व-घोषणा पत्र',
        'बैंक पासबुक',
      ],
      documentsEn: [
        '13-digit Bihar DBT Registration Number',
        'Digital Diesel Purchase Receipt from Petrol Pump',
        'Land Record LPC / Self Declaration',
        'Bank Account Passbook',
      ],
      stepsHi: [
        '1. dbtagriculture.bihar.gov.in पर जाएं और "डीजल अनुदान" या "कृषि यंत्र" चुनें।',
        '2. अपनी 13 अंकों की किसान पंजीकरण संख्या दर्ज करें।',
        '3. पेट्रोल पंप की रसीद संख्या, तारीख और सिंचित रकबा दर्ज करें।',
        '4. सत्यापन के बाद सब्सिडी राशि सीधे खाते में भेजी जाएगी।',
      ],
      stepsEn: [
        '1. Visit dbtagriculture.bihar.gov.in and select "Diesel Subsidy" or "Farm Implements".',
        '2. Enter 13-digit Farmer Registration ID.',
        '3. Enter diesel bill receipt details, pump name, and irrigated land area.',
        '4. Money is credited directly via DBT after online verification.',
      ],
      officialUrl: 'https://dbtagriculture.bihar.gov.in',
      helplinePhone: '18001806555',
    },
    {
      id: 'up-solar-tubewell',
      nameHi: `यूपी किसान सहायता एवं सोलर ट्यूबवेल योजना`,
      nameEn: `UP Kisan Sahayata & Solar Tubewell Scheme`,
      category: 'solar',
      state: 'Uttar Pradesh',
      subsidyPercentage: 70,
      maxBenefitAmount: '₹1.75 लाख सब्सिडी तक',
      maxLandAcres: 10,
      descriptionHi:
        'उत्तर प्रदेश सरकार द्वारा निजी ट्यूबवेल को सोलर पंप में बदलने के लिए 60%-70% अनुदान एवं निशुल्क कृषि बिजली।',
      descriptionEn:
        'Uttar Pradesh state government scheme providing 60%-70% subsidy to convert private electric/diesel tube wells to solar pumps along with power concessions.',
      eligibilityHi:
        'उत्तर प्रदेश के स्थायी निवासी किसान जिनके पास निजी ट्यूबवेल या बोरवेल उपलब्ध है।',
      eligibilityEn:
        'Resident farmers of Uttar Pradesh possessing private tube well or borewell facilities.',
      documentsHi: [
        'उत्तर प्रदेश निवास प्रमाण पत्र',
        'आधार कार्ड',
        'खसरा-खतौनी नकल',
        'ट्यूबवेल बिजली कनेक्शन रसीद / बोरवेल फोटो',
      ],
      documentsEn: [
        'UP Domicile Certificate',
        'Aadhaar Card',
        'Khasra-Khatauni Land Record',
        'Tubewell Electricity Bill / Borewell Photo',
      ],
      stepsHi: [
        '1. upagriculture.com (पारदर्शी किसान सेवा योजना) पोर्टल पर जाएं।',
        '2. "सोलर ट्यूबवेल बुकिंग" विकल्प पर क्लिक कर अपना पंजीकरण विवरण दर्ज करें।',
        '3. टोकन मनी का ऑनलाइन भुगतान करें।',
        '4. कृषि अधिकारी के सत्यापन के उपरांत सोलर सेटअप स्थापित होगा।',
      ],
      stepsEn: [
        '1. Visit upagriculture.com (Transparent Farmer Service Scheme portal).',
        '2. Select "Solar Tubewell Booking" and enter registration details.',
        '3. Pay token money online.',
        '4. Vendor installs solar system post verification by agriculture officer.',
      ],
      officialUrl: 'http://upagriculture.com',
      helplinePhone: '18001800151',
    },
    {
      id: 'mp-bhavantar-kalyan',
      nameHi: `एमपी भावांतर भुगतान एवं किसान कल्याण योजना`,
      nameEn: `MP Bhavantar Bhugtan & Kisan Kalyan Yojana`,
      category: 'dbt',
      state: 'Madhya Pradesh',
      subsidyPercentage: 100,
      maxBenefitAmount: '₹4,000 / वर्ष अतिरिक्त + भावांतर अंतर',
      maxLandAcres: 15,
      descriptionHi:
        'मध्य प्रदेश सरकार द्वारा PM-Kisan के ₹6,000 के अलावा ₹4,000 प्रति वर्ष अतिरिक्त (कुल ₹10,000) तथा मंडी में MSP से कम दाम मिलने पर अंतर राशि की भावांतर भरपाई।',
      descriptionEn:
        'MP Chief Minister Kisan Kalyan Yojana offering ₹4,000/year extra over PM-Kisan (total ₹10,000/yr), plus direct price deficit payouts under Bhavantar Bhugtan Scheme.',
      eligibilityHi:
        'मध्य प्रदेश के किसान जो ई-उपार्जन पोर्टल (SAARA Portal) पर पंजीकृत हैं।',
      eligibilityEn:
        'Farmers of Madhya Pradesh registered on e-Uparjan or SAARA portal.',
      documentsHi: [
        'समग्र आईडी (Samagra ID)',
        'आधार कार्ड',
        'ऋण पुस्तिका / खतौनी',
        'समग्र से लिंक बैंक खाता',
      ],
      documentsEn: [
        'Samagra ID',
        'Aadhaar Card',
        'Rin Pustika / Land Khatauni',
        'Bank Account linked with Samagra ID',
      ],
      stepsHi: [
        '1. saara.mp.gov.in या MP e-Uparjan पोर्टल पर पंजीयन कराएं।',
        '2. समग्र आईडी और आधार नंबर दर्ज कर विवरण लिंक करें।',
        '3. बोई गई फसल और खसरा नंबर प्रविष्ट करें।',
        '4. किश्तें एवं भावांतर राशि सीधे बैंक खाते में प्राप्त करें।',
      ],
      stepsEn: [
        '1. Register on saara.mp.gov.in or MP e-Uparjan portal.',
        '2. Enter Samagra ID and Aadhaar to link accounts.',
        '3. Declare sown crops and Khasra details.',
        '4. Direct benefit transfer credited to linked bank account.',
      ],
      officialUrl: 'https://saara.mp.gov.in',
      helplinePhone: '181',
    },
    {
      id: 'maha-namo-shetkari',
      nameHi: `महाराष्ट्र नमो शेतकरी महासन्मान निधि योजना`,
      nameEn: `Maharashtra Namo Shetkari Mahasanman Nidhi`,
      category: 'dbt',
      state: 'Maharashtra',
      subsidyPercentage: 100,
      maxBenefitAmount: '₹6,000 / वर्ष अतिरिक्त (कुल ₹12,000/वर्ष)',
      maxLandAcres: 5,
      descriptionHi:
        'महाराष्ट्र सरकार की नमो शेतकरी योजना जिसके तहत PM-Kisan लाभार्थियों को राज्य सरकार से अतिरिक्त ₹6,000/वर्ष (कुल ₹12,000 सालाना) सीधे बैंक खाते में प्रदान किए जाते हैं।',
      descriptionEn:
        'Maharashtra state scheme providing an additional ₹6,000/year to all PM-Kisan beneficiaries in Maharashtra, making the total annual financial support ₹12,000/year.',
      eligibilityHi:
        'महाराष्ट्र के सभी पीएम-किसान पंजीकृत किसान जिनका आधार-बैंक डीबीटी सक्रिय है।',
      eligibilityEn:
        'All PM-Kisan registered farmers in Maharashtra state with active Aadhaar-bank DBT status.',
      documentsHi: [
        'पीएम-किसान पंजीकरण संख्या / आधार',
        '7/12 व 8-अ उतारा (7/12 Extract)',
        'बैंक पासबुक की प्रति',
      ],
      documentsEn: [
        'PM-Kisan Registration No. / Aadhaar',
        '7/12 & 8-A Land Extract',
        'Bank Account Passbook Copy',
      ],
      stepsHi: [
        '1. nsmny.mahadait.maharashtra.gov.in या MahaDBT पोर्टल पर जाएं।',
        '2. अपना पीएम किसान आईडी या आधार नंबर प्रविष्ट करें।',
        '3. अपने 7/12 उतारा विवरण का मिलान करें।',
        '4. स्वीकृति मिलने के बाद राज्य की ₹2,000 की तीन किश्तें डीबीटी द्वारा प्राप्त करें।',
      ],
      stepsEn: [
        '1. Visit nsmny.mahadait.maharashtra.gov.in portal.',
        '2. Enter PM-Kisan registration ID or Aadhaar number.',
        '3. Verify 7/12 land extract link.',
        '4. Receive 3 equal state installments of ₹2,000 directly via DBT.',
      ],
      officialUrl: 'https://nsmny.mahadait.maharashtra.gov.in',
      helplinePhone: '022-22025357',
    },
    {
      id: 'raj-tarbandi-solar',
      nameHi: `राजस्थान किसान तारबंदी एवं सोलर पंप सब्सिडी`,
      nameEn: `Rajasthan Kisan Tarbandi & Solar Pump Subsidy`,
      category: 'machinery',
      state: 'Rajasthan',
      subsidyPercentage: 60,
      maxBenefitAmount: '₹48,000 तारबंदी + 60% सोलर',
      maxLandAcres: 10,
      descriptionHi:
        'खेतों को आवारा पशुओं व नीलगाय से बचाने हेतु 400 मीटर तारबंदी पर ₹48,000 तक (50-60%) सब्सिडी एवं सोलर पंप पर 60% तक राज्य सब्सिडी (RajKisan Sathi Portal)।',
      descriptionEn:
        'Rajasthan state scheme offering up to ₹48,000 (50-60%) subsidy for 400 meters of farm wire fencing (Tarbandi) to protect crops from wild animals, plus 60% solar pump subsidy.',
      eligibilityHi:
        'राजस्थान के किसान जिनके पास न्यूनतम 0.5 से 1.5 हेक्टेयर कृषि भूमि एक स्थान पर उपलब्ध है।',
      eligibilityEn:
        'Farmers of Rajasthan holding at least 0.5 to 1.5 hectares of land in a single block.',
      documentsHi: [
        'जन आधार कार्ड (Jan Aadhaar)',
        'आधार कार्ड',
        'जमाबंदी की नकल (6 महीने से पुरानी न हो)',
        'पासपोर्ट आकार फोटो',
      ],
      documentsEn: [
        'Jan Aadhaar Card',
        'Aadhaar Card',
        'Jamabandi Copy (less than 6 months old)',
        'Passport Size Photo',
      ],
      stepsHi: [
        '1. RajKisan Sathi Portal (rajkisan.rajasthan.gov.in) पर जाएं।',
        '2. अपने जन आधार आईडी से लॉगिन करें।',
        '3. "किसान तारबंदी योजना" आवेदन चुनें और जमीन का नक्शा/जमाबंदी अपलोड करें।',
        '4. स्वीकृति पत्र मिलने पर तारबंदी कार्य पूर्ण करें एवं भौतिक सत्यापन के बाद सब्सिडी पाएं।',
      ],
      stepsEn: [
        '1. Visit RajKisan Sathi Portal (rajkisan.rajasthan.gov.in).',
        '2. Log in using Jan Aadhaar ID.',
        '3. Select "Farmer Tarbandi Scheme" and upload Jamabandi copy.',
        '4. Erect fencing after receiving sanction order; subsidy credited after field check.',
      ],
      officialUrl: 'https://rajkisan.rajasthan.gov.in',
      helplinePhone: '18001801551',
    },
    {
      id: 'gujarat-kisan-sahay',
      nameHi: `गुजरात मुख्यमंत्री किसान सहाय योजना`,
      nameEn: `Gujarat Kisan Sahay Yojana`,
      category: 'insurance',
      state: 'Gujarat',
      subsidyPercentage: 100,
      maxBenefitAmount: '₹20,000 से ₹25,000 / हेक्टेयर',
      maxLandAcres: 10,
      descriptionHi:
        'गुजरात सरकार की शून्य-प्रीमियम आपदा सहायता योजना। बेमौसम बारिश, सूखा या बाढ़ से 33% से अधिक फसल क्षति होने पर किसानों को सीधे ₹25,000/हेक्टेयर तक राहत राशि।',
      descriptionEn:
        'Zero-premium state disaster relief scheme by Gujarat Govt offering up to ₹25,000/hectare direct assistance for crop loss exceeding 33% due to drought or floods.',
      eligibilityHi:
        'गुजरात राज्य के सभी पंजीकृत 8-अ खाताधारक किसान (बिना किसी प्रीमियम भुगतान के)।',
      eligibilityEn:
        'All registered 8-A landholder farmers in Gujarat state (no premium required).',
      documentsHi: [
        'आधार कार्ड',
        '8-अ एवं 7/12 उतारा (8-A & 7/12 Extract)',
        'बैंक पासबुक',
        'मोबाइल नंबर',
      ],
      documentsEn: [
        'Aadhaar Card',
        '8-A and 7/12 Land Extract',
        'Bank Account Passbook',
        'Mobile Number',
      ],
      stepsHi: [
        '1. ikhedut.gujarat.gov.in पोर्टल पर आवेदन करें।',
        '2. अपना 8-अ खाता नंबर और आधार प्रविष्ट करें।',
        '3. प्रभावित फसल एवं क्षतिग्रस्त क्षेत्रफल दर्ज करें।',
        '4. जिला सर्वे टीम की रिपोर्ट के बाद सीधे बैंक खाते में भुगतान प्राप्त करें।',
      ],
      stepsEn: [
        '1. Visit ikhedut.gujarat.gov.in portal.',
        '2. Enter 8-A account number and Aadhaar.',
        '3. Submit crop loss details and acreage.',
        '4. Receive direct benefit transfer following district survey team validation.',
      ],
      officialUrl: 'https://ikhedut.gujarat.gov.in',
      helplinePhone: '18001801551',
    },
    {
      id: 'punjab-crm-machinery',
      nameHi: `पंजाब फसल अवशेष प्रबंधन (CRM पराली मशीनरी 80% सब्सिडी)`,
      nameEn: `Punjab Crop Residue Management (CRM Stubble Machinery)`,
      category: 'machinery',
      state: 'Punjab',
      subsidyPercentage: 80,
      maxBenefitAmount: '50% से 80% मशीनरी सब्सिडी',
      maxLandAcres: 20,
      descriptionHi:
        'पराली (धान के अवशेष) न जलाने और प्रबंधन हेतु हैप्पी सीडर, सुपर सीडर, बेलर और पैडी स्ट्रॉ चॉपर पर व्यक्तिगत किसानों को 50% तथा किसान समूहों को 80% सब्सिडी (agripunjab.gov.in)।',
      descriptionEn:
        'Punjab state scheme providing 50% subsidy to individual farmers and 80% to custom hiring centers for purchasing stubble management machinery (Super Seeder, Happy Seeder, Baler).',
      eligibilityHi:
        'पंजाब के किसान, कृषि सहकारी समितियां, ग्राम पंचायतें और कस्टम हायरिंग सेंटर।',
      eligibilityEn:
        'Punjab farmers, Agricultural Cooperative Societies, Gram Panchayats, and CHCs.',
      documentsHi: [
        'आधार कार्ड',
        'जमीन की जमाबंदी नकल',
        'ट्रैक्टर आरसी (Tractor RC Copy)',
        'बैंक पासबुक',
      ],
      documentsEn: [
        'Aadhaar Card',
        'Jamabandi Land Copy',
        'Tractor Registration Certificate (RC)',
        'Bank Passbook',
      ],
      stepsHi: [
        '1. agripunjab.gov.in पोर्टल पर ऑनलाइन पंजीकरण करें।',
        '2. वांछित CRM मशीनरी (Super Seeder / Happy Seeder) का चयन करें।',
        '3. ट्रैक्टर आरसी और जमाबंदी अपलोड करें।',
        '4. ड्रॉ में चयन के बाद पंजीकृत निर्माता से मशीन खरीदकर सब्सिडी का दावा करें।',
      ],
      stepsEn: [
        '1. Register online on agripunjab.gov.in.',
        '2. Select desired CRM machinery model.',
        '3. Upload Tractor RC copy and Jamabandi document.',
        '4. Purchase from empanelled vendor after lottery selection and receive direct subsidy.',
      ],
      officialUrl: 'https://agripunjab.gov.in',
      helplinePhone: '18001802117',
    },
  ];
}

export const GOV_SCHEMES_DATABASE: GovScheme[] = getBaseSchemesDatabase();

/**
 * Filter schemes based on state, land size in acres, category, and search query.
 */
export function filterSchemes(
  state: string = 'All',
  landAcres: number = 0,
  category: string = 'all',
  searchQuery: string = ''
): GovScheme[] {
  const db = getBaseSchemesDatabase();
  const query = searchQuery.trim().toLowerCase();

  return db.filter((scheme) => {
    // 1. State matching
    if (state && state !== 'All' && state !== 'सभी राज्य') {
      const stateMatch =
        scheme.state === 'All' ||
        scheme.state.toLowerCase() === state.toLowerCase();
      if (!stateMatch) return false;
    }

    // 2. Category matching
    if (category && category !== 'all' && category !== 'सभी') {
      if (scheme.category !== category) return false;
    }

    // 3. Search query matching
    if (query.length > 0) {
      const matchNameEn = scheme.nameEn.toLowerCase().includes(query);
      const matchNameHi = scheme.nameHi.toLowerCase().includes(query);
      const matchDescEn = scheme.descriptionEn.toLowerCase().includes(query);
      const matchDescHi = scheme.descriptionHi.toLowerCase().includes(query);
      const matchState = scheme.state.toLowerCase().includes(query);
      const matchCategory = scheme.category.toLowerCase().includes(query);

      if (
        !matchNameEn &&
        !matchNameHi &&
        !matchDescEn &&
        !matchDescHi &&
        !matchState &&
        !matchCategory
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Live Groq AI & API Scheme Fetcher.
 * Dynamically queries active deadlines and updates for the current fiscal year.
 */
export async function fetchLiveGovSchemesFromAPI(
  state: string = 'All',
  landAcres: number = 2.5,
  category: string = 'all',
  query: string = ''
): Promise<GovScheme[]> {
  const baseList = filterSchemes(state, landAcres, category, query);
  const season = getCurrentSeasonInfo();

  if (!GROQ_API_KEY) {
    return baseList;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const systemPrompt = `You are an expert Government Agricultural Scheme database engine for India in the current year ${season.currentYear} (${season.seasonEn}, FY ${season.fiscalYear}).
Provide 2-3 active government subsidy scheme updates for a farmer in state: "${state}", land: ${landAcres} acres, category: "${category}".
Format output strictly as a JSON array of objects with keys: id, nameHi, nameEn, category, state, subsidyPercentage, maxBenefitAmount, maxLandAcres, descriptionHi, descriptionEn, eligibilityHi, eligibilityEn, documentsHi, documentsEn, stepsHi, stepsEn, officialUrl, helplinePhone, activeDeadline.`;

    for (const modelName of GROQ_MODEL_CHAIN) {
      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Fetch active schemes for ${state}, ${landAcres} acres land.` },
            ],
            temperature: 0.2,
            max_tokens: 1200,
          }),
        });

        if (response.ok) {
          clearTimeout(timeoutId);
          const data = await response.json();
          let content = data.choices?.[0]?.message?.content || '';
          content = content.replace(/```json/g, '').replace(/```/g, '').trim();

          const liveItems = JSON.parse(content);
          if (Array.isArray(liveItems) && liveItems.length > 0) {
            return [...liveItems, ...baseList];
          }
        }
      } catch (e) {
        // Continue to next model in fallback chain
      }
    }
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '';
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();

      const liveItems = JSON.parse(content);
      if (Array.isArray(liveItems) && liveItems.length > 0) {
        // Merge AI dynamic items with base list safely
        return [...liveItems, ...baseList];
      }
    }
  } catch (err) {
    // Graceful fallback to dynamic database on network/timeout
  }

  return baseList;
}

/**
 * Calculate total estimated yearly savings & subsidies for a farmer based on land acreage and state.
 */
export function calculateEligibleBenefits(
  landAcres: number = 2.5,
  state: string = 'All'
): BenefitCalculation {
  const acres = Math.max(0.1, Number(landAcres) || 1);
  const season = getCurrentSeasonInfo();
  const breakDown: BenefitCalculation['breakDown'] = [];
  let totalSavings = 0;

  // 1. PM-Kisan (Fixed ₹6,000/yr for landholders)
  if (acres > 0) {
    const pmKisanAmt = 6000;
    totalSavings += pmKisanAmt;
    breakDown.push({
      schemeId: 'pm-kisan',
      schemeNameHi: `पीएम-किसान (${season.activeInstallmentNo}वीं किश्त)`,
      schemeNameEn: `PM-KISAN (${season.activeInstallmentNo}th Installment)`,
      estimatedAmount: pmKisanAmt,
      noteHi: '₹2,000 की 3 किश्तें (सालाना ₹6,000)',
      noteEn: '3 installments of ₹2,000 (₹6,000 yearly)',
    });
  }

  // 2. State-specific bonus DBT
  const stateNorm = state.toLowerCase();
  if (stateNorm.includes('maharashtra')) {
    const mahaAmt = 6000;
    totalSavings += mahaAmt;
    breakDown.push({
      schemeId: 'maha-namo-shetkari',
      schemeNameHi: 'नमो शेतकरी महासन्मान निधि',
      schemeNameEn: 'Namo Shetkari Mahasanman Nidhi',
      estimatedAmount: mahaAmt,
      noteHi: 'महाराष्ट्र सरकार द्वारा ₹6,000 अतिरिक्त डीबीटी',
      noteEn: '₹6,000 extra state DBT by Maharashtra Govt',
    });
  } else if (stateNorm.includes('madhya pradesh') || stateNorm.includes('mp')) {
    const mpAmt = 4000;
    totalSavings += mpAmt;
    breakDown.push({
      schemeId: 'mp-bhavantar-kalyan',
      schemeNameHi: 'मुख्यमंत्री किसान कल्याण योजना',
      schemeNameEn: 'MP Kisan Kalyan Yojana',
      estimatedAmount: mpAmt,
      noteHi: 'मध्य प्रदेश सरकार द्वारा ₹4,000 अतिरिक्त सहायता',
      noteEn: '₹4,000 extra state support by MP Govt',
    });
  } else if (stateNorm.includes('bihar')) {
    const dieselAmt = Math.min(Math.round(acres * 750 * 2), 6000);
    totalSavings += dieselAmt;
    breakDown.push({
      schemeId: 'bihar-diesel-yantra',
      schemeNameHi: 'बिहार कृषि डीजल अनुदान',
      schemeNameEn: 'Bihar Diesel Subsidy',
      estimatedAmount: dieselAmt,
      noteHi: `अनुमानित ₹750/एकड़ सिंचाई डीजल अनुदान (${acres} एकड़)`,
      noteEn: `Est. ₹750/acre irrigation diesel subsidy (${acres} acres)`,
    });
  } else if (stateNorm.includes('rajasthan')) {
    const tarbandiAmt = 15000;
    totalSavings += tarbandiAmt;
    breakDown.push({
      schemeId: 'raj-tarbandi-solar',
      schemeNameHi: 'राजस्थान खेत तारबंदी सब्सिडी',
      schemeNameEn: 'Rajasthan Tarbandi Subsidy',
      estimatedAmount: tarbandiAmt,
      noteHi: 'खेत घेराबंदी तारबंदी पर 50-60% सरकारी अनुदान',
      noteEn: '50-60% government subsidy on farm fencing',
    });
  }

  // 3. Micro-Irrigation (Drip/Sprinkler) Subsidy
  const dripAmt = Math.min(Math.round(acres * 12000), 48000);
  totalSavings += dripAmt;
  breakDown.push({
    schemeId: 'pmksy-drip',
    schemeNameHi: 'ड्रिप व स्प्रिंकलर सिंचाई सब्सिडी (80%)',
    schemeNameEn: 'Drip & Sprinkler Irrigation Subsidy (80%)',
    estimatedAmount: dripAmt,
    noteHi: 'ड्रिप/फव्वारा प्रणाली पर 80% तक का अनुदान',
    noteEn: 'Up to 80% subsidy on drip/sprinkler setup',
  });

  // 4. PM-KUSUM Solar Pump (Amortized benefit value)
  if (acres >= 1) {
    const solarAmt = 25000;
    totalSavings += solarAmt;
    breakDown.push({
      schemeId: 'pm-kusum',
      schemeNameHi: 'पीएम-कुसुम सोलर पंप सब्सिडी (75%)',
      schemeNameEn: 'PM-KUSUM Solar Pump Subsidy (75%)',
      estimatedAmount: solarAmt,
      noteHi: 'सोलर पंप स्थापना पर 75% सरकारी छूट',
      noteEn: '75% government subsidy on solar pump setup',
    });
  }

  // 5. PMFBY Crop Insurance Coverage value
  const insuranceAmt = Math.min(Math.round(acres * 3200), 16000);
  totalSavings += insuranceAmt;
  breakDown.push({
    schemeId: 'pmfby',
    schemeNameHi: `फसल बीमा प्रीमियम अनुदान (${season.seasonHi})`,
    schemeNameEn: `Crop Insurance Premium Subsidy (${season.seasonEn})`,
    estimatedAmount: insuranceAmt,
    noteHi: 'फसल सुरक्षा पर 90% प्रीमियम सब्सिडी मूल्य',
    noteEn: '90% premium subsidy value for crop protection',
  });

  const matchingSchemes = filterSchemes(state, acres, 'all', '');

  return {
    totalEstimatedSavings: totalSavings,
    eligibleSchemesCount: matchingSchemes.length,
    formattedSavingsHi: `₹${totalSavings.toLocaleString('en-IN')}`,
    formattedSavingsEn: `₹${totalSavings.toLocaleString('en-IN')}`,
    currentSeasonHi: season.seasonHi,
    currentSeasonEn: season.seasonEn,
    fiscalYear: season.fiscalYear,
    breakDown,
  };
}

/**
 * Fetch latest government scheme news via RSS/Web fetch with dynamic timestamps.
 */
export async function fetchLatestSchemeNews(): Promise<SchemeNewsItem[]> {
  const rssUrl =
    'https://news.google.com/rss/search?q=PM+Kisan+agriculture+scheme+subsidy+india&hl=en-IN&gl=IN&ceid=IN:en';

  const season = getCurrentSeasonInfo();
  const todayStr = new Date().toISOString().split('T')[0];

  const fallbackNews: SchemeNewsItem[] = [
    {
      id: 'news-pmkisan-live',
      titleHi: `पीएम-किसान सम्मान निधि की ${season.activeInstallmentNo}वीं किश्त जारी - आधार डीबीटी स्थिति जाँचें`,
      titleEn: `PM-Kisan ${season.activeInstallmentNo}th Installment Updates: Verify Aadhaar Bank DBT Status`,
      date: todayStr,
      source: 'PIB Agriculture / PM-Kisan Portal',
      summaryHi: `वित्त वर्ष ${season.fiscalYear} हेतु ₹2,000 की अगली किश्त प्राप्त करने के लिए ई-केवाईसी और डीबीटी लिंक एक्टिव रखें।`,
      summaryEn: `Maintain active e-KYC & NPCI DBT link to receive ₹2,000 installment for FY ${season.fiscalYear}.`,
      url: 'https://pmkisan.gov.in',
    },
    {
      id: 'news-kusum-live',
      titleHi: `पीएम-कुसुम योजना: ${season.seasonHi} हेतु 75% सोलर पंप सब्सिडी पंजीयन चालू`,
      titleEn: `PM-KUSUM 2026: 75% Subsidized Solar Pump Registrations Open for ${season.seasonEn}`,
      date: todayStr,
      source: 'MNRE Agriculture',
      summaryHi: `3 HP से 10 HP ऑफ-ग्रिड सोलर पंपों हेतु 75% सरकारी अनुदान का लाभ उठाने के लिए ऑनलाइन आवेदन करें।`,
      summaryEn: `Apply online for 75% subsidy on 3 HP to 10 HP solar pumps.`,
      url: 'https://pmkusum.mnre.gov.in',
    },
    {
      id: 'news-pmksy-live',
      titleHi: `पर ड्रॉप मोर क्रॉप (PMKSY): ${season.seasonHi} में ड्रिप एवं स्प्रिंकलर पर 80% सब्सिडी`,
      titleEn: `Per Drop More Crop (PMKSY): 80% Micro-Irrigation Subsidy active for ${season.seasonEn}`,
      date: todayStr,
      source: 'Ministry of Agriculture',
      summaryHi: `जल संरक्षण एवं उपज वृद्धि हेतु 80% ड्रिप/फव्वारा सब्सिडी। स्वीकृति 15 दिनों में।`,
      summaryEn: `Up to 80% drip and sprinkler subsidy with fast-track online approvals.`,
      url: 'https://pmksy.gov.in',
    },
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/xml, text/xml, application/json, */*',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      const items: SchemeNewsItem[] = [];

      const itemRegex = /<item>[\s\S]*?<\/item>/gi;
      const matches = text.match(itemRegex);

      if (matches && matches.length > 0) {
        matches.slice(0, 5).forEach((itemXml, idx) => {
          const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
          const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
          const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

          const title = titleMatch
            ? titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
            : 'Government Agricultural Scheme Update';
          const link = linkMatch
            ? linkMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim()
            : 'https://pmkisan.gov.in';
          const rawDate = pubDateMatch ? pubDateMatch[1].trim() : '';

          let formattedDate = todayStr;
          if (rawDate) {
            try {
              formattedDate = new Date(rawDate).toISOString().split('T')[0];
            } catch (e) {
              // ignore parse error
            }
          }

          items.push({
            id: `rss-news-${idx}`,
            titleHi: title,
            titleEn: title,
            date: formattedDate,
            source: 'Agri News / PIB India',
            summaryHi: `${title} - ताजा सरकारी योजना समाचार।`,
            summaryEn: `${title} - Latest government scheme update.`,
            url: link,
          });
        });
      }

      if (items.length > 0) {
        return items;
      }
    }
  } catch (err) {
    // Network error or timeout -> fallback gracefully to dynamic curated news
  }

  return fallbackNews;
}
