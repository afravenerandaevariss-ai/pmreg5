import pg from 'pg';

const connectionString = 'postgresql://postgres:C%40hyono1990%23@db.pabnvxlvrussdfhisxzn.supabase.co:5432/postgres';
const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 10000 });

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS live_chats (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_nik TEXT NOT NULL,
        user_name TEXT,
        plant TEXT,
        sender_type TEXT NOT NULL,
        text TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );
    `);
    console.log("Table live_chats created successfully!");
  } catch (e) {
    console.error("Error:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
