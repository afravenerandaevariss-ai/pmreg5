import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';

const supabaseUrl = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const supabaseKey = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching web data from Supabase...");
  let masterMap = null;
  const { data, error } = await supabase
    .from('hierarchy_data')
    .select('data')
    .eq('id', 2)
    .single();

  if (error) {
    console.error("Error fetching web data:", error.message);
    return;
  }
  
  if (data && data.data) {
    masterMap = new Map(data.data);
  } else {
    console.log("No web data found.");
    return;
  }

  const webEquipments = Array.from(masterMap.keys());
  console.log(`Web data has ${webEquipments.length} equipments.`);

  console.log("Reading Excel file (C:/Users/User/Downloads/ProjApps/MP/ik17.xlsx)...");
  let excelEquipments = [];
  try {
    const workbook = xlsx.readFile('C:/Users/User/Downloads/ProjApps/MP/ik17.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find Equipment column index
    const headers = jsonData[0];
    let eqColIdx = -1;
    for(let i=0; i<headers.length; i++) {
        if(typeof headers[i] === 'string' && (headers[i].includes('Equipment') || headers[i].includes('Eq'))) {
            eqColIdx = i;
            break;
        }
    }
    
    if (eqColIdx === -1) eqColIdx = 0; // fallback to 1st column

    if (jsonData.length > 1) {
       for(let i=1; i<jsonData.length; i++) {
         const row = jsonData[i];
         if (row && row[eqColIdx]) {
           excelEquipments.push(String(row[eqColIdx]).trim());
         }
       }
    }
  } catch(e) {
    console.error("Error reading excel:", e.message);
    return;
  }

  console.log(`Excel data has ${excelEquipments.length} equipments.`);
  
  // Find differences
  const webSet = new Set(webEquipments);
  const excelSet = new Set(excelEquipments);

  let onlyInWeb = [];
  let onlyInExcel = [];

  for (const eq of webSet) {
    if (!excelSet.has(eq)) onlyInWeb.push(eq);
  }
  for (const eq of excelSet) {
    if (!webSet.has(eq)) onlyInExcel.push(eq);
  }

  console.log(`\n=== Hasil Perbandingan ===`);
  console.log(`Total data di Web: ${webSet.size}`);
  console.log(`Total data di Excel: ${excelSet.size}`);
  
  if (onlyInWeb.length === 0 && onlyInExcel.length === 0) {
    console.log("KESIMPULAN: Data di Web dan di Excel SAMA PERSIS (100% Match).");
  } else {
    console.log(`\nAda ${onlyInWeb.length} data yang ada di Web tapi TIDAK ADA di Excel.`);
    if (onlyInWeb.length > 0 && onlyInWeb.length <= 10) console.log("Contoh:", onlyInWeb.join(', '));
    else if (onlyInWeb.length > 10) console.log("Contoh 5 pertama:", onlyInWeb.slice(0, 5).join(', '));
    
    console.log(`\nAda ${onlyInExcel.length} data yang ada di Excel tapi TIDAK ADA di Web.`);
    if (onlyInExcel.length > 0 && onlyInExcel.length <= 10) console.log("Contoh:", onlyInExcel.join(', '));
    else if (onlyInExcel.length > 10) console.log("Contoh 5 pertama:", onlyInExcel.slice(0, 5).join(', '));
  }
}

run();
