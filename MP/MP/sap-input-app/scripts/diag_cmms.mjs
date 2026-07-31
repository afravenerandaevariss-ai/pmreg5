import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

  console.log('[2] Navigating to login page...');
  await page.goto('https://cmms.ptpn4.co.id/login', { waitUntil: 'networkidle2', timeout: 60000 });

  // Dump semua input fields yang ada
  const inputs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input')).map(el => ({
      type: el.type, name: el.name, id: el.id, placeholder: el.placeholder
    }));
  });
  console.log('[3] Input fields found:', JSON.stringify(inputs, null, 2));

  // Screenshot halaman login
  const loginShot = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'diag_login.png'), Buffer.from(loginShot));
  console.log('[4] Login page screenshot saved.');

  // Isi form login
  const nikInput = await page.$('input[name="nik"]') || await page.$('input[id="nik"]') || await page.$('input[type="text"]') || await page.$('input[placeholder*="NIK"]');
  const passInput = await page.$('input[type="password"]');

  console.log('[5] NIK input found:', !!nikInput, '| Pass input found:', !!passInput);

  if (nikInput) { await nikInput.click({ clickCount: 3 }); await nikInput.type('19010048', { delay: 80 }); }
  if (passInput) { await passInput.click({ clickCount: 3 }); await passInput.type('123', { delay: 80 }); }

  // Klik tombol submit
  const submitBtn = await page.$('button[type="submit"]') || await page.$('input[type="submit"]') || await page.$('button');
  console.log('[6] Submit button found:', !!submitBtn);
  
  if (submitBtn) {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {}),
      submitBtn.click()
    ]);
  }

  await new Promise(r => setTimeout(r, 6000));
  
  // Scroll entire page slowly to trigger lazy loading
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
  await new Promise(r => setTimeout(r, 3000));

  console.log('[7] Current URL after login:', page.url());

  // Full page screenshot
  const afterLoginShot = await page.screenshot({ type: 'png', fullPage: true });
  fs.writeFileSync(path.join(__dirname, '..', 'public', 'diag_fullpage.png'), Buffer.from(afterLoginShot));
  console.log('[8] Full page screenshot saved.');

  // Dump ALL unique text elements
  const allText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .filter(el => el.childElementCount === 0 && el.textContent.trim().length > 2 && el.textContent.trim().length < 120)
      .map(el => el.textContent.trim())
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 80);
  });
  console.log('[9] ALL text on full page:', JSON.stringify(allText, null, 2));

  await browser.close();
  console.log('✅ Done. Check public/diag_fullpage.png');
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
