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
  // Clean up test data using file to avoid escaping issues
  await runCmd(conn, "echo \"DELETE FROM ba_edits WHERE unit_code = 'TEST';\" > /tmp/clean.sql");
  await runCmd(conn, "echo \"DELETE FROM ba_edits WHERE no_eq LIKE 'new_5E02_%';\" >> /tmp/clean.sql");
  const r1 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -f /tmp/clean.sql 2>&1');
  console.log('Cleanup:', r1);
  
  // Verify
  const r2 = await runCmd(conn, "sudo -u postgres psql -d pmreg5_db -c \"SELECT COUNT(*) FROM ba_edits;\" 2>&1");
  console.log('Remaining count:', r2);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
