import { createClient } from '@supabase/supabase-js';

// Production Cloud Database with full data (7,503 daily logs & 17,277 equipment records)
export const SUPABASE_CLOUD_URL = 'https://pabnvxlvrussdfhisxzn.supabase.co';
export const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';

let envSupabaseUrl = SUPABASE_CLOUD_URL;
let envSupabaseAnonKey = SUPABASE_CLOUD_ANON_KEY;

// Check if explicit valid Supabase Cloud URL is passed in Vite or Node environment
try {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const metaUrl = import.meta.env.VITE_SUPABASE_URL;
    const metaKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (metaUrl && metaUrl.includes('supabase.co')) {
      envSupabaseUrl = metaUrl;
    }
    if (metaKey && !metaKey.startsWith('eyJ')) {
      envSupabaseAnonKey = metaKey;
    }
  } else if (typeof process !== 'undefined' && process.env) {
    const procUrl = process.env.VITE_SUPABASE_URL;
    const procKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (procUrl && procUrl.includes('supabase.co')) {
      envSupabaseUrl = procUrl;
    }
    if (procKey && !procKey.startsWith('eyJ')) {
      envSupabaseAnonKey = procKey;
    }
  }
} catch (_e) {
  // Ignore
}

// Fallback safety: ensure URL is always pointing to Supabase Cloud, never local/VPS dead PostgREST
if (!envSupabaseUrl || !envSupabaseUrl.includes('supabase.co')) {
  envSupabaseUrl = SUPABASE_CLOUD_URL;
  envSupabaseAnonKey = SUPABASE_CLOUD_ANON_KEY;
}

export const supabase = createClient(envSupabaseUrl, envSupabaseAnonKey);

// True in dev environment (by hostname or VITE_APP_ENV)
export const IS_DEV_ENV = (typeof window !== 'undefined' && (
  window.location.hostname.includes('dev') || 
  window.location.hostname === 'localhost' || 
  window.location.hostname === '127.0.0.1'
)) || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_ENV === 'dev') || (typeof process !== 'undefined' && process.env?.VITE_APP_ENV === 'dev');
