import { Client } from 'ssh2';
import fs from 'fs';

const SSH = {
  host: '43.134.84.59',
  port: 22,
  username: 'ubuntu',
  password: 'Akuhebat123#',
  readyTimeout: 30000
};

const sqlContent = fs.readFileSync('setup_ba_tables.sql', 'utf8').replace(/'/g, "'\\''");

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected!');
  
  // Find the postgres/supabase connection details on the server
  conn.exec('sudo -u postgres psql -c "\\l" 2>&1 | head -20', (err, stream) => {
    if (err) { console.error('exec err:', err); conn.end(); return; }
    let out = '';
    stream.on('data', d => out += d);
    stream.stderr.on('data', d => out += d);
    stream.on('close', () => {
      console.log('DB list:\n', out);
      
      // Now run our SQL
      const cmd = `sudo -u postgres psql -d postgres -c "${sqlContent.replace(/\n/g, ' ')}" 2>&1`;
      conn.exec(cmd, (err2, stream2) => {
        if (err2) { console.error('exec2 err:', err2); conn.end(); return; }
        let out2 = '';
        stream2.on('data', d => out2 += d);
        stream2.stderr.on('data', d => out2 += d);
        stream2.on('close', () => {
          console.log('SQL Result:\n', out2);
          conn.end();
        });
      });
    });
  });
});
conn.on('error', e => console.error('SSH error:', e));
conn.connect(SSH);
