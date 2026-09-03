import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para el navegador
export const createClient = () => {
  return createBrowserClient(supabaseUrl, supabaseKey);
};

// Cliente para el servidor (API routes, Server Components)
export const createServerClient = () => {
  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
};

// Cliente con service role (solo para API routes seguras)
export const createServiceClient = () => {
  return createSupabaseClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
};
