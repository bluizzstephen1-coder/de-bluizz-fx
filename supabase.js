// DE.Bluizz FX — Supabase client
// Replace these two values with your own Supabase project values.
// NEVER put a service_role key in frontend code.
const SUPABASE_URL = "https://jpzlepcevvbyburitjyp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DSyTYMXY2WWPLrD-usUuqQ_Amz2Cae5";

window.supabaseClient = (SUPABASE_URL !== "https://jpzlepcevvbyburitjyp.supabase.co")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  : null;
