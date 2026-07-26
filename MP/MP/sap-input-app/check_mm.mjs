import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.vercel
const envContent = fs.readFileSync('.env.vercel', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) env[parts[0].trim()] = parts.slice(1).join('=').trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'master_map')
    .single();
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('master_map type:', typeof data.value);
  console.log('Is Array?', Array.isArray(data.value));
  console.log('Sample keys:', Object.keys(data.value));
  console.log('Preview:', JSON.stringify(data.value).substring(0, 100));
}

check();
