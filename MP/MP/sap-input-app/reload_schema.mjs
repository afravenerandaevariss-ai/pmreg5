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
  // Send NOTIFY to reload schema cache - PostgREST will pick up the new constraint
  const r1 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "NOTIFY pgrst, 'reload schema'" 2>&1`);
  console.log('NOTIFY pgrst:', r1);
  
  // Wait 2 seconds for reload
  await new Promise(r => setTimeout(r, 2000));
  
  // Check PostgREST logs to confirm reload
  const r2 = await runCmd(conn, 'pm2 logs postgrest --nostream --lines 5 2>&1 | tail -8');
  console.log('PostgREST logs after reload:', r2);
  
  // Test upsert with on_conflict parameter (same as Supabase JS sends)
  const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNSIsImlhdCI6MTc4NzE5NDMxOCwiZXhwIjoyMTAyNTU0MzE4fQ.ll8EmgpSp8W7Vhict4l56Ov1jMk8Jo_9zMzhGs9qUqs';
  const testData = JSON.stringify({unit_code:"5E02",no_eq:"new_5E02_SCHEMATEST_001",new_no_eq:"",no_urut:"99",name:"Schema Test",cc:"",status:"",kepemilikan:""});
  
  // Insert first
  const r3 = await runCmd(conn, `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${ANON_KEY}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d '${testData}' "http://127.0.0.1:3003/ba_edits?on_conflict=unit_code,no_eq" 2>&1`);
  console.log('First upsert (insert):', r3);
  
  // Upsert same key (should update, not conflict)
  const testData2 = JSON.stringify({unit_code:"5E02",no_eq:"new_5E02_SCHEMATEST_001",new_no_eq:"2000099991",no_urut:"99",name:"Schema Test Updated",cc:"5E0201",status:"Baik",kepemilikan:"Sewa"});
  const r4 = await runCmd(conn, `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${ANON_KEY}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d '${testData2}' "http://127.0.0.1:3003/ba_edits?on_conflict=unit_code,no_eq" 2>&1`);
  console.log('Second upsert (update):', r4);
  
  // Cleanup
  const r5 = await runCmd(conn, `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer ${ANON_KEY}" "http://127.0.0.1:3003/ba_edits?unit_code=eq.5E02&no_eq=eq.new_5E02_SCHEMATEST_001" -X DELETE`);
  console.log('Cleanup:', r5);
  
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
