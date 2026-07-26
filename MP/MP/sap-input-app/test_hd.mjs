import fs from 'node:fs';

async function test() {
  const gowaUrl = 'https://gowa.waterflai.my.id';
  const authHeader = 'Basic ' + Buffer.from('admin:Sedap321#').toString('base64');
  let deviceId = ',ZZ';
  try {
    const devRes = await fetch(`${gowaUrl}/devices`, { headers: { 'Authorization': authHeader } });
    if (devRes.ok) {
      const devData = await devRes.json();
      const activeDev = (devData.results || []).find(d => d.state === 'logged_in');
      if (activeDev) deviceId = activeDev.id;
    }
  } catch (e) {}
  deviceId = encodeURIComponent(deviceId);
  
  const fileBuffer = fs.readFileSync('screenshot_final.png');

  // Test 4: /send/file
  try {
    const fd4 = new FormData();
    fd4.append('phone', '120363430505509462@g.us');
    fd4.append('caption', 'Test 4: /send/file endpoint');
    fd4.append('file', new Blob([fileBuffer], { type: 'image/png' }), 'screenshot.png');
    
    const res4 = await fetch(`${gowaUrl}/send/file?device_id=${deviceId}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: fd4
    });
    console.log('Test 4 File endpoint:', await res4.text());
  } catch (e) { console.error('File endpoint error', e.message); }

  // Test 5: /send/image with send_as_document
  try {
    const fd5 = new FormData();
    fd5.append('phone', '120363430505509462@g.us');
    fd5.append('caption', 'Test 5: /send/image with send_as_document=true');
    fd5.append('image', new Blob([fileBuffer], { type: 'image/png' }), 'screenshot.png');
    fd5.append('send_as_document', 'true');
    
    const res5 = await fetch(`${gowaUrl}/send/image?device_id=${deviceId}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: fd5
    });
    console.log('Test 5 Image endpoint send_as_document:', await res5.text());
  } catch (e) { console.error('Image send_as_document error', e.message); }
}
test();
