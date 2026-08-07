async function run() {
  console.log('Fetching connected devices from GoWA Server...');
  const gowaUrl = 'https://gowa.waterflai.my.id';
  const authHeader = 'Basic ' + Buffer.from('admin:Sedap321#').toString('base64');

  const endpoints = [
    `${gowaUrl}/devices`,
    `${gowaUrl}/api/devices`,
    `${gowaUrl}/device/list`,
    `${gowaUrl}/api/device/list`
  ];

  for (const url of endpoints) {
    try {
      console.log(`GET ${url}...`);
      const res = await fetch(url, {
        headers: { 'Authorization': authHeader }
      });
      const text = await res.text();
      console.log(`Status: ${res.status}`);
      console.log(`Body: ${text}\n`);
    } catch (e) {
      console.error(`Error GET ${url}:`, e.message);
    }
  }
}

run();
