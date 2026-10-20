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

  // ─── FIX 1: Check what notify_table_change function looks like ───
  console.log('=== notify_table_change function ===');
  const r1 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "\\sf notify_table_change" 2>&1`);
  console.log(r1);

  // ─── FIX 2: Add realtime triggers to ba_edits and ba_unit_edits ───
  // Write SQL to file to avoid shell escaping
  const sql = `
-- Add notify triggers to ba_edits (for realtime websocket)
DROP TRIGGER IF EXISTS notify_ba_edits_change ON ba_edits;
CREATE TRIGGER notify_ba_edits_change
  AFTER INSERT OR UPDATE OR DELETE ON ba_edits
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

DROP TRIGGER IF EXISTS notify_ba_unit_edits_change ON ba_unit_edits;
CREATE TRIGGER notify_ba_unit_edits_change
  AFTER INSERT OR UPDATE OR DELETE ON ba_unit_edits
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

DROP TRIGGER IF EXISTS notify_pdf_uploads_change ON pdf_uploads;
CREATE TRIGGER notify_pdf_uploads_change
  AFTER INSERT OR UPDATE OR DELETE ON pdf_uploads
  FOR EACH ROW EXECUTE FUNCTION notify_table_change();

-- Fix table ownership: change owner to pmreg5_user for consistent permissions
ALTER TABLE ba_edits OWNER TO pmreg5_user;
ALTER TABLE ba_unit_edits OWNER TO pmreg5_user;
ALTER TABLE pdf_uploads OWNER TO pmreg5_user;

-- Ensure sequences are also owned by pmreg5_user
-- (no sequences needed since using gen_random_uuid())

-- Re-grant to anon and authenticator
GRANT ALL ON ba_edits TO anon;
GRANT ALL ON ba_unit_edits TO anon;
GRANT ALL ON pdf_uploads TO anon;
GRANT ALL ON ba_edits TO authenticator;
GRANT ALL ON ba_unit_edits TO authenticator;
GRANT ALL ON pdf_uploads TO authenticator;
GRANT ALL ON ba_edits TO pmreg5_user;
GRANT ALL ON ba_unit_edits TO pmreg5_user;
GRANT ALL ON pdf_uploads TO pmreg5_user;

SELECT 'ALL_DONE' as result;
`;
  await runCmd(conn, `cat > /tmp/fix_ba.sql << 'ENDSQL'\n${sql}\nENDSQL`);
  const r2 = await runCmd(conn, 'sudo -u postgres psql -d pmreg5_db -f /tmp/fix_ba.sql 2>&1');
  console.log('Fix SQL result:\n', r2);

  // ─── FIX 3: Flush pmreg5-auth error log to clean it ───
  console.log('=== Flushing pm2 logs ===');
  const r3 = await runCmd(conn, 'pm2 flush pmreg5-auth 2>&1');
  console.log(r3);

  // ─── Reload PostgREST schema cache ───
  const r4 = await runCmd(conn, `sudo -u postgres psql -d pmreg5_db -c "NOTIFY pgrst, 'reload schema'" 2>&1`);
  console.log('Schema reload:', r4);

  // ─── Verify: test upsert again to make sure triggers don't cause errors ───
  await new Promise(r => setTimeout(r, 1500));
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNSIsImlhdCI6MTc4NzE5NDMxOCwiZXhwIjoyMTAyNTU0MzE4fQ.ll8EmgpSp8W7Vhict4l56Ov1jMk8Jo_9zMzhGs9qUqs';
  const d = '{"unit_code":"5E99","no_eq":"new_5E99_trigger_test","new_no_eq":"","no_urut":"1","name":"Trigger Test","cc":"","status":"Baik","kepemilikan":"Sewa"}';
  const r5 = await runCmd(conn, `curl -s -w "\\nHTTP:%{http_code}" -H "Authorization: Bearer ${ANON}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" -d '${d}' "http://127.0.0.1:3003/ba_edits?on_conflict=unit_code,no_eq"`);
  console.log('Post-fix upsert test:', r5);
  // Cleanup
  await runCmd(conn, `curl -s -o /dev/null -H "Authorization: Bearer ${ANON}" "http://127.0.0.1:3003/ba_edits?unit_code=eq.5E99" -X DELETE`);
  console.log('Trigger test cleanup done');

  conn.end();
});
conn.on('error', e => console.error(e));
conn.connect(SSH);
