import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_PATH = path.join(__dirname, '..', 'public', 'cmms_screenshot.png');

const GOWA_URL = 'https://gowa.waterflai.my.id';
const GOWA_USER = 'admin';
const GOWA_PASS = 'Sedap321#';
const TARGET_JID = '120363430505509462@g.us';
const CAPTION = 'Update Running Hour Submission Monitoring';

function getChromePath() {
  if (process.platform === 'linux') {
    const paths = ['/usr/bin/google-chrome-stable', '/usr/bin/google-chrome', '/usr/bin/chromium-browser'];
    for (const p of paths) { try { fs.accessSync(p); return p; } catch {} }
  }
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

async function main() {
  console.log('[1] Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: getChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1920,1080']
  });

  const page = await browser.newPage();
  // Set full desktop viewport & user agent
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  page.on('console', msg => console.log(`[PAGE]: ${msg.text()}`));

  console.log('[2] Navigating to login page...');
  await page.goto('https://cmms.ptpn4.co.id/dashboard', { waitUntil: 'networkidle2', timeout: 60000 });

  // Check if redirected to login
  const currentUrl = page.url();
  console.log('[3] Current URL:', currentUrl);

  if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('auth')) {
    console.log('[4] Login page detected, filling credentials...');
    // Try common login field selectors
    await page.waitForSelector('input[type="text"], input[name="nik"], input[name="username"], input[id="nik"], input[id="username"]', { timeout: 15000 });
    
    const nikField = await page.$('input[name="nik"]') || await page.$('input[id="nik"]') || await page.$('input[type="text"]');
    const passField = await page.$('input[type="password"]');
    
    if (nikField) await nikField.type('19010048', { delay: 50 });
    if (passField) await passField.type('123', { delay: 50 });
    
    console.log('[5] Submitting login form...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.keyboard.press('Enter')
    ]);
  } else {
    console.log('[4] Already on dashboard page, proceeding...');
  }

  console.log('[6] Waiting for dashboard to fully load...');
  await new Promise(r => setTimeout(r, 6000));
  
  // Scroll entire page slowly to trigger lazy loading (proven to work in diag_cmms)
  console.log('[6.1] Scrolling page to load all sections...');
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
  
  // Wait for lazy-loaded charts to finish rendering
  console.log('[6.2] Waiting for charts to render...');
  await new Promise(r => setTimeout(r, 6000));

  console.log('[7] Searching for "Monitoring Penginputan Jam Jalan" heading...');
  
  // Find the exact heading's absolute Y coordinate.
  // We reverse querySelectorAll so that we process leaf nodes (children) BEFORE their wrappers!
  const absoluteY = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*')).reverse();
    for (let el of els) {
      const text = (el.textContent || '').trim();
      if (text === 'Monitoring Penginputan Jam Jalan' || text === 'Running Hour Submission Monitoring') {
        const rect = el.getBoundingClientRect();
        const pageY = rect.top + window.scrollY;
        // Ignore header menu items
        if (pageY > 500) {
          return pageY;
        }
      }
    }
    return null;
  });

  if (!absoluteY) {
    throw new Error('Heading "Monitoring Penginputan Jam Jalan" NOT FOUND in the main content area.');
  }

  console.log(`[8] Real heading found at absolute page Y: ${absoluteY}`);

  console.log('[8.1] Scrolling exactly to the target area...');
  await page.evaluate((y) => {
    // Scroll so the heading is 120px from the top of the viewport
    // This perfectly clears the fixed navigation header (~100px tall)
    window.scrollTo({ top: Math.max(0, y - 120), behavior: 'instant' });
  }, absoluteY);
  
  // Wait for any fixed headers or scroll-linked animations to settle
  await new Promise(r => setTimeout(r, 2000));

  console.log('[8.15] Searching for "Reg 5" to click...');
  const clicked = await page.evaluate((headingY) => {
    const els = Array.from(document.querySelectorAll('*')).reverse();
    for (let el of els) {
      if ((el.textContent || '').trim() === 'Reg 5') {
        const rect = el.getBoundingClientRect();
        const pageY = rect.top + window.scrollY;
        // Ensure the "Reg 5" is part of this table (below heading, but not far below)
        if (pageY > headingY && pageY < headingY + 800) {
          el.click();
          return true;
        }
      }
    }
    return false;
  }, absoluteY);

  if (clicked) {
    console.log('[8.16] Clicked "Reg 5"! Waiting 6 seconds for drill-down to load...');
    await new Promise(r => setTimeout(r, 6000));
  } else {
    console.log('[8.16] WARNING: "Reg 5" not found! Taking screenshot of original view.');
  }

  console.log('[8.2] Taking normal viewport screenshot...');
  // Normal screenshot captures only the viewport. Since we just scrolled exactly there,
  // the target is now clearly visible below the header!
  const viewportBuffer = await page.screenshot({ type: 'png' });
  
  const scale = 1.5;
  const cropTop = Math.floor(100 * scale);
  const cropLeft = Math.floor(90 * scale);
  const cropWidth = Math.floor(1740 * scale);
  // Mengurangi cropHeight (logical px) agar tulisan "Traceability" tidak ikut terpotret
  const cropHeight = Math.floor(600 * scale);
  
  let pngBuffer;
  try {
    const sharp = (await import('sharp')).default;
    pngBuffer = await sharp(viewportBuffer)
      .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
      .toBuffer();
    console.log('[8.4] Crop successful!');
  } catch (err) {
    console.error('Error during Sharp crop:', err);
    throw err;
  }


  console.log(`[9] Screenshot taken! Size: ${(pngBuffer.length / 1024).toFixed(2)} KB`);
  if (!fs.existsSync(path.join(__dirname, '..', 'public'))) fs.mkdirSync(path.join(__dirname, '..', 'public'), { recursive: true });
  fs.writeFileSync(TEMP_PATH, pngBuffer);
  console.log('[9.1] Screenshot saved to:', TEMP_PATH);

  await browser.close();

  // Send via GoWA
  console.log('[10] Sending to WhatsApp...');
  const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');

  // Get active device
  const devRes = await fetch(`${GOWA_URL}/devices`, { headers: { 'Authorization': authHeader } });
  const devData = await devRes.json();
  const activeDevs = (devData.results || []).filter(d => d.state === 'logged_in');
  activeDevs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const deviceId = activeDevs[0]?.id || 'bbbb';
  console.log('[10.1] Using device:', deviceId);

  const formData = new FormData();
  formData.append('phone', TARGET_JID);
  formData.append('caption', CAPTION);
  const blob = new Blob([pngBuffer], { type: 'image/png' });
  formData.append('image', blob, 'Running_Hour_Monitoring.png');
  formData.append('is_hd', 'true');
  formData.append('compress', 'false');

  const resp = await fetch(`${GOWA_URL}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
    method: 'POST',
    headers: { 'Authorization': authHeader },
    body: formData
  });

  const data = await resp.json();
  console.log('[11] GoWA Response:', JSON.stringify(data, null, 2));

  if (data.code === 'SUCCESS') {
    console.log('✅ Successfully sent to', TARGET_JID);
  } else {
    console.error('❌ Failed to send:', data);
    process.exit(1);
  }
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
