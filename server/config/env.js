import 'dotenv/config';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];

function getEnv(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  return value;
}

function validateEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length && process.env.NODE_ENV === 'production') {
    console.error('[ENV] Missing required variables:', missing.join(', '));
    process.exit(1);
  }
}

validateEnv();

if (getEnv('NODE_ENV', 'development') === 'production' && getEnv('DEV_BYPASS_AUTH', 'false') === 'true') {
  console.error('[ENV] DEV_BYPASS_AUTH tidak boleh aktif di production');
  process.exit(1);
}

export const env = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  port: Number(getEnv('PORT', '3001')),
  supabaseUrl: getEnv('SUPABASE_URL', ''),
  supabaseServiceKey: getEnv('SUPABASE_SERVICE_KEY', ''),
  supabaseAnonKey: getEnv('SUPABASE_ANON_KEY', ''),
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
  devBypassAuth: getEnv('DEV_BYPASS_AUTH', 'false') === 'true',
  devUserId: getEnv('DEV_USER_ID', '00000000-0000-0000-0000-000000000001'),
  devUserRole: getEnv('DEV_USER_ROLE', 'owner'),
  deepseekApiKey: getEnv('DEEPSEEK_API_KEY', ''),
  deepseekModel: getEnv('DEEPSEEK_MODEL', 'deepseek-chat'),
  deepseekBaseUrl: getEnv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com'),
};
