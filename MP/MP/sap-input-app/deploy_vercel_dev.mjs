/**
 * deploy_vercel_dev.mjs
 * Deploy DEV ke Vercel via git push ke branch devpmreg5.
 * Vercel sudah terhubung ke repo GitHub dan auto-deploy saat branch devpmreg5 di-push.
 */

import { execSync } from 'child_process';

const GIT = process.env.GIT_PATH || 'git';
const REPO = new URL('../../../..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'); // path repo

function run(cmd, label = cmd) {
  console.log(`\n🔧 ${label}`);
  execSync(cmd, { stdio: 'inherit', cwd: REPO.replace(/\//g, '\\') });
}

async function main() {
  console.log('🚀 DEPLOY DEV → VERCEL (branch: devpmreg5)');
  console.log('📦 Vercel auto-deploy via GitHub push — tidak perlu build lokal.');

  // 1. Switch ke branch devpmreg5
  run(`${GIT} checkout devpmreg5`, 'Checkout branch devpmreg5');

  // 2. Merge main ke devpmreg5 (supaya kode terbaru ikut)
  run(`${GIT} merge origin/main --no-edit`, 'Merge origin/main ke devpmreg5');

  // 3. Push ke GitHub → Vercel otomatis deploy
  run(`${GIT} push origin devpmreg5`, 'Push devpmreg5 ke GitHub (Vercel auto-deploy)');

  // 4. Kembali ke main
  run(`${GIT} checkout main`, 'Kembali ke branch main');

  console.log('\n✅ PUSH SELESAI!');
  console.log('🌐 Vercel sedang build & deploy...');
  console.log('   Preview: https://devpmreg5.vercel.app');
  console.log('   Custom : https://devpmreg5.afratarigan.my.id (setelah DNS diarahkan ke Vercel)');
  console.log('\n⏳ Pantau status deploy di: https://vercel.com/keyusersapreg5-5782s-projects/pmreg5');
}

main().catch(e => { console.error(e); process.exit(1); });
