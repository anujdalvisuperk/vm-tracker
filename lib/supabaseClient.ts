import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This helps us debug in the Vercel logs if keys are missing
  console.warn("Supabase credentials are missing. Check your Vercel Environment Variables.");
}
export const supabase = createClient(
  supabaseUrl || 'https://kfkreohqyvlcdqehhfvg.supabase.co', 
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtma3Jlb2hxeXZsY2RxZWhoZnZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0Mjc4ODcsImV4cCI6MjA5NjAwMzg4N30.Iqle_5JI7jKCrE68zTqud9Gc1Ej0yNsHlUaA7GhIg4A'
);