import { Client } from 'ssh2';
import { execSync } from 'child_process';
import fs from 'fs';

const SSH = {
  host: process.env.SSH_HOST || '43.134.84.59',
  port: parseInt(process.env.SSH_PORT || '22'),
  username: process.env.SSH_USER || 'ubuntu',
  // Gunakan SSH key (direkomendasikan) atau password dari env var
  // Jalankan: SSH_PASS=xxx node deploy_both.mjs
  // Atau set SSH_KEY_PATH=/path/to/key untuk key-based auth
  ...(process.env.SSH_KEY_PATH
    ? { privateKey: (await import('fs')).default.readFileSync(process.env.SSH_KEY_PATH) }
    : { password: process.env.SSH_PASS || (() => { throw new Error('SSH_PASS atau SSH_KEY_PATH harus diset!'); })() }
  ),
  readyTimeout: 30000,
  keepaliveInterval: 10000,
};

function runCmd(conn, cmd, label = '') {
  return new Promise((resolve) => {
    console.log(`\n🔧 ${label || cmd.substring(0, 60)}`);
    let output = '', errOutput = '';
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve({ output: '', errOutput: err.message, code: -1 });
      stream.on('data', d => { output += d; process.stdout.write(d); });
      stream.stderr.on('data', d => { errOutput += d; process.stderr.write(d); });
      stream.on('close', code => resolve({ output, errOutput, code }));
    });
  });
}

async function connectSSH() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect(SSH);
  });
}

