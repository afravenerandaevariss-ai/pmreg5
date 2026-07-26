import fs from 'fs';

const envContent = fs.readFileSync('.env.vercel', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[parts[0].trim()] = val;
  }
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];

async function check() {
  const res = await fetch(`${supabaseUrl}/rest/v1/system_configs?key=eq.master_map`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  const data = await res.json();
  if (data && data.length > 0) {
    const val = data[0].value;
    console.log('Type:', typeof val);
    console.log('Is Array?', Array.isArray(val));
    console.log('Keys if object:', Object.keys(val));
    console.log('First 200 chars:', JSON.stringify(val).substring(0, 200));
  } else {
    console.log('No data found');
  }
}
check();
