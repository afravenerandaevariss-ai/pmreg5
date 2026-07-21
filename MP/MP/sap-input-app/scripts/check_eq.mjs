import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkEq() {
  const eqNum = '1000206812';
  
  const { data: eqData } = await supabase
    .from('master_equipment')
    .select('*')
    .eq('eq_num', eqNum);
    
  console.log('--- Master Equipment ---');
  console.log(eqData);
  
  const { data: logsData } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('induk_eq_num', eqNum);
    
  console.log('\n--- Daily Logs ---');
  console.log(logsData);
}

checkEq();
