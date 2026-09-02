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
    console.log(`\n🔧 [DEV DEPLOY] ${label}`);
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
  console.log('🚀 DEPLOYING DEVELOPMENT SERVER (devpmreg5.afratarigan.my.id)...');
  console.log('📦 Building Vite for Development (VITE_APP_ENV=dev)...');

  execSync('npx vite build --mode development --outDir dist-dev', { 
    stdio: 'inherit',
    env: { ...process.env, VITE_APP_ENV: 'dev' }
  });

  console.log('📦 Compressing dist-dev into deploy_dev.tar.gz...');
  execSync('tar -czf deploy_dev.tar.gz -C dist-dev .', { stdio: 'inherit' });

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
        await runCmd(conn, 'sudo chmod -R 755 /var/www/devpmreg5 && sudo chown -R ubuntu:www-data /var/www/devpmreg5', 'Fix permissions on DEV root');
        await runCmd(conn, 'mkdir -p /var/www/devpmreg5/dist', 'Ensure DEV directory exists');
        
        console.log('📤 Uploading deploy_dev.tar.gz archive...');
        await new Promise((resolve, reject) => {
          sftp.fastPut('deploy_dev.tar.gz', '/tmp/deploy_dev.tar.gz', (putErr) => {
            if (putErr) reject(putErr);
            else resolve();
          });
        });
        console.log('✅ Archive uploaded successfully!');

        await runCmd(conn, 'tar -xzf /tmp/deploy_dev.tar.gz -C /var/www/devpmreg5/dist && rm -f /tmp/deploy_dev.tar.gz', 'Extracting build archive to /var/www/devpmreg5/dist');
        await runCmd(conn, 'sudo chmod -R 755 /var/www/devpmreg5/dist && sudo chown -R ubuntu:www-data /var/www/devpmreg5/dist', 'Ensure 755 permissions on dist');

        await runCmd(conn, 'pm2 reload pmreg5-dev || pm2 restart pmreg5-dev', 'Reloading PM2 pmreg5-dev');
        await runCmd(conn, 'sudo nginx -t && sudo systemctl reload nginx', 'Reloading Nginx');

        console.log('\n🎉 DEV DEPLOYMENT COMPLETE! (devpmreg5.afratarigan.my.id)');
      } catch (e) {
        console.error('Deploy error:', e);
      } finally {
        if (fs.existsSync('deploy_dev.tar.gz')) fs.unlinkSync('deploy_dev.tar.gz');
        conn.end();
        process.exit(0);
      }
    });
  });

  conn.connect(SSH);
}

main();
