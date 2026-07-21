import XLSX from 'xlsx';
import fs from 'fs';

const filePath = 'D:/Eval PM/Monitoring logbook/MP/MP/Logbook Exsport.xlsx';

if (!fs.existsSync(filePath)) {
  console.error("File does not exist!");
  process.exit(1);
}

console.log("Reading file:", filePath);
const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer' });
console.log("Sheets in workbook:", wb.SheetNames);

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\nSheet [${sheetName}]: Total Rows: ${rows.length}`);
  console.log("First 10 rows:");
  rows.slice(0, 10).forEach((row, i) => {
    console.log(`  Row ${i}: [${row.slice(0, 15).join(', ')}]`);
  });
});
