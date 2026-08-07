const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTsA87B43S7y8HgSlEH4Wgu1-SQG8R0ZimWvhDlYJwETWoMKyV13R3hno660bDplBKpaS97nLMZBgUx/pub';

const gids = [
  '1545253477', '2033048565',
  '1081171877', '378103327',
  '2089303535', '374368206',
  '1722739608', '526940195',
  '1678430152', '954169137',
  '510068100'
];

async function inspectGids() {
  for (const gid of gids) {
    const url = `${baseUrl}?gid=${gid}&single=true&output=csv&_t=${Date.now()}`;
    try {
      const res = await fetch(url);
      const csv = await res.text();
      const lines = csv.split('\n').map(l => l.trim()).filter(l => l);
      
      const line0 = lines[0] || '';
      const line1 = lines[1] || '';
      const line2 = lines[2] || '';

      console.log(`\n📌 GID: ${gid}`);
      console.log(`   Line 0: "${line0.slice(0, 100)}"`);
      console.log(`   Line 1: "${line1.slice(0, 100)}"`);
      console.log(`   Line 2: "${line2.slice(0, 100)}"`);

      // Find dates present in this sheet
      const dates = new Set();
      lines.forEach(l => {
        const matches = l.match(/(\d{4}-\d{2}-\d{2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})/g);
        if (matches) matches.forEach(m => dates.add(m));
      });
      console.log(`   Unique dates found: ${Array.from(dates).slice(0, 10).join(', ')} (Total dates: ${dates.size})`);
    } catch (e) {
      console.error(`Error GID ${gid}:`, e.message);
    }
  }
}

inspectGids();
