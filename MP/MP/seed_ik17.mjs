import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
const supabase = createClient('https://pabnvxlvrussdfhisxzn.supabase.co', 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4');
async function run() {
  const workbook = xlsx.readFile('C:/Users/User/Downloads/ProjApps/MP/ik17.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  
  const headers = jsonData[0];
  let dateColIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Date'));
  let eqColIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Equipment') || h.includes('Eq')));
  let diffColIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Difference'));
  let textColIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Text'));

  const newRawRows = [];
  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i];
    if (row && row[dateColIdx]) {
      const serial = row[dateColIdx];
      if (typeof serial === 'number') {
        const parsed = xlsx.SSF.parse_date_code(serial);
        if (parsed) {
          const dateStr = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
          const eq = String(row[eqColIdx] || '').trim();
          const diff = parseFloat(row[diffColIdx]) || 0;
          const text = String(row[textColIdx] || '').trim().toLowerCase();
          const isSaldoAwal = text.includes('ib sd') || text.includes('ib s.d') || text.includes('saldo awal');
          if (eq && diff > 0) {
            newRawRows.push({ d: dateStr, e: eq, h: diff, s: isSaldoAwal });
          }
        }
      }
    }
  }

  console.log('Parsed rows:', newRawRows.length);
  
  const { error } = await supabase
    .from('hierarchy_data')
    .upsert({ id: 7, data: newRawRows, updated_at: new Date().toISOString() });
    
  if (error) console.error('Error saving:', error);
  else console.log('Successfully saved to Supabase ID 7');
}
run();
