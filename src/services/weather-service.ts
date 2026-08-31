interface Coordinates {
  latitude: number;
  longitude: number;
}

export const STATE_COORDINATES: Record<string, Coordinates> = {
  'Uttar Pradesh': { latitude: 26.8467, longitude: 80.9462 }, // Lucknow
  'Punjab': { latitude: 30.9010, longitude: 75.8573 }, // Ludhiana
  'Haryana': { latitude: 29.1492, longitude: 75.7217 }, // Hisar
  'Madhya Pradesh': { latitude: 23.2599, longitude: 77.4126 }, // Bhopal
  'Maharashtra': { latitude: 19.0760, longitude: 72.8777 }, // Mumbai
  'Rajasthan': { latitude: 26.9124, longitude: 75.7873 }, // Jaipur
  'Gujarat': { latitude: 23.2156, longitude: 72.6369 }, // Gandhinagar
  'Bihar': { latitude: 25.5941, longitude: 85.1376 }, // Patna
  'Karnataka': { latitude: 12.9716, longitude: 77.5946 }, // Bengaluru
  'Andhra Pradesh': { latitude: 16.5062, longitude: 80.6480 }, // Vijayawada
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
}

export function getWeatherCondition(code: number): WeatherCondition {
  // WMO weather code to icon and status translation mapping
  if (code === 0) {
    return {
      hi: 'साफ़ मौसम',
      en: 'Clear Sky',
      icon: { ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' }
    };
  }
  if (code >= 1 && code <= 3) {
    return {
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
  return {
    hi: 'साफ़ मौसम',
    en: 'Clear Sky',
    icon: { ios: 'sun.max.fill', android: 'wb_sunny', web: 'wb_sunny' }
  };
}

export async function fetchWeatherData(stateName: string): Promise<RawWeatherData> {
  const coords = STATE_COORDINATES[stateName] || { latitude: 20.5937, longitude: 78.9629 }; // Fallback to center of India
  
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,weather_code`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }
  
  const data = await response.json();
  const current = data.current;
  
  if (!current) {
    throw new Error('Weather response is missing current data');
  }
  
  return {
    temp: Math.round(current.temperature_2m),
    humidity: current.relative_humidity_2m,
    weatherCode: current.weather_code
  };
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
  
  // Rain/Thunderstorm conditions
  const isRainy = (code >= 61 && code <= 65) || (code >= 80 && code <= 82) || code >= 95;
  const isDrizzle = code === 51 || code === 53 || code === 55;
  
  if (isRainy) {
    return isHindi
      ? `${stateName} में तेज़ बारिश/आंधी की संभावना है। ${cropName} की फसल में जल निकासी का उचित प्रबंध करें और कीटनाशकों का छिड़काव रोक दें।`
      : `Rain or thunderstorm expected in ${stateName}. Ensure proper drainage channels for your ${cropName} crop and suspend pesticide sprays.`;
  }
  
  if (isDrizzle) {
    return isHindi
      ? `${stateName} में हल्की बूंदाबांदी हो रही है। ${cropName} में मिट्टी की नमी की जांच करें और आवश्यकतानुसार ही सिंचाई करें।`
      : `Light drizzle in ${stateName}. Monitor soil moisture for your ${cropName} crop and irrigate only if necessary.`;
  }

  // Extreme temperatures
  if (temp > 35) {
    return isHindi
      ? `तापमान ${temp}°C बहुत अधिक है। ${cropName} की फसल को झुलसने (heat stress) से बचाने के लिए शाम के समय हल्की सिंचाई करें।`
      : `High temperature of ${temp}°C detected. Apply light irrigation for ${cropName} in the evening to prevent heat stress.`;
  }
  
  if (temp < 15) {
    return isHindi
      ? `ठंड का मौसम है, तापमान ${temp}°C है। ${cropName} को पाले (frost) से बचाने के लिए शाम को खेत की मेड़ों पर हल्की नमी रखें।`
      : `Cool temperature of ${temp}°C detected. Maintain light soil moisture in your ${cropName} field to protect from frost.`;
  }

  // High humidity
  if (humidity > 75) {
    return isHindi
      ? `अधिक आर्द्रता (${humidity}%) दर्ज की गई है। ${cropName} में कीटों और फफूंद (fungal disease) का खतरा हो सकता है, नीम के तेल का छिड़काव करें।`
      : `High humidity of ${humidity}% detected. Watch for pests and fungal spots on your ${cropName}. Consider organic neem oil spray.`;
  }

  // Standard sunny/clear or cloudy weather
  if (code === 0) {
    return isHindi
      ? `${stateName} में मौसम बिल्कुल साफ़ है। ${cropName} की फसल में खरपतवार निकालने और यूरिया डालने के लिए यह सर्वोत्तम समय है।`
      : `Clear weather in ${stateName}. Perfect time for weed removal and applying nitrogen fertilizers to your ${cropName} crop.`;
  }

  return isHindi
    ? `मौसम अनुकूल है (${temp}°C, आर्द्रता ${humidity}%)। ${cropName} की फसल की निगरानी रखें और समय पर सिंचाई व निराई करें।`
    : `Weather is stable (${temp}°C, humidity ${humidity}%). Ideal conditions for general maintenance, weeding, and inspection of ${cropName}.`;
}
