import pg from 'pg';

const connectionString = 'postgresql://postgres:C%40hyono1990%23@db.pabnvxlvrussdfhisxzn.supabase.co:5432/postgres';

const pool = new pg.Pool({ connectionString });

const setupSQL = `
-- Create bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('excel_uploads', 'excel_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Since we access storage using supabase-js with anon key in the frontend,
-- we need to create an RLS policy to allow inserts.
-- Or better, we can just allow the anon key to upload to this bucket.
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'excel_uploads');

CREATE POLICY "Allow public select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'excel_uploads');

CREATE POLICY "Allow public delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'excel_uploads');
`;

async function run() {
  console.log("Connecting to Supabase...");
  const client = await pool.connect();
  try {
    console.log("Creating bucket and policies...");
    await client.query(setupSQL);
    console.log("Bucket and policies created successfully!");
  } catch (e) {
    console.error("Error creating bucket:", e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
