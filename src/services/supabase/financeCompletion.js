// Finance completion counts service
import { supabase } from './supabaseClient'

export async function getFinanceCompletionCounts() {
  try {
    console.log('🔍 Fetching finance completion counts...');
    
    // Get counts of PROs by finance status
    const { data, error } = await supabase
      .from('pro')
      .select('finance_status')
      .eq('trucking_status', 'completed') // Only count PROs that are completed in trucking
    
    if (error) {
      console.error('❌ Error fetching finance completion counts:', error);
      throw error;
    }

    // Count by finance status
    const counts = {
      unpaid: 0,
      paid: 0
    };

    data.forEach(pro => {
      const status = pro.finance_status || 'Unpaid';
      if (status.toLowerCase() === 'paid') {
        counts.paid++;
      } else {
        counts.unpaid++;
      }
    });

    console.log('📊 Finance completion counts:', counts);
    return counts;
  } catch (error) {
    console.error('❌ Error in getFinanceCompletionCounts:', error);
    throw error;
  }
}
