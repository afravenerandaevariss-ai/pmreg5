import XLSX from 'xlsx';

const file = 'C:/Users/LENOVO/Downloads/solar.xlsx';
const wb = XLSX.readFile(file);
const debitRows = XLSX.utils.sheet_to_json(wb.Sheets['Debit'], { defval: '' });

console.log('Total Debit rows in solar.xlsx:', debitRows.length);

// 1. All rows where Cost Center starts with 5D01
const cc5D01 = debitRows.filter(r => String(r['Cost Center']).startsWith('5D01'));
console.log('Debit rows where Cost Center starts with 5D01:', cc5D01.length);
cc5D01.forEach(r => {
  console.log('5D01 CC:', r['Cost Center'], '| CE:', r['Cost Element'], '| CE Name:', r['Cost element name'], '| Qty:', r['Total quantity'], r['Posted unit of meas.'], '| Val:', r['Value in Obj. Crcy'], '| Name:', r['Name']);
});

// 2. All rows where Plant is 5D01
const plant5D01 = debitRows.filter(r => String(r['Plant']) === '5D01');
console.log('\nDebit rows where Plant is 5D01:', plant5D01.length);

// 3. Any row in Debit mentioning 8108, Triton, or KB 8108 DM
const textMatches = debitRows.filter(r => {
  const s = (String(r['Name']) + ' ' + String(r['CO Object Name']) + ' ' + String(r['Document Header Text']) + ' ' + String(r['Material Description'])).toLowerCase();
  return s.includes('8108') || s.includes('triton kb');
});
console.log('\nDebit rows mentioning 8108 / Triton KB:', textMatches.length);
textMatches.forEach(r => {
  console.log('Match:', r['Cost Center'], '| CE:', r['Cost Element'], '| Qty:', r['Total quantity'], r['Posted unit of meas.'], '| Name:', r['Name']);
});

// 4. Any row in Debit with Cost Element 51100057 for 5D01*
const fuel5D01 = debitRows.filter(r => String(r['Cost Center']).startsWith('5D01') && String(r['Cost Element']).includes('51100057'));
console.log('\nDebit rows with 51100057 for 5D01:', fuel5D01.length);
