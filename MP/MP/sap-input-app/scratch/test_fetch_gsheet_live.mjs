const gsheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTsA87B43S7y8HgSlEH4Wgu1-SQG8R0ZimWvhDlYJwETWoMKyV13R3hno660bDplBKpaS97nLMZBgUx/pub?output=csv';

async function testFetch() {
  const res = await fetch(`${gsheetUrl}&_t=${Date.now()}`);
  const text = await res.text();
  console.log('=== RAW LINES 0 to 40 ===');
  const lines = text.split('\n');
  lines.slice(0, 40).forEach((l, i) => console.log(`[Line ${i}] ${l.trim()}`));
}

testFetch();
