import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const correctLogs = [
    {
      id: 'fix_1',
      date: '2026-07-20',
      plant: '5F08',
      induk_eq_num: '1000184409',
      induk_desc: 'SLUDGE SEPARATOR NO. 1',
      duration_minutes: 13.5 * 60,
      status: 'Normal',
      did_run: true
    },
    {
      id: 'fix_2',
      date: '2026-07-20',
      plant: '5F08',
      induk_eq_num: '1000182868',
      induk_desc: 'DIGESTER NO. 2',
      duration_minutes: 13.5 * 60,
      status: 'Normal',
      did_run: true
    },
    {
      id: 'fix_3',
      date: '2026-07-20',
      plant: '5F08',
      induk_eq_num: '1000183070',
      induk_desc: 'SCREW PRESS NO. 2',
      duration_minutes: 0,
      status: 'Normal',
      did_run: true
    }
  ];

  console.log("Inserting correct logs for 2026-07-20...");
  for (const log of correctLogs) {
    const { data, error } = await supabase.from('daily_logs').insert(log);
    if (error) {
      console.error("Error inserting", log.induk_desc, error);
    } else {
      console.log("Inserted", log.induk_desc);
    }
  }
  console.log("Done.");
}

run();
