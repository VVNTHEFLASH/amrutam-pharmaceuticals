import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { secureStorage } from './secureStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if credentials are present.
// Note: During local unit tests or CI runner, checking the URL pattern is a good way to see if Supabase is properly configured.
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_project_url' &&
  !supabaseUrl.includes('dummyurl')
);

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    return secureStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await secureStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await secureStorage.removeItem(key);
  },
};

export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: customStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : (null as unknown as SupabaseClient<Database>);



