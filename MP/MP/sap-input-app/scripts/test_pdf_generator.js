import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import puppeteer from 'puppeteer-core';
import { execSync } from 'child_process';

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

const GOWA_URL = process.env.GOWA_URL || 'https://gowa.waterflai.my.id';
const GOWA_USER = process.env.GOWA_USER || 'admin';
const GOWA_PASS = process.env.GOWA_PASS || 'Sedap321#';
const TARGET_GROUP_JID = process.env.TARGET_GROUP_JID || '120363430505509462@g.us';

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

const PLANT_INFO = {
  "5D01": { desc: "DISTRIK KALBAR",         wilayah: "Kal-Bar" },
  "5D02": { desc: "DISTRIK KALTIM",         wilayah: "Kal-Sel-Teng" },
  "5D03": { desc: "DISTRIK KALSELTENG",     wilayah: "Kal-Sel-Teng" },
  "5E01": { desc: "KEBUN GUNUNG MELIAU",    wilayah: "Kal-Bar" },
  "5E02": { desc: "KEBUN GUNUNG MAS",       wilayah: "Kal-Bar" },
  "5E03": { desc: "KEBUN SUNGAI DEKAN",     wilayah: "Kal-Bar" },
  "5E04": { desc: "KEBUN RIMBA BELIAN",     wilayah: "Kal-Bar" },
  "5E06": { desc: "KEBUN SINTANG",          wilayah: "Kal-Bar" },
  "5E07": { desc: "KEBUN NGABANG",          wilayah: "Kal-Bar" },
  "5E08": { desc: "KEBUN PARINDU",          wilayah: "Kal-Bar" },
  "5E09": { desc: "KEBUN KEMBAYAN",         wilayah: "Kal-Bar" },
  "5E11": { desc: "KEBUN DANAU SALAK",      wilayah: "Kal-Sel-Teng" },
  "5E12": { desc: "KEBUN KUMAI KARET",      wilayah: "Kal-Sel-Teng" },
  "5E13": { desc: "KEBUN BATULICIN",        wilayah: "Kal-Sel-Teng" },
  "5E14": { desc: "KEBUN PAMUKAN",          wilayah: "Kal-Sel-Teng" },
  "5E15": { desc: "KEBUN PELAIHARI",        wilayah: "Kal-Sel-Teng" },
  "5E16": { desc: "KEBUN TABARA",           wilayah: "Kal-Tim" },
  "5E17": { desc: "KEBUN TAJATI",           wilayah: "Kal-Tim" },
  "5E18": { desc: "KEBUN PANDAWA",          wilayah: "Kal-Tim" },
  "5E19": { desc: "KEBUN LONGKALI",         wilayah: "Kal-Tim" },
  "5F01": { desc: "PABRIK GUNUNG MELIAU",   wilayah: "Kal-Bar" },
  "5F04": { desc: "PABRIK RIMBA BELIAN",    wilayah: "Kal-Bar" },
  "5F07": { desc: "PABRIK NGABANG",         wilayah: "Kal-Bar" },
  "5F08": { desc: "PABRIK PARINDU",         wilayah: "Kal-Bar" },
  "5F09": { desc: "PABRIK KEMBAYAN",        wilayah: "Kal-Bar" },
  "5F11": { desc: "UNIT PROYEK BATU BARA",  wilayah: "Kal-Sel-Teng" },
  "5F14": { desc: "PABRIK PAMUKAN",         wilayah: "Kal-Sel-Teng" },
  "5F15": { desc: "PABRIK PELAIHARI",       wilayah: "Kal-Sel-Teng" },
  "5F20": { desc: "PKR TAMBARANGAN",        wilayah: "Kal-Sel-Teng" },
  "5F21": { desc: "PABRIK SAMUNTAI",        wilayah: "Kal-Sel-Teng" },
  "5F22": { desc: "PABRIK LONG PINANG",     wilayah: "Kal-Sel-Teng" },
};

const VEHICLE_MASTER_COUNT = {
  "5E01": 14, "5E02": 9, "5E03": 13, "5E04": 11, "5E06": 1, "5E07": 18, "5E08": 16, "5E09": 8,
  "5F01": 4, "5F04": 3, "5F07": 5, "5F08": 4, "5F09": 7, "5D01": 8,
  "5E11": 7, "5E12": 3, "5E13": 5, "5E14": 18, "5E15": 7,
  "5F11": 0, "5F14": 2, "5F15": 2, "5F20": 1, "5F21": 1, "5F22": 3, "5D02": 4, "5D03": 4,
  "5E16": 24, "5E17": 17, "5E18": 11, "5E19": 22
};

