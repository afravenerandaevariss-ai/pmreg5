import fs from 'fs';

async function testGoWAPdf() {
  const username = 'admin';
  const password = 'Sedap321#';
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const deviceId = 'aaaa'; // active logged-in device

  // Create a minimal valid sample PDF file
  const samplePdfContent = `%PDF-1.4
1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj
2 0 obj <</Type /Pages /Kinds [3 0 R] /Count 1>> endobj
3 0 obj <</Type /Page /Parent 2 0 R /Resources <<>> /Contents 4 0 R>> endobj
4 0 obj <</Length 44>> stream
BT /F1 12 Tf 72 712 Td (Logbook Rekap Regional 5) Tj ET
endstream endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000193 00000 n 
trailer <</Size 5 /Root 1 0 R>>
startxref
286
%%EOF`;

  fs.writeFileSync('test_document.pdf', samplePdfContent);

  const fileEndpoints = ['/send/file', '/send/document'];

  for (const ep of fileEndpoints) {
    try {
      console.log(`Testing GoWA endpoint ${ep}...`);
      const formData = new FormData();
      formData.append('phone', '120363430505509462@g.us');
      formData.append('caption', 'Monitoring Transaksi Logbook Regional 5 PDF Report');
      const blob = new Blob([fs.readFileSync('test_document.pdf')], { type: 'application/pdf' });
      formData.append('file', blob, 'Logbook_Rekap_Regional_5.pdf');
      formData.append('document', blob, 'Logbook_Rekap_Regional_5.pdf');

      const res = await fetch(`https://gowa.waterflai.my.id${ep}?device_id=${encodeURIComponent(deviceId)}`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'X-Device-Id': deviceId
        },
        body: formData
      });
      console.log(`Endpoint ${ep} Status:`, res.status);
      const text = await res.text();
      console.log(`Endpoint ${ep} Response:`, text);
    } catch (e) {
      console.error(`Endpoint ${ep} Error:`, e.message);
    }
  }

  if (fs.existsSync('test_document.pdf')) fs.unlinkSync('test_document.pdf');
}

testGoWAPdf();
