import pg from 'pg';

const connectionString = 'postgresql://postgres:C%40hyono1990%23@db.pabnvxlvrussdfhisxzn.supabase.co:5432/postgres';
const pool = new pg.Pool({ connectionString });

const users = [
{ nik: '13004627', name: 'Andhi Hartadi', role: 'Unit', plant: '5F01' },
{ nik: '19003496', name: 'Andre Kevin Simatupang', role: 'Unit', plant: '5F01' },
{ nik: '13004468', name: 'Herman', role: 'Unit', plant: '5F04' },
{ nik: '13000885', name: 'Darwis Simatupang', role: 'Unit', plant: '5F04' },
{ nik: '13000526', name: 'Sutrisno', role: 'Unit', plant: '5F07' },
{ nik: '13007185', name: 'Vabianus Ryza', role: 'Unit', plant: '5F07' },
{ nik: '13003757', name: 'Suiswadi', role: 'Unit', plant: '5F08' },
{ nik: '13001826', name: 'Heriyanto', role: 'Unit', plant: '5F08' },
{ nik: '19006776', name: 'Ahmad Darwin Siregar', role: 'Unit', plant: '5F09' },
{ nik: '19003120', name: 'Hermanto', role: 'Unit', plant: '5F09' },
{ nik: '13006816', name: 'Ardianor', role: 'Unit', plant: '5F14' },
{ nik: '13007990', name: 'Setia Poncowati', role: 'Unit', plant: '5F14' },
{ nik: '13004643', name: 'Buhari Muslim', role: 'Unit', plant: '5F15' },
{ nik: '13007911', name: 'Aminuddin Rifai Rambe', role: 'Unit', plant: '5F15' },
{ nik: '13004547', name: 'Sulaiman', role: 'Unit', plant: '5F21' },
{ nik: '13007913', name: 'Aulia Badrun Adz Dzuhri', role: 'Unit', plant: '5F21' },
{ nik: '13000992', name: 'Qosim', role: 'Unit', plant: '5F22' },
{ nik: '13007885', name: 'Muhammad Rizal', role: 'Unit', plant: '5F22' },
{ nik: '3000593', name: 'Abdul Halim Lubis', role: 'Regional', plant: 'ALL' },
{ nik: '13005488', name: 'Harnika', role: 'Regional', plant: 'ALL' },
{ nik: '13005483', name: 'Dadang Mulia', role: 'Regional', plant: 'ALL' },
{ nik: '13008078', name: 'Dandi Maulana', role: 'Regional', plant: 'ALL' },
{ nik: '19010048', name: 'Afra Veneranda Evaris', role: 'Regional', plant: 'ALL' },
{ nik: '13005791', name: 'Eko Puji Cahyono', role: 'Regional', plant: 'ALL' },
{ nik: '13006983', name: 'Hemas Hafidh Bachtiar', role: 'Regional', plant: 'ALL' },
{ nik: '13004524', name: 'Marjunita', role: 'Regional', plant: 'ALL' }
];

async function run() {
  const client = await pool.connect();
  try {
    for (const u of users) {
      await client.query(
        `INSERT INTO app_users (nik, name, password, role, plant)
         VALUES ($1, $2, '123', $3, $4)
         ON CONFLICT (nik) DO UPDATE 
         SET name = EXCLUDED.name, role = EXCLUDED.role, plant = EXCLUDED.plant`,
        [u.nik, u.name, u.role, u.plant]
      );
    }
    console.log("Users seeded successfully!");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
