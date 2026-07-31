const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
  const gowaUrl = 'https://gowa.waterflai.my.id';
  const authHeader = 'Basic ' + Buffer.from('admin:Sedap321#').toString('base64');
  const deviceId = encodeURIComponent(',ZZ');
  
  try {
    const fd1 = new FormData();
    fd1.append('phone', '120363427768510358@g.us');
    fd1.append('caption', 'Test as document');
    fd1.append('document', fs.createReadStream('screenshot_final3.png'));
    
    const res1 = await fetch(`${gowaUrl}/send/document?device_id=${deviceId}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: fd1
    });
    console.log('Document endpoint:', await res1.text());
  } catch (e) { console.error('Document error', e.message); }
  
  try {
    const fd2 = new FormData();
    fd2.append('phone', '120363427768510358@g.us');
    fd2.append('caption', 'Test with is_document flag');
    fd2.append('image', fs.createReadStream('screenshot_final3.png'));
    fd2.append('is_document', 'true');
    
    const res2 = await fetch(`${gowaUrl}/send/image?device_id=${deviceId}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: fd2
    });
    console.log('Image endpoint with is_document:', await res2.text());
  } catch (e) { console.error('Image is_document error', e.message); }

  try {
    const fd3 = new FormData();
    fd3.append('phone', '120363427768510358@g.us');
    fd3.append('caption', 'Test with asDocument flag');
    fd3.append('image', fs.createReadStream('screenshot_final3.png'));
    fd3.append('asDocument', 'true');
    
    const res3 = await fetch(`${gowaUrl}/send/image?device_id=${deviceId}`, {
      method: 'POST',
      headers: { 'Authorization': authHeader },
      body: fd3
    });
    console.log('Image endpoint with asDocument:', await res3.text());
  } catch (e) { console.error('Image asDocument error', e.message); }
}
test();
