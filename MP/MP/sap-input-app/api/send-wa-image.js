import { getSystemConfig } from '../src/lib/supabaseService.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const waConfig = (await getSystemConfig(12)) || {};
    const targetPhone = req.query.target || req.body?.target || waConfig.targetPhone || '120363430505509462@g.us';
    const provider = req.query.provider || req.body?.provider || waConfig.provider || 'gowa';
    const baseUrl = req.headers.host ? `https://${req.headers.host}` : 'https://pmreg5.afratarigan.my.id';

    // 1. Use Microlink API to take HD screenshot
    const targetUrl = encodeURIComponent(`${baseUrl}/?hideNav=true`);
    const microlinkUrl = `https://api.microlink.io/?url=${targetUrl}&screenshot=true&meta=false&waitForTimeout=5000&viewport.width=1400&viewport.height=1000&viewport.deviceScaleFactor=2`;
    
    console.log('Fetching screenshot from Microlink...');
    const microRes = await fetch(microlinkUrl);
    if (!microRes.ok) throw new Error('Failed to capture screenshot via Microlink');
    const microData = await microRes.json();
    const imageUrl = microData.data?.screenshot?.url;
    
    if (!imageUrl) throw new Error('Screenshot URL not returned by Microlink');
    
    console.log('Screenshot URL:', imageUrl);

    // 2. Fetch the image to convert to Base64
    const imgRes = await fetch(imageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    const screenshotBase64 = Buffer.from(arrayBuffer).toString('base64');

    let dispatchResult = { success: false, detail: null };
    const apiToken = req.query.token || req.body?.token || waConfig.apiToken || process.env.FONNTE_TOKEN;
    const gowaUrl = req.query.gowaUrl || waConfig.gowaUrl || 'https://gowa.waterflai.my.id';
    const gowaUser = req.query.gowaUser || waConfig.gowaUser || 'admin';
    const gowaPass = req.query.gowaPass || waConfig.gowaPass || 'Sedap321#';

    if (provider === 'gowa') {
      const authHeader = 'Basic ' + Buffer.from(`${gowaUser}:${gowaPass}`).toString('base64');
      let deviceId = waConfig.gowaDevice || ',ZZ';

      try {
        const devRes = await fetch(`${gowaUrl}/devices`, { headers: { 'Authorization': authHeader } });
        if (devRes.ok) {
          const devData = await devRes.json();
          const activeDev = (devData.results || []).find(d => d.state === 'logged_in');
          if (activeDev) deviceId = activeDev.id;
        }
      } catch (e) {
        console.warn('Could not fetch active GoWA device list:', e.message);
      }

      let formattedPhone = targetPhone;
      if (targetPhone.includes('@g.us')) {
        formattedPhone = targetPhone.trim();
      } else {
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
          caption: 'Laporan otomatis (HD Screenshot)',
          image: `data:image/png;base64,${screenshotBase64}`
        })
      });

      const gowaData = await gowaRes.json();
      dispatchResult = {
        success: gowaData.code === 'SUCCESS',
        detail: gowaData
      };
      
    } else {
      // Fallback to Fonnte
      const formData = new URLSearchParams();
      formData.append('target', targetPhone);
      formData.append('message', `Laporan otomatis (HD Screenshot)\n\n${imageUrl}`);
      formData.append('countryCode', '62');
      
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
      message: `Image Screenshot sent to ${targetPhone}`,
      dispatchResult,
      target: targetPhone,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Error generating/sending screenshot:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
