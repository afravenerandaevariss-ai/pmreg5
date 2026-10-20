import { createClient } from '@supabase/supabase-js';

let envSupabaseUrl;
let envSupabaseAnonKey;

// Static environment configurations for runtime domain matching
const DEV_URL = 'https://devpmreg5.afratarigan.my.id';
const DEV_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNS1kZXYiLCJpYXQiOjE3OTEyNzUxMTIsImV4cCI6MjEwNjYzNTExMn0.8BgDRC_KV3xWPpfSjl6gi-7ZPhU3J-PH4Yh-VIA3j44';

const PROD_URL = 'https://pmreg5.afratarigan.my.id';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNSIsImlhdCI6MTc4NzE5NDMxOCwiZXhwIjoyMTAyNTU0MzE4fQ.ll8EmgpSp8W7Vhict4l56Ov1jMk8Jo_9zMzhGs9qUqs';

// For Node.js / scripts
if (typeof process !== 'undefined' && process.env) {
  const isProd = process.env.VITE_APP_ENV === 'production' || process.env.NODE_ENV === 'production';
  envSupabaseUrl = process.env.VITE_SUPABASE_URL || (isProd ? PROD_URL : DEV_URL);
  envSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || (isProd ? PROD_ANON_KEY : DEV_ANON_KEY);
}


// For Vite Client (Browser)
// Check explicit environment variables first, then fallback to domain-based resolution
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    if (import.meta.env.VITE_SUPABASE_URL) {
      envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    }
    if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
      envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  }

  if (!envSupabaseUrl && typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host.includes('devpmreg5') || host === 'localhost' || host === '127.0.0.1') {
      envSupabaseUrl = DEV_URL;
      envSupabaseAnonKey = DEV_ANON_KEY;
    } else if (host.includes('pmreg5.afratarigan.my.id') || (!host.includes('vercel.app') && host.includes('pmreg5'))) {
      envSupabaseUrl = PROD_URL;
      envSupabaseAnonKey = PROD_ANON_KEY;
    } else {
      // Default fallback
      envSupabaseUrl = PROD_URL;
      envSupabaseAnonKey = PROD_ANON_KEY;
    }
  }
} catch (_e) {
  // Ignore
}

const supabaseUrl = envSupabaseUrl;
const supabaseAnonKey = envSupabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not set. Running in localStorage fallback mode.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// True in dev environment (by hostname or VITE_APP_ENV)
export const IS_DEV_ENV = (typeof window !== 'undefined' && (
  window.location.hostname.includes('dev') || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
)) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_ENV === 'dev') || (typeof process !== 'undefined' && process.env?.VITE_APP_ENV === 'dev');





