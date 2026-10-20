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
  // Get last 30 lines of PostgREST logs
  const r1 = await runCmd(conn, 'pm2 logs postgrest --nostream --lines 30 2>&1 | tail -35');
  console.log('Recent PostgREST logs:\n', r1);
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
