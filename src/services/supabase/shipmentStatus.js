// Shipment Status service - using existing pro table
import { supabase } from './supabaseClient'

export async function getShipmentStatus(proNumber) {
  const { data, error } = await supabase
    .from('pro')
    .select('status, updated_at, updated_by')
    .eq('pro_number', proNumber)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error
  }
  
  return data || { status: 'ongoing', updated_at: null, updated_by: null }
}

export async function updateShipmentStatus(proNumber, newStatus, userId) {
  // Validate status
  const validStatuses = ['ongoing', 'filed_boc', 'completed']
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`)
  }

  // Update the pro table with new status
  const { data, error } = await supabase
    .from('pro')
    .update({
      status: newStatus,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('pro_number', proNumber)
    .select('status, updated_at')
    .single()

  if (error) throw error

  // Log the status change in actions_log
  await supabase
    .from('actions_log')
    .insert({
      user_id: userId,
      action: 'update_shipment_status',
      target_type: 'shipment',
      target_id: proNumber,
      payload: {
        old_status: 'unknown', // We could fetch this if needed
        new_status: newStatus,
        pro_number: proNumber
      }
    })

  return data
}

export async function getAllShipmentStatuses() {
  const { data, error } = await supabase
    .from('pro')
    .select('pro_number, status, updated_at, updated_by')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Helper function to format status for display
export function formatStatusForDisplay(status) {
  const statusMap = {
    'ongoing': 'Ongoing',
    'filed_boc': 'Filed BoC',
    'completed': 'Completed'
  }
  return statusMap[status] || status
}

// Helper function to get status CSS class
export function getStatusClass(status) {
  const classMap = {
    'ongoing': 'status-ongoing',
    'filed_boc': 'status-filed-boc', 
    'completed': 'status-complete'
  }
  return classMap[status] || 'status-pending'
}

// Get status counts for pie chart
export async function getShipmentStatusCounts() {
  const { data, error } = await supabase
    .from('pro')
    .select('status')
    .not('status', 'is', null)

  if (error) throw error

  // Count each status
  const counts = {
    ongoing: 0,
    filed_boc: 0,
    completed: 0
  }

  data.forEach(pro => {
    const status = pro.status || 'ongoing'
    if (counts.hasOwnProperty(status)) {
      counts[status]++
    }
  })

  return counts
}
