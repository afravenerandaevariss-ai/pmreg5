import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const supabaseAnonKey = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error fetching buckets:', error);
  } else {
    console.log('Buckets:', data);
  }
}
run();
