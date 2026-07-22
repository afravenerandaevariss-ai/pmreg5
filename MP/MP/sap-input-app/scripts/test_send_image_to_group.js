import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

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
const TARGET_GROUP_JID = '120363430505509462@g.us';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

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

function getIndicatorClass(lastLogDateStr, targetDateStr) {
  if (!lastLogDateStr || lastLogDateStr === '-') return 'bg-black';
  try {
    const diff = calculateDaysDifference(targetDateStr, lastLogDateStr);
    if (diff <= 0 || diff === 1) return 'bg-green';
    if (diff > 1 && diff <= 3) return 'bg-yellow';
    return 'bg-red';
  } catch (e) {
    return 'bg-red';
  }
}

export async function generateAndSendTableImage(targetGroupJid = TARGET_GROUP_JID) {
  console.log(`[${new Date().toISOString()}] Generating Monitoring Transaksi Logbook table image...`);

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

    let lastLogDateRaw = '-';
    let lastLogDateFormatted = '-';
    if (plantLogs.length > 0) {
      const dates = plantLogs.map(l => l.date).sort();
      lastLogDateRaw = dates[dates.length - 1];
      const parts = lastLogDateRaw.split('-');
      lastLogDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    list.push({
      wilayah: info.wilayah,
      plant: plantCode,
      desc: info.desc,
      vehicleCount,
      workDays: 16,
      rencanaTx: totalTx > 0 ? totalTx : (vehicleCount * 16),
      totalTx,
      utdCount,
      tutdCount,
      pctUtd,
      pctTutd,
      lastLogDateRaw,
      lastLogDateFormatted
    });
  });

  list.sort((a, b) => {
    if (b.pctUtd !== a.pctUtd) return b.pctUtd - a.pctUtd;
    return b.totalTx - a.totalTx;
  });

  list.forEach((item, idx) => item.rank = idx + 1);

  const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthName = monthsIndo[now.getMonth()];
  const yearStr = now.getFullYear();
  const dateTitleStr = `${dayStr} ${monthName} ${yearStr}`;
  const hoursStr = String(now.getHours()).padStart(2, '0');
  const minsStr = String(now.getMinutes()).padStart(2, '0');
  const timeFormatted = `${hoursStr}.${minsStr}`;
  const dateTargetFormatted = `${dayStr}/${String(now.getMonth()+1).padStart(2, '0')}/${yearStr}`;

  // Build rows HTML
  const rowsHtml = list.map(item => {
    const bgClass = getIndicatorClass(item.lastLogDateRaw, targetDateStr);
    return `
      <tr>
        <td>${item.wilayah}</td>
        <td style="font-weight:700;">${item.plant}</td>
        <td style="text-align:left; font-weight:600;">${item.desc}</td>
        <td>${item.vehicleCount || '-'}</td>
        <td>${item.workDays || '-'}</td>
        <td>${item.rencanaTx || 0}</td>
        <td>${item.utdCount}</td>
        <td>${item.tutdCount}</td>
        <td style="font-weight:800;">${item.totalTx}</td>
        <td style="font-weight:600;">${item.pctUtd.toFixed(2)}%</td>
        <td style="font-weight:600;">${item.pctTutd.toFixed(2)}%</td>
        <td class="${bgClass}">${item.lastLogDateFormatted}</td>
        <td style="font-weight:800;">${item.rank}</td>
        <td><span style="color:#0284c7;">&#128065;</span></td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 15px; }
    .card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); width: 1120px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .title { font-size: 15px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .target { font-size: 11px; font-weight: 700; color: #0f172a; }
    .h-badge { background: #ffffff; border: 1px solid #94a3b8; padding: 1px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; display: inline-block; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: center; }
    th { background-color: #ffffff; font-weight: 800; color: #0f172a; font-size: 10px; }
    .th-group { background-color: #ffffff; font-weight: 800; }
    .bg-green { background-color: #10b981; color: white; font-weight: 700; }
    .bg-yellow { background-color: #facc15; color: #0f172a; font-weight: 700; }
    .bg-red { background-color: #ef4444; color: white; font-weight: 700; }
    .bg-black { background-color: #0f172a; color: white; font-weight: 700; }
    .legend { display: flex; align-items: center; gap: 20px; margin-top: 16px; font-size: 11px; font-weight: 600; color: #1e293b; }
    .legend-box { width: 32px; height: 16px; border-radius: 2px; display: inline-block; vertical-align: middle; margin-right: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="title">Monitoring Transaksi Logbook tanggal 1 s.d ${dateTitleStr} ${timeFormatted}</div>
        <div class="subtitle">REGIONAL 5</div>
      </div>
      <div style="text-align: right;">
        <div class="h-badge">H + 1</div>
        <div class="target" style="margin-top:4px;">Target input logbook : ${dateTargetFormatted}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2">WILAYAH</th>
          <th rowspan="2">PLANT</th>
          <th rowspan="2" style="width: 200px;">DESC</th>
          <th rowspan="2">JUMLAH<br>VEHICLE CODE</th>
          <th rowspan="2">JUMLAH<br>HARI KERJA</th>
          <th rowspan="2">RENCANA<br>TRANSAKSI</th>
          <th colspan="2" class="th-group">STATUS</th>
          <th rowspan="2">TOTAL<br>TRANSAKSI</th>
          <th colspan="2" class="th-group">PERSENTASE (%)</th>
          <th rowspan="2">LAST<br>LOGBOOK DATE</th>
          <th rowspan="2">RANK</th>
          <th rowspan="2">DETAIL</th>
        </tr>
        <tr>
          <th class="th-group">UP TO<br>DATE</th>
          <th class="th-group">TIDAK<br>UP TO DATE</th>
          <th class="th-group">UP TO<br>DATE</th>
          <th class="th-group">TIDAK<br>UP TO DATE</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="legend">
      <div style="font-weight:700;">Indikator :</div>
      <div><span class="legend-box bg-green"></span> Inputan sesuai / lebih dari target</div>
      <div><span class="legend-box bg-yellow"></span> Inputan terlambat &gt; 1 dan &lt; 3 hari</div>
      <div><span class="legend-box bg-red"></span> Inputan terlambat &gt; 3 hari</div>
    </div>
  </div>
</body>
</html>
  `;

  const htmlPath = path.resolve('temp_report_full.html');
  const imgPath = path.resolve('temp_report_full.png');
  fs.writeFileSync(htmlPath, htmlContent);

  console.log("Rendering table screenshot via Chrome headless...");

  await new Promise((resolve, reject) => {
    execFile(chromePath, [
      '--headless=new',
      '--disable-gpu',
      `--screenshot=${imgPath}`,
      '--window-size=1200,1650',
      '--default-background-color=00000000',
      `file:///${htmlPath.replace(/\\/g, '/')}`
    ], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  console.log(`Image generated at ${imgPath} (Size: ${fs.statSync(imgPath).size} bytes)`);

  // Send image to GoWA
  const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
  let deviceId = 'aaaa'; // active device

  try {
    const devRes = await fetch(`${GOWA_URL}/devices`, { headers: { 'Authorization': authHeader } });
    if (devRes.ok) {
      const devData = await devRes.json();
      const activeDev = (devData.results || []).find(d => d.state === 'logged_in');
      if (activeDev) deviceId = activeDev.id;
    }
  } catch (e) {
    console.warn("Using default device:", deviceId);
  }

  console.log(`Sending image to GoWA Group: ${targetGroupJid} using device ${deviceId}...`);

  const imgBuffer = fs.readFileSync(imgPath);
  const formData = new FormData();
  formData.append('phone', targetGroupJid);
  formData.append('caption', `Monitoring Transaksi Logbook Regional 5 (${dateTargetFormatted} ${timeFormatted})`);
  const blob = new Blob([imgBuffer], { type: 'image/png' });
  formData.append('image', blob, 'logbook_rekap_regional5.png');

  const gowaRes = await fetch(`${GOWA_URL}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'X-Device-Id': deviceId
    },
    body: formData
  });

  const gowaData = await gowaRes.json();
  console.log("GoWA Send Image Response:", JSON.stringify(gowaData, null, 2));

  // Clean up temp files
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);

  return gowaData;
}

if (process.argv[1].endsWith('test_send_image_to_group.js')) {
  generateAndSendTableImage().catch(console.error);
}
