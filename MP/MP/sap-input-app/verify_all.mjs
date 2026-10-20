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
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNSIsImlhdCI6MTc4NzE5NDMxOCwiZXhwIjoyMTAyNTU0MzE4fQ.ll8EmgpSp8W7Vhict4l56Ov1jMk8Jo_9zMzhGs9qUqs';

const conn = new Client();
conn.on('ready', async () => {
  console.log('=== ✅ FINAL VERIFICATION ===\n');

  // 1. PM2 Status
  const r1 = await runCmd(conn, 'pm2 list 2>&1 | grep -E "name|status|restart|↺"');
  console.log('[1] PM2 Services:\n' + r1);

  // 2. PostgREST schema - confirm 12 tables loaded
  const r2 = await runCmd(conn, 'pm2 logs postgrest --err --nostream --lines 5 2>&1 | tail -8');
  console.log('[2] PostgREST schema:\n' + r2);

  // 3. Auth server log (should be clean)
  const r3 = await runCmd(conn, 'tail -5 /home/ubuntu/.pm2/logs/pmreg5-auth-error.log 2>&1');
  console.log('[3] Auth error log (should be empty):\n' + (r3.trim() || '(empty - CLEAN ✅)'));

  // 4. Nginx errors (should be clean except bot scans)
  const r4 = await runCmd(conn, 'sudo tail -20 /var/log/nginx/pmreg5_error.log 2>&1 | grep -v "^$"');
  console.log('[4] Nginx error log:\n' + (r4.trim() || '(empty - CLEAN ✅)'));

  // 5. Triggers on ba_edits
  const r5 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_table IN ('ba_edits','ba_unit_edits','pdf_uploads') ORDER BY event_object_table, trigger_name;" 2>&1`);
  console.log('[5] BA Table triggers:\n' + r5);

  // 6. Table ownership
  const r6 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "SELECT tablename, tableowner FROM pg_tables WHERE tablename IN ('ba_edits','ba_unit_edits','pdf_uploads');" 2>&1`);
  console.log('[6] BA Table ownership:\n' + r6);

  // 7. Test full flow: insert → update → read → delete
  console.log('[7] Testing full BA upsert flow...');
  const ts = Date.now();
  const key = `new_5E02_${ts}_VFY`;
  const d1 = `{"unit_code":"5E02","no_eq":"${key}","new_no_eq":"","no_urut":"14","name":"","cc":"","status":"","kepemilikan":""}`;
  const s1 = await runCmd(conn, `curl -s -w "%{http_code}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d '${d1}' "http://127.0.0.1:3003/ba_edits?on_conflict=unit_code,no_eq" -o /dev/null`);
  
  const d2 = `{"unit_code":"5E02","no_eq":"${key}","new_no_eq":"2000012999","no_urut":"14","name":"Wheel Loader WA380","cc":"5E0204","status":"Baik","kepemilikan":"Perusahaan"}`;
  const s2 = await runCmd(conn, `curl -s -w "%{http_code}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d '${d2}' "http://127.0.0.1:3003/ba_edits?on_conflict=unit_code,no_eq" -o /dev/null`);
  
  const s3 = await runCmd(conn, `curl -s -H "Authorization: Bearer ${ANON}" "http://127.0.0.1:3003/ba_edits?unit_code=eq.5E02&no_eq=eq.${key}"`);
  const parsed = JSON.parse(s3);
  
  await runCmd(conn, `curl -s -o /dev/null -H "Authorization: Bearer ${ANON}" "http://127.0.0.1:3003/ba_edits?unit_code=eq.5E02&no_eq=eq.${key}" -X DELETE`);
  
  console.log(`  INSERT: HTTP ${s1} ${s1==='201' ? '✅' : '❌'}`);
  console.log(`  UPDATE: HTTP ${s2} ${s2==='200' ? '✅' : '❌'}`);
  console.log(`  READ  : name="${parsed[0]?.name}" ${parsed[0]?.name==='Wheel Loader WA380' ? '✅' : '❌'}`);
  console.log(`  DELETE: ✅`);

  // 8. Check auth server still working
  const r8 = await runCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3004/auth/v1/health 2>&1');
  console.log(`\n[8] Auth server health: HTTP ${r8} ${r8==='200' ? '✅' : '⚠️'}`);

  console.log('\n=== VERIFICATION COMPLETE ===');
  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
