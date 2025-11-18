// Re-export client-side Supabase client (safe for client components)
export { supabase, createClient } from './supabase-client';

// Re-export server-side Supabase client (for server components and API routes)
export { createSupabaseServerClient } from './supabase-server';
