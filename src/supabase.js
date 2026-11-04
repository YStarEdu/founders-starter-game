// The Supabase client: how the game talks to your database.
// It only exists once Supabase is connected (see config.js). In local mode it's null.
import { createClient } from "@supabase/supabase-js";
import { LOCAL_MODE, SUPABASE_KEY, SUPABASE_URL } from "./config.js";

export const supabase = LOCAL_MODE
  ? null
  : createClient(SUPABASE_URL, SUPABASE_KEY, {
      // Players never sign in, so there's no session to remember.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
