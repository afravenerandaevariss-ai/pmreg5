import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';

const supabaseUrl = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const supabaseKey = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Mengambil data HM dari Web (Supabase) untuk bulan Juni 2026...");
  
  // Fetch all daily_logs for 2026-06
  let allLogs = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('induk_eq_num, duration_minutes')
      .gte('date', '2026-06-01')
      .lte('date', '2026-06-30')
      .range(from, from + PAGE_SIZE - 1);
      
    if (error) {
      console.error("Error fetching web data:", error.message);
      return;
    }
    
    if (data && data.length > 0) {
      allLogs.push(...data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    } else {
      break;
    }
  }

  const webHmMap = new Map();
  allLogs.forEach(log => {
    const hmHours = log.duration_minutes / 60;
    const eq = String(log.induk_eq_num).trim();
    if (!webHmMap.has(eq)) webHmMap.set(eq, 0);
    webHmMap.set(eq, webHmMap.get(eq) + hmHours);
  });
  
  console.log(`Web memiliki log untuk ${webHmMap.size} equipment di bulan Juni.`);

  console.log("Membaca file Excel (ik17.xlsx)...");
  const excelHmMap = new Map();
  let excelEquipments = 0;
  try {
    const workbook = xlsx.readFile('C:/Users/User/Downloads/ProjApps/MP/ik17.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    if (jsonData.length > 1) {
       for(let i=1; i<jsonData.length; i++) {
         const row = jsonData[i];
         const eq = String(row[5] || '').trim();
         const diff = parseFloat(row[7]) || 0;
         const text = String(row[11] || '').trim();
         
         if (eq && diff > 0 && !text.includes('IB sd 31 Mei')) {
           if (!excelHmMap.has(eq)) excelHmMap.set(eq, 0);
           excelHmMap.set(eq, excelHmMap.get(eq) + diff);
         }
       }
    }
  } catch(e) {
    console.error("Error reading excel:", e.message);
    return;
  }

  console.log(`Excel memiliki log (non-IB) untuk ${excelHmMap.size} equipment.`);
  
  // Find differences
  let selisihList = [];
  let pasCount = 0;
  let webOnlyCount = 0;
  
  // Round helper
  const roundHm = (val) => Math.round(val * 100) / 100;

  for (const [eq, webHm] of webHmMap.entries()) {
    const excelHm = excelHmMap.get(eq) || 0;
    const diff = roundHm(webHm) - roundHm(excelHm);
    
    if (Math.abs(diff) < 0.05) {
      pasCount++;
    } else if (excelHm === 0) {
      webOnlyCount++;
      selisihList.push({ eq, web: roundHm(webHm), excel: 0, status: 'Belum masuk ke SAP sama sekali' });
    } else {
      selisihList.push({ eq, web: roundHm(webHm), excel: roundHm(excelHm), status: `Selisih: ${roundHm(diff)} HM` });
    }
  }

  console.log(`\n=== HASIL PERBANDINGAN HM (JUNI 2026) ===`);
  console.log(`Total alat yang HM-nya SAMA PERSIS (Web = Excel): ${pasCount} alat`);
  console.log(`Total alat di Web yang HM-nya BELUM MASUK sama sekali ke SAP: ${webOnlyCount} alat`);
  console.log(`Total alat yang masuk ke SAP tapi BEDA ANGKA (Selisih): ${selisihList.length - webOnlyCount} alat`);
  
  if (selisihList.length > 0) {
    console.log(`\nMenampilkan 15 contoh perbedaan:`);
    selisihList.slice(0, 15).forEach(item => {
      console.log(`- EQ: ${item.eq} | Web: ${item.web} | SAP: ${item.excel} -> ${item.status}`);
    });
  }
}

run();
