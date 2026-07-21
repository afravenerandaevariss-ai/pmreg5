import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  // Check from master_equipment table
  const { data, error } = await supabase
    .from('master_equipment')
    .select('eq_num, description, plant')
    .order('plant');

  if (error) { console.error(error); return; }

  // Check template_data from hierarchy_data (id=3)
  const { data: tmplRow } = await supabase
    .from('hierarchy_data')
    .select('data')
    .eq('id', 3)
    .single();

  let templateEqs = [];
  if (tmplRow?.data?.equipments) {
    templateEqs = tmplRow.data.equipments;
  }

  console.log(`\nTotal equipment di template: ${templateEqs.length}`);
  const noMP = templateEqs.filter(eq => !eq.measuringPoint || String(eq.measuringPoint).trim() === '');
  
  console.log(`Equipment TANPA Measuring Point: ${noMP.length}`);
  if (noMP.length > 0) {
    console.log('\n--- Daftar Equipment Tanpa Measuring Point ---');
    noMP.forEach(eq => {
      console.log(`Plant: ${eq.plant || '-'} | Eq: ${eq.eqNum} | ${eq.description || eq.induk || '-'}`);
    });
  } else {
    console.log('✅ Semua equipment memiliki Measuring Point.');
  }

  console.log(`\nTotal equipment di master_equipment: ${data.length}`);
  // Check measuring point from template vs master
  const templateNums = new Set(templateEqs.map(e => e.eqNum));
  const masterOnly = data.filter(e => !templateNums.has(e.eq_num));
  if (masterOnly.length > 0) {
    console.log(`\n⚠️  Equipment di master_equipment tapi TIDAK ada di template (tidak punya Measuring Point info):`);
    masterOnly.forEach(e => console.log(`  Plant: ${e.plant} | Eq: ${e.eq_num} | ${e.description}`));
  }
}

check();
