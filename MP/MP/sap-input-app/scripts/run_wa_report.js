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
const TARGET_GROUP_JID = process.env.TARGET_GROUP_JID || '120363430505509462@g.us';
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
    const activeDev = (devData.results || []).find(d => d.state === 'logged_in');
    if (activeDev) return activeDev.id;
  }
  return 'aaaa'; // fallback
}

async function sendScreenshotAsDocument(pngBuffer, deviceId, authHeader) {
  logStep('Sending HD Document via GoWA...');
  
  // First, fetch the caption
  let caption = 'Laporan otomatis';
  try {
    const txtRes = await fetch(`https://pmreg5.afratarigan.my.id/api/send-wa?mock=true`);
    if (txtRes.ok) {
      const txtData = await txtRes.json();
      if (txtData.success && txtData.text) {
        caption = txtData.text.split('```')[0].trim();
      }
    }
  } catch(e) { console.error('Failed to fetch caption', e); }

  const formData = new FormData();
  formData.append('phone', TARGET_GROUP_JID);
  formData.append('caption', caption);
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('image', blob, `Rekap_Logbook_Regional5_HD.png`);
  formData.append('is_hd', 'true');
  formData.append('compress', 'false');

  const resp = await fetch(`${GOWA_URL}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: { 'Authorization': authHeader },
    body: formData
  });

  const data = await resp.json();
  console.log('GoWA Response:', JSON.stringify(data, null, 2));
  return data;
}

async function captureScreenshotWithRetries() {
  const targetUrl = `https://pmreg5.afratarigan.my.id/?hideNav=true&tab=vehicle&screenshotMode=true&t=${Date.now()}`;
  let attempt = 1;
  let browser = null;

  while (attempt <= MAX_RETRIES) {
    try {
      logStep(`Attempt ${attempt}/${MAX_RETRIES}: Starting screenshot capture process...`);
      
      browser = await puppeteer.launch({
        executablePath: getChromePath(),
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 2 });
      
      // Route all page console logs to terminal for debugging
      page.on('console', msg => console.log(`[PAGE LOG]: ${msg.text()}`));

      logStep(`Navigating to ${targetUrl} and waiting for network idle...`);
      // Wait for network connections to drop to 0 for at least 500ms
      await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 45000 });
      logStep('Network is idle.');

      logStep('Waiting for #excel-report-sheet to appear in DOM...');
      await page.waitForSelector('#excel-report-sheet', { visible: true, timeout: 30000 });
      logStep('#excel-report-sheet is visible.');

      logStep('Performing robust rendering checks (fonts, rows, bounding box)...');
      // Execute robust checks inside the browser context
      const isReady = await page.waitForFunction(() => {
        const table = document.querySelector('#excel-report-sheet table');
        if (!table) {
          console.log('Table not found yet.');
          return false;
        }

        const rect = table.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.log('Table width/height is 0.');
          return false;
        }

        const rows = table.querySelectorAll('tr');
        if (rows.length < 5) { // Ensure actual data rows exist
          const emptyState = document.querySelector('.text-slate-500'); // the "Tidak ada data" text
          if (emptyState && emptyState.innerText.includes('Tidak ada data')) {
            console.log('Empty state detected. Returning true to capture it.');
            return true; 
          }
          console.log(`Only ${rows.length} rows found, waiting for more...`);
          return false;
        }

        if (document.fonts.status !== 'loaded') {
          console.log('Fonts not fully loaded yet.');
          return false;
        }

        console.log('All rendering checks passed!');
        return true;
      }, { timeout: 30000, polling: 'raf' }); // Check every requestAnimationFrame

      if (!isReady) {
        throw new Error('Robust rendering checks timed out or failed.');
      }

      logStep('Rendering checks passed! Taking a deep breath (waiting 1 extra second for final layout shift)...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const element = await page.$('#excel-report-sheet');
      const boundingBox = await element.boundingBox();
      
      logStep(`Adjusting viewport to fit element height: ${boundingBox.height}px`);
      await page.setViewport({ width: 1400, height: Math.ceil(boundingBox.height) + 100, deviceScaleFactor: 2 });

      logStep('Taking screenshot of the element...');
      const uint8Array = await element.screenshot({ type: 'png' });
      // Puppeteer returns a Uint8Array, we can pass it directly to our helper function
      const pngBuffer = Buffer.from(uint8Array);
      
      if (pngBuffer.length < 50000) { // Less than 50KB usually means a blank/error page
        throw new Error(`Screenshot size is too small (${pngBuffer.length} bytes). Likely a blank page.`);
      }

      logStep(`Screenshot successfully taken! Size: ${(pngBuffer.length / 1024).toFixed(2)} KB`);
      await browser.close();
      browser = null;

      // Send via GoWA
      const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
      const deviceId = await getActiveDeviceId(authHeader);
      await sendScreenshotAsDocument(pngBuffer, deviceId, authHeader);

      logStep('✅ Process completed successfully!');
      return; // Exit success!

    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed:`, error.message);
      if (browser) await browser.close().catch(()=> {});
      
      if (attempt >= MAX_RETRIES) {
        console.error('🚨 Max retries reached. Failing permanently.');
        process.exit(1);
      }
      
      attempt++;
      logStep(`Waiting 5 seconds before retrying...`);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

captureScreenshotWithRetries();
