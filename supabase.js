const SUPABASE_URL = "https://jpzlepcevvbyburitjyp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_DSyTYMXY2WWPLrD-usUuqQ_Amz2Cae5";

if (!window.supabase) {
  console.error("Supabase library was not loaded.");
  window.supabaseClient = null;
} else {
  window.supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
}