async function getSystemConfig(numericId) {
  const { data } = await supabase.from('hierarchy_data').select('data').eq('id', numericId).single();
  return data?.data || null;
}

function calculateDaysDifference(d1, d2) {
  if (!d1 || !d2) return 999;
  const date1 = new Date(d1 + 'T00:00:00');
  const date2 = new Date(d2 + 'T00:00:00');
  return Math.floor((date1 - date2) / (1000 * 60 * 60 * 24));
}

function getIndicatorClass(lastLogDateRaw, targetDateStr) {
  if (!lastLogDateRaw || lastLogDateRaw === '-') return 'bg-black';
  try {
    const diff = calculateDaysDifference(targetDateStr, lastLogDateRaw);
    if (diff <= 1) return 'bg-green';
    if (diff <= 3) return 'bg-yellow';
    return 'bg-red';
  } catch { return 'bg-red'; }
}

export async function generateAndSendTablePdf(targetGroupJid = TARGET_GROUP_JID) {
  console.log(`[${new Date().toISOString()}] Generating Clean 1-Page A4 Portrait PDF without source footer...`);

  const [logs, eqData] = await Promise.all([
    getSystemConfig(9),
    supabase.from('master_equipment').select('*')
  ]);

  const masterEquipments = eqData.data || [];
  const activeLogs = (logs || []).filter(l => !l.cancelled);
  
  // MANUAL UTC+7 OFFSET UNTUK MENJAMIN WAKTU JAKARTA MESKIPUN SERVER GITHUB ERROR
  const utcNow = new Date();
  const wibNow = new Date(utcNow.getTime() + (7 * 60 * 60 * 1000));
  
  const targetDateStr = `${wibNow.getUTCFullYear()}-${String(wibNow.getUTCMonth() + 1).padStart(2, '0')}-${String(wibNow.getUTCDate()).padStart(2, '0')}`;
  const targetMonthStr = targetDateStr.substring(0, 7);
  const monthLogs = activeLogs.filter(l => l.date && l.date.startsWith(targetMonthStr));

  // Hitung jumlah hari kerja otomatis (kecuali Sabtu & Minggu) dalam bulan ini sampai hari ini
  let autoWorkingDays = 0;
  for (let d = 1; d <= wibNow.getUTCDate(); d++) {
    const checkDate = new Date(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), d);
    const dayOfWeek = checkDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) autoWorkingDays++;
  }

  let tableData = Object.keys(PLANT_INFO).sort().map(plantCode => {
    const info = PLANT_INFO[plantCode];
    const plantVehicles = masterEquipments.filter(e => e.plant === plantCode && String(e.eqNum || '').startsWith('20000'));
    const vehicleCount = plantVehicles.length > 0 ? plantVehicles.length : (VEHICLE_MASTER_COUNT[plantCode] || 0);
    const plantLogs = monthLogs.filter(l => l.plant === plantCode);
    const totalTx = plantLogs.length;
    let utdCount = 0, tutdCount = 0;
    
    plantLogs.forEach(l => {
      if (!l.created_on) {
        tutdCount++;
      } else {
        try {
          const diff = calculateDaysDifference(l.created_on, l.date);
          if (diff <= 1) utdCount++; else tutdCount++;
        } catch { tutdCount++; }
      }
    });
    
    let lastLogDateRaw = '-', lastLogDateFormatted = '-';
    if (plantLogs.length > 0) {
      const dates = plantLogs.map(l => l.date).sort();
      lastLogDateRaw = dates[dates.length - 1];
      const parts = lastLogDateRaw.split('-');
      lastLogDateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    return {
      wilayah: info.wilayah, plant: plantCode, desc: info.desc,
      vehicleCount, 
      hariKerja: (vehicleCount > 0 && totalTx > 0) ? autoWorkingDays : '-',
      targetTotal: totalTx,
      upToDate: utdCount, notUpToDate: tutdCount, totalTransaksi: totalTx,
      pctUtd: totalTx > 0 ? (utdCount / totalTx) * 100 : 0,
      pctTutd: totalTx > 0 ? (tutdCount / totalTx) * 100 : 0,
      lastLogDateRaw, lastLogDateFormatted
    };
  });

  const rankableList = tableData
    .filter(item => item.totalTransaksi > 0 && item.upToDate > 0)
    .sort((a, b) => {
      if (b.upToDate !== a.upToDate) return b.upToDate - a.upToDate;
      if (b.totalTransaksi !== a.totalTransaksi) return b.totalTransaksi - a.totalTransaksi;
      return a.plant.localeCompare(b.plant);
    });

  const rankMap = {};
  rankableList.forEach((item, idx) => {
    rankMap[item.plant] = idx + 1;
  });

  tableData.forEach(item => {
    if (item.totalTransaksi === 0 || item.upToDate === 0) {
      item.rank = 28;
    } else {
      item.rank = rankMap[item.plant] || 28;
    }
  });

  const monthsIndo = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
  const dayStr = String(wibNow.getUTCDate()).padStart(2, '0');
  const monthName = monthsIndo[wibNow.getUTCMonth()];
  const yearStr = wibNow.getUTCFullYear();
  const dateTargetFormatted = `${dayStr}/${String(wibNow.getUTCMonth() + 1).padStart(2, '0')}/${yearStr}`;
  const headerTitleText = `Monitoring Transaksi Logbook tanggal 1 s.d ${dayStr} ${monthName} ${yearStr} ${String(wibNow.getUTCHours()).padStart(2, '0')}.${String(wibNow.getUTCMinutes()).padStart(2, '0')}`;

  const rowsHtml = tableData.map(item => {
    const bgClass = getIndicatorClass(item.lastLogDateRaw, targetDateStr);
    return `
      <tr>
        <td style="color:#374151">${item.wilayah}</td>
        <td style="font-weight:800;color:#16a34a">${item.plant}</td>
        <td style="text-align:left;padding-left:8px">${item.desc}</td>
        <td>${item.vehicleCount || '-'}</td>
        <td>${item.hariKerja}</td>
        <td style="font-weight:700">${item.targetTotal || '-'}</td>
        <td style="font-weight:800;color:#16a34a">${item.upToDate}</td>
        <td style="font-weight:800;color:#dc2626">${item.notUpToDate}</td>
        <td style="font-weight:800">${item.totalTransaksi}</td>
        <td style="font-weight:800;color:#16a34a">${item.pctUtd.toFixed(2)}%</td>
        <td style="font-weight:800;color:#dc2626">${item.pctTutd.toFixed(2)}%</td>
        <td class="${bgClass}">${item.lastLogDateFormatted}</td>
        <td style="font-weight:800">${item.rank}</td>
      </tr>`;
  }).join('');

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: #fff;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #111;
      width: 1340px;
      padding: 18px 24px;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .title { font-size: 14.5px; font-weight: 800; }
    .subtitle { font-size: 12px; font-weight: 800; margin-top: 3px; }
    .header-right { text-align: right; }
    .badge { display: inline-block; border: 1px solid #94a3b8; padding: 2px 12px; font-size: 12px; font-weight: 700; margin-bottom: 4px; }
    .target-label { font-size: 11px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #94a3b8; padding: 5px 4px; text-align: center; font-size: 11px; white-space: nowrap; }
    th { background: #f1f5f9; font-weight: 700; font-size: 10px; text-transform: uppercase; line-height: 1.3; }
    td[style*="text-align:left"] { white-space: normal; }
    .bg-green { background: #22c55e; color: #fff; font-weight: 700; }
    .bg-yellow { background: #facc15; color: #000; font-weight: 700; }
    .bg-red { background: #ef4444; color: #fff; font-weight: 700; }
    .bg-black { background: #000; color: #fff; font-weight: 700; }
    .legend { display: flex; align-items: center; gap: 14px; margin-top: 10px; font-size: 10.5px; font-weight: 600; flex-wrap: wrap; }
    .leg-box { display: inline-block; width: 16px; height: 11px; margin-right: 4px; vertical-align: middle; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">${headerTitleText}</div>
      <div class="subtitle">REGIONAL 5</div>
    </div>
    <div class="header-right">
      <div class="badge">H + 1</div>
      <div class="target-label">Target input logbook : <b>${dateTargetFormatted}</b></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2">WILAYAH</th>
        <th rowspan="2">PLANT</th>
        <th rowspan="2" style="min-width:150px">DESC</th>
        <th rowspan="2">JUMLAH<br>VEHICLE CODE</th>
        <th rowspan="2">JUMLAH<br>HARI KERJA</th>
        <th rowspan="2">RENCANA<br>TRANSAKSI</th>
        <th colspan="2">STATUS</th>
        <th rowspan="2">TOTAL<br>TRANSAKSI</th>
        <th colspan="2">PERSENTASE ( % )</th>
        <th rowspan="2">LAST<br>LOGBOOK DATE</th>
        <th rowspan="2">RANK</th>
      </tr>
      <tr>
        <th>UP TO<br>DATE</th>
        <th>TIDAK<br>UP TO DATE</th>
        <th>UP TO<br>DATE</th>
        <th>TIDAK<br>UP TO DATE</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <div class="legend">
    <span style="font-weight:800">Indikator :</span>
    <span><span class="leg-box bg-green"></span> Inputan sesuai / lebih dari target</span>
    <span><span class="leg-box bg-yellow"></span> Inputan terlambat &gt; 1 dan &lt; 3 hari</span>
    <span><span class="leg-box bg-red"></span> Inputan terlambat &gt; 3 hari</span>
  </div>
</body>
</html>`;

  const htmlPath = path.resolve('temp_report_clean.html');
  const publicDir = path.join(__dirname, '..', 'public');
  const pngPath = path.join(publicDir, 'rekap.png');
  fs.writeFileSync(htmlPath, htmlContent);

  console.log('Generating Clean HD Image via Puppeteer (PNG, 2x retina)...');
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();

  // Step 1: Set viewport exactly to content width, deviceScaleFactor 2
  // CSS 1340px × 2 = 2680px actual pixels — browser-quality antialiased text
  await page.setViewport({ width: 1340, height: 900, deviceScaleFactor: 2 });
  await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });

  // Step 2: Measure exact content height so viewport matches perfectly (no empty space)
  const contentHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1340, height: contentHeight, deviceScaleFactor: 2 });

  // Step 3: Screenshot as PNG (lossless — no JPEG compression artifacts)
  await page.screenshot({ path: pngPath, type: 'png', fullPage: true });
  await browser.close();

  if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);

  const imgSize = fs.statSync(pngPath).size;
  console.log(`Clean HD PNG saved to public/rekap.png (Size: ${imgSize} bytes, ${Math.round(imgSize/1024)}KB)`);

  // Push to GitHub so GoWA can download via raw URL (no WA compression on URL-based send)
  try {
    const repoRoot = path.join(__dirname, '..', '..', '..', '..');
    console.log('Pushing PNG to GitHub...');
    execSync('git add MP/MP/sap-input-app/public/rekap.png', { cwd: repoRoot, stdio: 'pipe' });
    execSync('git commit -m "chore: update rekap image"', { cwd: repoRoot, stdio: 'pipe' });
    execSync('git push origin main', { cwd: repoRoot, stdio: 'pipe', timeout: 60000 });
    console.log('PNG pushed to GitHub successfully.');
  } catch (e) {
    console.warn('Git push note:', e.message?.slice(0, 150));
  }

  // ─── Send via GoWA /send/image with PNG bytes ─────────────────────
  // Send PNG (not JPEG) directly as image so it shows as photo in chat
  const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
  let deviceId = 'aaaa';
  try {
    const devRes = await fetch(`${GOWA_URL}/devices`, { headers: { 'Authorization': authHeader } });
    if (devRes.ok) {
      const devData = await devRes.json();
      const activeDev = (devData.results || []).find(d => d.state === 'logged_in');
      if (activeDev) deviceId = activeDev.id;
    }
  } catch { /* use default */ }

  console.log(`Sending HD PNG via /send/image with compress=false to GoWA Group: ${targetGroupJid} using device ${deviceId}...`);

  const pngBuffer = fs.readFileSync(pngPath);

  // ── Kirim sebagai IMAGE dengan compress=false → GoWA tidak kompres sebelum kirim ──
  // Flag ini ditemukan di source GoWA: SendImage.js → payload.append("compress", false)
  const formData = new FormData();
  formData.append('phone', targetGroupJid);
  formData.append('caption', headerTitleText);
  formData.append('compress', 'false');          // ← FLAG HD: jangan kompres!
  formData.append('view_once', 'false');
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('image', blob, `Rekap_Logbook_Regional5_HD.png`);

  const gowaRes = await fetch(`${GOWA_URL}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: { 'Authorization': authHeader },
    body: formData
  });

  let gowaData;
  if (gowaRes.ok) {
    gowaData = await gowaRes.json();
    console.log('GoWA Send Image (HD, no compress) Response:', JSON.stringify(gowaData, null, 2));
  } else {
    // Fallback: kirim sebagai file attachment (100% tidak dikompresi)
    console.warn(`/send/image gagal (${gowaRes.status}), fallback ke /send/file...`);
    gowaData = await sendAsFile(pngBuffer, targetGroupJid, headerTitleText, authHeader, deviceId, GOWA_URL);
  }

  return gowaData;
}

async function sendAsFile(pngBuffer, targetGroupJid, caption, authHeader, deviceId, GOWA_URL) {
  const formData = new FormData();
  formData.append('phone', targetGroupJid);
  formData.append('caption', caption);
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('file', blob, `Rekap_Logbook_Regional5_HD.png`);
  const resp = await fetch(`${GOWA_URL}/send/file?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: { 'Authorization': authHeader },
    body: formData
  });
  const data = await resp.json();
  console.log('GoWA Send File Response:', JSON.stringify(data, null, 2));
  return data;
}

if (process.argv[1].endsWith('test_pdf_generator.js')) {
  generateAndSendTablePdf().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
