import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('daily_logs').select('*').eq('date', '2026-07-20');
  console.log("Found logs for 2026-07-20:");
  const badLogs = data.filter(d => d.duration_minutes > 1440);
  console.log(badLogs.map(d => ({id: d.id, induk: d.induk_desc, duration: d.duration_minutes})));
  
  if (badLogs.length > 0) {
    console.log("Deleting bad logs...");
    for (const log of badLogs) {
      await supabase.from('daily_logs').delete().eq('id', log.id);
    }
    console.log("Deleted.");
  }
}

run();
