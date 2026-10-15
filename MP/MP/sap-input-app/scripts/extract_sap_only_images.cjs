const fs = require('fs');
const path = require('path');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const sharp = require('sharp');

const modulesToRender = [
  {
    tcode: 'il01',
    file: '01. PM-UM-02_Master Data-Functional Location v02.pdf',
    pages: [8, 9, 10, 13, 17]
  },
  {
    tcode: 'ie01',
    file: '02. PM-UM-02_Master Data-Equipment v02.pdf',
    pages: [8, 9, 11, 17]
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
    pages: [8, 10, 12, 18]
  },
  {
    tcode: 'qs41',
    file: '07. PM-UM-02_Master Data-Catalog v02.pdf',
    pages: [8, 10, 16]
  },
  {
    tcode: 'ia01',
    file: '08. PM-UM-02_Master Data-Task List v02.pdf',
    pages: [8, 9, 11, 23]
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
    pages: [8, 9, 11, 18]
  },
  {
    tcode: 'ik11',
    file: '17. PM-UM-02_Measurement Document v02.pdf',
    pages: [8, 9, 10, 14]
  }
];

const basePath = 'C:/Logbook/MODUL PLANT MAINTENANCE';
const outBase = path.join(__dirname, '../public/images');

async function extractSapImages() {
  console.log('--- Ekstraksi Layar SAP GUI Asli Dimulai ---');

  for (const mod of modulesToRender) {
    const pdfPath = path.join(basePath, mod.file);
    if (!fs.existsSync(pdfPath)) {
      console.warn(`File ${pdfPath} tidak ditemukan!`);
      continue;
    }

    const targetDir = path.join(outBase, mod.tcode);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`\nModul [${mod.tcode.toUpperCase()}]:`);
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjs.getDocument({ data }).promise;

    for (let i = 0; i < mod.pages.length; i++) {
      const pageNum = mod.pages[i];
      const stepIndex = i + 1;
      const targetFileName = `step_${stepIndex}.png`;
      const targetFilePath = path.join(targetDir, targetFileName);

      const page = await doc.getPage(pageNum);
      const ops = await page.getOperatorList();

      const candidateImages = [];
      for (let opIdx = 0; opIdx < ops.fnArray.length; opIdx++) {
        if (ops.fnArray[opIdx] === pdfjs.OPS.paintImageXObject) {
          const imgKey = ops.argsArray[opIdx][0];
          await new Promise((resolve) => {
            let resolved = false;
            const timeout = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                resolve();
              }
            }, 600);

            page.objs.get(imgKey, (imgObj) => {
              if (!resolved) {
                resolved = true;
                clearTimeout(timeout);
                if (imgObj && imgObj.width && imgObj.height) {
                  // Saring gambar kecil / icon / logo (< 220px)
                  if (imgObj.width > 220 && imgObj.height > 100) {
                    candidateImages.push(imgObj);
                  }
                }
                resolve();
              }
            });
          });
        }
      }

      if (candidateImages.length === 0) {
        console.warn(`  [!] Tidak ada gambar SAP di hal ${pageNum} untuk step_${stepIndex}`);
        continue;
      }

      // Ambil gambar terbesar di halaman tersebut
      candidateImages.sort((a, b) => (b.width * b.height) - (a.width * a.height));
      const bestImg = candidateImages[0];

      const channels = bestImg.kind === 1 ? 1 : (bestImg.kind === 2 ? 3 : 4);
      try {
        await sharp(Buffer.from(bestImg.data), {
          raw: {
            width: bestImg.width,
            height: bestImg.height,
            channels: channels
          }
        }).png().toFile(targetFilePath);

        console.log(`  -> Berhasil simpan ${mod.tcode}/${targetFileName} (${bestImg.width}x${bestImg.height}, hal ${pageNum})`);
      } catch (err) {
        console.error(`  Gagal menyimpan ${mod.tcode}/${targetFileName}:`, err.message);
      }
    }
  }

  console.log('\n--- Ekstraksi 100% Selesai Sukses ---');
}

extractSapImages().catch(console.error);
