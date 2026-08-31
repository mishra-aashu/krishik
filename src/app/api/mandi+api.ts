const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || '';
  const cacheKey = state.toLowerCase() || 'all';
  const now = Date.now();

  // Serve cache if it exists and is fresh
  if (cache[cacheKey] && (now - cache[cacheKey].timestamp < CACHE_TTL)) {
    return Response.json(cache[cacheKey].data, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  const API_KEY =
    process.env.EXPO_PUBLIC_DATA_GOV_IN_API_KEY ||
    '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
  const BASE_URL =
    'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';

  try {
    let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=150`;
    if (state) {
      url += `&filters[State]=${encodeURIComponent(state)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      // If we have an expired cache, serve it rather than failing
      if (cache[cacheKey]) {
        console.warn(`[Mandi API Route] Server returned error ${response.status}. Serving expired cache.`);
        return Response.json(cache[cacheKey].data, {
          headers: { 'Access-Control-Allow-Origin': '*' },
        });
      }
      return Response.json(
        { error: `Govt API responded with status ${response.status}` },
        { 
          status: response.status,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const data = await response.json();
    cache[cacheKey] = {
      data: data,
      timestamp: now
    };
    return Response.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    if (cache[cacheKey]) {
      console.warn('[Mandi API Route] Fetch error. Serving expired cache.', error);
      return Response.json(cache[cacheKey].data, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
    return Response.json(
      { error: error.message || 'Internal server error' },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}
