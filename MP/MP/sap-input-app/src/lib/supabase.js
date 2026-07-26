import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL
  ? process.env.VITE_SUPABASE_URL
  : (import.meta.env && import.meta.env.VITE_SUPABASE_URL);

const supabaseAnonKey = typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY
  ? process.env.VITE_SUPABASE_ANON_KEY
  : (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not set. Running in localStorage fallback mode.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
