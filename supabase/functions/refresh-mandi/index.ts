// Supabase Edge Function: refresh-mandi
// Fetches mandi prices from the Vercel proxy for all major Indian states
// and upserts them into the mandi_prices table.
//
// Deploy:  supabase functions deploy refresh-mandi
// Trigger: Supabase Dashboard → Database → Cron Jobs
//          Schedule: 0 */4 * * * (every 4 hours)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STATES = [
  'Uttar Pradesh',
  'Punjab',
  'Haryana',
  'Madhya Pradesh',
  'Maharashtra',
  'Rajasthan',
  'Gujarat',
  'Bihar',
  'Karnataka',
  'Andhra Pradesh',
];

const VERCEL_MANDI_URL = 'https://krishik-psi.vercel.app/api/mandi';

serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let totalUpserted = 0;
  const errors: string[] = [];

  for (const state of STATES) {
    try {
      const res = await fetch(
        `${VERCEL_MANDI_URL}?state=${encodeURIComponent(state)}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!res.ok) {
        errors.push(`${state}: HTTP ${res.status}`);
        continue;
      }

      const json = await res.json();
      const records: any[] = json.records || [];
      if (records.length === 0) continue;

      const today = new Date().toISOString().split('T')[0];

      const rows = records
        .map((r: any) => ({
          commodity: (r.Commodity || r.commodity || '').trim(),
          price: Number(r.Modal_Price || r.modal_price) || 0,
          unit: 'Quintal',
          state: state,
          market: (r.Market || r.market || r.District || r.district || state)
            .replace(/\s*(APMC|Mandi|Market)\s*/gi, '')
            .trim(),
          change: '0',
          variety: r.Variety || r.variety || null,
          arrival_date: r.Arrival_Date || r.arrival_date || today,
          fetched_at: new Date().toISOString(),
        }))
        .filter((r: any) => r.commodity && r.price > 0);

      if (rows.length === 0) continue;

      const { error: upsertError } = await supabase
        .from('mandi_prices')
        .upsert(rows, {
          onConflict: 'commodity,market,state,arrival_date',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        errors.push(`${state}: ${upsertError.message}`);
      } else {
        totalUpserted += rows.length;
      }
    } catch (err: any) {
      errors.push(`${state}: ${err?.message || err}`);
    }
  }

  const body = {
    ok: errors.length === 0,
    totalUpserted,
    errors: errors.length > 0 ? errors : undefined,
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
