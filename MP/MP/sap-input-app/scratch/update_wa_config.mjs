import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://pabnvxlvrussdfhisxzn.supabase.co', 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4');

async function run() {
  console.log('Updating wa_config in Supabase...');

  // Try hierarchy_data table (id=100) or system_config
  const updatedConfig = {
    targetPhone: '120363430505509462',
    targetGroup: 'Group PM (120363430505509462)',
    provider: 'gowa',
    gowaUrl: 'https://gowa.waterflai.my.id',
    gowaUser: 'admin',
    gowaPass: 'Sedap321#',
    gowaDevice: '黄玲玲',
    autoSendEnabled: true,
    sendTime: '08:00 & 15:30',
    updatedAt: new Date().toISOString()
  };

  const { data: existing } = await sb.from('hierarchy_data').select('*').eq('id', 100).single();
  let currentMap = {};
  if (existing && existing.data) {
    currentMap = existing.data;
  }
  currentMap['wa_config'] = updatedConfig;

  const { error } = await sb.from('hierarchy_data').upsert({ id: 100, data: currentMap, updated_at: new Date().toISOString() });

  if (error) {
    console.error('Error updating wa_config in hierarchy_data:', error);
  } else {
    console.log('✅ Successfully updated wa_config in Supabase (id=100) to target 120363430505509462.');
  }
}

run();
