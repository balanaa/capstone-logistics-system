import { supabase } from '../services/supabase/client';

export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('test_table').select('*').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connection successful:', data);
    return true;
  } catch (err) {
    console.error('❌ Supabase connection threw:', err);
    return false;
  }
}

 