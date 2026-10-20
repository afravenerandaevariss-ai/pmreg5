import { Client } from 'ssh2';
const SSH = { host: '43.134.84.59', port: 22, username: 'ubuntu', password: 'Akuhebat123#', readyTimeout: 30000 };
function runCmd(conn, cmd) {
  return new Promise((resolve) => {
    let out = '';
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve('ERR: ' + err.message);
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => out += d);
      stream.on('close', () => resolve(out));
    });
  });
}
const conn = new Client();
conn.on('ready', async () => {
  // PROBLEM 1: pmreg5-auth EADDRINUSE port 3002
  // Check what is using port 3002
  console.log('=== Who is using port 3002? ===');
  const r1 = await runCmd(conn, 'sudo lsof -i :3002 2>&1 || sudo ss -tlnp | grep 3002');
  console.log(r1);

  // Check pmreg5-auth config/script
  console.log('=== pmreg5-auth startup script ===');
  const r2 = await runCmd(conn, 'pm2 show pmreg5-auth 2>&1 | grep -E "script|exec|cwd|instances"');
  console.log(r2);

  // PROBLEM 2: Trigger ownership errors
  console.log('=== DB Trigger ownership issue ===');
  const r3 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -c "\\dT" 2>&1 | head -20');
  console.log(r3);

  // Check ba_edits table ownership
  const r4 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -c "SELECT tablename, tableowner FROM pg_tables WHERE schemaname=\'public\' ORDER BY tablename;" 2>&1');
  console.log('Table ownership:\n', r4);

  // Check pmreg5-auth restart count
  const r5 = await runCmd(conn, 'pm2 describe pmreg5-auth 2>&1 | grep -E "restart|status|pid|port"');
  console.log('pmreg5-auth status:', r5);

  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
