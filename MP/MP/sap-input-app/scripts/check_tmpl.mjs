import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkTemplate() {
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'template_data')
    .single();
    
  if (data && data.value) {
    let tmpl;
    if (typeof data.value === 'string') {
      tmpl = JSON.parse(data.value);
    } else {
      tmpl = data.value;
    }
    const eq = tmpl.equipments.find(e => e.eqNum === '1000206812');
    console.log('--- Template Data ---');
    console.log(eq);
  }
}

checkTemplate();
