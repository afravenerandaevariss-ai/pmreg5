import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
       console.log('PAGE ERROR LOG:', msg.text());
       msg.args().forEach(async arg => {
         console.log(await arg.jsonValue());
       });
    } else {
       console.log('PAGE LOG:', msg.text());
    }
  });
  page.on('pageerror', err => console.log('PAGE UNCAUGHT ERROR:', err.toString(), err.stack));
  
  console.log('Navigating to https://pmreg5.afratarigan.my.id/');
  await page.goto('https://pmreg5.afratarigan.my.id/', { waitUntil: 'networkidle0' });
  
  await browser.close();
})();
