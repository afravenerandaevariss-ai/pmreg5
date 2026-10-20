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
  // Check Nginx config for /rest/v1
  const r1 = await runCmd(conn, 'grep -r "rest/v1\\|postgrest\\|3003" /etc/nginx/ 2>&1 | head -20');
  console.log('Nginx config for rest/v1:\n', r1);
  
  // Test ba_edits via localhost with nginx
  const r2 = await runCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" "https://pmreg5.afratarigan.my.id/rest/v1/ba_edits?limit=1" -k 2>&1');
  console.log('External test via server curl:', r2);
  
  // Test internal postgrest again
  const r3 = await runCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3003/ba_edits?limit=1" 2>&1');
  console.log('Internal PostgREST test:', r3);
  
  // Check if PostgREST is returning the table via schema reload
  const r4 = await runCmd(conn, 'curl -s http://127.0.0.1:3003/ 2>&1 | head -200 | grep -i "ba_edits\\|ba_unit"');
  console.log('PostgREST schema (ba tables):', r4 || 'NOT FOUND in schema');
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
