import { createClient } from '@supabase/supabase-js';

let envSupabaseUrl;
let envSupabaseAnonKey;

// Production Cloud Database with full data (7,503 daily logs & 17,277 equipment records)
const SUPABASE_CLOUD_URL = 'https://pabnvxlvrussdfhisxzn.supabase.co';
const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';

const DEV_URL = SUPABASE_CLOUD_URL;
const DEV_ANON_KEY = SUPABASE_CLOUD_ANON_KEY;

const PROD_URL = SUPABASE_CLOUD_URL;
const PROD_ANON_KEY = SUPABASE_CLOUD_ANON_KEY;

// For Node.js / scripts
if (typeof process !== 'undefined' && process.env) {
  envSupabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_CLOUD_URL;
  envSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || SUPABASE_CLOUD_ANON_KEY;
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





