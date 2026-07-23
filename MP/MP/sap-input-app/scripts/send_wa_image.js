import puppeteer from 'puppeteer';


// Configuration from environment variables
let TARGET_PHONE = process.env.TARGET_PHONE || '081251334618'; // Group PM target
if (TARGET_PHONE.startsWith('0')) {
  TARGET_PHONE = '62' + TARGET_PHONE.substring(1);
}
const GOWA_URL = process.env.GOWA_URL || 'https://gowa.waterflai.my.id';
const GOWA_USER = process.env.GOWA_USER || 'admin';
const GOWA_PASS = process.env.GOWA_PASS || 'Sedap321#';
const APP_URL = process.env.APP_URL || 'https://pmreg5.afratarigan.my.id';
const NIK = process.env.WEB_NIK || '19010048';
const PASS = process.env.WEB_PASS || 'ikatanistripenerbanganindonesia';

async function run() {
  console.log('Starting automated screenshot & WA delivery...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new', // run in new headless mode
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    
    console.log(`Navigating to ${APP_URL}/?tab=vehicles...`);
    await page.goto(APP_URL + '/?tab=vehicles', { waitUntil: 'networkidle2' });
    
    // Login
    console.log('Logging in...');
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    
    // In React, page.type is much more reliable than dispatching events manually
    // Assuming first text input is NIK and first password input is Password
    const textInputs = await page.$$('input[type="text"]');
    if (textInputs.length > 0) {
      await textInputs[0].type(NIK);
    }
    
    const passInputs = await page.$$('input[type="password"]');
    if (passInputs.length > 0) {
      await passInputs[0].type(PASS);
    }
    
    // Click login button
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginBtn = buttons.find(b => b.textContent.toLowerCase().includes('masuk'));
      if (loginBtn) loginBtn.click();
    });
    
    console.log('Waiting 5 seconds to see login result...');
    await new Promise(r => setTimeout(r, 5000));
    
    // Explicitly click the VehicleMonitoringView tab in the sidebar (Truck icon)
    console.log('Clicking the Truck icon in the sidebar...');
    await page.evaluate(() => {
      const allBtns = document.querySelectorAll('button');
      for (let btn of allBtns) {
        if (btn.innerHTML.includes('lucide-truck')) {
          btn.click();
          break;
        }
      }
    });
    
    // Wait a bit after clicking the tab
    await new Promise(r => setTimeout(r, 2000));
    
    await page.screenshot({ path: 'debug.png' });
    console.log('Saved debug.png');
    
    // Wait for the report sheet to load
    console.log('Waiting for dashboard and report sheet to load...');
    await page.waitForSelector('#excel-report-sheet', { timeout: 30000 });
    
    // Wait a bit extra for data to fetch and render
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Modifying DOM to avoid cropping...');
    await page.evaluate(() => {
      const element = document.getElementById('excel-report-sheet');
      const tableWrapper = element.querySelector('.overflow-x-auto');
      if (element) {
        element.style.setProperty('max-width', 'none', 'important');
        element.style.setProperty('width', 'max-content', 'important');
        element.style.setProperty('margin', '0', 'important');
      }
      if (tableWrapper) {
        tableWrapper.style.setProperty('overflow', 'visible', 'important');
        tableWrapper.style.setProperty('width', 'max-content', 'important');
      }
    });
    
    console.log('Taking HD screenshot...');
    const element = await page.$('#excel-report-sheet');
    const imageBuffer = await element.screenshot({ type: 'png' });
    console.log(`Screenshot taken! Size: ${Math.round(imageBuffer.length / 1024)} KB`);
    
    await browser.close();
    
    // Send to GoWA
    console.log('Sending to GoWA API...');
    const authHeader = 'Basic ' + Buffer.from(`${GOWA_USER}:${GOWA_PASS}`).toString('base64');
    
    // First, find device
    let deviceId = '黄玲玲';
    try {
      const devRes = await fetch(`${GOWA_URL}/devices`, { headers: { 'Authorization': authHeader } });
      if (devRes.ok) {
        const devData = await devRes.json();
        const activeDev = (devData.results || []).find(d => d.state === 'logged_in');
        if (activeDev) deviceId = activeDev.id;
      }
    } catch (e) {
      console.warn('Could not fetch GoWA device list:', e.message);
    }
    
    const now = new Date();
    const dateStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()}`;
    
    // Attempt sending image as form-data
    // Note: We might need to adjust this depending on exact GoWA specs
    const formData = new FormData();
    formData.append('phone', TARGET_PHONE);
    formData.append('message', 'Laporan Monitoring Logbook Kendaraan (Otomatis)');
    
    // In Node.js 18+, native FormData expects a Blob instead of a raw Buffer
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('file', imageBlob, 'report.png');
    // form.append('caption', caption); // some APIs use caption instead of message for images
    
    // Try POST /send/message
    const sendRes = await fetch(`${GOWA_URL}/send/message?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader
      },
      body: formData
    });
    
    const sendData = await sendRes.json();
    console.log('GoWA Response:', sendData);
    if(sendData.code === 'SUCCESS' || sendData.success) {
      console.log('✅ Successfully sent image to WA!');
    } else {
      console.log('❌ Failed or got unexpected response, please verify API endpoint.');
    }
    
  } catch (err) {
    console.error('Task failed:', err);
    if(browser) await browser.close();
    process.exit(1);
  }
}

run();
