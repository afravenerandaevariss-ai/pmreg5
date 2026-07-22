const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'; // Assuming this from before
const htmlPath = path.resolve('temp_test.html');
const imgPath = path.resolve('test_hd.png');

fs.writeFileSync(htmlPath, '<html><body style="width:800px;height:1000px;background:red;"><h1 style="font-size:100px;color:white;">TEST HD</h1></body></html>');

execFile(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--window-size=900,1100',
  '--force-device-scale-factor=3',
  `--screenshot=${imgPath}`,
  `file:///${htmlPath.replace(/\\/g, '/')}`
], (err) => {
  if (err) console.error(err);
  else {
    console.log('PNG generated!', fs.statSync(imgPath).size, 'bytes');
  }
});
