import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPaths = [
  path.join(process.cwd(), '.env.local'),
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env.local'),
  path.join(__dirname, '..', '.env')
];
for (const envFile of envPaths) {
  if (fs.existsSync(envFile)) {
    const envConfig = dotenv.parse(fs.readFileSync(envFile));
    for (const k in envConfig) {
      if (!process.env[k]) process.env[k] = envConfig[k];
    }
  }
}

const GOWA_URL = process.env.GOWA_URL || 'https://gowa.afratarigan.my.id';
const GOWA_USER = process.env.GOWA_USER || 'admin';
const GOWA_PASS = process.env.GOWA_PASS || 'Sedap321#';

// ─────────────────────────────────────────────────────────────
// SAFETY GUARD: STRICT DEV / PROD ISOLATION
// ─────────────────────────────────────────────────────────────
const PROD_GROUP_JIDS = ['120363430505509462@g.us'];

// Detect whether running in DEV or PROD
const APP_URL = process.env.APP_URL || process.env.VITE_APP_BASE_URL || process.env.VITE_SUPABASE_URL || 'https://devpmreg5.afratarigan.my.id';
const isDev = process.env.VITE_APP_ENV === 'dev' || 
              process.env.NODE_ENV === 'development' || 
              (APP_URL && APP_URL.includes('dev')) ||
              (!process.env.CI && (!process.env.APP_URL || process.env.APP_URL.includes('dev')));

let TARGET_GROUP_JIDS = [];
if (isDev) {
  console.log('='.repeat(65));
  console.log('🛡️ [SAFETY GUARD] ENVIRONMENT: DEV / TESTING DETECTED');
  console.log(`   APP_URL: ${APP_URL}`);
  
  // In DEV, read target only from DEV_TARGET_WA or TARGET_GROUP_JIDS
  const devTarget = process.env.DEV_TARGET_WA || process.env.TARGET_GROUP_JIDS;
  if (devTarget) {
    const candidateList = devTarget.split(',').map(s => s.trim()).filter(Boolean);
    // STRICTLY strip any production group IDs — KECUALI jika admin sudah
    // mendeklarasikannya secara eksplisit di DEV_TARGET_WA (opt-in sadar).
    // Tanpa pengecualian ini, DEV tidak akan pernah bisa mengirim apa pun
    // ketika DEV_TARGET_WA diset ke grup yang sama dengan grup PROD.
    const explicitlyOptedIn = (process.env.DEV_TARGET_WA || '')
      .split(',').map(s => s.trim()).filter(Boolean);

    TARGET_GROUP_JIDS = candidateList.filter(id =>
      explicitlyOptedIn.includes(id) || !PROD_GROUP_JIDS.some(prodId => id.includes(prodId))
    );
    const blocked = candidateList.length - TARGET_GROUP_JIDS.length;
    if (blocked > 0) {
      console.warn(`⚠️ [SAFETY GUARD] Blocked ${blocked} PROD group(s) in DEV mode!`);
    }
    if (explicitlyOptedIn.length > 0) {
      console.log(`✅ [SAFETY GUARD] DEV_TARGET_WA opt-in eksplisit: ${explicitlyOptedIn.join(', ')}`);
    }
  }

  if (TARGET_GROUP_JIDS.length === 0) {
    console.warn('ℹ️ [SAFETY GUARD] No DEV_TARGET_WA configured in .env.local.');
    console.warn('   PROD groups are completely blocked in DEV mode.');
    console.warn('   Screenshots will be generated locally in public/ without sending to PROD.');
    console.warn('   To receive test messages on your own WhatsApp, set DEV_TARGET_WA=<phone> in .env.local.');
  } else {
    console.log(`🎯 [SAFETY GUARD] DEV messages will ONLY be sent to test target: ${TARGET_GROUP_JIDS.join(', ')}`);
  }
  console.log('='.repeat(65));
} else {
  // PROD mode: Send to official groups
  TARGET_GROUP_JIDS = process.env.TARGET_GROUP_JIDS ? process.env.TARGET_GROUP_JIDS.split(',').map(s => s.trim()).filter(Boolean) : ['120363430505509462@g.us'];
  console.log('🚀 [ENVIRONMENT]: PRODUCTION MODE ACTIVE');
}

