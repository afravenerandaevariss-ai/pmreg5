import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SSH = {
  host: '43.134.84.59',
  port: 22,
  username: 'ubuntu',
  password: 'Akuhebat123#',
  readyTimeout: 30000,
  keepaliveInterval: 10000,
  keepaliveCountMax: 10
};

function runCmd(conn, cmd, label = cmd) {
  return new Promise((resolve) => {
    console.log(`\n🔧 [PROD DEPLOY] ${label}`);
    let output = '';
    let errorOutput = '';
    conn.exec(cmd, (err, stream) => {
      if (err) return resolve({ output: '', errorOutput: err.message, code: -1 });
      stream.on('data', (d) => { output += d.toString(); });
      stream.stderr.on('data', (d) => { errorOutput += d.toString(); });
      stream.on('close', (code) => resolve({ output, errorOutput, code }));
    });
  });
}

async function main() {
  console.log('🚀 DEPLOYING PRODUCTION SERVER (pmreg5.afratarigan.my.id)...');
  console.log('📦 Building Vite for Production...');

  execSync('npx vite build --mode production --outDir dist-prod', { stdio: 'inherit' });

  // Create tar.gz archive locally using tar (index.html + assets)
  console.log('📦 Compressing dist-prod (index.html + assets) into deploy_prod.tar.gz...');
  execSync('tar -czf deploy_prod.tar.gz -C dist-prod index.html assets', { stdio: 'inherit' });

  const conn = new Client();
  conn.on('ready', () => {
    console.log('✅ SSH Connected to 43.134.84.59');
    conn.sftp(async (err, sftp) => {
      if (err) {
        console.error('SFTP Error:', err);
        conn.end();
        return;
      }
      try {
        await runCmd(conn, 'sudo chmod -R 755 /var/www/pmreg5 && sudo chown -R ubuntu:www-data /var/www/pmreg5', 'Fix permissions on PROD root');
        await runCmd(conn, 'mkdir -p /var/www/pmreg5/dist', 'Ensure PROD directory exists');
        
        console.log('📤 Uploading deploy_prod.tar.gz archive...');
        await new Promise((resolve, reject) => {
          sftp.fastPut('deploy_prod.tar.gz', '/tmp/deploy_prod.tar.gz', (putErr) => {
            if (putErr) reject(putErr);
            else resolve();
          });
        });
        console.log('✅ Archive uploaded successfully!');

        await runCmd(conn, 'tar -xzf /tmp/deploy_prod.tar.gz -C /var/www/pmreg5/dist && rm -f /tmp/deploy_prod.tar.gz', 'Extracting build archive to /var/www/pmreg5/dist');
        await runCmd(conn, 'sudo chmod -R 755 /var/www/pmreg5/dist && sudo chown -R ubuntu:www-data /var/www/pmreg5/dist', 'Ensure 755 permissions on dist');

        await runCmd(conn, 'pm2 reload pmreg5 || pm2 restart pmreg5', 'Reloading PM2 pmreg5');
        await runCmd(conn, 'sudo nginx -t && sudo systemctl reload nginx', 'Reloading Nginx');

        console.log('\n🎉 PROD DEPLOYMENT COMPLETE! (pmreg5.afratarigan.my.id)');
      } catch (e) {
        console.error('Deploy error:', e);
      } finally {
        if (fs.existsSync('deploy_prod.tar.gz')) fs.unlinkSync('deploy_prod.tar.gz');
        conn.end();
        process.exit(0);
      }
    });
  });

  conn.connect(SSH);
}

main();
