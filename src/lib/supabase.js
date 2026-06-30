import { createClient } from "@supabase/supabase-js";

// These come from your Supabase project (Settings -> API).
// In Astro, any env var prefixed PUBLIC_ is safely exposed to the browser.
// The anon key is meant to be public — your data is protected by the
// Row Level Security rules in supabase-setup.sql, not by hiding the key.
const url = import.meta.env.PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(url, key);

// Used to show a friendly "you still need to configure this" message
// instead of silently failing on first run.
export const isConfigured =
  !!import.meta.env.PUBLIC_SUPABASE_URL &&
  !!import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
