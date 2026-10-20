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
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNSIsImlhdCI6MTc4NzE5NDMxOCwiZXhwIjoyMTAyNTU0MzE4fQ.ll8EmgpSp8W7Vhict4l56Ov1jMk8Jo_9zMzhGs9qUqs';
const conn = new Client();
conn.on('ready', async () => {
  // Test direct to PostgREST WITH proper JWT auth
  const r1 = await runCmd(conn, `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${ANON_KEY}" http://127.0.0.1:3003/ba_edits?limit=1 2>&1`);
  console.log('PostgREST with JWT:', r1);
  
  // Check what PostgREST says without auth
  const r2 = await runCmd(conn, 'curl -s http://127.0.0.1:3003/ba_edits?limit=1 2>&1');
  console.log('PostgREST without JWT:', r2);
  
  // Test via Nginx with proper JWT header
  const r3 = await runCmd(conn, `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${ANON_KEY}" -H "apikey: ${ANON_KEY}" http://127.0.0.1/rest/v1/ba_edits?limit=1 2>&1`);
  console.log('Via Nginx with JWT:', r3);
  
  // Check PostgREST logs 
  const r4 = await runCmd(conn, 'pm2 logs postgrest --nostream --lines 10 2>&1 | tail -20');
  console.log('PostgREST logs:', r4);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
