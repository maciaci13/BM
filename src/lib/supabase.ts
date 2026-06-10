import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import 'react-native-url-polyfill/auto';

const extra = Constants.expoConfig?.extra ?? {};
export const SUPABASE_URL: string = extra.supabaseUrl;
const SUPABASE_ANON_KEY: string = extra.supabaseAnonKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

export type Profile = {
  id: string;
  display_name: string | null;
  language: 'bg' | 'en';
  skin_type: string | null;
  skin_concerns: string[] | null;
  allergies: string[] | null;
  current_skin_analysis: any;
  onboarding_completed: boolean | null;
};

export async function getProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', auth.user.id).maybeSingle();
  if (data) return data as Profile;
  // self-heal: create profile row if the signup trigger is missing
  const fallback = {
    id: auth.user.id,
    display_name: (auth.user.user_metadata?.full_name as string) ?? auth.user.email?.split('@')[0] ?? null,
  };
  await supabase.from('profiles').upsert(fallback);
  return { language: 'bg', skin_type: null, skin_concerns: [], allergies: [], current_skin_analysis: null, onboarding_completed: false, ...fallback } as Profile;
}
