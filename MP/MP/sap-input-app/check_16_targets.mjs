import XLSX from 'xlsx';

const file = 'C:/Users/LENOVO/Downloads/solar.xlsx';
const wb = XLSX.readFile(file);
const debitRows = XLSX.utils.sheet_to_json(wb.Sheets['Debit'], { defval: '' });

const targetCCs = [
  '5D01CAR005', '5E01DTR008', '5E01GRA001', '5E01WLD001',
  '5E04TRB001', '5E09COM001', '5E12CAR003', '5E14COM001',
  '5E16DTR006', '5E17DTR003', '5E18COM001', '5E19EXC001',
  '5F01CAR003', '5F09DTR001', '5F14CAR002', '5F22WLO001'
];

console.log('--- CHECKING 16 VEHICLES IN DEBIT SHEET ---');
for (const cc of targetCCs) {
  const matches = debitRows.filter(r => String(r['Cost Center']).trim().toUpperCase() === cc);
  console.log(`\nCC: ${cc} -> Found ${matches.length} rows in Debit`);
  matches.forEach(m => {
    console.log(`  CE: "${m['Cost Element']}" | CE Name: "${m['Cost element name']}" | Qty: ${m['Total quantity']} | UoM: "${m['Posted unit of meas.']}" | Period: "${m['Period']}" | Date: ${m['Posting Date']} | Name: "${m['Name']}" | MatDesc: "${m['Material Description']}"`);
  });
}
