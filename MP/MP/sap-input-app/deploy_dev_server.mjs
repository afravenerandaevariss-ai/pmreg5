import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';

const SSH = {
  host: '43.134.84.59',
  port: 22,
  username: 'ubuntu',
  password: 'Akuhebat123#',
  readyTimeout: 30000,
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

async function uploadDir(sftp, localDir, remoteDir) {
  await new Promise((resolve) => sftp.mkdir(remoteDir, { mode: '0755' }, () => resolve()));
  const files = fs.readdirSync(localDir);
  for (const file of files) {
    const localPath = path.join(localDir, file);
    const remotePath = path.join(remoteDir, file).replace(/\\/g, '/');
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      await uploadDir(sftp, localPath, remotePath);
    } else {
      await new Promise((resolve) => {
        sftp.fastPut(localPath, remotePath, (putErr) => {
          if (putErr) console.warn('  ⚠️ Upload warning:', file, putErr.message);
          else console.log('  📁 Uploaded:', remotePath);
          resolve();
        });
      });
    }
  }
}

import { execSync } from 'child_process';

async function main() {
  console.log('🚀 DEPLOYING DEVELOPMENT SERVER (devpmreg5.afratarigan.my.id)...');
  console.log('📦 Building Vite for DEV (VITE_APP_ENV=dev → dev_ prefixed Supabase tables)...');

  execSync('npx vite build --mode dev --outDir dist-dev', { stdio: 'inherit' });

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
        await runCmd(conn, 'rm -rf /var/www/devpmreg5/dist/* && mkdir -p /var/www/devpmreg5/dist', 'Ensure fresh DEV directory');
        console.log('📤 Uploading fresh dist-dev/ build...');
        await uploadDir(sftp, path.resolve('./dist-dev'), '/var/www/devpmreg5/dist');
        await runCmd(conn, 'sudo chmod -R 755 /var/www/devpmreg5/dist && sudo chown -R ubuntu:www-data /var/www/devpmreg5/dist', 'Ensure 755 permissions on dist');

        await runCmd(conn, 'pm2 reload pmreg5-dev || pm2 restart pmreg5-dev', 'Reloading PM2 pmreg5-dev');
        await runCmd(conn, 'sudo nginx -t && sudo systemctl reload nginx', 'Reloading Nginx');

        console.log('✅ DEV DEPLOYMENT COMPLETE!');
      } catch (e) {
        console.error('Deploy error:', e);
      } finally {
        conn.end();
        process.exit(0);
      }
    });
  });

  conn.connect(SSH);
}

main();
