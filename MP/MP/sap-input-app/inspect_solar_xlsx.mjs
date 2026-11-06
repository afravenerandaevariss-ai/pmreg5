import XLSX from 'xlsx';

const file = 'C:/Users/LENOVO/Downloads/solar.xlsx';
console.log('Reading full solar.xlsx...');
const wb = XLSX.readFile(file);

for (const sheetName of ['Debit', 'Credit', 'zco', 'IH08', 'Piv-Debit']) {
  if (!wb.Sheets[sheetName]) continue;
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
  console.log(`\n=== Sheet: ${sheetName} (total ${rows.length} rows) ===`);
  const matches = rows.filter(r => {
    const s = JSON.stringify(r);
    return s.includes('5D01CAR005') || s.includes('8108');
  });
  console.log(`Matches for 5D01CAR005 / 8108: ${matches.length}`);
  matches.forEach(m => console.log(JSON.stringify(m, null, 2)));
}
