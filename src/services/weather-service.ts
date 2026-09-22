interface Coordinates {
  latitude: number;
  longitude: number;
}

export const STATE_COORDINATES: Record<string, Coordinates> = {
  // English
  'Uttar Pradesh': { latitude: 26.8467, longitude: 80.9462 },
  'Punjab': { latitude: 30.9010, longitude: 75.8573 },
  'Haryana': { latitude: 29.1492, longitude: 75.7217 },
  'Madhya Pradesh': { latitude: 23.2599, longitude: 77.4126 },
  'Maharashtra': { latitude: 19.0760, longitude: 72.8777 },
  'Rajasthan': { latitude: 26.9124, longitude: 75.7873 },
  'Gujarat': { latitude: 23.2156, longitude: 72.6369 },
  'Bihar': { latitude: 25.5941, longitude: 85.1376 },
  'Karnataka': { latitude: 12.9716, longitude: 77.5946 },
  'Andhra Pradesh': { latitude: 16.5062, longitude: 80.6480 },
  'West Bengal': { latitude: 22.5726, longitude: 88.3639 },
  'Telangana': { latitude: 17.3850, longitude: 78.4867 },
  'Tamil Nadu': { latitude: 13.0827, longitude: 80.2707 },
  'Odisha': { latitude: 20.2961, longitude: 85.8245 },
  'Kerala': { latitude: 8.5241, longitude: 76.9366 },
  'Assam': { latitude: 26.1445, longitude: 91.7362 },
  'Chhattisgarh': { latitude: 21.2514, longitude: 81.6296 },
  'Jharkhand': { latitude: 23.3441, longitude: 85.3096 },
  'Uttarakhand': { latitude: 30.3165, longitude: 78.0322 },
  'Himachal Pradesh': { latitude: 31.1048, longitude: 77.1734 },
  'Jammu and Kashmir': { latitude: 34.0837, longitude: 74.7973 },

  // Hindi
  'उत्तर प्रदेश': { latitude: 26.8467, longitude: 80.9462 },
  'पंजाब': { latitude: 30.9010, longitude: 75.8573 },
  'हरियाणा': { latitude: 29.1492, longitude: 75.7217 },
  'मध्य प्रदेश': { latitude: 23.2599, longitude: 77.4126 },
  'महाराष्ट्र': { latitude: 19.0760, longitude: 72.8777 },
  'राजस्थान': { latitude: 26.9124, longitude: 75.7873 },
  'गुजरात': { latitude: 23.2156, longitude: 72.6369 },
  'बिहार': { latitude: 25.5941, longitude: 85.1376 },
  'कर्नाटक': { latitude: 12.9716, longitude: 77.5946 },
  'आंध्र प्रदेश': { latitude: 16.5062, longitude: 80.6480 },
  'पश्चिम बंगाल': { latitude: 22.5726, longitude: 88.3639 },
  'तेलंगाना': { latitude: 17.3850, longitude: 78.4867 },
  'तमिलनाडु': { latitude: 13.0827, longitude: 80.2707 },
  'ओडिशा': { latitude: 20.2961, longitude: 85.8245 },
  'केरल': { latitude: 8.5241, longitude: 76.9366 },
  'असम': { latitude: 26.1445, longitude: 91.7362 },
  'छत्तीसगढ़': { latitude: 21.2514, longitude: 81.6296 },
  'झारखंड': { latitude: 23.3441, longitude: 85.3096 },
  'उत्तराखंड': { latitude: 30.3165, longitude: 78.0322 },
  'हिमाचल प्रदेश': { latitude: 31.1048, longitude: 77.1734 },
  'जम्मू और कश्मीर': { latitude: 34.0837, longitude: 74.7973 },
};

export interface WeatherCondition {
  hi: string;
  en: string;
  icon: {
    ios: string;
    android: string;
    web: string;
  };
}

