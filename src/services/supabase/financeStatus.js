// Finance Status service
import { supabase } from './supabaseClient'

export async function getFinanceStatus(proNumber) {
  try {
    const { data, error } = await supabase
      .from('pro')
      .select('finance_status')
      .eq('pro_number', proNumber)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error
    }

    return { status: data?.finance_status || 'Unpaid' }
  } catch (error) {
    console.error('Error fetching finance status:', error)
    return { status: 'Unpaid' }
  }
}

export async function updateFinanceStatus(proNumber, newStatus, userId) {
  // Validate status
  const validStatuses = ['Unpaid', 'Paid']
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`)
  }

  try {
    const { error } = await supabase
      .from('pro')
      .update({
        finance_status: newStatus,
        updated_by: userId,
        updated_at: new Date().toISOString()
      })
      .eq('pro_number', proNumber)

    if (error) throw error

    return { success: true, proNumber, status: newStatus }
  } catch (error) {
    console.error('Error updating finance status:', error)
    throw error
  }
}
