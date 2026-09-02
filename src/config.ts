/**
 * Public Application Configuration
 * 
 * Unlike .env files (which are ignored by Git), this file is committed to your repository.
 * You can safely place public API keys here (like the Supabase Anon Key) 
 * so they are available immediately after cloning or deploying.
 */

export const config = {
  supabase: {
    // Replace with your Supabase Project URL (e.g., 'https://xyz.supabase.co')
    url: '',
    // Replace with your Supabase Anon Key (safe to be public in browser clients)
    anonKey: ''
  }
};
