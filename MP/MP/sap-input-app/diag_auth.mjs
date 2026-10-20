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
  // Check what PID 3402929 is (the one holding port 3002)
  console.log('=== PID 3402929 info ===');
  const r1 = await runCmd(conn, 'ps -p 3402929 -o pid,cmd 2>&1');
  console.log(r1);
  
  // Read auth-server.mjs to understand issue
  console.log('=== auth-server.mjs content ===');
  const r2 = await runCmd(conn, 'head -60 /var/www/pmreg5/server/auth-server.mjs 2>&1');
  console.log(r2);
  
  // Check if pmreg5-auth is actually stable and working now
  console.log('=== pmreg5-auth current status ===');
  const r3 = await runCmd(conn, 'pm2 describe pmreg5-auth 2>&1 | head -30');
  console.log(r3);
  
  // Check last restart time
  console.log('=== pmreg5-auth recent stdout ===');
  const r4 = await runCmd(conn, 'tail -10 /home/ubuntu/.pm2/logs/pmreg5-auth-out.log 2>&1');
  console.log(r4);
  
  // Check the TRIGGER ownership error - is this affecting ba_edits?
  console.log('=== Check triggers on tables ===');
  const r5 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -c "SELECT trigger_name, event_object_table, action_statement FROM information_schema.triggers WHERE trigger_schema=\'public\' ORDER BY event_object_table;" 2>&1');
  console.log(r5);
  
  // Check ba tables owner (should be accessible by pmreg5_user)
  console.log('=== Test pmreg5_user access to ba_edits ===');
  const r6 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "SET ROLE pmreg5_user; SELECT COUNT(*) FROM ba_edits;" 2>&1`);
  console.log(r6);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
