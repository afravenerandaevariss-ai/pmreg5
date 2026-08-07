const baseUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTsA87B43S7y8HgSlEH4Wgu1-SQG8R0ZimWvhDlYJwETWoMKyV13R3hno660bDplBKpaS97nLMZBgUx/pub';

const gids = [
  '1081171877', '378103327', '2089303535', '374368206', 
  '1722739608', '526940195', '1678430152', '954169137', '510068100', '2033048565'
];

function parseCSVMatrixOrVertical(csvText, defaultMonth = '2026-08') {
  const lines = csvText.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
  if (lines.length < 2) return [];

  // Helper to split CSV line safely handling quotes
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

  // Scan first 10 lines for header
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
    // HORIZONTAL MATRIX FORMAT: Equipment, Description, ..., Plant, Total, 01, 02, 03, ...
    const eqIdx = headers.findIndex(h => h === 'equipment' || h.includes('equipment'));
    const descIdx = headers.findIndex(h => h === 'description' || h.includes('desc'));
    const plantIdx = headers.findIndex(h => h === 'plant');

    // Find date columns (e.g. '01', '02', ..., '31')
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
      if (!eq || !/^\d+$/.test(eq)) continue; // Must be numeric equipment ID

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

async function testAllPlants() {
  console.log('⚡ Fetching & Parsing all plant GIDs...');
  let totalParsed = 0;
  const dateCounts = {};

  for (const gid of gids) {
    const url = `${baseUrl}?gid=${gid}&single=true&output=csv&_t=${Date.now()}`;
    try {
      const res = await fetch(url);
      const csv = await res.text();
      const items = parseCSVMatrixOrVertical(csv, '2026-08');
      totalParsed += items.length;
      items.forEach(it => {
        if (it.durationMinutes > 0) {
          dateCounts[it.dateStr] = (dateCounts[it.dateStr] || 0) + 1;
        }
      });
    } catch (e) {
      console.error(`GID ${gid} error:`, e.message);
    }
  }

  console.log(`\n🎉 Total parsed records across all tabs: ${totalParsed}`);
  console.log('📊 Active inputs per date (duration > 0):');
  Object.entries(dateCounts).sort().forEach(([d, count]) => {
    console.log(`  - Date ${d}: ${count} equipment logs`);
  });
}

testAllPlants();
