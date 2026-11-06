import XLSX from 'xlsx';

const file = 'C:/Users/LENOVO/Downloads/solar.xlsx';
const wb = XLSX.readFile(file);
const debitRows = XLSX.utils.sheet_to_json(wb.Sheets['Debit'], { defval: '' });

console.log('Analyzing all Cost Elements and UoMs in Debit sheet...');

const ceStats = {};
const fuelUoms = {};
let fuelRowsCount = 0;
let fuelWithZeroOrEmptyUom = 0;
let fuelNonStandardUom = [];

for (const r of debitRows) {
  const rawCe = String(r['Cost Element'] || r['CostElement'] || '').trim();
  const normCe = rawCe.replace(/^0+/, '');
  ceStats[normCe] = (ceStats[normCe] || 0) + 1;

  if (normCe === '51100057') {
    fuelRowsCount++;
    const rawUom = String(r['Posted unit of meas.'] || r['Unit of Measure'] || r['UoM'] || '').trim();
    fuelUoms[rawUom] = (fuelUoms[rawUom] || 0) + 1;

    if (!rawUom || rawUom.toUpperCase() !== 'L') {
      fuelNonStandardUom.push({
        cc: r['Cost Center'],
        period: r['Period'],
        date: r['Posting Date'],
        qty: r['Total quantity'],
        val: r['Value in Obj. Crcy'],
        uom: rawUom,
        name: r['Name'],
        matDesc: r['Material Description'],
        rawCe
      });
    }
  }
}

console.log('Cost Elements in Debit (top 15):', Object.entries(ceStats).sort((a,b)=>b[1]-a[1]).slice(0, 15));
console.log(`Total 51100057 rows: ${fuelRowsCount}`);
console.log('51100057 UoMs distribution:', fuelUoms);
console.log(`51100057 rows with NON-STANDARD UoM (not 'L'): ${fuelNonStandardUom.length}`);
fuelNonStandardUom.forEach(x => {
  console.log(`  CC: ${x.cc} | Period: ${x.period} | Qty: ${x.qty} | UoM: "${x.uom}" | Val: ${x.val} | Name: "${x.name}" | MatDesc: "${x.matDesc}"`);
});
