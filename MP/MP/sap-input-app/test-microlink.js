async function test() {
  const targetUrl = encodeURIComponent(`https://pmreg5.afratarigan.my.id/?hideNav=true&tab=vehicle&screenshotMode=true&t=${Date.now()}`);
  const microlinkUrl = `https://api.microlink.io/?url=${targetUrl}&screenshot=true&meta=false&waitForSelector=%23data-ready&waitForTimeout=35000&viewport.width=1400&viewport.height=4000&viewport.deviceScaleFactor=2&element=%23excel-report-sheet`;
  
  console.log(microlinkUrl);
  const res = await fetch(microlinkUrl);
  const data = await res.json();
  console.log(data);
}
test();
