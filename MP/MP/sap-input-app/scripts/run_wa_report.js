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
const TARGET_GROUP_JIDS = process.env.TARGET_GROUP_JIDS ? process.env.TARGET_GROUP_JIDS.split(',') : ['120363041780234935@g.us', '120363427768510358@g.us'];
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

async function sendScreenshotAsDocument(pngBuffer, deviceId, authHeader) {
  logStep('Sending HD Document via GoWA...');
  
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

  const caption = `*Update Running Hour Submission Monitoring*\n🗓️ ${dateFormatted} ⏰ ${timeFormatted} WIB`;

  let overallSuccess = true;
  for (const groupId of TARGET_GROUP_JIDS) {
    const formData = new FormData();
    formData.append('phone', groupId.trim());
    formData.append('caption', caption);
    const blob = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('image', blob, `Running_Hour_Monitoring_HD.png`);
    formData.append('is_hd', 'true');
    formData.append('compress', 'false');

    console.log(`\n[+] Sending HD Document to ${groupId.trim()}...`);
    const resp = await fetch(`${GOWA_URL}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: formData
    });

    const data = await resp.json();
    console.log(`GoWA Response for ${groupId.trim()}:`, JSON.stringify(data, null, 2));
    if (data.code !== 'SUCCESS') overallSuccess = false;
  }
  return { success: overallSuccess };
}

async function captureScreenshotWithRetries() {
  let attempt = 1;
  let browser = null;

  while (attempt <= MAX_RETRIES) {
    try {
      logStep(`Attempt ${attempt}/${MAX_RETRIES}: Starting screenshot capture process...`);
      
      browser = await puppeteer.launch({
        executablePath: getChromePath(),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1920,1080']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1.5 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      page.on('console', msg => console.log(`[PAGE LOG]: ${msg.text()}`));

      logStep('Navigating to CMMS login page...');
      await page.goto('https://cmms.ptpn4.co.id/dashboard', { waitUntil: 'networkidle2', timeout: 60000 });

      const currentUrl = page.url();
      if (currentUrl.includes('login') || currentUrl.includes('signin') || currentUrl.includes('auth')) {
        logStep('Login page detected, filling credentials...');
        await page.waitForSelector('input[type="text"], input[name="nik"], input[name="username"], input[id="nik"], input[id="username"]', { timeout: 15000 });
        
        const nikField = await page.$('input[name="nik"]') || await page.$('input[id="nik"]') || await page.$('input[type="text"]');
        const passField = await page.$('input[type="password"]');
        
        if (nikField) await nikField.type('19010048', { delay: 50 });
        if (passField) await passField.type('123', { delay: 50 });
        
        logStep('Submitting login form...');
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
          page.keyboard.press('Enter')
        ]);
      }

      logStep('Waiting for dashboard to fully load...');
      await new Promise(r => setTimeout(r, 6000));
      
      logStep('Scrolling page to load all lazy sections...');
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
      
      logStep('Waiting for charts to render...');
      await new Promise(r => setTimeout(r, 6000));

      logStep('Searching for "Monitoring Penginputan Jam Jalan" heading...');
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

      if (!absoluteY) {
        throw new Error('Heading "Monitoring Penginputan Jam Jalan" NOT FOUND in the main content area.');
      }

      logStep(`Real heading found at absolute page Y: ${absoluteY}`);
      logStep('Scrolling exactly to the target area...');
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
        logStep('Clicked "Reg 5"! Waiting 6 seconds for drill-down to load...');
        await new Promise(r => setTimeout(r, 6000));
      } else {
        logStep('WARNING: "Reg 5" not found! Taking screenshot of original view.');
      }

      logStep('Taking normal viewport screenshot...');
      const viewportBuffer = await page.screenshot({ type: 'png' });
      
      logStep('Cropping viewport screenshot using Sharp (adjusting for deviceScaleFactor = 1.5)...');
      const scale = 1.5;
      const cropTop = Math.floor(100 * scale);
      const cropLeft = Math.floor(90 * scale);
      const cropWidth = Math.floor(1740 * scale);
      // Mengurangi cropHeight agar "Traceability" tidak terpotret
      const cropHeight = Math.floor(600 * scale);
      
      let pngBuffer;
      const sharp = (await import('sharp')).default;
      pngBuffer = await sharp(viewportBuffer)
        .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
        .toBuffer();

      logStep(`Screenshot successfully taken! Size: ${(pngBuffer.length / 1024).toFixed(2)} KB`);
      if (!fs.existsSync('public')) fs.mkdirSync('public');
      fs.writeFileSync('public/rekap.png', pngBuffer);
      
      await browser.close();
      browser = null;

      // Send via GoWA
      const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
      const deviceId = await getActiveDeviceId(authHeader);
      await sendScreenshotAsDocument(pngBuffer, deviceId, authHeader);

      logStep('✅ Process completed successfully!');
      return; 

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

async function main() {
  const now = new Date();
  const currentHourWIB = parseInt(new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(now));

  if (currentHourWIB === 7 || currentHourWIB === 14) {
    const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
    const deviceId = await getActiveDeviceId(authHeader);
    
    let message = '';
    if (currentHourWIB === 7) {
      message = `💪 *PTPN Tumbuh Juara Bangun Negeri!*\n_Bapak/Ibu sekalian, mohon segera selesaikan inputan Plant Maintenance (PM) unit masing-masing, karena hasil monitoring harian akan segera di-update secara berkala di grup ini._\n\n`;
    } else {
      message = `_Mohon kerjasamanya kepada seluruh unit untuk selalu disiplin melakukan *input* Logbook dan *update* Jam Jalan Mesin Pabrik secara rutin dan tepat waktu. Terima kasih!_\n\n`;
    }
    
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
    
    if (overallSuccess) console.log('✅ Text reminder sent successfully!');
    else { console.error('❌ Failed to send text reminder to some groups.'); process.exit(1); }
  } else {
    // 08:00 or 15:00
    await captureScreenshotWithRetries();
  }
}

main();


