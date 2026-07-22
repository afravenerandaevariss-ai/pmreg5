import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pabnvxlvrussdfhisxzn.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const GOWA_URL = 'https://gowa.waterflai.my.id';
const GOWA_USER = 'admin';
const GOWA_PASS = 'Sedap321#';

const PLANT_INFO = {
  "5E01": { desc: "KEBUN GUNUNG MELIAU",   wilayah: "Kal-Bar" },
  "5E02": { desc: "KEBUN GUNUNG MAS",      wilayah: "Kal-Bar" },
  "5E03": { desc: "KEBUN SUNGAI DEKAN",    wilayah: "Kal-Bar" },
  "5E04": { desc: "KEBUN RIMBA BELIAN",     wilayah: "Kal-Bar" },
  "5E06": { desc: "KEBUN SINTANG",          wilayah: "Kal-Bar" },
  "5E07": { desc: "KEBUN NGABANG",          wilayah: "Kal-Bar" },
  "5E08": { desc: "KEBUN PARINDU",          wilayah: "Kal-Bar" },
  "5E09": { desc: "KEBUN KEMBAYAN",         wilayah: "Kal-Bar" },
  "5F01": { desc: "PABRIK GUNUNG MELIAU",   wilayah: "Kal-Bar" },
  "5F04": { desc: "PABRIK RIMBA BELIAN",    wilayah: "Kal-Bar" },
  "5F07": { desc: "PABRIK NGABANG",         wilayah: "Kal-Bar" },
  "5F08": { desc: "PABRIK PARINDU",         wilayah: "Kal-Bar" },
  "5F09": { desc: "PABRIK KEMBAYAN",        wilayah: "Kal-Bar" },
  "5D01": { desc: "DISTRIK KALBAR",         wilayah: "Kal-Bar" },
  "5E11": { desc: "KEBUN DANAU SALAK",      wilayah: "Kal-Sel-Teng" },
  "5E12": { desc: "KEBUN KUMAI KARET",      wilayah: "Kal-Sel-Teng" },
  "5E13": { desc: "KEBUN BATULICIN",        wilayah: "Kal-Sel-Teng" },
  "5E14": { desc: "KEBUN PAMUKAN",          wilayah: "Kal-Sel-Teng" },
  "5E15": { desc: "KEBUN PELAIHARI",        wilayah: "Kal-Sel-Teng" },
  "5F11": { desc: "UNIT PROYEK BATU BARA",  wilayah: "Kal-Sel-Teng" },
  "5F14": { desc: "PABRIK PAMUKAN",         wilayah: "Kal-Sel-Teng" },
  "5F15": { desc: "PABRIK PELAIHARI",       wilayah: "Kal-Sel-Teng" },
  "5F20": { desc: "PKR TAMBARANGAN",        wilayah: "Kal-Sel-Teng" },
  "5F21": { desc: "PABRIK SAMUNTAI",        wilayah: "Kal-Sel-Teng" },
  "5F22": { desc: "PABRIK LONG PINANG",     wilayah: "Kal-Sel-Teng" },
  "5D02": { desc: "DISTRIK KALTIM",         wilayah: "Kal-Sel-Teng" },
  "5D03": { desc: "DISTRIK KALSELTENG",     wilayah: "Kal-Sel-Teng" },
  "5E16": { desc: "KEBUN TABARA",           wilayah: "Kal-Tim" },
  "5E17": { desc: "KEBUN TAJATI",           wilayah: "Kal-Tim" },
  "5E18": { desc: "KEBUN PANDAWA",          wilayah: "Kal-Tim" },
  "5E19": { desc: "KEBUN LONGKALI",         wilayah: "Kal-Tim" },
};

const VEHICLE_MASTER_COUNT = {
  "5E01": 14, "5E02": 9, "5E03": 13, "5E04": 11, "5E06": 1, "5E07": 18, "5E08": 16, "5E09": 8,
  "5F01": 4, "5F04": 3, "5F07": 5, "5F08": 4, "5F09": 7, "5D01": 8,
  "5E11": 7, "5E12": 3, "5E13": 5, "5E14": 18, "5E15": 7,
  "5F11": 0, "5F14": 2, "5F15": 2, "5F20": 1, "5F21": 1, "5F22": 3, "5D02": 4, "5D03": 4,
  "5E16": 24, "5E17": 17, "5E18": 11, "5E19": 22
};

async function getSystemConfig(numericId) {
  const { data } = await supabase
    .from('hierarchy_data')
    .select('data')
    .eq('id', numericId)
    .single();
  return data?.data || null;
}

function calculateDaysDifference(d1, d2) {
  const date1 = new Date(d1 + 'T00:00:00');
  const date2 = new Date(d2 + 'T00:00:00');
  return Math.floor((date1 - date2) / (1000 * 60 * 60 * 24));
}

