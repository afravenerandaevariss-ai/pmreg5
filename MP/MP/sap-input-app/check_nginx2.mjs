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
  const r1 = await runCmd(conn, 'cat /etc/nginx/sites-enabled/pmreg5* 2>&1 | head -60');
  console.log('Nginx config:\n', r1);
  
  const r2 = await runCmd(conn, 'curl -s -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNSIsImlhdCI6MTc4NzE5NDMxOCwiZXhwIjoyMTAyNTU0MzE4fQ.ll8EmgpSp8W7Vhict4l56Ov1jMk8Jo_9zMzhGs9qUqs" "http://localhost/rest/v1/ba_edits?limit=1" 2>&1');
  console.log('Via localhost nginx:', r2);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
