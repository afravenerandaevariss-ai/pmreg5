process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { execSync } from 'child_process';
try {
  execSync('vercel --prod --yes', { stdio: 'inherit', timeout: 120000 });
} catch(e) {
  process.exit(1);
}
