import pg from 'pg';

const connectionString = 'postgresql://postgres:C%40hyono1990%23@db.pabnvxlvrussdfhisxzn.supabase.co:5432/postgres';

const pool = new pg.Pool({
  connectionString,
});

const setupSQL = `
CREATE TABLE IF NOT EXISTS excel_chunks (
  session_id TEXT NOT NULL,
  chunk_index INT NOT NULL,
  data TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_excel_chunks_session ON excel_chunks(session_id);

CREATE TABLE IF NOT EXISTS parsed_excel (
  session_id TEXT PRIMARY KEY,
  type TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
`;

async function run() {
  console.log("Connecting to Supabase...");
  const client = await pool.connect();
  try {
    console.log("Creating tables...");
    await client.query(setupSQL);
    console.log("Tables created successfully!");
  } catch (e) {
    console.error("Error creating tables:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
