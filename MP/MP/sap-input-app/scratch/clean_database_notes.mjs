import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://pabnvxlvrussdfhisxzn.supabase.co', 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4');

async function run() {
  console.log('Cleaning notes in Supabase daily_logs...');
  const { data, error } = await sb
    .from('daily_logs')
    .update({ notes: null })
    .ilike('notes', '%Import GSheet%');

  if (error) {
    console.error('Error updating notes:', error);
  } else {
    console.log('✅ Successfully cleared all Import GSheet notes in daily_logs.');
  }
}

run();