const MAX_RETRIES = 3;

// ─────────────────────────────────────────────────────────────
// AUTO-DETECT PERIODE BERDATA
// App default ke bulan berjalan. Jika bulan itu belum ada transaksi
// (mis. DEV hanya punya data s/d Sep 2026), tabel akan tampil kosong dan
// gate screenshot tidak akan pernah lolos. Jadi cari bulan terakhir yang
// benar-benar punya transaksi di PostgREST, lalu pakai sebagai ?month=.
// ─────────────────────────────────────────────────────────────
async function detectLatestDataMonth() {
  if (process.env.REPORT_MONTH) return process.env.REPORT_MONTH; // override manual
  try {
    const res = await fetch(
      `${APP_URL}/rest/v1/vehicle_logs?select=date&order=date.desc&limit=1`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const maxDate = rows?.[0]?.date;
    if (!maxDate) return null;
    return { month: maxDate.slice(0, 7), date: maxDate };
  } catch (e) {
    console.warn('[PERIODE] Gagal deteksi bulan berdata:', e.message);
    return null;
  }
}

// Auto-detect Chrome path.
// PENTING: kandidat TIDAK cukup dicek dengan fs.accessSync(). Ubuntu menyediakan
// /usr/bin/chromium-browser sebagai wrapper snap yang ADA tapi GAGAL dieksekusi di
// server headless (butuh `xdg-settings`, dan content snap gpu-2404/gnome-46-2404
// sering dilepas demi disk). Akibatnya Puppeteer "Failed to launch the browser
// process!" dan laporan 08:00/16:00 WIB gagal total. Jadi setiap kandidat
// dijalankan `--version` dulu; yang pertama benar-benar jalan itulah yang dipakai.
function probeChrome(binPath) {
  try {
    fs.accessSync(binPath);
  } catch {
    return null;
  }
  // Hanya Linux yang punya jebakan wrapper (chromium-browser → snap). Di Windows
  // cukup cek keberadaan file agar `--version` tidak memicu/menempel ke sesi Chrome
  // yang sedang berjalan.
  if (process.platform !== 'linux') return binPath;
  try {
    const out = execFileSync(binPath, ['--version'], {
      timeout: 20000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString().trim();
    return out || null;
  } catch (e) {
    const detail = (e.stderr || '').toString().trim().split('\n')[0] || e.message;
    console.warn(`⚠️ [BROWSER] Kandidat tidak bisa dijalankan: ${binPath} → ${detail}`);
    return null;
  }
}

function getChromePath() {
  const linuxDefaults = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];
  // CHROME_PATH diutamakan, TAPI tidak mengunci: kalau nilainya basi/tidak bisa
  // dijalankan, auto-detect tetap dijalankan agar laporan tidak gagal total.
  const candidates = process.env.CHROME_PATH
    ? [process.env.CHROME_PATH, ...linuxDefaults.filter((p) => p !== process.env.CHROME_PATH)]
    : process.platform === 'linux'
      ? linuxDefaults
      : ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'];

  for (const p of candidates) {
    const version = probeChrome(p);
    if (version) {
      console.log(`🌐 [BROWSER] Memakai ${p} (${version})`);
      return p;
    }
  }

  throw new Error(
    'Tidak ada browser yang bisa dijalankan. Pasang Google Chrome: ' +
      'wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb && ' +
      'sudo dpkg -i /tmp/chrome.deb || sudo apt-get install -f -y'
  );
}

async function logStep(msg) {
  console.log(`[${new Date().toISOString()}] ⏳ ${msg}`);
}

async function getActiveDeviceId(authHeader) {
  const targetDevice = process.env.GOWA_DEVICE || '6285135734210@s.whatsapp.net';
  try {
    const devRes = await fetch(`${GOWA_URL}/devices`, { headers: { 'Authorization': authHeader } });
    if (devRes.ok) {
      const devData = await devRes.json();
      const matched = (devData.results || []).find(d =>
        (d.jid && (d.jid === targetDevice || d.jid.includes('6285135734210'))) ||
        d.id === targetDevice ||
        (d.display_name && d.display_name.toLowerCase().includes('plant maintenance'))
      );
      if (matched) return matched.id;
      const activeDevs = (devData.results || []).filter(d => d.state === 'logged_in');
      if (activeDevs.length > 0) return activeDevs[0].id;
    }
  } catch (e) {
    console.warn('Could not fetch GoWA devices:', e.message);
  }
  return '4a7d45f1-9304-471b-9f78-451fdd651517';
}

// ---------------------------------------------------------
// LOGBOOK PMREG5 LOGIC
// ---------------------------------------------------------
async function sendPmreg5Screenshot(pngBuffer, deviceId, authHeader) {
  logStep('Sending PMReg5 HD Document via GoWA...');
  const now = new Date();
  const optionsDate = { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' };
  const optionsTime = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
  const formatterDate = new Intl.DateTimeFormat('id-ID', optionsDate);
  const formatterTime = new Intl.DateTimeFormat('id-ID', optionsTime);
  const dateParts = formatterDate.formatToParts(now);
  const dayStr = dateParts.find(p => p.type === 'day').value;
  const monthStr = dateParts.find(p => p.type === 'month').value;
  const yearStr = dateParts.find(p => p.type === 'year').value;
  const dateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
  const timeFormatted = formatterTime.format(now).replace(':', '.');

  let caption = isDev ? `🧪 *[DEV TESTING - BUKAN DATA RESMI]*\n` : ``;
  caption += `*Monitoring Transaksi Logbook tanggal 1 s.d ${dateFormatted} ${timeFormatted}*\n`;
  caption += `*REGIONAL 5 ${isDev ? '(DEV SIMULATION)' : ''}*\n\n`;

  if (isDev && TARGET_GROUP_JIDS.length === 0) {
    console.log('[DEV SAFETY GUARD] ✅ PMReg5 Screenshot saved locally to public/rekap.png.');
    console.log('[DEV SAFETY GUARD] 🛡️ No WhatsApp messages sent to PROD. Simulation successful.');
    return { success: true, simulated: true };
  }

  let overallSuccess = true;
  for (const groupId of TARGET_GROUP_JIDS) {
    const formData = new FormData();
    formData.append('phone', groupId.trim());
    formData.append('caption', caption);
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('image', blob, `Rekap_Logbook_Regional5_HD.png`);
    formData.append('is_hd', 'true');
    formData.append('compress', 'false');

    console.log(`\n[+] Sending PMReg5 Image to ${groupId.trim()}...`);
    const resp = await fetch(`${GOWA_URL}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: formData
    });
    const rawText = await resp.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error(`[PMReg5] ❌ Non-JSON response (HTTP ${resp.status}): ${rawText.slice(0, 200)}`);
      overallSuccess = false;
      continue;
    }
    if (data.code === 'SUCCESS') {
      console.log(`[PMReg5] ✅ SUCCESS | Message ID: ${data.results?.message_id || 'n/a'} | ${groupId.trim()}`);
    } else {
      console.error(`[PMReg5] ❌ FAILED (HTTP ${resp.status}): ${JSON.stringify(data).slice(0, 300)}`);
      overallSuccess = false;
    }
  }
  return { success: overallSuccess };
}

async function capturePmreg5Screenshot() {
  const period = await detectLatestDataMonth();
  let url = `${APP_URL}/?hideNav=true&tab=vehicle&screenshotMode=true&t=${Date.now()}`;
  if (period?.month) {
    url += `&month=${encodeURIComponent(period.month)}&targetDate=${encodeURIComponent(period.date)}`;
    logStep(`[PMReg5] Periode berdata terdeteksi: ${period.month} (transaksi terakhir ${period.date})`);
  } else {
    logStep('[PMReg5] Tidak dapat mendeteksi periode berdata; memakai default bulan berjalan.');
  }
  const targetUrl = url;
  let attempt = 1;
  let browser = null;

  while (attempt <= MAX_RETRIES) {
    try {
      logStep(`[PMReg5] Attempt ${attempt}/${MAX_RETRIES}...`);
      browser = await puppeteer.launch({
        executablePath: getChromePath(),
        headless: 'new',
        // Default protocolTimeout = 180s. waitForFunction di bawah memakai 240s,
        // sehingga CDP call mati lebih dulu ("Runtime.callFunctionOn timed out").
        protocolTimeout: 300000,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--use-gl=swiftshader',                    // fix: rendering software agar tidak hitam
          '--use-angle=swiftshader-webgl',            // fix: WebGL via swiftshader
          '--force-color-profile=srgb',               // fix: warna CSS tampil benar
          '--run-all-compositor-stages-before-draw',  // fix: tunggu render selesai
          '--disable-features=VizDisplayCompositor',
          '--font-render-hinting=none',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
        ]
      });

      const page = await browser.newPage();
      page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
      page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
      page.on('response', resp => { if (resp.status() === 401) console.log('401 URL:', resp.url()); });
      await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
      
      if (APP_URL.includes('devpmreg5') || process.env.HTTP_AUTH_USER) {
        const u = process.env.HTTP_AUTH_USER || 'Admin';
        const p = process.env.HTTP_AUTH_PASS || 'Akuhebat#1';
        await page.authenticate({ username: u, password: p });
      }

      logStep('[PMReg5] Membuka halaman dan menunggu load awal...');
      // networkidle0 TIDAK dipakai: app melakukan polling/upsert berkala sehingga
      // network tidak pernah idle → goto selalu timeout 90s.
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.waitForSelector('#excel-report-sheet', { visible: true, timeout: 60000 });

      logStep('[PMReg5] Tahan lebih lama untuk memastikan data fresh selesai di-fetch dari server...');
      // Terukur di server: 21 request REST (~19.4 MB) baru selesai pada t≈106s.
      // Timeout 120s terlalu mepet sehingga attempt 1 sering gagal dan harus retry.
      const isReady = await page.waitForFunction(() => {
        const table = document.querySelector('#excel-report-sheet table');
        if (!table) return false;
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        if (rows.length < 5) return false;

        // WAJIB: minimal satu baris punya Total Transaksi > 0.
        // '#data-ready' TIDAK dipakai karena muncul prematur (~15s) sebelum
        // vehicle_logs selesai di-fetch (~106s) → screenshot jadi kosong/hitam.
        return rows.some(r => {
          const tds = r.querySelectorAll('td');
          if (tds.length <= 8) return false;
          const tx = parseInt(tds[8].innerText.trim(), 10);
          return !isNaN(tx) && tx > 0;
        });
      }, { timeout: 240000, polling: 500 });

      if (!isReady) throw new Error('Data rendering checks timed out or failed.');

      // Tahan lebih lama: Beri waktu ekstra 10 detik agar seluruh badge status & warna selesai dirender
      logStep('[PMReg5] Data terdeteksi masuk! Menahan 10 detik ekstra agar visual stabil...');
      await new Promise(resolve => setTimeout(resolve, 10000));

      const element = await page.$('#excel-report-sheet');
      const boundingBox = await element.boundingBox();
      
      await page.setViewport({ width: 1400, height: Math.ceil(boundingBox.height) + 100, deviceScaleFactor: 2 });
      const uint8Array = await element.screenshot({ type: 'png' });
      const pngBuffer = Buffer.from(uint8Array);
      
      if (pngBuffer.length < 50000) throw new Error(`Screenshot size is too small.`);

      logStep(`[PMReg5] Screenshot successfully taken! Size: ${(pngBuffer.length / 1024).toFixed(2)} KB`);
      if (!fs.existsSync('public')) fs.mkdirSync('public');
      fs.writeFileSync('public/rekap.png', pngBuffer);
      await browser.close();
      browser = null;

      const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
      const deviceId = await getActiveDeviceId(authHeader);
      return await sendPmreg5Screenshot(pngBuffer, deviceId, authHeader);
    } catch (error) {
      console.error(`[PMReg5] ❌ Attempt ${attempt} failed:`, error.message);
      if (browser) await browser.close().catch(()=> {});
      if (attempt >= MAX_RETRIES) {
        console.error('[PMReg5] 🚨 Max retries reached.');
        return { success: false }; // Continue to next script instead of exiting
      }
      attempt++;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  return { success: false };
}


// ---------------------------------------------------------
// CMMS LOGIC
// ---------------------------------------------------------
async function sendCmmsScreenshot(pngBuffer, deviceId, authHeader) {
  logStep('Sending CMMS HD Document via GoWA...');
  const now = new Date();
  const optionsDate = { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' };
  const optionsTime = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false };
  const formatterDate = new Intl.DateTimeFormat('id-ID', optionsDate);
  const formatterTime = new Intl.DateTimeFormat('id-ID', optionsTime);
  const dateParts = formatterDate.formatToParts(now);
  const dayStr = dateParts.find(p => p.type === 'day').value;
  const monthStr = dateParts.find(p => p.type === 'month').value;
  const yearStr = dateParts.find(p => p.type === 'year').value;
  const dateFormatted = `${dayStr}/${monthStr}/${yearStr}`;
  const timeFormatted = formatterTime.format(now).replace(':', '.');

  let caption = isDev ? `🧪 *[DEV TESTING - BUKAN DATA RESMI]*\n` : ``;
  caption += `*Update Running Hour Submission Monitoring ${isDev ? '(DEV SIMULATION)' : ''}*\n🗓️ ${dateFormatted} ⏰ ${timeFormatted} WIB`;

  if (isDev && TARGET_GROUP_JIDS.length === 0) {
    console.log('[DEV SAFETY GUARD] ✅ CMMS Screenshot saved locally to public/cmms_screenshot.png.');
    console.log('[DEV SAFETY GUARD] 🛡️ No WhatsApp messages sent to PROD. Simulation successful.');
    return { success: true, simulated: true };
  }

  let overallSuccess = true;
  for (const groupId of TARGET_GROUP_JIDS) {
    const formData = new FormData();
    formData.append('phone', groupId.trim());
    formData.append('caption', caption);
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('image', blob, `Running_Hour_Monitoring_HD.png`);
    formData.append('is_hd', 'true');
    formData.append('compress', 'false');

    console.log(`\n[+] Sending CMMS Image to ${groupId.trim()}...`);
    const resp = await fetch(`${GOWA_URL}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: formData
    });
    const rawText = await resp.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error(`[CMMS] ❌ Non-JSON response (HTTP ${resp.status}): ${rawText.slice(0, 200)}`);
      overallSuccess = false;
      continue;
    }
    if (data.code === 'SUCCESS') {
      console.log(`[CMMS] ✅ SUCCESS | Message ID: ${data.results?.message_id || 'n/a'} | ${groupId.trim()}`);
    } else {
      console.error(`[CMMS] ❌ FAILED (HTTP ${resp.status}): ${JSON.stringify(data).slice(0, 300)}`);
      overallSuccess = false;
    }
  }
  return { success: overallSuccess };
}

async function captureCmmsScreenshot() {
  let attempt = 1;
  let browser = null;

  while (attempt <= MAX_RETRIES) {
    try {
      logStep(`[CMMS] Attempt ${attempt}/${MAX_RETRIES}...`);
      browser = await puppeteer.launch({
        executablePath: getChromePath(),
        headless: true,
        protocolTimeout: 300000,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--window-size=1920,1080']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      logStep('Navigating to CMMS login page...');
      await page.goto('https://cmms.ptpn4.co.id/dashboard', { waitUntil: 'networkidle2', timeout: 60000 });

      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('auth')) {
        await page.waitForSelector('input[type="text"], input[name="nik"], input[name="username"], input[id="nik"], input[id="username"]', { timeout: 15000 });
        const nikField = await page.$('input[name="nik"]') || await page.$('input[id="nik"]') || await page.$('input[type="text"]');
        const passField = await page.$('input[type="password"]');
        if (nikField) await nikField.type('19010048', { delay: 50 });
        if (passField) await passField.type('123', { delay: 50 });
        
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          page.keyboard.press('Enter')
        ]);
      }

      await new Promise(r => setTimeout(r, 6000));
      await page.evaluate(async () => {
        await new Promise(resolve => {
          let total = 0;
          const dist = 400;
          const timer = setInterval(() => {
            window.scrollBy(0, dist);
            total += dist;
            if (total >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
          }, 300);
        });
      });
      await new Promise(r => setTimeout(r, 6000));

      const absoluteY = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*')).reverse();
        for (let el of els) {
          const text = (el.textContent || '').trim();
          if (text === 'Monitoring Penginputan Jam Jalan' || text === 'Running Hour Submission Monitoring') {
            const rect = el.getBoundingClientRect();
            const pageY = rect.top + window.scrollY;
            if (pageY > 500) return pageY;
          }
        }
        return null;
      });

      if (!absoluteY) throw new Error('Heading "Monitoring Penginputan Jam Jalan" NOT FOUND');

      await page.evaluate((y) => {
        window.scrollTo({ top: Math.max(0, y - 80), behavior: 'instant' });
      }, absoluteY);
      await new Promise(r => setTimeout(r, 2000));

      logStep('Searching for "Reg 5" to click...');
      const clicked = await page.evaluate((headingY) => {
        const els = Array.from(document.querySelectorAll('*')).reverse();
        for (let el of els) {
          if ((el.textContent || '').trim() === 'Reg 5') {
            const rect = el.getBoundingClientRect();
            const pageY = rect.top + window.scrollY;
            if (pageY > headingY && pageY < headingY + 800) {
              el.click();
              return true;
            }
          }
        }
        return false;
      }, absoluteY);

      if (clicked) {
        logStep('Clicked "Reg 5"! Waiting for drill-down to load...');
        await new Promise(r => setTimeout(r, 6000));
      }

      // Delete the legend row inside the red box ("delete in the red box" requested by user)
      await page.evaluate(() => {
        const allElements = Array.from(document.querySelectorAll('*'));
        for (const el of allElements) {
          const text = (el.textContent || '').trim();
          if (
            text.includes('ada data jam jalan yang diinput') ||
            text.includes('Jumlah Equipment dengan data jam jalan') ||
            text.includes('Pabrik Tidak Beroperasi')
          ) {
            if (el.children.length > 0 && el.offsetHeight < 120 && el.tagName !== 'BODY' && el.tagName !== 'HTML') {
              el.remove();
            }
          }
        }
      });
      await new Promise(r => setTimeout(r, 1000));

      const viewportBuffer = await page.screenshot({ type: 'png' });
      const scale = 1.5;
      const cropTop = Math.floor(65 * scale);
      const cropLeft = Math.floor(15 * scale);
      const cropWidth = Math.floor(1885 * scale);
      const cropHeight = Math.floor(615 * scale);
      
      let pngBuffer;
      const sharp = (await import('sharp')).default;
      pngBuffer = await sharp(viewportBuffer)
        .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
        .toBuffer();

      if (!fs.existsSync('public')) fs.mkdirSync('public');
      fs.writeFileSync('public/cmms_screenshot.png', pngBuffer);
      await browser.close();
      browser = null;

      const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
      const deviceId = await getActiveDeviceId(authHeader);
      return await sendCmmsScreenshot(pngBuffer, deviceId, authHeader);
    } catch (error) {
      console.error(`[CMMS] ❌ Attempt ${attempt} failed:`, error.message);
      if (browser) await browser.close().catch(()=> {});
      if (attempt >= MAX_RETRIES) {
        console.error('[CMMS] 🚨 Max retries reached.');
        return { success: false };
      }
      attempt++;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  return { success: false };
}

// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------
async function sendReminder(hourWIB) {
  let message = isDev ? `🧪 *[DEV TESTING - BUKAN DATA RESMI]*\n` : ``;
  if (hourWIB === 7) {
    message += `💪 *PTPN Tumbuh Juara Bangun Negeri!*\n_Bapak/Ibu sekalian, mohon segera selesaikan inputan Plant Maintenance (PM) unit masing-masing, karena hasil monitoring harian akan segera di-update secara berkala di grup ini._\n\n`;
  } else {
    message += `_Mohon kerjasamanya kepada seluruh unit untuk selalu disiplin melakukan *input* Logbook dan *update* Jam Jalan Mesin Pabrik secara rutin dan tepat waktu. Terima kasih!_\n\n`;
  }

  if (isDev && TARGET_GROUP_JIDS.length === 0) {
    console.log('[DEV SAFETY GUARD] ✅ DEV reminder message generated:');
    console.log(message);
    console.log('[DEV SAFETY GUARD] 🛡️ No WhatsApp messages dispatched to PROD. Simulation successful.');
    return { success: true, simulated: true };
  }

  const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
  const deviceId = await getActiveDeviceId(authHeader);

  let overallSuccess = true;
  for (const groupId of TARGET_GROUP_JIDS) {
    console.log(`\n[+] Sending text reminder to ${groupId.trim()}...`);
    const formData = new URLSearchParams();
    formData.append('phone', groupId.trim());
    formData.append('message', message);

    const resp = await fetch(`${GOWA_URL}/send/message?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    const rawText = await resp.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      console.error(`[Reminder] ❌ Non-JSON response (HTTP ${resp.status}): ${rawText.slice(0, 200)}`);
      overallSuccess = false;
      continue;
    }
    if (data.code === 'SUCCESS') {
      console.log(`[Reminder] ✅ SUCCESS | Message ID: ${data.results?.message_id || 'n/a'} | ${groupId.trim()}`);
    } else {
      console.error(`[Reminder] ❌ FAILED (HTTP ${resp.status}): ${JSON.stringify(data).slice(0, 300)}`);
      overallSuccess = false;
    }
  }
  return { success: overallSuccess };
}

async function sendBothReports() {
  console.log('\n--- STARTING PMREG5 REPORT ---');
  const pm = await capturePmreg5Screenshot();

  console.log('\n--- STARTING CMMS REPORT ---');
  const cm = await captureCmmsScreenshot();

  return { success: !!(pm?.success && cm?.success) };
}

async function main() {
  // --action=07:00 | 08:00 | 14:00 | 16:00 | all  (untuk cron yang presisi)
  const actionArg = process.argv.slice(2)
    .find(a => a.startsWith('--action='))
    ?.replace('--action=', '').trim();

  const now = new Date();
  const currentHourWIB = parseInt(new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(now));

  let result;
  if (actionArg) {
    console.log(`🎯 [MODE] Action eksplisit: ${actionArg}`);
    if (actionArg === 'all') {
      result = await sendBothReports();
      await new Promise(r => setTimeout(r, 2500));
      await sendReminder(7);
      await new Promise(r => setTimeout(r, 2500));
      await sendReminder(14);
    } else if (actionArg === '07:00' || actionArg === '14:00') {
      result = await sendReminder(actionArg === '07:00' ? 7 : 14);
    } else if (actionArg === '08:00' || actionArg === '16:00') {
      result = await sendBothReports();
    } else {
      console.error(`❌ Action tidak dikenal: ${actionArg}`);
      process.exit(1);
    }
  } else if (currentHourWIB === 7 || currentHourWIB === 14) {
    result = await sendReminder(currentHourWIB);
  } else {
    result = await sendBothReports();
  }

  if (!result?.success) {
    console.error('\n[RESULT] ❌ Sebagian atau seluruh pengiriman GAGAL. Periksa log di atas.');
    process.exit(1);
  }
  console.log('\n[RESULT] ✅ Semua pengiriman berhasil.');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
