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
const conn = new Client();
conn.on('ready', async () => {
  // Check pmreg5-auth full error log
  console.log('=== PMREG5-AUTH FULL ERROR (last 50 lines) ===');
  const r1 = await runCmd(conn, 'tail -50 /home/ubuntu/.pm2/logs/pmreg5-auth-error.log 2>&1');
  console.log(r1);

  // Check pmreg5 app stdout log for recent errors
  console.log('=== PMREG5 APP STDOUT (last 30 lines) ===');
  const r2 = await runCmd(conn, 'pm2 logs pmreg5 --nostream --lines 20 2>&1 | tail -30');
  console.log(r2);

  // Check nginx access log for 4xx/5xx errors
  console.log('=== NGINX RECENT 4xx/5xx ===');
  const r3 = await runCmd(conn, 'sudo tail -100 /var/log/nginx/pmreg5_access.log 2>&1 | grep -E " [45][0-9][0-9] " | tail -20');
  console.log(r3 || '(no 4xx/5xx errors in last 100 lines)');

  // Check if ba_edits endpoint works correctly with real upsert
  console.log('=== TEST BA_EDITS UPSERT ===');
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNSIsImlhdCI6MTc4NzE5NDMxOCwiZXhwIjoyMTAyNTU0MzE4fQ.ll8EmgpSp8W7Vhict4l56Ov1jMk8Jo_9zMzhGs9qUqs';
  const data = '{"unit_code":"5E02","no_eq":"new_5E02_debug_test","new_no_eq":"","no_urut":"99","name":"","cc":"","status":"","kepemilikan":""}';
  const r4 = await runCmd(conn, `curl -s -w "\\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d '${data}' "http://127.0.0.1:3003/ba_edits?on_conflict=unit_code,no_eq"`);
  console.log('Insert new row:', r4);
  // Update it
  const data2 = '{"unit_code":"5E02","no_eq":"new_5E02_debug_test","new_no_eq":"2000000001","no_urut":"99","name":"Debug Equipment","cc":"5E0201","status":"Baik","kepemilikan":"Sewa"}';
  const r5 = await runCmd(conn, `curl -s -w "\\nHTTP_STATUS:%{http_code}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d '${data2}' "http://127.0.0.1:3003/ba_edits?on_conflict=unit_code,no_eq"`);
  console.log('Update (upsert):', r5);
  // Read it back
  const r6 = await runCmd(conn, `curl -s -H "Authorization: Bearer ${ANON}" "http://127.0.0.1:3003/ba_edits?unit_code=eq.5E02&no_eq=eq.new_5E02_debug_test"`);
  console.log('Read back:', r6);
  // Cleanup
  await runCmd(conn, `curl -s -o /dev/null -H "Authorization: Bearer ${ANON}" "http://127.0.0.1:3003/ba_edits?unit_code=eq.5E02&no_eq=eq.new_5E02_debug_test" -X DELETE`);
  console.log('Cleanup done');

  conn.end();
});
conn.on('error', e => console.error('SSH error:', e));
conn.connect(SSH);