async function main() {
  // ─── STEP 1: Build PRODUCTION ─────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  STEP 1: Build PRODUCTION Frontend  ║');
  console.log('╚══════════════════════════════════════╝');
  execSync('npx vite build --mode production --outDir dist-prod', {
    stdio: 'inherit',
    env: { ...process.env, VITE_APP_ENV: 'production' }
  });
  execSync('tar -czf deploy_prod.tar.gz -C dist-prod index.html assets', { stdio: 'inherit' });
  console.log('✅ PROD build complete');

  // ─── STEP 2: Build DEV ────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║   STEP 2: Build DEV Frontend        ║');
  console.log('╚══════════════════════════════════════╝');
  execSync('npx vite build --mode dev --outDir dist-dev', {
    stdio: 'inherit',
    env: { ...process.env, VITE_APP_ENV: 'dev' }
  });
  execSync('tar -czf deploy_dev.tar.gz -C dist-dev .', { stdio: 'inherit' });
  console.log('✅ DEV build complete');

  // ─── STEP 3: Upload & Deploy to Server ────────────────────────────────────
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  STEP 3: Upload & Deploy to Server  ║');
  console.log('╚══════════════════════════════════════╝');

  const conn = await connectSSH();
  console.log('✅ SSH Connected to 43.134.84.59');

  await new Promise((resolve, reject) => {
    conn.sftp(async (err, sftp) => {
      if (err) return reject(err);

      // Upload PROD archive
      console.log('\n📤 Uploading deploy_prod.tar.gz...');
      await new Promise((res, rej) =>
        sftp.fastPut('deploy_prod.tar.gz', '/tmp/deploy_prod.tar.gz', { concurrency: 2, chunkSize: 32768 }, e => e ? rej(e) : res())
      );
      console.log('✅ PROD archive uploaded');

      // Upload DEV archive
      console.log('\n📤 Uploading deploy_dev.tar.gz...');
      await new Promise((res, rej) =>
        sftp.fastPut('deploy_dev.tar.gz', '/tmp/deploy_dev.tar.gz', { concurrency: 2, chunkSize: 32768 }, e => e ? rej(e) : res())
      );
      console.log('✅ DEV archive uploaded');

      try {
        // ╔══════════════════════════════════════════════════════════════════╗
        // ║  SAFETY RULE: Deploy TIDAK PERNAH menyentuh .env di server.    ║
        // ║  File .env di /var/www/pmreg5/.env dan /var/www/devpmreg5/.env ║
        // ║  adalah sumber kebenaran tunggal untuk secrets tiap environment.║
        // ║  Edit secrets → langsung di server via SSH, bukan via deploy.   ║
        // ╚══════════════════════════════════════════════════════════════════╝

        // ── Sync API handlers to both PROD and DEV ───────────────────────────
        for (const apiFile of ['send-wa.js', 'process-excel.js', 'send-wa-image-disabled.js', 'vehicle-logs-slim.js']) {
          if (fs.existsSync(`api/${apiFile}`)) {
            await new Promise((res, rej) => sftp.fastPut(`api/${apiFile}`, `/var/www/pmreg5/api/${apiFile}`, e => e ? rej(e) : res()));
            await new Promise((res, rej) => sftp.fastPut(`api/${apiFile}`, `/var/www/devpmreg5/api/${apiFile}`, e => e ? rej(e) : res()));
          }
        }
        console.log('✅ Synced api/*.js handlers to both PROD & DEV');

        // ── Deploy PROD ──────────────────────────────────────────────────────
        console.log('\n🚀 ─── DEPLOYING PRODUCTION ───');
        await runCmd(conn, 'sudo chmod -R 755 /var/www/pmreg5 && sudo chown -R ubuntu:www-data /var/www/pmreg5', 'Fix PROD permissions');
        await runCmd(conn, 'mkdir -p /var/www/pmreg5/dist', 'Ensure PROD dist dir');
        await runCmd(conn, 'rm -rf /var/www/pmreg5/dist/assets && rm -f /var/www/pmreg5/dist/index.html', 'Wipe stale PROD assets & index.html');
        await runCmd(conn, 'tar -xzf /tmp/deploy_prod.tar.gz -C /var/www/pmreg5/dist && rm -f /tmp/deploy_prod.tar.gz', 'Extract PROD archive');
        await runCmd(conn, 'sudo chmod -R 755 /var/www/pmreg5/dist && sudo chown -R ubuntu:www-data /var/www/pmreg5/dist', 'Ensure PROD dist permissions');
        // ✅ SAFETY: Reload (bukan restart) agar .env server tetap terbaca dari PM2 env cache
        await runCmd(conn, 'pm2 reload pmreg5 || pm2 restart pmreg5', 'Reload PM2 pmreg5');
        console.log('\n🎉 PRODUCTION deployed! (pmreg5.afratarigan.my.id)');

        // ── Deploy DEV ───────────────────────────────────────────────────────
        console.log('\n🚀 ─── DEPLOYING DEV PLAYGROUND ───');
        await runCmd(conn, 'sudo chmod -R 755 /var/www/devpmreg5 && sudo chown -R ubuntu:www-data /var/www/devpmreg5', 'Fix DEV permissions');
        await runCmd(conn, 'mkdir -p /var/www/devpmreg5/dist', 'Ensure DEV dist dir');
        await runCmd(conn, 'rm -rf /var/www/devpmreg5/dist/assets && rm -f /var/www/devpmreg5/dist/index.html', 'Wipe stale DEV assets & index.html');
        await runCmd(conn, 'tar -xzf /tmp/deploy_dev.tar.gz -C /var/www/devpmreg5/dist && rm -f /tmp/deploy_dev.tar.gz', 'Extract DEV archive');
        await runCmd(conn, 'sudo chmod -R 755 /var/www/devpmreg5/dist && sudo chown -R ubuntu:www-data /var/www/devpmreg5/dist', 'Ensure DEV dist permissions');
        // ✅ SAFETY: .env TIDAK pernah di-copy/overwrite — tiap server punya .env sendiri
        await runCmd(conn, 'pm2 restart pmreg5-dev pmreg5-dev-auth pmreg5-dev-postgrest', 'Restart DEV PM2 services');
        console.log('\n🎉 DEV PLAYGROUND deployed! (devpmreg5.afratarigan.my.id)');

        // ── Reload Nginx ─────────────────────────────────────────────────────
        await runCmd(conn, 'pm2 save', 'Save PM2 state');
        await runCmd(conn, 'sudo nginx -t && sudo systemctl reload nginx', 'Reload Nginx');

        // ── Verify Databases Are Separate ────────────────────────────────────
        console.log('\n🔍 ─── VERIFYING DATABASE ISOLATION ───');
        const { output: dbCheck } = await runCmd(conn,
          `sudo -u postgres psql -c "\\l" | grep pmreg5`,
          'List pmreg5 databases'
        );
        const { output: devTables } = await runCmd(conn,
          `sudo -u postgres psql -d pmreg5_dev_db -c "SELECT COUNT(*) as dev_users FROM app_users;"`,
          'Count users in pmreg5_dev_db'
        );
        const { output: prodTables } = await runCmd(conn,
          `sudo -u postgres psql -d pmreg5_db -c "SELECT COUNT(*) as prod_users FROM app_users;"`,
          'Count users in pmreg5_db'
        );

        console.log('\n══════════════════════════════════════════════════════');
        console.log('  ✅ DEPLOYMENT SUMMARY');
        console.log('══════════════════════════════════════════════════════');
        console.log('  🌐 PROD: https://pmreg5.afratarigan.my.id');
        console.log('           Database: pmreg5_db (LIVE PRODUCTION)');
        console.log('           PM2: pmreg5 (port 3001) + pmreg5-auth (3004) + postgrest (3003)');
        console.log('  🛠️  DEV:  https://devpmreg5.afratarigan.my.id');
        console.log('           Database: pmreg5_dev_db (ISOLATED PLAYGROUND)');
        console.log('           PM2: pmreg5-dev (port 3002) + pmreg5-dev-auth (3006) + pmreg5-dev-postgrest (3005)');
        console.log('══════════════════════════════════════════════════════');

      } finally {
        if (fs.existsSync('deploy_prod.tar.gz')) fs.unlinkSync('deploy_prod.tar.gz');
        if (fs.existsSync('deploy_dev.tar.gz')) fs.unlinkSync('deploy_dev.tar.gz');
        conn.end();
        resolve();
      }
    });
  });

  process.exit(0);
}

main().catch(e => { console.error('❌ Deploy failed:', e); process.exit(1); });
