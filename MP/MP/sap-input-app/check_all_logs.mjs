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
  console.log('=== PM2 STATUS ===');
  const r1 = await runCmd(conn, 'pm2 list 2>&1');
  console.log(r1);
  
  console.log('=== NGINX ERROR LOG (last 30 lines) ===');
  const r2 = await runCmd(conn, 'sudo tail -30 /var/log/nginx/pmreg5_error.log 2>&1');
  console.log(r2 || '(no errors)');
  
  console.log('=== POSTGREST ERROR LOG (last 30 lines) ===');
  const r3 = await runCmd(conn, 'pm2 logs postgrest --nostream --lines 30 2>&1 | tail -40');
  console.log(r3);
  
  console.log('=== PMREG5 APP ERROR LOG (last 30 lines) ===');
  const r4 = await runCmd(conn, 'pm2 logs pmreg5 --err --nostream --lines 30 2>&1 | tail -40');
  console.log(r4);
  
  console.log('=== PMREG5-AUTH ERROR LOG (last 20 lines) ===');
  const r5 = await runCmd(conn, 'pm2 logs pmreg5-auth --err --nostream --lines 20 2>&1 | tail -25');
  console.log(r5);
  
  conn.end();
});
conn.on('error', e => console.error('SSH error:', e));
conn.connect(SSH);
