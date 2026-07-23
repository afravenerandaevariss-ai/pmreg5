/**
 * run_wa_report.js
 * =================
 * Entry-point script for GitHub Actions automated WhatsApp report.
 * 
 * Flow:
 *  1. Fetch logbook data from Supabase
 *  2. Render a beautiful HD PNG table via Puppeteer (headless Chrome)
 *  3. Send the image to the WhatsApp group via GoWA API
 * 
 * Runs automatically via GitHub Actions cron (09:00 WIB & 15:00 WIB).
 * Can also be triggered manually: node scripts/run_wa_report.js
 */

import { generateAndSendTablePdf } from './test_pdf_generator.js';

const TARGET_GROUP_JID = process.env.TARGET_GROUP_JID || '120363430505509462@g.us';

console.log('='.repeat(60));
console.log('  PMREG5 - Automated WhatsApp Logbook Report');
console.log('  Time:', new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }), 'WIB');
console.log('  Target Group:', TARGET_GROUP_JID);
console.log('='.repeat(60));

generateAndSendTablePdf(TARGET_GROUP_JID)
  .then((result) => {
    if (result && (result.code === 'SUCCESS' || result.success)) {
      console.log('\n✅ SUCCESS: HD Image report sent to WhatsApp group!');
      console.log('   Response:', JSON.stringify(result, null, 2));
      process.exit(0);
    } else {
      console.error('\n❌ FAILED: GoWA returned non-success response.');
      console.error('   Response:', JSON.stringify(result, null, 2));
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
