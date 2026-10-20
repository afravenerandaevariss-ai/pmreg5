import { Client } from 'ssh2';
import fs from 'fs';

const SSH = {
  host: '43.134.84.59',
  port: 22,
  username: 'ubuntu',
  password: 'Akuhebat123#',
  readyTimeout: 30000
};

function runCmd(conn, cmd) {
  return new Promise((resolve) => {
    let out = '';
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve({ out: '', err: err.message });
      stream.on('data', d => out += d);
      stream.stderr.on('data', d => out += d);
      stream.on('close', () => resolve({ out }));
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  console.log('SSH Connected!');
  
  // Check what users exist in postgres
  const r1 = await runCmd(conn, 'sudo -u postgres psql -c "\\du" 2>&1');
  console.log('Users:\n', r1.out);
  
  // Check connection string used by PostgREST
  const r2 = await runCmd(conn, 'find /etc /home /opt /srv /var -name "*.conf" -o -name "*.env" 2>/dev/null | xargs grep -l "PGRST\\|postgrest\\|pmreg5_db" 2>/dev/null | head -5');
  console.log('Config files:\n', r2.out);
  
  // Try to connect to pmreg5_db as pmreg5_user
  const r3 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -c "\\dt" 2>&1 | head -30');
  console.log('Tables in pmreg5_db:\n', r3.out);
  
  conn.end();
});
conn.on('error', e => console.error('SSH error:', e));
conn.connect(SSH);
