import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  console.log('Navigating to https://pmreg5.afratarigan.my.id/');
  await page.goto('https://pmreg5.afratarigan.my.id/', { waitUntil: 'networkidle0' });
  
  const content = await page.content();
  console.log('Page loaded. Length:', content.length);
  
  await browser.close();
})();
