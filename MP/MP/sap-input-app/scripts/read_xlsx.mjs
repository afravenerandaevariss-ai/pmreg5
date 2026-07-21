import xlsx from 'xlsx';

const wb = xlsx.readFile('C:/Users/User/Downloads/ProjApps/MP/REGIONAL 5 coba.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

for (let row of data) {
  if (row[1] && String(row[1]).trim() === '1000206812') {
    console.log(row);
  }
}
