import { sendMessageToGroq } from './chat-service';

export interface DesiSolution {
  id: string;
  titleHi: string;
  titleEn: string;
  category: 'pest' | 'fertilizer' | 'water' | 'storage' | 'tools';
  categoryHi: string;
  categoryEn: string;
  costEstimate: string;
  prepTimeHi: string;
  prepTimeEn: string;
  ingredientsHi: string[];
  ingredientsEn: string[];
  procedureHi: string[];
  procedureEn: string[];
  usageHi: string;
  usageEn: string;
  benefitsHi: string;
  benefitsEn: string;
  iconName: string;
}

export const DESI_SOLUTIONS_DATABASE: DesiSolution[] = [
  {
    id: 'jeevamrut',
    titleHi: 'जीवामृत (प्राकृतिक सूक्ष्मजीव खाद)',
    titleEn: 'Jeevamrut (Microbial Liquid Fertilizer)',
    category: 'fertilizer',
    categoryHi: 'जैविक खाद',
    categoryEn: 'Organic Fertilizer',
    costEstimate: '₹20 - ₹50',
    prepTimeHi: '5 - 7 दिन',
    prepTimeEn: '5 - 7 Days',
    iconName: 'drop.fill',
    ingredientsHi: [
      'देशी गाय का गोबर: 10 किलोग्राम',
      'देशी गाय का गौमूत्र: 10 लीटर',
      'गुड या गन्ने का रस: 2 किलोग्राम',
      'बेसन (चना/किसी भी दाल का आटा): 2 किलोग्राम',
      'अपने खेत के मेड़ की जीवंत मिट्टी: 1 मुट्ठी',
      'पानी: 200 लीटर'
    ],
    ingredientsEn: [
      'Desi Cow Dung: 10 kg',
      'Desi Cow Urine: 10 Liters',
      'Jaggery / Sugarcane Juice: 2 kg',
      'Gram Flour (Besan): 2 kg',
      'Fertile Soil from Farm Bund: 1 Handful',
      'Water: 200 Liters'
    ],
    procedureHi: [
      'एक 200 लीटर के प्लास्टिक ड्रम में 200 लीटर स्वच्छ पानी भरें।',
      'इसमें 10 किग्रा गोबर और 10 लीटर गोमूत्र डालकर अच्छी तरह मिलाएं।',
      'अब 2 किग्रा गुड़, 2 किग्रा बेसन और 1 मुट्ठी खेत की मिट्टी डालें।',
      'लकड़ी के डंडे से गोल घुमाकर 2 से 3 मिनट सुबह-शाम चलाएं।',
      'दुकान/छायादार जगह पर जूट के बोरे से ढककर 5 से 7 दिन सड़ने दें।'
    ],
    procedureEn: [
      'Fill a 200L plastic drum with 200L of clean water.',
      'Add 10 kg cow dung and 10L cow urine; mix thoroughly using a wooden stick.',
      'Add 2 kg jaggery, 2 kg besan flour, and 1 handful of fertile soil.',
      'Stir clockwise for 2-3 minutes twice daily (morning & evening).',
      'Cover with a jute bag in shade and ferment for 5 to 7 days.'
    ],
    usageHi: '1 एकड़ खेत में सिंचाई के पानी के साथ बहाएं या 10% घोल बनाकर फसलों पर स्प्रे करें।',
    usageEn: 'Apply along with irrigation water for 1 acre land or dilute to 10% and spray on crops.',
    benefitsHi: 'मिट्टी में मित्र जीवाणुओं की संख्या करोड़ों में बढ़ती है, फसल हरी-भरी रहती है व रासायनिक यूरिया का खर्च 80% घटता है।',
    benefitsEn: 'Increases beneficial soil microbes by millions, improves soil structure, and reduces chemical NPK costs by 80%.'
  },
  {
    id: 'neemastra',
    titleHi: 'नीमास्त्र (प्राकृतिक रसचूसक कीटनाशक)',
    titleEn: 'Neemastra (Sucking Pest Botanical Organic Control)',
    category: 'pest',
    categoryHi: 'कीट नियंत्रण',
    categoryEn: 'Pest Control',
    costEstimate: '₹0 (मुफ्त)',
    prepTimeHi: '48 घंटे',
    prepTimeEn: '48 Hours',
    iconName: 'shield.fill',
    ingredientsHi: [
      'देशी गाय का गोमूत्र: 5 लीटर',
      'देशी गाय का गोबर: 1 किलोग्राम',
      'नीम की पत्तियां व टहनियां (कुचली हुई): 5 किलोग्राम',
      'पानी: 100 लीटर'
    ],
    ingredientsEn: [
      'Desi Cow Urine: 5 Liters',
      'Desi Cow Dung: 1 kg',
      'Crushed Neem Leaves & Twigs: 5 kg',
      'Water: 100 Liters'
    ],
    procedureHi: [
      'एक ड्रम में 5 लीटर गोमूत्र और 1 किग्रा गोबर मिलाएं।',
      'इसमें 5 किग्रा कुचली नीम की पत्तियां डालकर 100 लीटर पानी भरें।',
      'डंडे से मिलाकर 48 घंटे के लिए छाया में रखें।',
      'दिन में दो बार हिलाएं और 48 घंटे बाद सूती कपड़े से छान लें।'
    ],
    procedureEn: [
      'Mix 5L cow urine and 1 kg cow dung in a drum.',
      'Add 5 kg crushed neem leaves and fill with 100L clean water.',
      'Keep in shade for 48 hours and stir twice daily.',
      'Filter through a clean cotton cloth after 48 hours.'
    ],
    usageHi: 'बिना पानी मिलाए प्रति एकड़ फसल पर सफेद मक्खी, माहो, तेला व इल्ली पर सीधा छिड़काव करें।',
    usageEn: 'Spray directly on crops without dilution to control whiteflies, aphids, jassids & small caterpillars.',
    benefitsHi: 'कीटों का प्रजनन रुक जाता है और फसल जहरीले रसायनों से बचती है।',
    benefitsEn: 'Stops insect breeding naturally without toxic synthetic pesticides.'
  },
  {
    id: 'agniastra',
    titleHi: 'अग्न्यास्त्र (इल्ली व सुंडी मारक देसी काढ़ा)',
    titleEn: 'Agniastra (Caterpillar & Stem Borer Organic Decoction)',
    category: 'pest',
    categoryHi: 'कीट नियंत्रण',
    categoryEn: 'Pest Control',
    costEstimate: '₹30 - ₹60',
    prepTimeHi: '24 घंटे',
    prepTimeEn: '24 Hours',
    iconName: 'flame.fill',
    ingredientsHi: [
      'देशी गाय का गोमूत्र: 10 लीटर',
      'कुचली नीम पत्ती: 2 किलोग्राम',
      'तीखी तीखी हरी मिर्च पेस्ट: 500 ग्राम',
      'देसी लहसुन पेस्ट: 500 ग्राम',
      'तंबाकू पाउडर (या तंबाकू पत्ती): 250 ग्राम'
    ],
    ingredientsEn: [
      'Desi Cow Urine: 10 Liters',
      'Crushed Neem Leaves: 2 kg',
      'Spicy Green Chilli Paste: 500g',
      'Garlic Paste: 500g',
      'Tobacco Leaf / Powder: 250g'
    ],
    procedureHi: [
      'सभी सामग्रियों को 10 लीटर गोमूत्र में मिलाकर मिट्टी या स्टील के बर्तन में धीमी आंच पर उबालें।',
      '4 उबाल आने के बाद बर्तन को उतारकर 24 घंटे के लिए ठण्डा होने दें।',
      '24 घंटे बाद कपड़े से छानकर किसी केन में भर लें।'
    ],
    procedureEn: [
      'Combine all crushed ingredients in 10L cow urine and boil on low flame for 4 boils.',
      'Remove from heat and let cool for 24 hours.',
      'Filter with cloth and store in a container.'
    ],
    usageHi: '600 मिली अग्न्यास्त्र को 15 लीटर पानी की टंकी में मिलाकर फसलों पर छिड़कें।',
    usageEn: 'Mix 600 ml Agniastra per 15-liter spray tank and spray on borer affected crops.',
    benefitsHi: 'तना छेदक, फल छेदक व बड़ी इल्लियों का 100% सटीक देसी सफाया।',
    benefitsEn: 'Highly effective against stem borer, pod borer and large caterpillars.'
  },
  {
    id: 'bottle_drip',
    titleHi: 'प्लास्टिक बोतल ड्रिप सिंचाई (शून्य लागत तकनीक)',
    titleEn: 'Waste Plastic Bottle Drip Irrigation (Zero Cost)',
    category: 'water',
    categoryHi: 'जल संरक्षण',
    categoryEn: 'Water Saving',
    costEstimate: '₹0 (कबाड़ बोतल)',
    prepTimeHi: '10 मिनट',
    prepTimeEn: '10 Minutes',
    iconName: 'drop.circle.fill',
    ingredientsHi: [
      '2 लीटर की बेकार प्लास्टिक बोतल',
      'सूती धागा या कॉटन बड',
      'सुई या पतली कील',
      'पानी'
    ],
    ingredientsEn: [
      'Used 2-liter Plastic Bottles',
      'Cotton Thread or Earbuds',
      'Needle or Small Nail',
      'Water'
    ],
    procedureHi: [
      'बोतल के ढक्कन में सुई गर्म करके एक छोटा छेद करें।',
      'छेड़ में कॉटन का धागा या रुई ठूंसें ताकि पानी बूंद-बूंद करके टपके।',
      'बोतल का निचला पेंदा काट दें और पौधे के तने से 4 इंच दूर उलटा गाड़ दें।',
      'ऊपर से पानी भर दें।'
    ],
    procedureEn: [
      'Poke a tiny hole in the bottle cap using a warm needle.',
      'Insert a small piece of cotton thread to control the drip rate.',
      'Cut off the bottom of the bottle and insert it upside down near the plant roots.',
      'Fill with water from the open top.'
    ],
    usageHi: 'सब्जी के पौधों, टमाटर, मिर्च, पपीते व छोटे फलदार पौधों में नमी बनाए रखने हेतु सर्वोत्तम।',
    usageEn: 'Perfect for vegetable crops, tomatoes, papayas, and young fruit trees in dry weather.',
    benefitsHi: '80% पानी की बचत, खरपतवार नहीं उगते और धूप में पौधे नहीं सूखते।',
    benefitsEn: 'Saves 80% water, prevents weed growth around root zones.'
  },
  {
    id: 'yellow_sticky_trap',
    titleHi: 'देसी पीला व नीला स्टिकी ट्रैप (कीट जाल)',
    titleEn: 'DIY Yellow & Blue Sticky Pest Traps',
    category: 'tools',
    categoryHi: 'देसी उपकरण',
    categoryEn: 'Tools & Jugad',
    costEstimate: '₹10 - ₹15',
    prepTimeHi: '15 मिनट',
    prepTimeEn: '15 Minutes',
    iconName: 'square.grid.3x3.fill',
    ingredientsHi: [
      'पीले/नीले रंग का प्लास्टिक डिब्बा या शीट',
      'अरंडी का तेल (Castor Oil) या ग्रीस / ग्रीस ऑइल',
      'लकड़ी का डंडा'
    ],
    ingredientsEn: [
      'Yellow or Blue Plastic Sheet/Plate',
      'Castor Oil or Transparent Grease',
      'Wooden Stakes'
    ],
    procedureHi: [
      'पीले प्लास्टिक बोर्ड या तेल के खाली डिब्बे को साफ करें।',
      'दोनों तरफ अरंडी का तेल या गाढ़ा ट्रांसपेरेंट ग्रीस लगाएं।',
      'फसल की ऊंचाई से 1 फीट ऊपर डंडे के सहारे खेत में 10-15 जगह लगाएं।'
    ],
    procedureEn: [
      'Clean a yellow plastic sheet or container.',
      'Apply a generous layer of sticky castor oil or clear grease on both sides.',
      'Mount on wooden stakes 1 foot above crop canopy level (10-15 per acre).'
    ],
    usageHi: '1 एकड़ खेत में 15 पीले ट्रैप लगाने से रसचूसक कीट आकर्षित होकर चिपक जाते हैं।',
    usageEn: 'Place 15 traps per acre to catch flying aphids, whiteflies, and thrips.',
    benefitsHi: 'कीटनाशक दवा छिड़कने की जरूरत नहीं पड़ती, लागत शून्य के बराबर।',
    benefitsEn: 'Eliminates chemical spray needs by trapping pests before infestation.'
  },
  {
    id: 'sour_buttermilk',
    titleHi: 'खट्टा मट्ठा व तांबा घोल (फफूंदनाशक देसी स्प्रे)',
    titleEn: 'Fermented Sour Buttermilk & Copper Fungicide',
    category: 'pest',
    categoryHi: 'कीट व फफूंद',
    categoryEn: 'Pest Control',
    costEstimate: '₹10 - ₹20',
    prepTimeHi: '8 - 10 दिन',
    prepTimeEn: '8 - 10 Days',
    iconName: 'leaf.fill',
    ingredientsHi: [
      'खट्टा मट्ठा/छाछ: 5 लीटर',
      'तांबे का पुराना बर्तन या तांबे का तार: 1 टुकड़ा',
      'पानी: 100 लीटर'
    ],
    ingredientsEn: [
      'Sour Fermented Buttermilk: 5 Liters',
      'Old Copper Vessel or Copper Wire: 1 Piece',
      'Water: 100 Liters'
    ],
    procedureHi: [
      '5 लीटर ताजे मट्ठा में तांबे का टुकड़ा डालकर 10 दिन के लिए मटके में रख दें।',
      '10 दिन बाद मट्ठा हरा-नीला हो जाएगा।',
      'इसे 100 लीटर पानी में मिलाकर छान लें।'
    ],
    procedureEn: [
      'Submerge a piece of copper inside 5L sour buttermilk in an earthen pot for 10 days.',
      'The liquid will turn greenish-blue due to copper sulfate reaction.',
      'Dilute with 100 liters of water and filter.'
    ],
    usageHi: 'आलू-टमाटर का झुलसा रोग, मिर्च का चुरड़ा-मुरड़ा रोग व धान का झोंका रोग रोकने हेतु छिड़काव करें।',
    usageEn: 'Spray on potato blight, tomato leaf curl, and paddy blast disease.',
    benefitsHi: 'फफूंदनाशक रासायनिक दवाओं का खर्च खत्म, फसल में प्राकृतिक चमक व विकास।',
    benefitsEn: 'Zero-cost fungal protection while feeding natural proteins to leaves.'
  }
];

