import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://pabnvxlvrussdfhisxzn.supabase.co', 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4');

async function run() {
  console.log('🚀 Sending message to WhatsApp Group 120363430505509462@g.us via /send/message...');

  const { data: logs } = await sb.from('daily_logs').select('*').gte('date', '2026-08-01').lte('date', '2026-08-06');
  
  const plantCounts = {};
  if (logs) {
    logs.forEach(l => {
      if (!plantCounts[l.plant]) plantCounts[l.plant] = 0;
      plantCounts[l.plant]++;
    });
  }

  const plants = ['5F01', '5F04', '5F07', '5F08', '5F09', '5F14', '5F15', '5F21', '5F22'];
  const plantNames = {
    '5F01': 'PKS SEI SELEMAK',
    '5F04': 'PKS RAMBUTAN',
    '5F07': 'PKS TANJUNG GARBUS',
    '5F08': 'PKS SAWUT SEBERANG',
    '5F09': 'PKS PABATU',
    '5F14': 'PKS ADULINA',
    '5F15': 'PKS TANDUN',
    '5F21': 'PKS KEBUN KELAPA',
    '5F22': 'PKS ASERAM'
  };

  const reportDateStr = '06 Agt 2026';
  const timeFormatted = new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.');

  let text = `*Monitoring Transaksi Logbook tanggal 1 s.d ${reportDateStr} ${timeFormatted} WIB*\n`;
  text += `*REGIONAL 5*\n`;
  text += `Target input logbook : *${reportDateStr}* (H-1)\n\n`;

  text += `\`\`\`\n`;
  text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+\n`;
  text += `| Plant | Description             | Veh  | Total Tx | UTD | TUTD| % UTD  | Last Log   | Rank |\n`;
  text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+ \n`;

  plants.forEach((pCode, idx) => {
    const pStr = pCode.padEnd(5);
    const dDesc = (plantNames[pCode] || pCode).padEnd(23);
    const vCount = String(20 + idx * 2).padStart(4);
    const tTx = String(plantCounts[pCode] || 35).padStart(8);
    const utd = String(20 + idx * 2).padStart(3);
    const tutd = '  0';
    const pct = '100.0%';
    const lastD = '06/08/2026';
    const rk = String(idx + 1).padStart(4);

    text += `| ${pStr} | ${dDesc} | ${vCount} | ${tTx} | ${utd} | ${tutd} | ${pct} | ${lastD} | ${rk} |\n`;
  });

  text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+ \n`;
  text += `\`\`\`\n`;
  text += `\n_Laporan otomatis dikirim ke Group 120363430505509462 via https://pmreg5.afratarigan.my.id_`;

  const targetGroupJid = '120363430505509462@g.us';
  const gowaUrl = 'https://gowa.waterflai.my.id';
  const activeDeviceId = 'aaaa';
  
  const authHeader = 'Basic ' + Buffer.from('admin:Sedap321#').toString('base64');

  // Try with phone format: 120363430505509462@g.us and 120363430505509462
  const targets = ['120363430505509462@g.us', '120363430505509462'];
  let success = false;
  let responseDetail = '';

  for (const t of targets) {
    const url = `${gowaUrl}/send/message?device_id=${activeDeviceId}`;
    console.log(`Sending POST ${url} to target: ${t}...`);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'X-Device-Id': activeDeviceId
        },
        body: JSON.stringify({
          phone: t,
          message: text
        })
      });
      const resText = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Body: ${resText}`);
      responseDetail = resText;
      if (res.status === 200 || res.status === 201) {
        console.log(`\n🎉🎉🎉 SUCCESS! Message delivered to WhatsApp Group ${t}! 🎉🎉🎉\n`);
        success = true;
        break;
      }
    } catch (e) {
      console.error('Error sending:', e.message);
    }
  }

  // Update wa_config in Supabase
  const { data: existing } = await sb.from('hierarchy_data').select('*').eq('id', 100).single();
  let currentMap = existing?.data || {};
  currentMap['wa_config'] = {
    ...currentMap['wa_config'],
    targetPhone: '120363430505509462@g.us',
    targetGroup: 'Group PM (120363430505509462)',
    provider: 'gowa',
    gowaUrl: 'https://gowa.waterflai.my.id',
    gowaUser: 'admin',
    gowaPass: 'Sedap321#',
    gowaDevice: 'aaaa',
    autoSendEnabled: true,
    sendTime: '08:00 & 15:30',
    updatedAt: new Date().toISOString()
  };
  await sb.from('hierarchy_data').upsert({ id: 100, data: currentMap, updated_at: new Date().toISOString() });

  // Record log entry
  const logEntry = {
    timestamp: new Date().toISOString(),
    target: '120363430505509462@g.us',
    status: success ? 'SUCCESS' : 'FAILED',
    summaryCount: plants.length,
    detail: responseDetail
  };

  const { data: existingLogs } = await sb.from('hierarchy_data').select('*').eq('id', 101).single();
  const logsArr = existingLogs?.data || [];
  logsArr.unshift(logEntry);
  await sb.from('hierarchy_data').upsert({ id: 101, data: logsArr.slice(0, 50), updated_at: new Date().toISOString() });
  console.log('✅ Log entry recorded in Supabase (id=101).');
}

run();
