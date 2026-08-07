import { createClient } from '@supabase/supabase-js';

let envSupabaseUrl;
let envSupabaseAnonKey;

// For Vercel Serverless Functions (Node.js)
if (typeof process !== 'undefined' && process.env) {
  envSupabaseUrl = process.env.VITE_SUPABASE_URL;
  envSupabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
}

// For Vite Client (Browser)
// Vite replaces `import.meta.env.VITE_...` statically at build time.
// We use a try-catch to avoid crashing in environments where import.meta is undefined.
try {
  if (!envSupabaseUrl && import.meta && import.meta.env) {
    envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  }
  if (!envSupabaseAnonKey && import.meta && import.meta.env) {
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

// True when the app was built with VITE_APP_ENV=dev (devpmreg5 server)
// False (or undefined) for production builds (pmreg5 server)
export const IS_DEV_ENV = (() => {
  try {
    return import.meta?.env?.VITE_APP_ENV === 'dev';
  } catch {
    return false;
  }
})();

