import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { getSystemConfig } from '../src/lib/supabaseService.js';
import { createClient } from '@supabase/supabase-js';

// Vercel Edge/Serverless function config
export const config = {
  maxDuration: 60, // Maximum duration for Vercel Hobby is 10s, but we set 60s in case they are on Pro
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jntrcngldjffohommske.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let browser = null;
  try {
    const waConfig = (await getSystemConfig(12)) || {};
    const targetPhone = req.query.target || req.body?.target || waConfig.targetPhone || '120363430505509462@g.us';
    const provider = req.query.provider || req.body?.provider || waConfig.provider || 'gowa';
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://pmreg5.afratarigan.my.id';

    // 1. Launch Puppeteer
    browser = await puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    const page = await browser.newPage();
    
    // Set HD Viewport as requested by user
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 });
    
    // 2. Navigate to Dashboard
    await page.goto(`${baseUrl}/?hideNav=true`, { waitUntil: 'networkidle0', timeout: 15000 });

    // 3. Take Screenshot of the dashboard content
    // We crop to the specific dashboard element if it exists, otherwise full page
    const element = await page.$('.p-4.md\\:p-8'); // Main content area
    let screenshotBase64;
    
    if (element) {
      screenshotBase64 = await element.screenshot({ encoding: 'base64', type: 'png' });
    } else {
      screenshotBase64 = await page.screenshot({ encoding: 'base64', type: 'png', fullPage: true });
    }

    await browser.close();
    browser = null;

    // 4. Send to GoWA
    let dispatchResult = { success: false, detail: null };
    
    if (provider === 'gowa') {
      const gowaUrl = req.query.gowaUrl || waConfig.gowaUrl || 'https://gowa.waterflai.my.id';
      const gowaUser = req.query.gowaUser || waConfig.gowaUser || 'admin';
      const gowaPass = req.query.gowaPass || waConfig.gowaPass || 'Sedap321#';
      const authHeader = 'Basic ' + Buffer.from(`${gowaUser}:${gowaPass}`).toString('base64');
      
      let deviceId = waConfig.gowaDevice || ',ZZ';
      
      let formattedPhone = targetPhone;
      if (!targetPhone.includes('@g.us')) {
        const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
        formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
      }

      // Send Base64 Image to GoWA
      const gowaRes = await fetch(`${gowaUrl}/send/image?device_id=${encodeURIComponent(deviceId)}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: formattedPhone,
          caption: `*Monitoring Transaksi Logbook*\nLaporan otomatis (HD Screenshot) dari ${baseUrl}`,
          image: `data:image/png;base64,${screenshotBase64}`
        })
      });

      const gowaData = await gowaRes.json();
      dispatchResult = {
        success: gowaData.code === 'SUCCESS',
        detail: gowaData
      };
    } else {
      // Fonnte image sending logic
      const apiToken = req.query.token || req.body?.token || waConfig.apiToken;
      const formData = new URLSearchParams();
      formData.append('target', targetPhone);
      formData.append('url', `data:image/png;base64,${screenshotBase64}`);
      formData.append('caption', `Laporan otomatis (HD Screenshot)`);
      
      const apiRes = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': apiToken },
        body: formData
      });
      const apiData = await apiRes.json();
      dispatchResult = { success: apiData.status === true || apiData.status === 'true', detail: apiData };
    }

    return res.status(200).json({
      success: true,
      message: 'Screenshot HD berhasil dikirim!',
      dispatchResult
    });

  } catch (err) {
    if (browser) await browser.close();
    console.error('Error generating/sending screenshot:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
