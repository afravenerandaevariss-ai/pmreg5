import mammoth from 'mammoth';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const docxPath = 'D:/Eval PM/Monitoring logbook/MP/MP/tutorial/zpmik22.docx';
const outputDir = 'public/tutorial/zpmik22';

try {
  mkdirSync(outputDir, { recursive: true });
} catch(e) {}

// Extract HTML with images embedded as base64
const options = {
  convertImage: mammoth.images.imgElement(function(image) {
    return image.read("base64").then(function(imageBuffer) {
      const ext = image.contentType.split('/')[1] || 'png';
      const filename = `img_${Date.now()}_${Math.random().toString(36).substr(2,5)}.${ext}`;
      const outputPath = path.join(outputDir, filename);
      writeFileSync(outputPath, Buffer.from(imageBuffer, 'base64'));
      return { src: `/tutorial/zpmik22/${filename}` };
    });
  })
};

mammoth.convertToHtml({ path: docxPath }, options).then((result) => {
    writeFileSync('scripts/zpmik22_content.html', result.value);
    
    mammoth.extractRawText({ path: docxPath }).then((textResult) => {
        writeFileSync('scripts/zpmik22_text.txt', textResult.value);
        
        console.log('HTML content saved to scripts/zpmik22_content.html');
        console.log('Text content saved to scripts/zpmik22_text.txt');
        console.log('Images saved to', outputDir);
        console.log('\nMessages:', result.messages.length > 0 ? result.messages : 'none');
    });
});
