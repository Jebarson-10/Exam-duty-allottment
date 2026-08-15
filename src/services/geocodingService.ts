// Automatic Geocoding Service for Erode District CEO Office
// Automatically fetches GPS latitude and longitude from School/Centre names and addresses
// Uses OpenStreetMap Nominatim with local caching and Erode District Locality Fallback Dictionary

export interface GeocodeResult {
  lat: number;
  lng: number;
  confidence: 'HIGH' | 'MEDIUM' | 'FALLBACK';
  source: 'NOMINATIM_OSM' | 'LOCALITY_DICTIONARY' | 'CACHED';
  displayName: string;
}

// Built-in verified coordinates for Erode district towns, taluks, panchayats, and landmarks
export const ERODE_LOCALITIES: Record<string, { lat: number; lng: number }> = {
  // Major Towns & Taluk HQs
  'erode': { lat: 11.3418, lng: 77.7212 },
  'erode town': { lat: 11.3418, lng: 77.7212 },
  'erode urban': { lat: 11.3418, lng: 77.7212 },
  'brough road': { lat: 11.3418, lng: 77.7212 },
  'railway colony': { lat: 11.3325, lng: 77.7285 },
  'surampatti': { lat: 11.3210, lng: 77.7050 },
  'veerappanchatram': { lat: 11.3620, lng: 77.7250 },
  'kasipalayam': { lat: 11.3140, lng: 77.7320 },
  'periyasemur': { lat: 11.3650, lng: 77.7120 },
  'chithode': { lat: 11.3980, lng: 77.6690 },
  'thindal': { lat: 11.3280, lng: 77.6820 },
  'perundurai road': { lat: 11.3350, lng: 77.6950 },

  // Bhavani Taluk
  'bhavani': { lat: 11.4485, lng: 77.6833 },
  'kalingarayanpalayam': { lat: 11.4550, lng: 77.6950 },
  'komarapalayam': { lat: 11.4420, lng: 77.7050 },
  'mylambadi': { lat: 11.4720, lng: 77.6410 },
  'urachikottai': { lat: 11.4780, lng: 77.6720 },
  'salangapalayam': { lat: 11.4120, lng: 77.6180 },
  'appakudal': { lat: 11.5310, lng: 77.6120 },
  'ammapettai': { lat: 11.5980, lng: 77.7140 },

  // Gobichettipalayam Taluk
  'gobichettipalayam': { lat: 11.4552, lng: 77.4377 },
  'gobi': { lat: 11.4552, lng: 77.4377 },
  'lakkampatti': { lat: 11.4250, lng: 77.4620 },
  'kavindapadi': { lat: 11.4280, lng: 77.5450 },
  'kugalur': { lat: 11.4680, lng: 77.4080 },
  'kallipatti': { lat: 11.4920, lng: 77.4120 },
  'modachur': { lat: 11.4450, lng: 77.4480 },
  'nambiyur': { lat: 11.3650, lng: 77.3240 },
  'getticheviyur': { lat: 11.3850, lng: 77.3820 },

  // Perundurai Taluk
  'perundurai': { lat: 11.2764, lng: 77.5837 },
  'chennimalai': { lat: 11.1685, lng: 77.6120 },
  'kunnathur': { lat: 11.2140, lng: 77.4250 },
  'vijayamangalam': { lat: 11.2380, lng: 77.5020 },
  'vellode': { lat: 11.2420, lng: 77.6850 },
  'thingalur': { lat: 11.2950, lng: 77.5210 },
  'ingur': { lat: 11.2480, lng: 77.5920 },

  // Sathyamangalam Taluk
  'sathyamangalam': { lat: 11.5034, lng: 77.2415 },
  'sathy': { lat: 11.5034, lng: 77.2415 },
  'bhavanisagar': { lat: 11.4820, lng: 77.1450 },
  'ariyoor': { lat: 11.5280, lng: 77.2650 },
  'punjai puliampatti': { lat: 11.3520, lng: 77.1720 },
  'puliampatti': { lat: 11.3520, lng: 77.1720 },
  'rangasamudram': { lat: 11.5120, lng: 77.2320 },
  'sirumugai': { lat: 11.3280, lng: 77.0120 },

  // Anthiyur Taluk
  'anthiyur': { lat: 11.5794, lng: 77.5937 },
  'bargur': { lat: 11.7820, lng: 77.5320 },
  'athani': { lat: 11.5420, lng: 77.5180 },
  'vellithiruppur': { lat: 11.5950, lng: 77.6320 },
  'brammadesam': { lat: 11.5510, lng: 77.5580 },

  // Kodumudi & Modakkurichi
  'kodumudi': { lat: 11.0784, lng: 77.8841 },
  'sivagiri': { lat: 11.1210, lng: 77.7850 },
  'modakkurichi': { lat: 11.2986, lng: 77.7554 },
  'ezhumathur': { lat: 11.2180, lng: 77.7820 },
  'ganapathipalayam': { lat: 11.2850, lng: 77.7950 },
  'unjalur': { lat: 11.1120, lng: 77.8520 },
  'pasur': { lat: 11.1980, lng: 77.8120 },

  // Thalavadi (Hills)
  'thalavadi': { lat: 11.7820, lng: 77.0150 },
  'talavadi': { lat: 11.7820, lng: 77.0150 },
  'hasanur': { lat: 11.6920, lng: 77.1250 },
  'dhimbam': { lat: 11.6420, lng: 77.1850 },
};

const GEOCODE_CACHE_KEY = 'erode_geocode_cache_v1';
const inMemoryGeoCache: Record<string, GeocodeResult> = {};

