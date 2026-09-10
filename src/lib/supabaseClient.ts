import { createClient } from '@supabase/supabase-js';

const metaEnv = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const supabaseUrl =
  metaEnv.VITE_SUPABASE_URL ||
  'https://wnsfvbzdcszvswfytjnu.supabase.co';

const supabaseAnonKey =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Induc2Z2YnpkY3N6dnN3Znl0am51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNDQ1NTcsImV4cCI6MjEwNDYyMDU1N30.rEPKiUXCp6uPulR-_m3fCNLK78lYsRGd59_pqwywJmc';


export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
