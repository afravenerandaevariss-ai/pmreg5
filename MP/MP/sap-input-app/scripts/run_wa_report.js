import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (fs.existsSync('.env.local')) {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  for (const k in envConfig) process.env[k] = envConfig[k];
}

const GOWA_URL = process.env.GOWA_URL || 'https://gowa.waterflai.my.id';
const GOWA_USER = process.env.GOWA_USER || 'admin';
const GOWA_PASS = process.env.GOWA_PASS || 'Sedap321#';

// ─────────────────────────────────────────────────────────────
// SAFETY GUARD: STRICT DEV / PROD ISOLATION
// ─────────────────────────────────────────────────────────────
const PROD_GROUP_JIDS = ['120363041780234935@g.us', '120363427768510358@g.us', '120363430505509462'];

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
    // STRICTLY strip any production group IDs
    TARGET_GROUP_JIDS = candidateList.filter(id => !PROD_GROUP_JIDS.some(prodId => id.includes(prodId)));
    if (TARGET_GROUP_JIDS.length < candidateList.length) {
      console.warn('⚠️ [SAFETY GUARD] Blocked attempt to send to PROD group in DEV mode!');
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
  TARGET_GROUP_JIDS = process.env.TARGET_GROUP_JIDS ? process.env.TARGET_GROUP_JIDS.split(',').map(s => s.trim()).filter(Boolean) : ['120363041780234935@g.us', '120363427768510358@g.us'];
  console.log('🚀 [ENVIRONMENT]: PRODUCTION MODE ACTIVE');
}

const MAX_RETRIES = 3;

// Auto-detect Chrome path
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

async function logStep(msg) {
  console.log(`[${new Date().toISOString()}] ⏳ ${msg}`);
}

async function getActiveDeviceId(authHeader) {
  const devRes = await fetch(`${GOWA_URL}/devices`, { headers: { 'Authorization': authHeader } });
  if (devRes.ok) {
    const devData = await devRes.json();
    const activeDevs = (devData.results || []).filter(d => d.state === 'logged_in');
    if (activeDevs.length > 0) {
      activeDevs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return activeDevs[0].id;
    }
  }
  return 'aaaa'; // fallback
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
    const data = await resp.json();
    if (data.code !== 'SUCCESS') overallSuccess = false;
  }
  return { success: overallSuccess };
}

async function capturePmreg5Screenshot() {
  const targetUrl = `${APP_URL}/?hideNav=true&tab=vehicle&screenshotMode=true&t=${Date.now()}`;
  let attempt = 1;
  let browser = null;

  while (attempt <= MAX_RETRIES) {
    try {
      logStep(`[PMReg5] Attempt ${attempt}/${MAX_RETRIES}...`);
      browser = await puppeteer.launch({
        executablePath: getChromePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
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

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#excel-report-sheet', { visible: true, timeout: 30000 });

      const isReady = await page.waitForFunction(() => {
        const table = document.querySelector('#excel-report-sheet table');
        if (!table) return false;
        const rect = table.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const rows = table.querySelectorAll('tr');
        if (rows.length < 5) {
          const emptyState = document.querySelector('.text-slate-500');
          if (emptyState && emptyState.innerText.includes('Tidak ada data')) return true; 
          return false;
        }
        return true;
      }, { timeout: 30000, polling: 'raf' });

      if (!isReady) throw new Error('Robust rendering checks timed out or failed.');
      await new Promise(resolve => setTimeout(resolve, 1000));

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
      await sendPmreg5Screenshot(pngBuffer, deviceId, authHeader);
      return; 
    } catch (error) {
      console.error(`[PMReg5] ❌ Attempt ${attempt} failed:`, error.message);
      if (browser) await browser.close().catch(()=> {});
      if (attempt >= MAX_RETRIES) {
        console.error('[PMReg5] 🚨 Max retries reached.');
        break; // Continue to next script instead of exiting
      }
      attempt++;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
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
    const data = await resp.json();
    if (data.code !== 'SUCCESS') overallSuccess = false;
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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1920,1080']
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
        window.scrollTo({ top: Math.max(0, y - 120), behavior: 'instant' });
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

      const viewportBuffer = await page.screenshot({ type: 'png' });
      const scale = 1.5;
      const cropTop = Math.floor(100 * scale);
      const cropLeft = Math.floor(90 * scale);
      const cropWidth = Math.floor(1740 * scale);
      const cropHeight = Math.floor(600 * scale);
      
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
      await sendCmmsScreenshot(pngBuffer, deviceId, authHeader);
      return; 
    } catch (error) {
      console.error(`[CMMS] ❌ Attempt ${attempt} failed:`, error.message);
      if (browser) await browser.close().catch(()=> {});
      if (attempt >= MAX_RETRIES) {
        console.error('[CMMS] 🚨 Max retries reached.');
        break;
      }
      attempt++;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

// ---------------------------------------------------------
// MAIN
// ---------------------------------------------------------
async function main() {
  const now = new Date();
  const currentHourWIB = parseInt(new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(now));

  if (currentHourWIB === 7 || currentHourWIB === 14) {
    let message = isDev ? `🧪 *[DEV TESTING - BUKAN DATA RESMI]*\n` : ``;
    if (currentHourWIB === 7) {
      message += `💪 *PTPN Tumbuh Juara Bangun Negeri!*\n_Bapak/Ibu sekalian, mohon segera selesaikan inputan Plant Maintenance (PM) unit masing-masing, karena hasil monitoring harian akan segera di-update secara berkala di grup ini._\n\n`;
    } else {
      message += `_Mohon kerjasamanya kepada seluruh unit untuk selalu disiplin melakukan *input* Logbook dan *update* Jam Jalan Mesin Pabrik secara rutin dan tepat waktu. Terima kasih!_\n\n`;
    }

    if (isDev && TARGET_GROUP_JIDS.length === 0) {
      console.log('[DEV SAFETY GUARD] ✅ DEV reminder message generated:');
      console.log(message);
      console.log('[DEV SAFETY GUARD] 🛡️ No WhatsApp messages dispatched to PROD. Simulation successful.');
      return;
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
      const data = await resp.json();
      console.log(`GoWA Response for ${groupId.trim()}:`, JSON.stringify(data, null, 2));
      if (data.code !== 'SUCCESS') overallSuccess = false;
    }
  } else {
    // 08:00 or 15:00 - RUN BOTH REPORTS SEQUENTIALLY
    console.log('\n--- STARTING PMREG5 REPORT ---');
    await capturePmreg5Screenshot();
    
    console.log('\n--- STARTING CMMS REPORT ---');
    await captureCmmsScreenshot();
  }
}

main();