function getGeocodeCache(): Record<string, GeocodeResult> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return JSON.parse(window.localStorage.getItem(GEOCODE_CACHE_KEY) || '{}');
    }
  } catch {}
  return inMemoryGeoCache;
}

function saveGeocodeToCache(key: string, result: GeocodeResult) {
  try {
    const k = key.toLowerCase().trim();
    inMemoryGeoCache[k] = result;
    if (typeof window !== 'undefined' && window.localStorage) {
      const cache = getGeocodeCache();
      cache[k] = result;
      window.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
    }
  } catch {
    // Ignore storage quota limits
  }
}

/**
 * Searches local locality dictionary for matching location keywords
 */
export function findLocalityCoordinates(text: string): { lat: number; lng: number; matchedLocality: string } | null {
  const normalized = text.toLowerCase();

  // Try matching longer locality keys first (e.g. "punjai puliampatti" before "puliampatti")
  const sortedKeys = Object.keys(ERODE_LOCALITIES).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    // Word boundary or contains search
    const regex = new RegExp(`\\b${key}\\b`, 'i');
    if (regex.test(normalized) || normalized.includes(key)) {
      return {
        lat: ERODE_LOCALITIES[key].lat,
        lng: ERODE_LOCALITIES[key].lng,
        matchedLocality: key,
      };
    }
  }

  return null;
}

/**
 * Geocodes an institution name and address.
 * 1. Checks cache
 * 2. Attempts OpenStreetMap Nominatim search (bounded to Erode District)
 * 3. Falls back to Erode Locality Dictionary
 * 4. Defaults to Erode District Center (11.3418, 77.7212)
 */
export async function geocodeInstitution(
  name: string,
  address: string = '',
  blockName: string = ''
): Promise<GeocodeResult> {
  const fullSearchQuery = `${name} ${address} ${blockName}`.trim();
  const cacheKey = fullSearchQuery.toLowerCase();

  // 1. Check Cache
  const cached = getGeocodeCache()[cacheKey];
  if (cached) {
    return { ...cached, source: 'CACHED' };
  }

  // 2. Try Nominatim Geocoding API if online
  if (typeof fetch !== 'undefined') {
    try {
      // Clean query string for Nominatim (remove punctuation)
      const cleanAddress = `${address} ${blockName} Erode Tamil Nadu India`
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress)}&limit=1&countrycodes=in&viewbox=76.80,11.85,78.00,11.00&bounded=1`;

      const response = await fetch(url, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'ErodeCEOSchoolExamDutySystem/1.0',
        },
      });

      if (response.ok) {
        let data;
        try {
          data = await response.json();
        } catch {
          console.warn('Nominatim returned non-JSON response');
          data = null;
        }
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);

          // Verify point falls roughly in/near Erode district bounding box
          if (lat >= 10.9 && lat <= 11.9 && lng >= 76.7 && lng <= 78.1) {
            const result: GeocodeResult = {
              lat: Math.round(lat * 100000) / 100000,
              lng: Math.round(lng * 100000) / 100000,
              confidence: 'HIGH',
              source: 'NOMINATIM_OSM',
              displayName: data[0].display_name || cleanAddress,
            };
            saveGeocodeToCache(cacheKey, result);
            return result;
          }
        }
      }
    } catch (err) {
      // Network failure or CORS/rate-limit, proceed to locality fallback
    }
  }

  // 3. Fallback to Locality Dictionary matching
  const match = findLocalityCoordinates(fullSearchQuery);
  if (match) {
    // Add small random jitter (±0.002 deg ~ 200m) if multiple institutions are in same town
    const jitterLat = (Math.random() - 0.5) * 0.004;
    const jitterLng = (Math.random() - 0.5) * 0.004;

    const result: GeocodeResult = {
      lat: Math.round((match.lat + jitterLat) * 100000) / 100000,
      lng: Math.round((match.lng + jitterLng) * 100000) / 100000,
      confidence: 'MEDIUM',
      source: 'LOCALITY_DICTIONARY',
      displayName: `Matched Locality: ${match.matchedLocality.toUpperCase()}, Erode District`,
    };
    saveGeocodeToCache(cacheKey, result);
    return result;
  }

  // 4. District Center Default Fallback
  const defaultResult: GeocodeResult = {
    lat: 11.3418 + (Math.random() - 0.5) * 0.004,
    lng: 77.7212 + (Math.random() - 0.5) * 0.004,
    confidence: 'FALLBACK',
    source: 'LOCALITY_DICTIONARY',
    displayName: 'Erode District Collectorate / Center (Manual Pin Recommended)',
  };
  saveGeocodeToCache(cacheKey, defaultResult);
  return defaultResult;
}

/**
 * Batch geocodes an array of items with a progress callback.
 */
export async function batchGeocodeItems<T extends { name: string; address?: string; blockId?: string; lat?: number; lng?: number }>(
  items: T[],
  onProgress?: (current: number, total: number, itemName: string) => void
): Promise<T[]> {
  const updatedItems: T[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress(i + 1, items.length, item.name);
    }

    // If item already has valid non-default GPS coordinates, keep them
    if (
      item.lat &&
      item.lng &&
      !isNaN(item.lat) &&
      !isNaN(item.lng) &&
      item.lat >= 10.9 &&
      item.lat <= 11.9
    ) {
      updatedItems.push(item);
      continue;
    }

    const geo = await geocodeInstitution(item.name, item.address || '', item.blockId || '');
    updatedItems.push({
      ...item,
      lat: geo.lat,
      lng: geo.lng,
    });

    // Gentle 1100ms pause to avoid browser UI thread lock and respect Nominatim rate limit
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  return updatedItems;
}
