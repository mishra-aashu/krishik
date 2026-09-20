import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LiveLocationData {
  latitude: number;
  longitude: number;
  district?: string;
  state?: string;
  city?: string;
  displayName: string;
}

const STATE_CENTROIDS: Record<string, { lat: number; lon: number }> = {
  'Uttar Pradesh': { lat: 26.8467, lon: 80.9462 },
  'Punjab': { lat: 30.9010, lon: 75.8573 },
  'Haryana': { lat: 29.1492, lon: 75.7217 },
  'Madhya Pradesh': { lat: 23.2599, lon: 77.4126 },
  'Maharashtra': { lat: 19.0760, lon: 72.8777 },
  'Rajasthan': { lat: 26.9124, lon: 75.7873 },
  'Gujarat': { lat: 23.2156, lon: 72.6369 },
  'Bihar': { lat: 25.5941, lon: 85.1376 },
  'Karnataka': { lat: 12.9716, lon: 77.5946 },
  'Andhra Pradesh': { lat: 16.5062, lon: 80.6480 },
  'West Bengal': { lat: 22.5726, lon: 88.3639 },
  'Telangana': { lat: 17.3850, lon: 78.4867 },
  'Tamil Nadu': { lat: 13.0827, lon: 80.2707 },
  'Odisha': { lat: 20.2961, lon: 85.8245 },
  'Kerala': { lat: 8.5241, lon: 76.9366 },
  'Assam': { lat: 26.1445, lon: 91.7362 },
  'Chhattisgarh': { lat: 21.2514, lon: 81.6296 },
  'Jharkhand': { lat: 23.3441, lon: 85.3096 },
  'Uttarakhand': { lat: 30.3165, lon: 78.0322 },
  'Himachal Pradesh': { lat: 31.1048, lon: 77.1734 },
};

export function findNearestState(latitude: number, longitude: number): string {
  let minDistanceSq = Infinity;
  let nearestState = 'Uttar Pradesh';

  for (const [state, coords] of Object.entries(STATE_CENTROIDS)) {
    const dLat = latitude - coords.lat;
    const dLon = longitude - coords.lon;
    const distSq = dLat * dLat + dLon * dLon;
    if (distSq < minDistanceSq) {
      minDistanceSq = distSq;
      nearestState = state;
    }
  }
  return nearestState;
}

function cleanStateName(rawState?: string): string | undefined {
  if (!rawState) return undefined;
  const cleaned = rawState.replace(/^State of\s+/i, '').trim();
  for (const knownState of Object.keys(STATE_CENTROIDS)) {
    if (knownState.toLowerCase() === cleaned.toLowerCase() || cleaned.toLowerCase().includes(knownState.toLowerCase())) {
      return knownState;
    }
  }
  return cleaned;
}

export async function requestLocationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      return true; // Web uses native navigator.geolocation prompt directly
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('Error requesting location permission:', err);
    return false;
  }
}

export async function getLiveGPSLocation(): Promise<LiveLocationData | null> {
  try {
    // 1. Web Geolocation
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.geolocation) {
      const webPos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => {
            console.warn('Web geolocation error:', err.message);
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
      });

      if (webPos) {
        const lat = webPos.coords.latitude;
        const lon = webPos.coords.longitude;
        const geoInfo = await reverseGeocodeCoordinates(lat, lon);
        return {
          latitude: lat,
          longitude: lon,
          district: geoInfo.district,
          state: geoInfo.state,
          city: geoInfo.city,
          displayName: geoInfo.displayName,
        };
      }
    }

    // 2. Mobile expo-location
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    const geoInfo = await reverseGeocodeCoordinates(lat, lon);

    return {
      latitude: lat,
      longitude: lon,
      district: geoInfo.district,
      state: geoInfo.state,
      city: geoInfo.city,
      displayName: geoInfo.displayName,
    };
  } catch (err) {
    console.warn('Failed to get live GPS location:', err);
    return null;
  }
}

export async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<{ district?: string; state?: string; city?: string; displayName: string }> {
  // 1. Try native expo-location reverseGeocodeAsync on mobile
  if (Platform.OS !== 'web') {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (places && places.length > 0) {
        const place = places[0];
        const district = place.subregion || place.district || place.city || undefined;
        const rawState = place.region || undefined;
        const state = cleanStateName(rawState) || findNearestState(latitude, longitude);
        const city = place.city || place.name || undefined;

        let displayName = '';
        if (district && state) {
          displayName = `${district}, ${state}`;
        } else if (city && state) {
          displayName = `${city}, ${state}`;
        } else if (state) {
          displayName = state;
        } else {
          displayName = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
        }

        return { district, state, city, displayName };
      }
    } catch (nativeErr) {
      console.warn('Native reverse geocode failed, falling back:', nativeErr);
    }
  }

  // 2. Free client-side reverse geocoding fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      const city = data.city || data.locality || undefined;
      const district = data.locality || data.city || undefined;
      const rawState = data.principalSubdivision || undefined;
      const state = cleanStateName(rawState) || findNearestState(latitude, longitude);

      let displayName = '';
      if (city && state && city !== state) {
        displayName = `${city}, ${state}`;
      } else if (state) {
        displayName = state;
      } else {
        displayName = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
      }

      return { district, state, city, displayName };
    }
  } catch (apiErr) {
    console.warn('Online reverse geocode error:', apiErr);
  }

  // 3. Mathematical Centroid Fallback (Works 100% offline)
  const fallbackState = findNearestState(latitude, longitude);
  return {
    state: fallbackState,
    displayName: fallbackState,
  };
}
