async function testSmartFetch(rawUrl, monthStr = '2026-08') {
  console.log('🚀 Smart Fetching Google Sheet:', rawUrl);

  const cleanUrl = rawUrl.split('?')[0]; // strip query params
  let pubhtmlUrl = cleanUrl;
  if (cleanUrl.endsWith('/pub')) {
    pubhtmlUrl = cleanUrl + 'html';
  } else if (!cleanUrl.endsWith('/pubhtml')) {
    const match = cleanUrl.match(/\/d\/e\/([a-zA-Z0-9-_]+)/);
    if (match) {
      pubhtmlUrl = `https://docs.google.com/spreadsheets/d/e/${match[1]}/pubhtml`;
    }
  }

  console.log('📍 Clean pubhtml URL:', pubhtmlUrl);

  let gids = [];
  try {
    const htmlRes = await fetch(`${pubhtmlUrl}?_t=${Date.now()}`);
    const htmlText = await htmlRes.text();
    const hrefGids = [...htmlText.matchAll(/gid=(\d+)["&']/g)].map(h => h[1]);
    gids = [...new Set(hrefGids)];
    console.log(`Found ${gids.length} tab GIDs in pubhtml:`, gids);
  } catch (e) {
    console.warn('Could not fetch pubhtml:', e.message);
  }

  const csvUrls = [];
  const basePub = pubhtmlUrl.replace('/pubhtml', '/pub');
  if (gids.length > 0) {
    gids.forEach(gid => {
      csvUrls.push(`${basePub}?gid=${gid}&single=true&output=csv&_t=${Date.now()}`);
    });
  } else {
    csvUrls.push(`${basePub}?output=csv&_t=${Date.now()}`);
  }

  console.log(`📥 Fetching ${csvUrls.length} CSV tabs...`);
  const allParsed = [];

  for (const url of csvUrls) {
    try {
      const res = await fetch(url);
      const csvText = await res.text();
      const items = parseCSVMatrixOrVertical(csvText, monthStr);
      allParsed.push(...items);
    } catch (e) {
      console.warn('Failed to fetch/parse tab:', url, e.message);
    }
  }

  console.log(`\n🎉 Total items parsed from all tabs: ${allParsed.length}`);
  const perDate = {};
  allParsed.forEach(it => {
    if (it.durationMinutes > 0) {
      perDate[it.dateStr] = (perDate[it.dateStr] || 0) + 1;
    }
  });

  console.log('📊 Active inputs per date (duration > 0):');
  Object.entries(perDate).sort().forEach(([d, cnt]) => {
    console.log(`  - Date ${d}: ${cnt} equipment entries`);
  });
}

function parseCSVMatrixOrVertical(csvText, defaultMonth = '2026-08') {
  const lines = csvText.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
  if (lines.length < 2) return [];

  const splitLine = (line) => {
    const cols = [];
    let cur = '', inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
      else cur += ch;
    }
    cols.push(cur.trim());
    return cols;
  };

  let headerIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cols = splitLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim().toLowerCase());
    if (cols.includes('equipment') || cols.includes('tanggal')) {
      headerIdx = i;
      headers = cols;
      break;
    }
  }

  if (headerIdx === -1) return [];

  const isVertical = headers.includes('tanggal') || headers.includes('date');
  const parsed = [];

  if (isVertical) {
    const tanggalIdx = headers.findIndex(h => h.includes('tanggal') || h.includes('date'));
    const plantIdx   = headers.findIndex(h => h.includes('plant'));
    const eqIdx      = headers.findIndex(h => h.includes('equipment') || h.includes('kode'));
    const descIdx    = headers.findIndex(h => h.includes('desc') || h.includes('deskripsi'));
    const jamIdx     = headers.findIndex(h => h.includes('jam') || h.includes('durasi') || h.includes('hour'));

    let lastSeenDate = '';
    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
      let tgl = cols[tanggalIdx] || '';
      const eq = cols[eqIdx] || '';
      const jamRaw = cols[jamIdx] || '0';
      const plant = plantIdx >= 0 ? cols[plantIdx] : '';
      const desc = descIdx >= 0 ? cols[descIdx] : '';

      if (!tgl && !eq) continue;
      if (!tgl && lastSeenDate) tgl = lastSeenDate;

      let dateStr = '';
      const dmyMatch = tgl.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      const isoMatch = tgl.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dmyMatch) {
        dateStr = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
      } else if (isoMatch) {
        dateStr = tgl;
      }
      if (!dateStr || !eq) continue;

      const jam = parseFloat(jamRaw.replace(',', '.')) || 0;
      parsed.push({ dateStr, indukEqNum: eq, indukDesc: desc, plant, durationMinutes: Math.round(jam * 60) });
    }
  } else {
    // MATRIX FORMAT: Equipment, Description, ..., Plant, Total, 01, 02, 03, ...
    const eqIdx = headers.findIndex(h => h === 'equipment' || h.includes('equipment'));
    const descIdx = headers.findIndex(h => h === 'description' || h.includes('desc'));
    const plantIdx = headers.findIndex(h => h === 'plant');

    const dateCols = [];
    headers.forEach((h, idx) => {
      const dayNum = parseInt(h, 10);
      if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31 && h.length <= 2) {
        dateCols.push({ dayNum, colIdx: idx, dayStr: String(dayNum).padStart(2, '0') });
      }
    });

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const cols = splitLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
      const eq = cols[eqIdx] || '';
      if (!eq || !/^\d+$/.test(eq)) continue;

      const desc = descIdx >= 0 ? cols[descIdx] : '';
      const plant = plantIdx >= 0 ? cols[plantIdx] : '';

      dateCols.forEach(({ dayStr, colIdx }) => {
        const jamRaw = cols[colIdx] || '0';
        const jam = parseFloat(jamRaw.replace(',', '.')) || 0;
        const dateStr = `${defaultMonth}-${dayStr}`;
        parsed.push({ dateStr, indukEqNum: eq, indukDesc: desc, plant, durationMinutes: Math.round(jam * 60) });
      });
    }
  }

  return parsed;
}

testSmartFetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTsA87B43S7y8HgSlEH4Wgu1-SQG8R0ZimWvhDlYJwETWoMKyV13R3hno660bDplBKpaS97nLMZBgUx/pub?output=csv');
