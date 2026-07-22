import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Auto-detect Chrome path: Windows (local) or Linux (GitHub Actions / server)
function getChromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform === 'linux') {
    const linuxPaths = [
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium'
    ];
    for (const p of linuxPaths) {
      try { fs.accessSync(p); return p; } catch {}
    }
  }
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}
const chromePath = getChromePath();

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

export async function generateAndSendTablePdf(targetGroupJid = TARGET_GROUP_JID) {
  console.log(`[${new Date().toISOString()}] Generating Clean 1-Page A4 Portrait PDF without source footer...`);

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

  let tableData = Object.keys(PLANT_INFO).map(plantCode => {
    const info = PLANT_INFO[plantCode];
    const plantVehicles = masterEquipments.filter(e => e.plant === plantCode && String(e.eq_num || '').startsWith('20000'));
    const vehicleCount = plantVehicles.length > 0 ? plantVehicles.length : (VEHICLE_MASTER_COUNT[plantCode] || 0);

    const plantLogs = monthLogs.filter(l => l.plant === plantCode);
    const totalTx = plantLogs.length;

    let utdCount = 0;
    let tutdCount = 0;
    plantLogs.forEach(l => {
      try {
        const diff = calculateDaysDifference(l.created_on || l.date, l.date);
        if (diff <= 1) utdCount++; else tutdCount++;
      } catch (e) { tutdCount++; }
    });

    let lastLogDateRaw = '-';
    let lastLogDateFormatted = '-';
    if (plantLogs.length > 0) {
      const dates = plantLogs.map(l => l.date).sort();
      lastLogDateRaw = dates[dates.length - 1];
      const parts = lastLogDateRaw.split('-');
      lastLogDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return {
      wilayah: info.wilayah,
      plant: plantCode,
      desc: info.desc,
      vehicleCount,
      hariKerja: vehicleCount > 0 ? 16 : '-',
      targetTotal: vehicleCount > 0 ? (vehicleCount * 16) : 0,
      upToDate: utdCount,
      notUpToDate: tutdCount,
      totalTransaksi: totalTx,
      pctUtd: totalTx > 0 ? (utdCount / totalTx) * 100 : 0,
      pctTutd: totalTx > 0 ? (tutdCount / totalTx) * 100 : 0,
      lastLogDateRaw,
      lastLogDateFormatted
    };
  });

  tableData.sort((a, b) => a.plant.localeCompare(b.plant));

  const rankedList = [...tableData].sort((a, b) => (b.pctUtd - a.pctUtd) || (b.totalTransaksi - a.totalTransaksi));
  tableData.forEach(item => item.rank = rankedList.findIndex(r => r.plant === item.plant) + 1);

  const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthName = monthsIndo[now.getMonth()];
  const yearStr = now.getFullYear();
  const dateTargetFormatted = `${dayStr}/${String(now.getMonth()+1).padStart(2, '0')}/${yearStr}`;
  const headerTitleText = `Monitoring Transaksi Logbook tanggal 1 s.d ${dayStr} ${monthName} ${yearStr} ${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;

  const rowsHtml = tableData.map(item => {
    const bgClass = getIndicatorClass(item.lastLogDateRaw, targetDateStr);
    return `
      <tr>
        <td style="color: #374151;">${item.wilayah}</td>
        <td style="font-weight: 800; color: #16a34a;">${item.plant}</td>
        <td style="text-align: left; padding-left: 12px;">${item.desc}</td>
        <td>${item.vehicleCount || '-'}</td>
        <td>${item.hariKerja}</td>
        <td style="font-weight: 700;">${item.targetTotal}</td>
        <td style="font-weight: 800; color: #16a34a;">${item.upToDate}</td>
        <td style="font-weight: 800; color: #dc2626;">${item.notUpToDate}</td>
        <td style="font-weight: 800;">${item.totalTransaksi}</td>
        <td style="font-weight: 800; color: #16a34a;">${item.pctUtd.toFixed(2)}%</td>
        <td style="font-weight: 800; color: #dc2626;">${item.pctTutd.toFixed(2)}%</td>
        <td class="${bgClass}">${item.lastLogDateFormatted}</td>
        <td style="font-weight: 800;">${item.rank}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; padding: 30px 40px; background: #ffffff; font-family: "Segoe UI", "Calibri", "Arial", sans-serif; color: #000000; width: 1600px; box-sizing: border-box; }
    .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .header-left { display: flex; flex-direction: column; gap: 4px; }
    .title { font-size: 20px; font-weight: 800; color: #000000; }
    .subtitle { font-size: 16px; font-weight: 800; color: #000000; text-transform: uppercase; }
    .header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .h-badge { border: 1px solid #cbd5e1; padding: 4px 16px; font-size: 14px; font-weight: bold; }
    .target { font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 13px; }
    th { font-weight: 800; text-transform: uppercase; background: #ffffff; }
    .th-group { font-weight: 800; }
    .bg-green { background-color: #10b981 !important; color: white !important; font-weight: 700; }
    .bg-yellow { background-color: #facc15 !important; color: #000000 !important; font-weight: 700; }
    .bg-red { background-color: #ef4444 !important; color: white !important; font-weight: 700; }
    .bg-black { background-color: #000000 !important; color: white !important; font-weight: 700; }
    .legend-container { display: flex; align-items: center; gap: 20px; margin-top: 20px; font-size: 14px; font-weight: 600; }
    .legend-item { display: flex; align-items: center; gap: 8px; }
    .legend-box { width: 24px; height: 16px; }
  </style>
</head>
<body>
  <div class="header-container">
    <div class="header-left">
      <div class="title">${headerTitleText}</div>
      <div class="subtitle">REGIONAL 5</div>
    </div>
    <div class="header-right">
      <div class="h-badge">H + 1</div>
      <div class="target">Target input logbook : <b>${dateTargetFormatted}</b></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2">WILAYAH</th>
        <th rowspan="2">PLANT</th>
        <th rowspan="2" style="width: 280px;">DESC</th>
        <th rowspan="2">JUMLAH<br>VEHICLE CODE</th>
        <th rowspan="2">JUMLAH<br>HARI KERJA</th>
        <th rowspan="2">RENCANA<br>TRANSAKSI</th>
        <th colspan="2" class="th-group">STATUS</th>
        <th rowspan="2">TOTAL<br>TRANSAKSI</th>
        <th colspan="2" class="th-group">PERSENTASE ( % )</th>
        <th rowspan="2">LAST<br>LOGBOOK DATE</th>
        <th rowspan="2">RANK</th>
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

  <div class="legend-container">
    <div style="font-weight: 800; font-size: 16px;">Indikator :</div>
    <div class="legend-item"><div class="legend-box bg-green"></div> Inputan sesuai / lebih dari target</div>
    <div class="legend-item"><div class="legend-box bg-yellow"></div> Inputan terlambat &gt; 1 dan &lt; 3 hari</div>
    <div class="legend-item"><div class="legend-box bg-red"></div> Inputan terlambat &gt; 3 hari</div>
  </div>
</body>
</html>
  `;

  const htmlPath = path.resolve('temp_report_clean.html');
  const jpgPath = path.join(__dirname, '..', 'Rekap_Logbook_Kendaraan_Regional5_Clean.jpg');
  fs.writeFileSync(htmlPath, htmlContent);

  console.log("Generating Clean HD Image via Puppeteer...");
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1700, height: 1000, deviceScaleFactor: 1.5 });
  
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  
  await page.screenshot({
    path: jpgPath,
    type: 'jpeg',
    quality: 95,
    fullPage: true
  });
  
  await browser.close();

  const imgSize = fs.statSync(jpgPath).size;
  console.log(`Clean HD JPEG generated at ${jpgPath} (Size: ${imgSize} bytes)`);

  // Send PDF via GoWA /send/file
  const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
  let deviceId = 'aaaa';

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

  console.log(`Sending Clean HD JPEG to GoWA Group: ${targetGroupJid} using device ${deviceId}...`);

  const imgBuffer = fs.readFileSync(jpgPath);
  const formData = new FormData();
  formData.append('phone', targetGroupJid);
  formData.append('caption', headerTitleText);
  formData.append('is_hd', 'true');
  const blob = new Blob([imgBuffer], { type: 'image/jpeg' });
  formData.append('image', blob, `Rekap_Logbook_Kendaraan_Regional5_${dayStr}_${monthName}_${yearStr}.jpg`);

  const gowaRes = await fetch(`${GOWA_URL}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'X-Device-Id': deviceId
    },
    body: formData
  });

  const gowaData = await gowaRes.json();
  console.log("GoWA Send Clean Image Response:", JSON.stringify(gowaData, null, 2));

  // Clean up temp files
  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
  if (fs.existsSync(jpgPath)) fs.unlinkSync(jpgPath);

  return gowaData;
}

if (process.argv[1].endsWith('test_pdf_generator.js')) {
  generateAndSendTablePdf().catch(console.error);
}
