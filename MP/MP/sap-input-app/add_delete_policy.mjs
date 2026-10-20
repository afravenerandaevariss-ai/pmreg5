import { Client } from 'ssh2';
const SSH = { host: '43.134.84.59', port: 22, username: 'ubuntu', password: 'Akuhebat123#', readyTimeout: 30000 };
function runCmd(conn, cmd) {
  return new Promise((resolve) => {
    let out = '';
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve('');
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => out += d);
      stream.on('close', () => resolve(out));
    });
  });
}
const conn = new Client();
conn.on('ready', async () => {
  // Add DELETE policy for ba_edits (for soft delete / hard delete)
  await runCmd(conn, 'echo "DROP POLICY IF EXISTS \\"Allow public delete ba_edits\\" ON ba_edits;" > /tmp/p.sql');
  await runCmd(conn, 'echo "CREATE POLICY \\"Allow public delete ba_edits\\" ON ba_edits FOR DELETE TO anon USING (true);" >> /tmp/p.sql');
  
  // Add DELETE for ba_unit_edits too
  await runCmd(conn, 'echo "DROP POLICY IF EXISTS \\"Allow public delete ba_unit_edits\\" ON ba_unit_edits;" >> /tmp/p.sql');
  await runCmd(conn, 'echo "CREATE POLICY \\"Allow public delete ba_unit_edits\\" ON ba_unit_edits FOR DELETE TO anon USING (true);" >> /tmp/p.sql');
  
  // Clean up test data directly from psql
  await runCmd(conn, 'echo "DELETE FROM ba_edits WHERE unit_code IN (\'TEST\', \'5E02\') AND no_eq LIKE \'new_%\' AND (name LIKE \'%Test%\' OR name = \'\'\'\'\' OR name = \'ggg\' OR name IS NULL);" >> /tmp/p.sql');
  
  const r = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -f /tmp/p.sql 2>&1');
  console.log('Policies + cleanup:', r);
  
  // Verify cleanup
  const r2 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -c "SELECT unit_code, no_eq, name, status FROM ba_edits ORDER BY unit_code, updated_at DESC;" 2>&1');
  console.log('Remaining data:', r2);
  
  // Reload schema
  const r3 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -c "NOTIFY pgrst, \'reload schema\'" 2>&1');
  console.log('Schema reload:', r3);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
