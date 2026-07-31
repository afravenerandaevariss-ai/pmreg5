import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('hierarchy_data').select('*').eq('id', 7).single();
  if (error) {
    console.error(error);
    return;
  }
  
  const ik17 = data.data;
  console.log("Total IK17 rows before:", ik17.length);
  
  // Clean up any row that has the bad data (e.g. 46159 or -46159)
  const cleaned = ik17.filter(row => row.h !== 46159 && row.h !== -46159 && row.h !== 46156 && row.h !== -46156);
  
  console.log("Total IK17 rows after:", cleaned.length);
  
  if (cleaned.length < ik17.length) {
    console.log("Updating IK17 data in DB...");
    await supabase.from('hierarchy_data').update({ data: cleaned }).eq('id', 7);
    console.log("Updated.");
  } else {
    console.log("No bad IK17 data found.");
  }
}

run();
