const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

async function scanPdf(filename) {
  const filePath = path.join('C:/Logbook/MODUL PLANT MAINTENANCE', filename);
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data }).promise;
  console.log(`=== ${filename} (Total Pages: ${doc.numPages}) ===`);
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const ops = await page.getOperatorList();
    const imgs = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      if (ops.fnArray[i] === pdfjs.OPS.paintImageXObject) {
        const k = ops.argsArray[i][0];
        await new Promise(r => {
          let done = false;
          const t = setTimeout(() => { if (!done) { done = true; r(); } }, 300);
          page.objs.get(k, obj => {
            if (!done) {
              done = true;
              clearTimeout(t);
              if (obj && obj.width > 200 && obj.height > 100) {
                imgs.push({ k, w: obj.width, h: obj.height });
              }
              r();
            }
          });
        });
      }
    }
    if (imgs.length > 0) {
      console.log(`  Page ${p}: ` + imgs.map(x => `${x.k}(${x.w}x${x.h})`).join(', '));
    }
  }
}

async function run() {
  await scanPdf('12. PM-UM-02_Bisnis Proses-Maintenance Notification v02.pdf');
  await scanPdf('02. PM-UM-02_Master Data-Equipment v02.pdf');
  await scanPdf('05. PM-UM-02_Master Data-Measuring Point v02.pdf');
  await scanPdf('07. PM-UM-02_Master Data-Catalog v02.pdf');
  await scanPdf('08. PM-UM-02_Master Data-Task List v02.pdf');
  await scanPdf('17. PM-UM-02_Measurement Document v02.pdf');
}
run().catch(console.error);
