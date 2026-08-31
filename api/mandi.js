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
  const API_KEY = process.env.EXPO_PUBLIC_DATA_GOV_IN_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';
  const BASE_URL = 'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';

  try {
    let url = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=15`;
    if (state) {
      url += `&filters[State]=${encodeURIComponent(state)}`;
    }

    const apiResponse = await fetch(url);
    if (!apiResponse.ok) {
      // Try without state filter as a fallback
      if (state) {
        const generalUrl = `${BASE_URL}?api-key=${API_KEY}&format=json&limit=15`;
        const generalResponse = await fetch(generalUrl);
        if (generalResponse.ok) {
          const data = await generalResponse.json();
          return res.status(200).json(data);
        }
      }
      return res.status(apiResponse.status).json({ 
        error: `Govt API responded with status ${apiResponse.status}` 
      });
    }

    const data = await apiResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
