// Supabase client wrapper - replaces Firebase
import { supabase } from '@/integrations/supabase/client';

// Export supabase as db for Firebase compatibility
export const db = supabase;
export const auth = supabase.auth;
export const storage = supabase.storage;

// Re-export supabase functions
export { supabase };
