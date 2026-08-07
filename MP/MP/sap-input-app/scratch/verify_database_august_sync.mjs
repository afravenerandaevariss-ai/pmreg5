import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://pabnvxlvrussdfhisxzn.supabase.co', 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4');

async function run() {
  const { data } = await sb.from('daily_logs').select('date, plant').gte('date', '2026-08-01');
  const dateCounts = {};
  data.forEach(r => { dateCounts[r.date] = (dateCounts[r.date] || 0) + 1; });

  console.log(`Total August 2026 logs in Supabase: ${data.length}`);
  console.log('Log count per date in August 2026:');
  Object.keys(dateCounts).sort().forEach(d => {
    console.log(` - Date ${d}: ${dateCounts[d]} logs`);
  });
}

run();
