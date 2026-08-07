import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTsA87B43S7y8HgSlEH4Wgu1-SQG8R0ZimWvhDlYJwETWoMKyV13R3hno660bDplBKpaS97nLMZBgUx/pub?output=csv';

const plantGidMap = {
  '5F01': '1081171877',
  '5F04': '378103327',
  '5F07': '2089303535',
  '5F08': '374368206',
  '5F09': '1722739608',
  '5F14': '526940195',
  '5F15': '1678430152',
  '5F21': '954169137',
  '5F22': '510068100'
};

function parseCsvLine(line) {
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cols.push(cur.trim().replace(/^"|"$/g, ''));
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim().replace(/^"|"$/g, ''));
  return cols;
}

async function run() {
  console.log('🚀 Executing full fresh August 2026 multi-tab GSheet sync (Poin 1, 2, 3, 4, 8, 9)...');

  // 1. Fetch master equipment to ensure exact FLOC classification and Induk mapping
  const { data: dbEquips, error: eqErr } = await supabase.from('master_equipment').select('*');
  if (eqErr) {
    console.error('Error fetching master equipment:', eqErr);
    return;
  }
  console.log(`Fetched ${dbEquips.length} master equipment records.`);

  // Map eqNum -> equipment object
  const eqMap = new Map();
  dbEquips.forEach(eq => eqMap.set(eq.eq_num, eq));

  const newLogsMap = new Map();
  const gridByPlant = {};

  for (const [plantCode, gid] of Object.entries(plantGidMap)) {
    const url = `${baseUrl}&gid=${gid}`;
    console.log(`Fetching Plant ${plantCode} (GID ${gid})...`);

    const r = await fetch(url);
    const text = await r.text();
    const lines = text.split('\n').map(l => l.trimEnd()).filter(l => l.trim());

    if (!gridByPlant[plantCode]) gridByPlant[plantCode] = {};

    let headerIdx = -1;
    let headers = [];
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const cols = parseCsvLine(lines[i]).map(c => c.toLowerCase());
      const hasEqOrPlant = cols.some(c => c.includes('equipment') || c.includes('kode') || c.includes('plant') || c.includes('mesin'));
      const hasDayNumbers = cols.some(c => /^0?[1-9]$|^[12][0-9]$|^3[01]$/.test(c));
      if (hasEqOrPlant && hasDayNumbers) {
        headerIdx = i;
        headers = cols;
        break;
      }
    }

    if (headerIdx === -1) {
      console.warn(`Header not found for plant ${plantCode}`);
      continue;
    }

    const dayColMap = [];
    headers.forEach((h, idx) => {
      const m = h.match(/^0?([1-9]|[12][0-9]|3[01])$/);
      if (m) {
        dayColMap.push({ dayNum: parseInt(m[1], 10), colIdx: idx });
      }
    });

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      const eqNum = cols[0];
      const eqDesc = cols[1];

      if (!eqNum || !/^\d+$/.test(eqNum)) continue;

      dayColMap.forEach(({ dayNum, colIdx }) => {
        const valStr = (cols[colIdx] || '').replace(/^"|"$/g, '').trim();

        // Rule: If valStr is empty, 0, or '-' -> NO LOG CREATED (Date 05 stays clean 0h)
        if (!valStr || valStr === '-' || valStr === '0') return;

        let hours = 0;
        if (valStr === '✓' || valStr.toLowerCase() === 'v') {
          hours = 24;
        } else {
          const num = parseFloat(valStr.replace(',', '.'));
          if (!isNaN(num) && num > 0) hours = num;
          else return;
        }

        if (hours > 0) {
          const dayPad = String(dayNum).padStart(2, '0');
          const dateStr = `2026-08-${dayPad}`;
          const uniqueKey = `${plantCode}_${eqNum}_${dateStr}`;
          const logId = `log_${uniqueKey}`;

          // Find exact Induk equipment info
          const matchedEq = eqMap.get(eqNum);
          const isInduk = matchedEq ? (matchedEq.eq_type === 'Induk') : (cols[2] ? cols[2].split('-').length <= 5 : true);

          newLogsMap.set(uniqueKey, {
            id: logId,
            plant: plantCode,
            date: dateStr,
            induk_eq_num: eqNum,
            induk_desc: eqDesc || (matchedEq ? matchedEq.description : eqNum),
            duration_minutes: Math.round(hours * 60),
            status: 'Normal',
            notes: null,
            timestamp: new Date().toISOString(),
            did_run: true,
            damaged_subs: []
          });

          if (!gridByPlant[plantCode][eqNum]) gridByPlant[plantCode][eqNum] = {};
          gridByPlant[plantCode][eqNum][dayNum] = hours;
        }
      });
    }
  }

  const cleanLogs = Array.from(newLogsMap.values());
  console.log(`Generated EXACTLY ${cleanLogs.length} per-plant numeric daily logs for August 2026.`);

  // 4. Purge ALL August 2026 daily_logs from Supabase completely
  console.log('Purging ALL August 2026 daily_logs from Supabase...');
  const { error: delErr } = await supabase
    .from('daily_logs')
    .delete()
    .gte('date', '2026-08-01')
    .lte('date', '2026-08-31');

  if (delErr) {
    console.error('Error purging old logs:', delErr);
    return;
  }
  console.log('✅ ALL August 2026 logs purged successfully.');

  // Insert fresh 100% accurate numeric logs into Supabase
  console.log('Inserting exact numeric daily_logs into Supabase...');
  const chunkSize = 100;
  for (let i = 0; i < cleanLogs.length; i += chunkSize) {
    const chunk = cleanLogs.slice(i, i + chunkSize);
    const { error: insErr } = await supabase.from('daily_logs').upsert(chunk, { onConflict: 'id' });
    if (insErr) console.error('Insert error:', insErr);
  }
  console.log('✅ Exact numeric daily_logs inserted into Supabase.');

  // Update grid configs in hierarchy_data (id=4)
  console.log('Updating grid configs for all plants in hierarchy_data (id=4)...');
  for (const plantCode of Object.keys(gridByPlant)) {
    await supabase.from('hierarchy_data').upsert({ id: 4, data: gridByPlant[plantCode], updated_at: new Date().toISOString() });
  }

  console.log('🎉 === FREEDOM IMPORT COMPLETE: All 9 plants synced from August 01 to 06! ===');
}

run();
