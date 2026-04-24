import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Sanitize URL/Key in case they were accidentally concatenated or contain spaces/quotes
const supabaseUrl = rawUrl.split(/[ \n,;]/)[0].split('.eyJ')[0].replace(/^["']|["']$/g, '').trim();
const supabaseAnonKey = rawKey.split(/[ \n,;]/)[0].replace(/^["']|["']$/g, '').trim();

if (typeof window !== 'undefined') {
  console.log('[Supabase] Initializing client...');
  if (rawUrl !== supabaseUrl) {
    console.warn('[Supabase] URL was malformed/concatenated. Sanitized to:', supabaseUrl);
  }
  if (rawKey !== supabaseAnonKey) {
    console.warn('[Supabase] Anon Key was malformed. Sanitized.');
  }
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Supabase] CRITICAL: Missing configuration! Check your environment variables.');
  } else {
    // Attempt to detect Project ID mismatch
    try {
      const urlRef = supabaseUrl.split('.')[0].replace('https://', '');
      const keyParts = supabaseAnonKey.split('.');
      if (keyParts.length === 3) {
        const payload = JSON.parse(atob(keyParts[1]));
        const keyRef = payload.ref;
        if (keyRef && urlRef && keyRef !== urlRef) {
          console.error(`[Supabase] CREDENTIAL MISMATCH: URL is for project "${urlRef}", but Key is for project "${keyRef}". This will cause 401 errors.`);
        }
      }
    } catch (e) {
      console.warn('[Supabase] Could not verify key/url alignment.');
    }
  }
}

export const isSupabaseConfigured = 
  supabaseUrl !== '' && 
  supabaseAnonKey !== '' && 
  !supabaseUrl.includes('placeholder.supabase.co');

// Use placeholder if not configured to prevent crashes, but isSupabaseConfigured will be false
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
