import pg from 'pg';

const connectionString = 'postgresql://postgres:C%40hyono1990%23@db.pabnvxlvrussdfhisxzn.supabase.co:5432/postgres';
const pool = new pg.Pool({ connectionString });

const users = [
{ nik: '13004627', name: 'Andhi Hartadi', jabatan: 'Asisten Teknik', unit: '5F01', unit_name: 'PABRIK GUNUNG MELIAU', role: 'Unit' },
{ nik: '19003496', name: 'Andre Kevin Simatupang', jabatan: 'Krani Teknik', unit: '5F01', unit_name: 'PABRIK GUNUNG MELIAU', role: 'Unit' },
{ nik: '13004468', name: 'Herman', jabatan: 'Asisten Teknik', unit: '5F04', unit_name: 'PABRIK RIMBA BELIAN', role: 'Unit' },
{ nik: '13000885', name: 'Darwis Simatupang', jabatan: 'Pembantu Krani Teknik', unit: '5F04', unit_name: 'PABRIK RIMBA BELIAN', role: 'Unit' },
{ nik: '13000526', name: 'Sutrisno', jabatan: 'Asisten Teknik', unit: '5F07', unit_name: 'PABRIK NGABANG', role: 'Unit' },
{ nik: '13007185', name: 'Vabianus Ryza', jabatan: 'Krani Teknik', unit: '5F07', unit_name: 'PABRIK NGABANG', role: 'Unit' },
{ nik: '13003757', name: 'Suiswadi', jabatan: 'Asisten Teknik', unit: '5F08', unit_name: 'PABRIK PARINDU', role: 'Unit' },
{ nik: '13001826', name: 'Heriyanto', jabatan: 'Krani Keuangan dan Anggaran', unit: '5F08', unit_name: 'PABRIK PARINDU', role: 'Unit' },
{ nik: '19006776', name: 'Ahmad Darwin Siregar', jabatan: 'Asisten Teknik', unit: '5F09', unit_name: 'PABRIK KEMBAYAN', role: 'Unit' },
{ nik: '19003120', name: 'Hermanto', jabatan: 'Pembantu operator kamar mesin', unit: '5F09', unit_name: 'PABRIK KEMBAYAN', role: 'Unit' },
{ nik: '13006816', name: 'Ardianor', jabatan: 'Krani', unit: '5F14', unit_name: 'PABRIK PAMUKAN', role: 'Unit' },
{ nik: '13007990', name: 'Setia Poncowati', jabatan: 'Krani', unit: '5F14', unit_name: 'PABRIK PAMUKAN', role: 'Unit' },
{ nik: '13004643', name: 'Buhari Muslim', jabatan: 'Krani 1', unit: '5F15', unit_name: 'PABRIK PELAIHARI', role: 'Unit' },
{ nik: '13007911', name: 'Aminuddin Rifai Rambe', jabatan: 'Krani Teknik', unit: '5F15', unit_name: 'PABRIK PELAIHARI', role: 'Unit' },
{ nik: '13004547', name: 'Sulaiman', jabatan: 'Krani', unit: '5F21', unit_name: 'PABRIK SAMUNTAI', role: 'Unit' },
{ nik: '13007913', name: 'Aulia Badrun Adz Dzuhri', jabatan: 'Krani Teknik', unit: '5F21', unit_name: 'PABRIK SAMUNTAI', role: 'Unit' },
{ nik: '13000992', name: 'Qosim', jabatan: 'Asisten Teknik', unit: '5F22', unit_name: 'PABRIK LONG PINANG', role: 'Unit' },
{ nik: '13007885', name: 'Muhammad Rizal', jabatan: 'Krani Teknik', unit: '5F22', unit_name: 'PABRIK LONG PINANG', role: 'Unit' },
{ nik: '3000593', name: 'Abdul Halim Lubis', jabatan: 'Lead ERP SAP PTPN IV Regional V', unit: '5AKN', unit_name: 'Akuntansi dan Keuangan', role: 'Regional' },
{ nik: '13005488', name: 'Harnika', jabatan: 'Asisten Mesin dan Instalasi Pabrik', unit: '5TEP', unit_name: 'Teknik dan Pengolahan', role: 'Regional' },
{ nik: '13005483', name: 'Dadang Mulia', jabatan: 'Asisten Sipil dan Infrastruktur Kebun', unit: '5TEP', unit_name: 'Teknik dan Pengolahan', role: 'Regional' },
{ nik: '13008078', name: 'Dandi Maulana', jabatan: 'Krani Administrasi', unit: '5TEP', unit_name: 'Teknik dan Pengolahan', role: 'Regional' },
{ nik: '19010048', name: 'Afra Veneranda Evaris', jabatan: 'Keyuser PM', unit: '5AKN', unit_name: 'Akuntansi dan Keuangan', role: 'Regional' },
{ nik: '13005791', name: 'Eko Puji Cahyono', jabatan: 'Keyuser CO', unit: '5AKN', unit_name: 'Akuntansi dan Keuangan', role: 'Regional' },
{ nik: '13006983', name: 'Hemas Hafidh Bachtiar', jabatan: 'Keyuser MM', unit: '5AKN', unit_name: 'Akuntansi dan Keuangan', role: 'Regional' },
{ nik: '13004524', name: 'Marjunita', jabatan: 'Keyuser MM', unit: '5AKN', unit_name: 'Akuntansi dan Keuangan', role: 'Regional' }
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS jabatan TEXT`);
    await client.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS unit_name TEXT`);

    for (const u of users) {
      await client.query(
        `INSERT INTO app_users (nik, name, password, role, plant, jabatan, unit_name)
         VALUES ($1, $2, '123', $3, $4, $5, $6)
         ON CONFLICT (nik) DO UPDATE 
         SET name = EXCLUDED.name, role = EXCLUDED.role, plant = EXCLUDED.plant, jabatan = EXCLUDED.jabatan, unit_name = EXCLUDED.unit_name`,
        [u.nik, u.name, u.role, u.unit, u.jabatan, u.unit_name]
      );
    }
    console.log("Users updated with Jabatan and Unit Name!");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

run();
