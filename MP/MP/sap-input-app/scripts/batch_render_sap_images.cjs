const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');

const modulesToRender = [
  {
    tcode: 'il01',
    file: '01. PM-UM-02_Master Data-Functional Location v02.pdf',
    pages: [8, 9, 10, 12, 16]
  },
  {
    tcode: 'ie01',
    file: '02. PM-UM-02_Master Data-Equipment v02.pdf',
    pages: [8, 9, 11, 16]
  },
  {
    tcode: 'ib01',
    file: '03. PM-UM-02_Master Data-Bill of Material v02.pdf',
    pages: [8, 11, 14, 18]
  },
  {
    tcode: 'ir01',
    file: '04. PM-UM-02_Master Data-Work Center v02.pdf',
    pages: [8, 19, 21, 24]
  },
  {
    tcode: 'ik01',
    file: '05. PM-UM-02_Master Data-Measuring Point v02.pdf',
    pages: [8, 9, 13, 18]
  },
  {
    tcode: 'qs41',
    file: '07. PM-UM-02_Master Data-Catalog v02.pdf',
    pages: [8, 12, 16]
  },
  {
    tcode: 'ia01',
    file: '08. PM-UM-02_Master Data-Task List v02.pdf',
    pages: [8, 9, 15, 23]
  },
  {
    tcode: 'ip01',
    file: '10. PM-UM-02_Master Data-Maintenance Plan v02.pdf',
    pages: [8, 12, 16, 22]
  },
  {
    tcode: 'ip30',
    file: '11. PM-UM-02_Maintenance Schedule v02.pdf',
    pages: [8, 11, 14, 16]
  },
  {
    tcode: 'iw21',
    file: '12. PM-UM-02_Bisnis Proses-Maintenance Notification v02.pdf',
    pages: [8, 9, 13, 18]
  },
  {
    tcode: 'ik11',
    file: '17. PM-UM-02_Measurement Document v02.pdf',
    pages: [8, 9, 11, 14]
  }
];

const basePath = 'C:/Logbook/MODUL PLANT MAINTENANCE';
const outBase = path.join(__dirname, '../public/images');

async function renderAll() {
  for (const m of modulesToRender) {
    const filePath = path.join(basePath, m.file);
    if (!fs.existsSync(filePath)) {
      console.warn('File not found:', filePath);
      continue;
    }
    const targetDir = path.join(outBase, m.tcode);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`Processing ${m.tcode} (${m.file})...`);
    const data = new Uint8Array(fs.readFileSync(filePath));
    const doc = await pdfjs.getDocument({ data }).promise;

    for (let i = 0; i < m.pages.length; i++) {
      const pageNum = m.pages[i];
      if (pageNum > doc.numPages) continue;

      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      const outName = `step_${i + 1}.png`;
      const outPath = path.join(targetDir, outName);
      fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
      console.log(`  Saved ${m.tcode}/${outName} (page ${pageNum})`);
    }
  }
  console.log('ALL MODULE SCREENSHOTS RENDERED SUCCESSFULLY!');
}

renderAll().catch(console.error);
