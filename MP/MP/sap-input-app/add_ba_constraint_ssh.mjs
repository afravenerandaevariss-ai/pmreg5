import { Client } from 'ssh2';

const SSH = {
  host: '43.134.84.59', port: 22, username: 'ubuntu',
  password: 'Akuhebat123#', readyTimeout: 30000
};

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
  // Add UNIQUE constraint using a file on the server to avoid shell escaping issues
  const sqlFile = '/tmp/ba_constraint.sql';
  const sqlContent = `ALTER TABLE ba_edits ADD CONSTRAINT ba_edits_unit_no_eq_unique UNIQUE (unit_code, no_eq);`;
  
  await runCmd(conn, `echo "${sqlContent}" > ${sqlFile}`);
  const r = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -f ${sqlFile} 2>&1`);
  console.log('Constraint result:', r);
  
  // Also reload PostgREST to recognize new tables
  const r2 = await runCmd(conn, 'sudo systemctl reload postgrest 2>&1 || sudo systemctl restart postgrest 2>&1 || true');
  console.log('PostgREST reload:', r2 || 'done');
  
  // Find PostgREST service name
  const r3 = await runCmd(conn, 'systemctl list-units | grep -i "post\\|pgrst" | head -5');
  console.log('PostgREST services:', r3);
  
  // Try pg_notify to reload schema cache
  const r4 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "NOTIFY pgrst, 'reload schema'" 2>&1`);
  console.log('Schema reload notify:', r4);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
