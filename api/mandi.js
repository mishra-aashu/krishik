const cache = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const state = req.query.state || '';
  const cacheKey = state.toLowerCase() || 'all';
  const now = Date.now();

  // Serve cache if it exists and is fresh
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL)) {
    return res.status(200).json(cache[cacheKey].data);
  }

  const API_KEY = process.env.EXPO_PUBLIC_DATA_GOV_IN_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
  const BASE_URL = 'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';

  try {
    let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=150`;
    if (state) {
      url += `&filters[State]=${encodeURIComponent(state)}`;
    }

    const apiResponse = await fetch(url);
    if (!apiResponse.ok) {
      // If server responds with error, and we have expired cache, serve it
      if (cache[cacheKey]) {
        console.warn(`[Mandi API Proxy] Server returned error ${apiResponse.status}. Serving expired cache.`);
        return res.status(200).json(cache[cacheKey].data);
      }
      return res.status(apiResponse.status).json({ 
        error: `Govt API responded with status ${apiResponse.status}` 
      });
    }

    const data = await apiResponse.json();
    cache[cacheKey] = {
      data: data,
      timestamp: now
    };
    return res.status(200).json(data);
  } catch (error) {
    if (cache[cacheKey]) {
      console.warn('[Mandi API Proxy] Fetch error. Serving expired cache.', error);
      return res.status(200).json(cache[cacheKey].data);
    }
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
