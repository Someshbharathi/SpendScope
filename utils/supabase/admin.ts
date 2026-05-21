import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Booleans only — safe for logs and API diagnostics (never includes secret values). */
export type ServiceRoleEnvStatus = {
  hasSupabaseUrl: boolean;
  hasServiceRoleKey: boolean;
};

/**
 * Reads Supabase service-role env at call time (not module load).
 * Required on Vercel: server-only vars are not available until the function runs.
 */
export function getServiceRoleEnvStatus(): ServiceRoleEnvStatus {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  return {
    hasSupabaseUrl: supabaseUrl.length > 0,
    hasServiceRoleKey: serviceRoleKey.length > 0,
  };
}

/**
 * Service-role client for trusted server routes that must read across all rows (bypasses RLS).
 * Never import this from client components.
 */
export function createServiceRoleClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
