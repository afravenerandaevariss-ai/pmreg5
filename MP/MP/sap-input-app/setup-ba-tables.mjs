import pg from 'pg';

const connectionString = 'postgresql://postgres:C%40hyono1990%23@db.pabnvxlvrussdfhisxzn.supabase.co:5432/postgres';
const pool = new pg.Pool({ connectionString });

const setupSQL = `
CREATE TABLE IF NOT EXISTS ba_edits (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_code     TEXT        NOT NULL,
  no_eq         TEXT        NOT NULL,
  new_no_eq     TEXT        DEFAULT '',
  no_urut       TEXT        DEFAULT '',
  name          TEXT        DEFAULT '',
  cc            TEXT        DEFAULT '',
  status        TEXT        DEFAULT '',
  kepemilikan   TEXT        DEFAULT '',
  updated_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT ba_edits_unit_no_eq_unique UNIQUE (unit_code, no_eq)
);
CREATE INDEX IF NOT EXISTS idx_ba_edits_unit_code ON ba_edits(unit_code);

CREATE TABLE IF NOT EXISTS ba_unit_edits (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_code        TEXT        NOT NULL UNIQUE,
  nomor_ba         TEXT        DEFAULT '',
  perihal_text     TEXT        DEFAULT '',
  penutup          TEXT        DEFAULT '',
  sig_buat         TEXT        DEFAULT '',
  jabatan_buat     TEXT        DEFAULT '',
  nama_buat        TEXT        DEFAULT '',
  sig_ketahui      TEXT        DEFAULT '',
  jabatan_ketahui  TEXT        DEFAULT '',
  nama_ketahui     TEXT        DEFAULT '',
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pdf_uploads (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_code        TEXT        NOT NULL,
  file_name        TEXT        NOT NULL,
  notes            TEXT,
  drive_file_id    TEXT,
  drive_folder_id  TEXT,
  drive_folder_url TEXT,
  uploaded_by      TEXT,
  uploaded_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pdf_uploads_unit_code ON pdf_uploads(unit_code);

ALTER TABLE ba_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ba_unit_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_uploads ENABLE ROW LEVEL SECURITY;
`;

async function run() {
  const client = await pool.connect();
  try {
    await client.query(setupSQL);
    console.log('Tables created!');

    // Create RLS policies
    const policies = [
      `CREATE POLICY IF NOT EXISTS ba_edits_anon_all ON ba_edits FOR ALL TO anon USING (true) WITH CHECK (true)`,
      `CREATE POLICY IF NOT EXISTS ba_unit_edits_anon_all ON ba_unit_edits FOR ALL TO anon USING (true) WITH CHECK (true)`,
      `CREATE POLICY IF NOT EXISTS pdf_uploads_anon_all ON pdf_uploads FOR ALL TO anon USING (true) WITH CHECK (true)`
    ];
    for (const p of policies) {
      try { await client.query(p); } catch(e) { /* already exists */ }
    }

    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('ba_edits','ba_unit_edits','pdf_uploads') ORDER BY table_name`);
    console.log('Verified tables:', res.rows.map(r=>r.table_name).join(', '));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}
run();
