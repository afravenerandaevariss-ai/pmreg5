import pg from 'pg';

const connectionString = 'postgresql://postgres:C%40hyono1990%23@db.pabnvxlvrussdfhisxzn.supabase.co:5432/postgres';

const pool = new pg.Pool({ connectionString });

const setupSQL = `
CREATE TABLE IF NOT EXISTS ba_edits (
  no_eq text PRIMARY KEY,
  status text,
  kepemilikan text,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE ba_edits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read ba_edits" ON ba_edits;
CREATE POLICY "Allow public read ba_edits" ON ba_edits FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow public insert ba_edits" ON ba_edits;
CREATE POLICY "Allow public insert ba_edits" ON ba_edits FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update ba_edits" ON ba_edits;
CREATE POLICY "Allow public update ba_edits" ON ba_edits FOR UPDATE TO public USING (true);
`;

async function run() {
  console.log("Connecting to Supabase...");
  const client = await pool.connect();
  try {
    console.log("Creating ba_edits table and policies...");
    await client.query(setupSQL);
    console.log("Table and policies created successfully!");
  } catch (e) {
    console.error("Error creating table:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