export interface RawWeatherData {
  temp: number;
  humidity: number;
  weatherCode: number;
  isDay?: number;
}

export function getWeatherCondition(code: number, isDay: number = 1): WeatherCondition {
  // WMO weather code to icon and status translation mapping
  if (code === 0) {
    return isDay === 0
      ? {
          hi: 'साफ़ रात',
          en: 'Clear Night',
          icon: { ios: 'moon.stars.fill', android: 'bedtime', web: 'bedtime' }
        }
      : {
          hi: 'साफ़ मौसम',
          en: 'Clear Sky',
          icon: { ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' }
        };
  }
  if (code >= 1 && code <= 3) {
    return isDay === 0
      ? {
          hi: 'आंशिक बादल',
          en: 'Partly Cloudy',
          icon: { ios: 'cloud.moon.fill', android: 'nights_stay', web: 'nights_stay' }
        }
      : {
          hi: 'आंशिक बादल',
          en: 'Partly Cloudy',
          icon: { ios: 'cloud.sun.fill', android: 'cloud', web: 'cloud' }
        };
  }
  if (code === 45 || code === 48) {
    return {
      hi: 'कोहरा',
      en: 'Foggy',
      icon: { ios: 'cloud.fog.fill', android: 'waves', web: 'waves' }
    };
  }
  if (code === 51 || code === 53 || code === 55) {
    return {
      hi: 'बूंदाबांदी',
      en: 'Drizzle',
      icon: { ios: 'cloud.drizzle.fill', android: 'cloud_queue', web: 'cloud_queue' }
    };
  }
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
    return {
      hi: 'बारिश',
      en: 'Rainy',
      icon: { ios: 'cloud.rain.fill', android: 'grain', web: 'grain' }
    };
  }
  if (code >= 95) {
    return {
      hi: 'आंधी-तूफान',
      en: 'Thunderstorm',
      icon: { ios: 'cloud.bolt.rain.fill', android: 'thunderstorm', web: 'thunderstorm' }
    };
  }
  // Default fallback for other values
  return isDay === 0
    ? {
        hi: 'साफ़ रात',
        en: 'Clear Night',
        icon: { ios: 'moon.stars.fill', android: 'bedtime', web: 'bedtime' }
      }
    : {
        hi: 'साफ़ मौसम',
        en: 'Clear Sky',
        icon: { ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' }
      };
}

export interface DisasterAlert {
  type: 'thunderstorm' | 'heavy_rain' | 'heatwave' | 'frost' | 'high_wind';
  severity: 'critical' | 'warning' | 'advisory';
  titleHi: string;
  titleEn: string;
  descHi: string;
  descEn: string;
  actionItemsHi: string[];
  actionItemsEn: string[];
  probability: number;
}

export interface HourlyForecastItem {
  time: string;
  temp: number;
  precProb: number;
  code: number;
}

export interface DailyForecastItem {
  date: string;
  dayNameHi: string;
  dayNameEn: string;
  dateFormatted: string;
  maxTemp: number;
  minTemp: number;
  precProb: number;
  precSum: number;
  weatherCode: number;
}

export interface RawWeatherData {
  temp: number;
  humidity: number;
  weatherCode: number;
  isDay?: number;
  windSpeed?: number;
  maxTemp24h?: number;
  minTemp24h?: number;
  maxRainProb24h?: number;
  hourly24h?: HourlyForecastItem[];
  daily7d?: DailyForecastItem[];
  disasterAlert?: DisasterAlert | null;
}

export function detectDisasterAlert(
  temp: number,
  humidity: number,
  code: number,
  hourly: HourlyForecastItem[]
): DisasterAlert | null {
  const maxRainProb = Math.max(...hourly.map(h => h.precProb), 0);
  const maxTemp = Math.max(...hourly.map(h => h.temp), temp);
  const minTemp = Math.min(...hourly.map(h => h.temp), temp);
  const hasThunder = code >= 95 || hourly.some(h => h.code >= 95);
  const hasHeavyRain = (code >= 61 && code <= 65) || maxRainProb >= 60;

  if (hasThunder) {
    return {
      type: 'thunderstorm',
      severity: 'critical',
      titleHi: '48-घंटे में भारी आंधी व ओलावृष्टि चेतावनी',
      titleEn: '48h Severe Thunderstorm & Hail Warning',
      descHi: 'अगले 48 घंटों में भारी गरज, तेज हवाएं व ओले गिरने की संभावना है।',
      descEn: 'Severe thunderstorm, strong winds and hail expected within 48 hours.',
      actionItemsHi: [
        'कीटनाशक या यूरिया का छिड़काव तुरंत रोक दें।',
        'खेतों से जल निकासी (Drainage) की नालियां खोलें।',
        'कटी हुई फसल को खुले में न रखें, तिरपाल से ढकें।',
        'फसल क्षति की स्थिति में स्थानीय कृषि कार्यालय को सूचित करें।'
      ],
      actionItemsEn: [
        'Suspend pesticide and fertilizer application immediately.',
        'Clear field drainage channels to prevent waterlogging.',
        'Cover harvested produce with waterproof tarpaulins.',
        'Report crop damage to local agricultural office promptly.'
      ],
      probability: Math.max(maxRainProb, 85),
    };
  }

  if (hasHeavyRain) {
    return {
      type: 'heavy_rain',
      severity: 'warning',
      titleHi: '48-घंटे में भारी वर्षा की चेतावनी',
      titleEn: '48h Heavy Rain Advisory',
      descHi: `वर्षा की संभावना ${maxRainProb}% तक बनी हुई है। जलजमाव का खतरा है।`,
      descEn: `High rainfall probability of ${maxRainProb}% detected in next 48 hours.`,
      actionItemsHi: [
        'खेतों में अतिरिक्त सिंचाई बंद कर दें।',
        'जड़ों में सड़ांध (Root rot) रोकने के लिए निकासी मार्ग साफ़ रखें।',
        'कटाई योग्य फसल को जल्द से जल्द सुरक्षित करें।'
      ],
      actionItemsEn: [
        'Stop additional field irrigation.',
        'Ensure drainage outlets are clear to protect crop roots.',
        'Harvest mature crops promptly if ready.'
      ],
      probability: maxRainProb,
    };
  }

  if (maxTemp >= 38) {
    return {
      type: 'heatwave',
      severity: 'warning',
      titleHi: '48-घंटे में तीव्र हीटवेव / लू की चेतावनी',
      titleEn: '48h Heatwave Warning',
      descHi: `अधिकतम तापमान ${maxTemp}°C तक पहुँचने का अनुमान है। फसल झुलस सकती है।`,
      descEn: `Extreme heat with peak temperature reaching ${maxTemp}°C expected.`,
      actionItemsHi: [
        'फसल को झुलसने से बचाने के लिए शाम को हल्की सिंचाई करें।',
        'पौधों की जड़ों में नमी बनाए रखने के लिए पराली या मल्चिंग का प्रयोग करें।',
        'दुधारू पशुओं को दोपहर में ठंडे व छायादार स्थान पर बांधें।'
      ],
      actionItemsEn: [
        'Apply light evening irrigation to reduce soil temperature.',
        'Use straw mulching to conserve root zone moisture.',
        'Keep livestock in shaded, well-ventilated areas with adequate water.'
      ],
      probability: 90,
    };
  }

  if (minTemp <= 8) {
    return {
      type: 'frost',
      severity: 'warning',
      titleHi: '48-घंटे में तीव्र शीतलहर व पाला (Frost) चेतावनी',
      titleEn: '48h Coldwave & Frost Advisory',
      descHi: `न्यूनतम तापमान ${minTemp}°C तक गिरने की संभावना है। पाला पड़ने का खतरा।`,
      descEn: `Freezing temperatures around ${minTemp}°C expected. High frost risk.`,
      actionItemsHi: [
        'शाम के समय खेत में हल्की सिंचाई करें (पानी का तापमान वातावरण से अधिक होता है)।',
        'रात में खेत की उत्तर-पश्चिम दिशा में धुआं करें।',
        'सब्जियों व छोटे पौधों को पुआल से ढकें।'
      ],
      actionItemsEn: [
        'Irrigate fields lightly in the evening to maintain soil heat.',
        'Create mild smoke on field borders during late night.',
        'Cover vulnerable vegetable seedlings with straw thatch.'
      ],
      probability: 85,
    };
  }

  // Default mild alert if high rain probability
  if (maxRainProb >= 40) {
    return {
      type: 'heavy_rain',
      severity: 'advisory',
      titleHi: '48-घंटे में बारिश का अलर्ट',
      titleEn: '48h Rain Forecast Alert',
      descHi: `अगले 48 घंटों में बारिश की संभावना ${maxRainProb}% है।`,
      descEn: `Precipitation chance of ${maxRainProb}% forecasted for next 48 hours.`,
      actionItemsHi: [
        'सिंचाई और छिड़काव की योजना बारिश के अनुसार बनाएं।',
        'मंडी ले जाने वाली उपज को तिरपाल से ढककर रखें।'
      ],
      actionItemsEn: [
        'Plan irrigation and spraying activities around rainfall.',
        'Protect market-bound produce with waterproof covers.'
      ],
      probability: maxRainProb,
    };
  }

  return null;
}

export async function fetchWeatherData(
  location: string | Coordinates
): Promise<RawWeatherData> {
  let coords: Coordinates;
  if (typeof location === 'object' && location !== null && 'latitude' in location) {
    coords = location;
  } else {
    coords = STATE_COORDINATES[location] || { latitude: 20.5937, longitude: 78.9629 };
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&forecast_days=7&timezone=auto`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    
    const data = await response.json();
    const current = data.current;
    
    if (!current) {
      throw new Error('Weather response is missing current data');
    }

    const hourlyTimes: string[] = data.hourly?.time || [];
    const hourlyTemps: number[] = data.hourly?.temperature_2m || [];
    const hourlyProbs: number[] = data.hourly?.precipitation_probability || [];
    const hourlyCodes: number[] = data.hourly?.weather_code || [];

    const hourly24h: HourlyForecastItem[] = [];
    for (let i = 0; i < Math.min(24, hourlyTimes.length); i++) {
      const timeStr = new Date(hourlyTimes[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      hourly24h.push({
        time: timeStr,
        temp: Math.round(hourlyTemps[i] ?? current.temperature_2m),
        precProb: hourlyProbs[i] ?? 0,
        code: hourlyCodes[i] ?? current.weather_code,
      });
    }

    // Parse 7-day forecast
    const dailyTimes: string[] = data.daily?.time || [];
    const dailyCodes: number[] = data.daily?.weather_code || [];
    const dailyMaxTemps: number[] = data.daily?.temperature_2m_max || [];
    const dailyMinTemps: number[] = data.daily?.temperature_2m_min || [];
    const dailyProbs: number[] = data.daily?.precipitation_probability_max || [];
    const dailySums: number[] = data.daily?.precipitation_sum || [];

    const dayNamesHi = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsHi = ['जन', 'फर', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितं', 'अक्टूबर', 'नवं', 'दिसं'];

    const daily7d: DailyForecastItem[] = [];

    for (let i = 0; i < Math.min(7, dailyTimes.length); i++) {
      const dateStr = dailyTimes[i].split('T')[0];
      const parts = dateStr.split('-');
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const dayNum = parseInt(parts[2], 10);
      const dateObj = new Date(year, month, dayNum);

      const isToday = i === 0;

      daily7d.push({
        date: dateStr,
        dayNameHi: isToday ? 'आज' : dayNamesHi[dateObj.getDay()],
        dayNameEn: isToday ? 'Today' : dayNamesEn[dateObj.getDay()],
        dateFormatted: `${dayNum} ${monthsEn[month]}`,
        maxTemp: Math.round(dailyMaxTemps[i] ?? current.temperature_2m),
        minTemp: Math.round(dailyMinTemps[i] ?? current.temperature_2m),
        precProb: Math.round(dailyProbs[i] ?? 0),
        precSum: Math.round((dailySums[i] ?? 0) * 10) / 10,
        weatherCode: dailyCodes[i] ?? current.weather_code,
      });
    }

    const tempVal = Math.round(current.temperature_2m);
    const humidityVal = current.relative_humidity_2m;
    const codeVal = current.weather_code;
    const isDayVal = current.is_day ?? 1;
    const windVal = Math.round(current.wind_speed_10m ?? 0);

    const alert = detectDisasterAlert(tempVal, humidityVal, codeVal, hourly24h);
    
    return {
      temp: tempVal,
      humidity: humidityVal,
      weatherCode: codeVal,
      isDay: isDayVal,
      windSpeed: windVal,
      hourly24h,
      daily7d,
      disasterAlert: alert,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export function generateWeatherAdvisory(
  temp: number,
  humidity: number,
  code: number,
  stateName: string,
  cropName: string,
  language: 'hi' | 'en'
): string {
  const isHindi = language === 'hi';
  const cleanCrop = (cropName || 'Crop').split('(')[0].trim();
  const cLower = cleanCrop.toLowerCase();

  // Weather Condition Categories
  const isThunderstorm = code >= 95;
  const isHeavyRain = (code >= 63 && code <= 65) || (code >= 81 && code <= 82);
  const isLightRain = (code >= 61 && code <= 62) || code === 80;
  const isDrizzle = code >= 51 && code <= 55;
  const isFog = code === 45 || code === 48;
  const isCloudy = code === 2 || code === 3;
  const isClear = code === 0 || code === 1;

  // 1. THUNDERSTORM / HEAVY RAIN ALERTS (Highest Priority)
  if (isThunderstorm || isHeavyRain) {
    if (cLower.includes('wheat') || cLower.includes('गेहूं')) {
      return isHindi
        ? `${stateName} में आंधी/भारी बारिश। गेहूं की फसल को गिरने (Lodging) से बचाने हेतु सिंचाई तुरंत रोकें।`
        : `Heavy rain & wind in ${stateName}. Postpone Wheat irrigation to prevent stalk lodging.`;
    }
    if (cLower.includes('paddy') || cLower.includes('rice') || cLower.includes('धान')) {
      return isHindi
        ? `${stateName} में मूसलाधार बारिश। धान के खेतों में अत्यधिक जलभराव से बचाव हेतु निकासी (Drainage) खोलें।`
        : `Torrential rain in ${stateName}. Ensure field drainage to protect Paddy roots.`;
    }
    if (cLower.includes('mustard') || cLower.includes('सरसों')) {
      return isHindi
        ? `${stateName} में भारी बारिश। सरसों के खेत से पानी निकालें; फली टूटने व सड़न का खतरा।`
        : `Heavy rain in ${stateName}. Drain excess water from Mustard fields to prevent pod rot.`;
    }
    if (cLower.includes('potato') || cLower.includes('आलू')) {
      return isHindi
        ? `${stateName} में तेज बारिश। आलू की मेंड़ों पर जलभराव न होने दें; कंद गलने का डर।`
        : `Heavy rain in ${stateName}. Keep Potato ridges clear of waterlogging to prevent tuber rot.`;
    }
    if (cLower.includes('cotton') || cLower.includes('कपास')) {
      return isHindi
        ? `${stateName} में आंधी/बारिश। कपास की चुनी हुई रुई को ढकें व सिंचाई व स्प्रे टालें।`
        : `Storm/rain in ${stateName}. Protect harvested Cotton and suspend field spraying.`;
    }
    return isHindi
      ? `${stateName} में आंधी/भारी बारिश की संभावना। ${cleanCrop} में जल निकासी की व्यवस्था करें।`
      : `Heavy rain/storm in ${stateName}. Ensure proper drainage for ${cleanCrop}.`;
  }

  // 2. DRIZZLE / LIGHT RAIN
  if (isLightRain || isDrizzle) {
    return isHindi
      ? `${stateName} में बूंदाबांदी (${humidity}% नमी)। ${cleanCrop} में कीटनाशक छिड़काव रोकें व सिंचाई स्थगित रखें।`
      : `Light rain in ${stateName} (${humidity}% RH). Postpone spraying and irrigation for ${cleanCrop}.`;
  }

  // 3. EXTREME HEAT (> 36°C)
  if (temp >= 36) {
    if (cLower.includes('wheat') || cLower.includes('गेहूं')) {
      return isHindi
        ? `तपिश (${temp}°C)। गेहूं में दाना भराव प्रभावित हो सकता है; शाम को हल्की सिंचाई करें।`
        : `Extreme heat (${temp}°C). Apply light evening irrigation for Wheat to protect grain filling.`;
    }
    if (cLower.includes('paddy') || cLower.includes('rice') || cLower.includes('धान')) {
      return isHindi
        ? `तेज धूप व ${temp}°C तापमान। धान के खेत में 2-3 सेमी नमी/पानी बनाए रखें।`
        : `High heat (${temp}°C). Maintain 2-3 cm standing water in Paddy field.`;
    }
    if (cLower.includes('sugarcane') || cLower.includes('गन्ना')) {
      return isHindi
        ? `तीव्र तापमान (${temp}°C) से गन्ने में कंसुआ कीट का खतरा। 10-12 दिन पर सिंचाई करें।`
        : `High temp (${temp}°C). Irrigate Sugarcane every 10-12 days to control shoot borer.`;
    }
    return isHindi
      ? `उच्च तापमान (${temp}°C)। ${cleanCrop} की जड़ों में नमी हेतु शाम को हल्की सिंचाई करें।`
      : `High temp (${temp}°C). Irrigate ${cleanCrop} in the evening to protect roots.`;
  }

  // 4. LOW TEMPERATURE / FROST THREAT (< 12°C)
  if (temp <= 12) {
    if (cLower.includes('mustard') || cLower.includes('सरसों')) {
      return isHindi
        ? `ठंड (${temp}°C) से सरसों में पाला (Frost) का अंदेशा। खेत की मेड़ों पर शाम को धुआं या हल्की सिंचाई करें।`
        : `Cold temp (${temp}°C): Frost threat for Mustard. Apply evening light irrigation.`;
    }
    if (cLower.includes('potato') || cLower.includes('आलू')) {
      return isHindi
        ? `कम तापमान (${temp}°C)। आलू में पाले से बचाव हेतु शाम को सिंचाई करें व पुआल से ढकें।`
        : `Cold temp (${temp}°C). Irrigate Potato fields in evening to prevent frost damage.`;
    }
    return isHindi
      ? `तापमान गिरकर ${temp}°C हुआ। ${cleanCrop} को पाले से बचाने हेतु खेत में नमी रखें।`
      : `Low temp (${temp}°C). Maintain soil moisture to protect ${cleanCrop} from frost.`;
  }

  // 5. HIGH HUMIDITY (> 75% RH) + SPECIFIC CROP DISEASES
  if (humidity >= 75) {
    if (cLower.includes('wheat') || cLower.includes('गेहूं')) {
      return isHindi
        ? `उच्च नमी (${humidity}%) व ${temp}°C: गेहूं में पीला रतुआ (Yellow Rust) व फफूंद का खतरा। पत्तियों के निचले भाग की जांच करें।`
        : `High humidity (${humidity}%) & ${temp}°C: Yellow Rust & fungal risk in Wheat. Inspect leaf undersides.`;
    }
    if (cLower.includes('potato') || cLower.includes('आलू')) {
      return isHindi
        ? `उच्च आर्द्रता (${humidity}%) व ${temp}°C: आलू में पछेती झुलसा (Late Blight) का खतरा। पत्तियों पर काले धब्बों की जांच करें।`
        : `High humidity (${humidity}%) & ${temp}°C: High Late Blight threat for Potato. Check leaves for dark spots.`;
    }
    if (cLower.includes('mustard') || cLower.includes('सरसों')) {
      return isHindi
        ? `आर्द्रता (${humidity}%): सरसों की फसल में माहू (Aphid) व सफेद रतुआ का प्रकोप हो सकता है। फूलों की जांच करें।`
        : `High humidity (${humidity}%): Aphid (माहू) & White Rust risk for Mustard. Inspect flower heads.`;
    }
    if (cLower.includes('paddy') || cLower.includes('rice') || cLower.includes('धान')) {
      return isHindi
        ? `अधिक नमी (${humidity}%): धान में शीथ ब्लाइट व पत्ती लपेटक की संभावना। जल स्तर नियंत्रित करें।`
        : `High humidity (${humidity}%): Risk of Sheath Blight in Paddy. Manage field water level.`;
    }
    if (cLower.includes('cotton') || cLower.includes('कपास')) {
      return isHindi
        ? `उच्च नमी (${humidity}%): कपास में गुलाबी सुंडी व चूसक कीटों का खतरा। कीट ट्रैप स्थापित करें।`
        : `High humidity (${humidity}%): Pink Bollworm & sucking pest threat in Cotton. Set up pheromone traps.`;
    }
    if (cLower.includes('tomato') || cLower.includes('टमाटर') || cLower.includes('chili') || cLower.includes('मिर्च')) {
      return isHindi
        ? `अधिक आर्द्रता (${humidity}%): ${cleanCrop} में पत्ती मरोड़ा (Leaf Curl) व फफूंद जनित रोग का अंदेशा। नीम तेल का छिड़काव करें।`
        : `High humidity (${humidity}%): Leaf Curl & fungal rot threat in ${cleanCrop}. Spray neem oil.`;
    }
    return isHindi
      ? `हवा में अधिक नमी (${humidity}%) व ${temp}°C: ${cleanCrop} में फफूंद व कीटों का अंदेशा। खेत का निरीक्षण करें।`
      : `High humidity (${humidity}%) & ${temp}°C: Risk of fungal pests in ${cleanCrop}. Inspect field.`;
  }

  // 6. CLEAR / FAVORABLE WEATHER
  if (isClear) {
    return isHindi
      ? `${stateName} में मौसम साफ़ (${temp}°C, ${humidity}% नमी)। ${cleanCrop} में निराई-गुड़ाई, खाद व कीटनाशक हेतु सर्वोत्तम समय।`
      : `Clear weather in ${stateName} (${temp}°C, ${humidity}% RH). Ideal for ${cleanCrop} weeding & fertilization.`;
  }

  // 7. FOG / CLOUDY
  if (isFog || isCloudy) {
    return isHindi
      ? `${stateName} में धुंध/बदली (${temp}°C)। ${cleanCrop} में धूप की कमी से कीट पनप सकते हैं; निगरानी रखें।`
      : `Cloudy/foggy weather in ${stateName} (${temp}°C). Monitor ${cleanCrop} for pest development.`;
  }

  // 8. GENERAL DEFAULT
  return isHindi
    ? `मौसम अनुकूल है (${temp}°C, ${humidity}% नमी)। ${cleanCrop} की सामान्य देखभाल व पोषण प्रबंधन जारी रखें।`
    : `Favorable weather (${temp}°C, ${humidity}% RH). Maintain normal care for your ${cleanCrop} crop.`;
}
