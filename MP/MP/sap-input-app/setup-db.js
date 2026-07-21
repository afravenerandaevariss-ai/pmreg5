import pg from 'pg';

const connectionString = 'postgresql://postgres:C%40hyono1990%23@db.pabnvxlvrussdfhisxzn.supabase.co:5432/postgres';

const pool = new pg.Pool({
  connectionString,
});

const setupSQL = `
-- Tabel menyimpan data master equipment (hasil upload Excel)
CREATE TABLE IF NOT EXISTS master_equipment (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  eq_num TEXT NOT NULL,
  plant TEXT NOT NULL,
  description TEXT,
  functional_loc TEXT,
  fl_description TEXT,
  cost_center TEXT,
  eq_type TEXT, -- 'Induk' atau 'Sub'
  induk TEXT,
  reading NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel menyimpan data hierarchy reference
CREATE TABLE IF NOT EXISTS hierarchy_data (
  id numeric PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabel menyimpan daily logs jam jalan
CREATE TABLE IF NOT EXISTS daily_logs (
  id TEXT PRIMARY KEY,
  plant TEXT NOT NULL,
  date TEXT NOT NULL, -- format: 'yyyy-MM-dd'
  induk_eq_num TEXT NOT NULL,
  induk_desc TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Normal',
  notes TEXT DEFAULT '',
  did_run BOOLEAN DEFAULT true,
  damaged_subs JSONB DEFAULT '[]',
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa query (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_plant ON daily_logs(plant);
CREATE INDEX IF NOT EXISTS idx_master_equipment_plant ON master_equipment(plant);
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
