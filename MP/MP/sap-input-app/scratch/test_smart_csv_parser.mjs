const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTsA87B43S7y8HgSlEH4Wgu1-SQG8R0ZimWvhDlYJwETWoMKyV13R3hno660bDplBKpaS97nLMZBgUx/pub';

async function testMatrix() {
  const url = `${baseUrl}?gid=1081171877&single=true&output=csv&_t=${Date.now()}`;
  const res = await fetch(url);
  const csv = await res.text();
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l);

  console.log('=== GID 1081171877 MATRIX PREVIEW ===');
  lines.slice(0, 10).forEach((l, i) => console.log(`[Line ${i}] ${l.slice(0, 150)}`));
}

testMatrix();