export async function sendViaGoWA(targetPhone = '081251334618') {
  console.log(`Building WA Logbook report...`);
  const [logs, eqData] = await Promise.all([
    getSystemConfig(9),
    supabase.from('master_equipment').select('*')
  ]);

  const masterEquipments = eqData.data || [];
  const activeLogs = (logs || []).filter(l => l.status !== 'CANCELLED');

  const now = new Date();
  const targetDateStr = now.toISOString().split('T')[0];
  const targetMonthStr = targetDateStr.substring(0, 7);
  const monthLogs = activeLogs.filter(l => l.date && l.date.startsWith(targetMonthStr));

  const list = [];
  Object.entries(PLANT_INFO).forEach(([plantCode, info]) => {
    const plantVehicles = masterEquipments.filter(e => e.plant === plantCode && String(e.eq_num || '').startsWith('20000'));
    const vehicleCount = plantVehicles.length > 0 ? plantVehicles.length : (VEHICLE_MASTER_COUNT[plantCode] || 0);
    const plantLogs = monthLogs.filter(l => l.plant === plantCode);
    const totalTx = plantLogs.length;

    let utdCount = 0;
    let tutdCount = 0;
    plantLogs.forEach(l => {
      if (!l.created_on) tutdCount++;
      else {
        try {
          const diff = calculateDaysDifference(l.created_on, l.date);
          if (diff <= 1) utdCount++;
          else tutdCount++;
        } catch (e) { tutdCount++; }
      }
    });

    const pctUtd = totalTx > 0 ? (utdCount / totalTx) * 100 : 0;
    const pctTutd = totalTx > 0 ? (tutdCount / totalTx) * 100 : 0;

    let lastLogDate = '-';
    if (plantLogs.length > 0) {
      const dates = plantLogs.map(l => l.date).sort();
      const maxDate = dates[dates.length - 1];
      const parts = maxDate.split('-');
      lastLogDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    list.push({
      wilayah: info.wilayah,
      plant: plantCode,
      desc: info.desc,
      vehicleCount,
      totalTx,
      utdCount,
      tutdCount,
      pctUtd,
      pctTutd,
      lastLogDate
    });
  });

  list.sort((a, b) => {
    if (b.pctUtd !== a.pctUtd) return b.pctUtd - a.pctUtd;
    return b.totalTx - a.totalTx;
  });
  list.forEach((item, idx) => item.rank = idx + 1);

  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = now.getFullYear();
  const dateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
  const hoursStr = String(now.getHours()).padStart(2, '0');
  const minsStr = String(now.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hoursStr}.${minsStr}`;

  let text = `*Monitoring Transaksi Logbook tanggal 1 s.d ${dateFormatted} ${timeFormatted}*\n`;
  text += `*REGIONAL 5*\n`;
  text += `Target input logbook : *${dateFormatted}*\n\n`;

  text += `\`\`\`\n`;
  text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+\n`;
  text += `| Plant | Description             | Veh  | Total Tx | UTD | TUTD| % UTD  | Last Log   | Rank |\n`;
  text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+\n`;

  list.forEach(item => {
    const pCode = item.plant.padEnd(5);
    const dDesc = item.desc.length > 23 ? item.desc.substring(0, 20) + '...' : item.desc.padEnd(23);
    const vCount = String(item.vehicleCount).padStart(4);
    const tTx = String(item.totalTx).padStart(8);
    const utd = String(item.utdCount).padStart(3);
    const tutd = String(item.tutdCount).padStart(3);
    const pct = `${item.pctUtd.toFixed(1)}%`.padStart(6);
    const lastD = item.lastLogDate.padStart(10);
    const rk = String(item.rank).padStart(4);

    text += `| ${pCode} | ${dDesc} | ${vCount} | ${tTx} | ${utd} | ${tutd} | ${pct} | ${lastD} | ${rk} |\n`;
  });
  text += `+-------+-------------------------+------+----------+-----+-----+--------+------------+------+\n`;
  text += `\`\`\`\n`;
  text += `\n_Laporan otomatis diproses dari https://pmreg5.afratarigan.my.id (Jadwal 08:00 WIB & 15:30 WIB)_`;

  console.log("Sending to GoWA gateway https://gowa.waterflai.my.id ...");

  // Fetch active device from GoWA
  const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
  let deviceId = '黄玲玲';

  try {
    const devRes = await fetch(`${GOWA_URL}/devices`, { headers: { 'Authorization': authHeader } });
    if (devRes.ok) {
      const devData = await devRes.json();
      const activeDev = (devData.results || []).find(d => d.state === 'logged_in');
      if (activeDev) {
        deviceId = activeDev.id;
        console.log(`Found active GoWA device: ${activeDev.display_name} (ID: ${deviceId})`);
      }
    }
  } catch (e) {
    console.log(`Using default GoWA device: ${deviceId}`);
  }

  const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
  const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;

  const gowaRes = await fetch(`${GOWA_URL}/send/message?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone: formattedPhone,
      message: text
    })
  });

  const gowaData = await gowaRes.json();
  console.log("GoWA Gateway Response:", gowaData);

  return { success: gowaData.code === 'SUCCESS', detail: gowaData, text };
}

if (process.argv[1].endsWith('test_send_via_gowa.js')) {
  sendViaGoWA().catch(console.error);
}
