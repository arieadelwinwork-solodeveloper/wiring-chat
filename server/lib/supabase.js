import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let adminClient = null;

export function getSupabaseAdmin() {
  if (!env.supabaseUrl || !env.supabaseServiceKey) {
    return null;
  }
  if (!adminClient) {
    adminClient = createClient(env.supabaseUrl, env.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export function getSupabaseForUser(accessToken) {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return null;
  }
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
