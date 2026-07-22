import fs from 'fs';

async function testGoWAImageMultipart() {
  const username = 'admin';
  const password = 'Sedap321#';
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const deviceId = 'aaaa'; // active device ID from /devices

  // Create a dummy red 1x1 or test PNG image buffer
  const samplePngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  fs.writeFileSync('test_image.png', samplePngBuffer);

  const formData = new FormData();
  formData.append('phone', '120363430505509462@g.us');
  formData.append('caption', 'Monitoring Transaksi Logbook Regional 5');
  const blob = new Blob([samplePngBuffer], { type: 'image/png' });
  formData.append('image', blob, 'test_image.png');

  console.log("Sending multipart POST to /send/image with device_id:", deviceId);

  try {
    const res = await fetch(`https://gowa.waterflai.my.id/send/image?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'X-Device-Id': deviceId
      },
      body: formData
    });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Error:", e.message);
  } finally {
    if (fs.existsSync('test_image.png')) fs.unlinkSync('test_image.png');
  }
}

testGoWAImageMultipart();