export async function askAiDesiJugad(
  userQuery: string,
  cropName: string = '',
  language: 'hi' | 'en' = 'hi'
): Promise<string> {
  const promptHi = `आप भारतीय प्राकृतिक व देसी खेती (Zero Budget Natural Farming) के विशेषज्ञ हैं।
किसान का प्रश्न: "${userQuery}" ${cropName ? `(फसल: ${cropName})` : ''}

सख्त निर्देश: उत्तर केवल 50 से 70 शब्दों में, एकदम छोटा, स्पष्ट और 3-4 बुलेट पॉइंट्स में ही दें ताकि किसान को तुरंत समझ आए। 

संरचना:
💡 **जुगाड़ नाम**: (1 पंक्ति)
🧪 **सामग्री**: (1-2 वस्तुएं)
⚙️ **तरीका**: (संक्षिप्त विधि)
🌾 **उपयोग**: (मात्रा)

भाषा: अति सरल ${language === 'hi' ? 'हिंदी' : 'अंग्रेजी'}.`;

  try {
    const dummyProfile = { state: 'All', soilType: 'All', crop: cropName || 'All' };
    const response = await sendMessageToGroq([{ role: 'user', content: promptHi }], dummyProfile, 'fast');
    return response || (language === 'hi' ? 'क्षमा करें, AI उत्तर प्राप्त नहीं हो सका। कृपया पुनः प्रयास करें।' : 'Sorry, failed to generate AI response.');
  } catch (err) {
    console.warn('AI Desi Jugad Error:', err);
    return language === 'hi'
      ? 'नेटवर्क समस्या के कारण AI उत्तर नहीं मिल सका। कृपया नीचे दिए गए देसी नुस्खे देखें।'
      : 'Network error. Please check offline remedies below.';
  }
}
