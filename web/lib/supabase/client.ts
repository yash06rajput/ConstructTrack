"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Browser-safe Supabase client. Uses the anon key only — never the
 * service-role key. Safe to import from client components.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.example to .env and fill in your Supabase project credentials.",
    );
  }

  return createClient(url, anonKey);
}
