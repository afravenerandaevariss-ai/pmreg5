import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const SUPABASE_KEY = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function cleanupDuplicates() {
  console.log('🔍 Mengambil semua data daily_logs dari Supabase...');

  // Fetch all records in pages
  let allData = [];
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('id, date, induk_eq_num, plant, timestamp')
      .order('date')
      .order('induk_eq_num')
      .order('timestamp', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) { console.error('Error fetch:', error); process.exit(1); }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`📊 Total records: ${allData.length}`);

  // Group by (date, induk_eq_num) — keep latest (first after desc sort by timestamp)
  const seen = new Map();
  const toDelete = [];

  for (const row of allData) {
    const key = `${row.date}__${row.induk_eq_num}`;
    if (!seen.has(key)) {
      seen.set(key, row.id); // keep this one (latest timestamp)
    } else {
      toDelete.push(row.id); // duplicate → delete
    }
  }

  console.log(`🗑️  Duplikat ditemukan: ${toDelete.length} record`);

  if (toDelete.length === 0) {
    console.log('✅ Tidak ada duplikat. Database sudah bersih!');
    return;
  }

  // Delete in batches of 100
  const BATCH = 100;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    const batch = toDelete.slice(i, i + BATCH);
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .in('id', batch);

    if (error) {
      console.error(`Error delete batch ${i}:`, error);
    } else {
      deleted += batch.length;
      console.log(`  Dihapus ${deleted}/${toDelete.length}...`);
    }
  }

  console.log(`\n✅ Selesai! ${deleted} data duplikat berhasil dihapus dari database.`);
  console.log(`📌 Tersisa ${allData.length - deleted} record unik.`);
}

cleanupDuplicates();
