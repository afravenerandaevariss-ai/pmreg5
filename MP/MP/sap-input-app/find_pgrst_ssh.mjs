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
  // Find PostgREST process
  const r1 = await runCmd(conn, 'ps aux | grep -i pgrst | grep -v grep');
  console.log('pgrst processes:', r1 || 'none found');
  
  // Find in PM2
  const r2 = await runCmd(conn, 'pm2 list 2>&1 | head -20');
  console.log('PM2 list:', r2);
  
  // Check PostgREST config
  const r3 = await runCmd(conn, 'cat /etc/postgrest/pmreg5.conf 2>&1');
  console.log('PostgREST config:', r3);
  
  // Check if NOTIFY worked
  const r4 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -c "\\dt ba*" 2>&1');
  console.log('BA tables:', r4);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
