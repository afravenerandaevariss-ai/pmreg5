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
  // Check current constraints on ba_edits
  const r1 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'ba_edits'::regclass;" 2>&1`);
  console.log('ba_edits constraints:\n', r1);
  
  // Add the unique constraint via file (to avoid shell escaping)
  await runCmd(conn, 'echo "ALTER TABLE ba_edits ADD CONSTRAINT ba_edits_unit_no_eq_unique UNIQUE (unit_code, no_eq);" > /tmp/constraint.sql');
  const r2 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -f /tmp/constraint.sql 2>&1');
  console.log('Add constraint result:', r2);
  
  // Verify
  const r3 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "SELECT conname FROM pg_constraint WHERE conrelid = 'ba_edits'::regclass;" 2>&1`);
  console.log('Constraints after:', r3);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
