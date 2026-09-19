const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
  }
}

loadEnv();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://rqrlhbbdgpfcemeiwija.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxcmxoYmJkZ3BmY2VtZWl3aWphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4Mjc2MTIsImV4cCI6MjEwNTQwMzYxMn0.WZLzsmiuLMuJUnFYrrDbRIPkrGPlUN2haTm6pNUepks';
const GOVT_API_KEY = process.env.EXPO_PUBLIC_DATA_GOV_IN_API_KEY || '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MAJOR_STATES = [
  'Punjab',
  'Haryana',
  'Uttar Pradesh',
  'Rajasthan',
  'Madhya Pradesh',
  'Maharashtra',
  'Gujarat',
  'Bihar',
  'West Bengal',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Tamil Nadu',
];

async function fetchRecordsForState(stateName) {
  const BASE_URL = 'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';
  const url = `${BASE_URL}?api-key=${GOVT_API_KEY}&format=json&limit=50&filters[State]=${encodeURIComponent(stateName)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return [];
    const json = await res.json();
    return json.records || [];
  } catch (err) {
    console.warn(`[Mandi Sync] Could not fetch state ${stateName}:`, err.message);
    return [];
  }
}

async function syncMandiPrices() {
  console.log('[Mandi Sync] Starting Govt API mandi prices fetch across states...');

  const BASE_URL = 'https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24';
  let rawRecords = [];

  // 1. Fetch general latest records
  try {
    const url = `${BASE_URL}?api-key=${GOVT_API_KEY}&format=json&limit=100&sort[Arrival_Date]=desc`;
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (res.ok) {
      const data = await res.json();
      if (data.records) rawRecords.push(...data.records);
    }
  } catch (e) {
    console.warn('[Mandi Sync] General fetch warning:', e.message);
  }

  // 2. Fetch state-specific records for all major agricultural states
  for (const st of MAJOR_STATES) {
    const stRecs = await fetchRecordsForState(st);
    if (stRecs.length > 0) {
      rawRecords.push(...stRecs);
    }
  }

  console.log(`[Mandi Sync] Total fetched raw records: ${rawRecords.length}`);

  if (rawRecords.length === 0) {
    console.log('[Mandi Sync] No records returned.');
    return { count: 0 };
  }

  const rows = [];
  const seenKeys = new Set();

  for (const rec of rawRecords) {
    const commodity = rec.Commodity || rec.commodity;
    const state = rec.State || rec.state;
    const market = rec.Market || rec.market;
    const arrivalDate = rec.Arrival_Date || rec.arrival_date || '';
    const modalPrice = Number(rec.Modal_Price || rec.modal_price) || 0;
    const minPrice = Number(rec.Min_Price || rec.min_price) || 0;
    const maxPrice = Number(rec.Max_Price || rec.max_price) || 0;
    const variety = rec.Variety || rec.variety || '';

    if (!commodity || !state || !market || !modalPrice) continue;

    const uniqueKey = `${commodity.trim().toLowerCase()}_${market.trim().toLowerCase()}_${state.trim().toLowerCase()}_${arrivalDate}`;
    if (seenKeys.has(uniqueKey)) continue;
    seenKeys.add(uniqueKey);

    let changeStr = '0';
    if (maxPrice > minPrice && minPrice > 0) {
      const pctDiff = ((modalPrice - minPrice) / minPrice) * 100;
      const valueDiff = Math.round(modalPrice * 0.012);
      if (pctDiff > 4) changeStr = `+₹${valueDiff}`;
      else if (pctDiff < 2) changeStr = `-₹${valueDiff}`;
    }

    rows.push({
      commodity: commodity.trim(),
      price: modalPrice,
      unit: 'Quintal',
      state: state.trim(),
      market: market.trim(),
      change: changeStr,
      variety: variety.trim(),
      arrival_date: arrivalDate,
      fetched_at: new Date().toISOString(),
    });
  }

  console.log(`[Mandi Sync] Formatted ${rows.length} unique valid rows for Supabase.`);

  const chunkSize = 200;
  let insertedCount = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('mandi_prices')
      .upsert(chunk, { onConflict: 'commodity,market,state,arrival_date' });

    if (error) {
      console.error(`[Mandi Sync] Error upserting chunk ${i / chunkSize}:`, error.message);
    } else {
      insertedCount += chunk.length;
    }
  }

  console.log(`[Mandi Sync] Successfully synced ${insertedCount} mandi records to Supabase!`);
  return { count: insertedCount };
}

if (require.main === module) {
  syncMandiPrices()
    .then(res => {
      console.log('[Mandi Sync] Complete:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('[Mandi Sync] Failed:', err);
      process.exit(1);
    });
}

module.exports = { syncMandiPrices };
