import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('daily_logs').select('*').eq('date', '2026-07-20').eq('plant', '5F08');
  console.log("Plant 5F08 on 2026-07-20:");
  console.log(data);
}

run();
