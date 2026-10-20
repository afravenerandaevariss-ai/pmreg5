import { Client } from 'ssh2';

const SSH = {
  host: '43.134.84.59',
  port: 22,
  username: 'ubuntu',
  password: 'Akuhebat123#',
  readyTimeout: 30000
};

function runCmd(conn, cmd) {
  return new Promise((resolve) => {
    let out = '';
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve({ out: '', err: err.message });
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => out += d);
      stream.on('close', () => resolve({ out }));
    });
  });
}

const SQL_STATEMENTS = [
  // ba_edits
  `CREATE TABLE IF NOT EXISTS ba_edits (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, unit_code TEXT NOT NULL DEFAULT '', no_eq TEXT NOT NULL, new_no_eq TEXT DEFAULT '', no_urut TEXT DEFAULT '', name TEXT DEFAULT '', cc TEXT DEFAULT '', status TEXT DEFAULT '', kepemilikan TEXT DEFAULT '', updated_at TIMESTAMPTZ DEFAULT now())`,
  `ALTER TABLE ba_edits ADD COLUMN IF NOT EXISTS unit_code TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE ba_edits ADD COLUMN IF NOT EXISTS new_no_eq TEXT DEFAULT ''`,
  `ALTER TABLE ba_edits ADD COLUMN IF NOT EXISTS no_urut TEXT DEFAULT ''`,
  `ALTER TABLE ba_edits ADD COLUMN IF NOT EXISTS name TEXT DEFAULT ''`,
  `ALTER TABLE ba_edits ADD COLUMN IF NOT EXISTS cc TEXT DEFAULT ''`,
  `ALTER TABLE ba_edits ADD COLUMN IF NOT EXISTS kepemilikan TEXT DEFAULT ''`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ba_edits_unit_no_eq_unique') THEN ALTER TABLE ba_edits ADD CONSTRAINT ba_edits_unit_no_eq_unique UNIQUE (unit_code, no_eq); END IF; END $$`,
  `CREATE INDEX IF NOT EXISTS idx_ba_edits_unit_code ON ba_edits(unit_code)`,
  // ba_unit_edits  
  `CREATE TABLE IF NOT EXISTS ba_unit_edits (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, unit_code TEXT NOT NULL UNIQUE, nomor_ba TEXT DEFAULT '', perihal_text TEXT DEFAULT '', penutup TEXT DEFAULT '', sig_buat TEXT DEFAULT '', jabatan_buat TEXT DEFAULT '', nama_buat TEXT DEFAULT '', sig_ketahui TEXT DEFAULT '', jabatan_ketahui TEXT DEFAULT '', nama_ketahui TEXT DEFAULT '', updated_at TIMESTAMPTZ DEFAULT now())`,
  `ALTER TABLE ba_unit_edits ADD COLUMN IF NOT EXISTS nomor_ba TEXT DEFAULT ''`,
  `ALTER TABLE ba_unit_edits ADD COLUMN IF NOT EXISTS perihal_text TEXT DEFAULT ''`,
  // pdf_uploads
  `CREATE TABLE IF NOT EXISTS pdf_uploads (id uuid DEFAULT gen_random_uuid() PRIMARY KEY, unit_code TEXT NOT NULL, file_name TEXT NOT NULL, notes TEXT, drive_file_id TEXT, drive_folder_id TEXT, drive_folder_url TEXT, uploaded_by TEXT, uploaded_at TIMESTAMPTZ DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS idx_pdf_uploads_unit_code ON pdf_uploads(unit_code)`,
  // RLS
  `ALTER TABLE ba_edits ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE ba_unit_edits ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY`,
  // Policies
  `DROP POLICY IF EXISTS "Allow public read ba_edits" ON ba_edits`,
  `CREATE POLICY "Allow public read ba_edits" ON ba_edits FOR SELECT TO anon USING (true)`,
  `DROP POLICY IF EXISTS "Allow public insert ba_edits" ON ba_edits`,
  `CREATE POLICY "Allow public insert ba_edits" ON ba_edits FOR INSERT TO anon WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Allow public update ba_edits" ON ba_edits`,
  `CREATE POLICY "Allow public update ba_edits" ON ba_edits FOR UPDATE TO anon USING (true)`,
  `DROP POLICY IF EXISTS "Allow public read ba_unit_edits" ON ba_unit_edits`,
  `CREATE POLICY "Allow public read ba_unit_edits" ON ba_unit_edits FOR SELECT TO anon USING (true)`,
  `DROP POLICY IF EXISTS "Allow public insert ba_unit_edits" ON ba_unit_edits`,
  `CREATE POLICY "Allow public insert ba_unit_edits" ON ba_unit_edits FOR INSERT TO anon WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Allow public update ba_unit_edits" ON ba_unit_edits`,
  `CREATE POLICY "Allow public update ba_unit_edits" ON ba_unit_edits FOR UPDATE TO anon USING (true)`,
  `DROP POLICY IF EXISTS "Allow public read pdf_uploads" ON pdf_uploads`,
  `CREATE POLICY "Allow public read pdf_uploads" ON pdf_uploads FOR SELECT TO anon USING (true)`,
  `DROP POLICY IF EXISTS "Allow public insert pdf_uploads" ON pdf_uploads`,
  `CREATE POLICY "Allow public insert pdf_uploads" ON pdf_uploads FOR INSERT TO anon WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "Allow public delete pdf_uploads" ON pdf_uploads`,
  `CREATE POLICY "Allow public delete pdf_uploads" ON pdf_uploads FOR DELETE TO anon USING (true)`,
  // Grant privileges
  `GRANT ALL ON ba_edits TO pmreg5_user`,
  `GRANT ALL ON ba_unit_edits TO pmreg5_user`,
  `GRANT ALL ON pdf_uploads TO pmreg5_user`,
  `GRANT ALL ON ba_edits TO anon`,
  `GRANT ALL ON ba_unit_edits TO anon`,
  `GRANT ALL ON pdf_uploads TO anon`,
  `GRANT ALL ON ba_edits TO authenticator`,
  `GRANT ALL ON ba_unit_edits TO authenticator`,
  `GRANT ALL ON pdf_uploads TO authenticator`,
];

const conn = new Client();
conn.on('ready', async () => {
  console.log('SSH Connected!');
  for (const sql of SQL_STATEMENTS) {
    const r = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "${sql.replace(/"/g, '\\"')}" 2>&1`);
    const status = r.out.includes('ERROR') ? '❌' : '✅';
    console.log(`${status} ${sql.substring(0, 60)}...`);
    if (r.out.includes('ERROR')) console.log('   >', r.out.trim());
  }
  
  // Verify
  const verify = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -c "\\dt" 2>&1 | grep -E "ba_edits|ba_unit_edits|pdf_uploads"');
  console.log('\nVerification:\n', verify.out || '(no ba_ tables found)');
  conn.end();
});
conn.on('error', e => console.error('SSH error:', e));
conn.connect(SSH);
