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
  // Reload PostgREST via PM2
  const r1 = await runCmd(conn, 'pm2 reload postgrest 2>&1');
  console.log('PM2 reload postgrest:', r1);
  
  // Wait a bit then test
  await new Promise(r => setTimeout(r, 2000));
  
  // Test via curl on the server itself (localhost)
  const r2 = await runCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3003/ba_edits?limit=1 2>&1');
  console.log('ba_edits HTTP status:', r2);
  
  const r3 = await runCmd(conn, 'curl -s http://127.0.0.1:3003/ba_edits?limit=1 2>&1');
  console.log('ba_edits response:', r3);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
