/**
 * Server-side API route for Mandi price data.
 * This runs on the server (Node.js), so there are NO CORS restrictions.
 * The client calls /api/mandi?state=Punjab and this route proxies to
 * api.data.gov.in keeping the API key on the server side.
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || '';

  const API_KEY =
    process.env.EXPO_PUBLIC_DATA_GOV_IN_API_KEY ||
    '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
  const BASE_URL =
    'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';

  try {
    let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=15`;
    if (state) {
      url += `&filters[State]=${encodeURIComponent(state)}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      // Try without state filter as a fallback
      if (state) {
        const generalUrl = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=15`;
        const generalResponse = await fetch(generalUrl);
        if (generalResponse.ok) {
          const data = await generalResponse.json();
          return Response.json(data, {
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
        }
      }
      return Response.json(
        { error: `API responded with status ${response.status}` },
        { 
          status: response.ok ? 200 : response.status,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    const data = await response.json();
    return Response.json(data, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error: any) {
    return Response.json(
      { error: error.message || 'Internal server error' },
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}
