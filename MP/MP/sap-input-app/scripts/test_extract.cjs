const fs = require('fs');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');

async function test() {
  const filePath = 'C:/Logbook/MODUL PLANT MAINTENANCE/01. PM-UM-02_Master Data-Functional Location v02.pdf';
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(9);
  const ops = await page.getOperatorList();
  
  for (const k of ['img_p8_1', 'img_p8_2', 'img_p8_3', 'img_p8_4']) {
    const res = await new Promise((resolve) => {
      let done = false;
      const t = setTimeout(() => {
        if (!done) {
          done = true;
          resolve('TIMEOUT');
        }
      }, 1000);
      page.objs.get(k, (data) => {
        if (!done) {
          done = true;
          clearTimeout(t);
          resolve(data ? (data.width + 'x' + data.height + ' kind=' + data.kind) : 'null');
        }
      });
    });
    console.log(k, res);
  }
}
test().catch(console.error);
