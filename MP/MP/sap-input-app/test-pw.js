import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.setViewportSize({ width: 1400, height: 4000 });
  const targetUrl = 'https://pmreg5.afratarigan.my.id/?hideNav=true&tab=vehicle&screenshotMode=true';
  console.log('Navigating to', targetUrl);
  
  await page.goto(targetUrl, { waitUntil: 'networkidle' });
  
  console.log('Waiting for #data-ready...');
  await page.waitForSelector('#data-ready', { state: 'attached', timeout: 30000 });
  console.log('#data-ready found!');
  
  const element = await page.$('#excel-report-sheet');
  if (element) {
    console.log('Element found, taking screenshot...');
    await element.screenshot({ path: 'test-pw-screenshot.png' });
    console.log('Screenshot saved to test-pw-screenshot.png');
  } else {
    console.log('#excel-report-sheet not found!');
  }
  
  await browser.close();
}
test();
