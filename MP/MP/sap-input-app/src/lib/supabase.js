import { createClient } from '@supabase/supabase-js';

let envSupabaseUrl;
let envSupabaseAnonKey;

// For Vercel Serverless Functions (Node.js)
if (typeof process !== 'undefined' && process.env) {
  envSupabaseUrl = process.env.VITE_SUPABASE_URL;
  envSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
}

// Static environment configurations for runtime domain matching
const DEV_URL = 'https://devpmreg5.afratarigan.my.id';
const DEV_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNS1kZXYiLCJpYXQiOjE3OTEyNzUxMTIsImV4cCI6MjEwNjYzNTExMn0.8BgDRC_KV3xWPpfSjl6gi-7ZPhU3J-PH4Yh-VIA3j44';

const PROD_URL = 'https://pmreg5.afratarigan.my.id';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InBtcmVnNSIsImlhdCI6MTc4NzE5NDMxOCwiZXhwIjoyMTAyNTU0MzE4fQ.ll8EmgpSp8W7Vhict4l56Ov1jMk8Jo_9zMzhGs9qUqs';

// For Vite Client (Browser)
// Dynamically resolve URL and Anon Key based on current domain to guarantee 100% environment isolation
try {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host.includes('devpmreg5') || host === 'localhost' || host === '127.0.0.1') {
      envSupabaseUrl = DEV_URL;
      envSupabaseAnonKey = DEV_ANON_KEY;
    } else if (host.includes('pmreg5')) {
      envSupabaseUrl = PROD_URL;
      envSupabaseAnonKey = PROD_ANON_KEY;
    }
  }

  if (!envSupabaseUrl && typeof import.meta !== 'undefined' && import.meta.env) {
    envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  }
  if (!envSupabaseAnonKey && typeof import.meta !== 'undefined' && import.meta.env) {
    envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }
} catch (e) {
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
)) || import.meta.env.VITE_APP_ENV === 'dev';





