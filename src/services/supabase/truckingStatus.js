// Trucking Container Status service
import { supabase } from './supabaseClient'

/**
 * Log trucking status action to actions_log table for audit trail
 * @param {Object} params
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.action - Action type: 'trucking_status_changed'
 * @param {string} params.proNumber - PRO number
 * @param {string} params.oldStatus - Previous trucking status
 * @param {string} params.newStatus - New trucking status
 */
export async function logTruckingStatusAction({
  userId,
  proNumber,
  oldStatus,
  newStatus
}) {
  // Validate required fields
  if (!userId || !proNumber) {
    console.warn("⚠️ Skipping trucking status log: missing userId or proNumber", {
      userId,
      proNumber,
    });
    return;
  }

  // Get user details for logging from profiles table
  let userName = 'Unknown User'
  try {
    console.log(`[logTruckingStatusAction] Fetching user name from profiles table for user: ${userId}`)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
    
    if (!profileError && profile?.full_name) {
      userName = profile.full_name
      console.log(`[logTruckingStatusAction] Found user name in profiles: ${userName}`)
    } else {
      console.warn(`[logTruckingStatusAction] Could not fetch user name from profiles:`, profileError)
      // Fallback to user ID if profile not found
      userName = `User ${userId.substring(0, 8)}`
    }
  } catch (err) {
    console.warn('Could not get user details from profiles:', err)
    userName = `User ${userId.substring(0, 8)}`
  }

  // Create notification message based on status change
  let notificationMessage = ''
  if (newStatus === 'completed') {
    notificationMessage = `PRO ${proNumber} moved to Finance Department`
  } else {
    notificationMessage = `PRO ${proNumber} trucking status changed to '${newStatus}'`
  }

  const { error } = await supabase.from("actions_log").insert({
    user_id: userId,
    action: 'trucking_status_changed',
    target_type: 'pro',
    target_id: proNumber,
    payload: {
      pro_number: String(proNumber),
      old_trucking_status: oldStatus,
      new_trucking_status: newStatus,
      notification_message: notificationMessage,
      user_name: userName, // Add username to payload
      updated_at: new Date().toISOString()
    },
  });

  if (error) {
    console.error("❌ Error logging trucking status action:", error);
    // Don't throw - the actual operation was successful
  } else {
    console.log(
      `✅ Logged trucking status action: ${oldStatus} → ${newStatus} for PRO ${proNumber} by ${userName}`
    );
  }
}

export async function getTruckingTableData() {
  console.log('🔍 Fetching trucking table data directly from existing tables...');
  
  // Fetch PROs with 'completed' shipment status and their BOL + DO data
  const { data: prosData, error } = await supabase
    .from('pro')
    .select(`
      pro_number,
      created_at,
      status,
      documents!inner(
        document_type,
        document_fields(
          canonical_key,
          normalized_value,
          raw_value
        )
      )
    `)
    .eq('status', 'completed') // Only show PROs that are completed in shipment
    .in('documents.document_type', ['bill_of_lading', 'delivery_order']) // Both BOL and DO documents
    .eq('documents.department', 'shipment')
    .order('created_at', { ascending: false })

  console.log('📊 PROs query result:', { prosData, error });

  if (error) {
    console.error('❌ Error fetching trucking data:', error);
    throw error;
  }

  console.log(`✅ Found ${prosData?.length || 0} completed PROs`);

  // Normalize consignee name function
  const normalizeConsigneeName = (text) => {
    if (!text) return ''
    const t = String(text).toUpperCase()
    if (t.includes('PUREGOLD')) return 'PUREGOLD'
    if (t.includes('ROBINSON')) return 'ROBINSONS'
    if (t.includes('MOTOSCO') || t.includes('MONTOSCO')) return 'MONTOSCO'
    return ''
  }

  // Transform the data for table display - one row per PRO
  const results = await Promise.all(prosData.map(async pro => {
    // Group documents by type
    const documentsByType = {};
    pro.documents.forEach(doc => {
      if (doc.document_fields) {
        documentsByType[doc.document_type] = doc.document_fields;
      }
    });

    const bolFields = documentsByType.bill_of_lading || [];
    const doFields = documentsByType.delivery_order || [];

    if (bolFields.length === 0) {
      console.log(`⚠️ No BOL document fields found for PRO ${pro.pro_number}`);
      return null;
    }

    // Create field maps for easier access
    const bolFieldMap = {};
    bolFields.forEach(field => {
      bolFieldMap[field.canonical_key] = field.raw_value || field.normalized_value;
    });

    const doFieldMap = {};
    doFields.forEach(field => {
      doFieldMap[field.canonical_key] = field.raw_value || field.normalized_value;
    });

    console.log(`📋 BOL fields for PRO ${pro.pro_number}:`, bolFieldMap);
    console.log(`📋 DO fields for PRO ${pro.pro_number}:`, doFieldMap);
    
    // Extract container numbers and seal numbers from BOL
    const containerSealPairs = bolFieldMap.container_seal_pairs ? 
      JSON.parse(bolFieldMap.container_seal_pairs) : [];
    const containerDisplay = containerSealPairs.map(container => {
      return container.sealNo 
        ? `${container.containerNo} / ${container.sealNo}`
        : container.containerNo
    }).join(', ') || '-';

    // Format detention start date
    const formatDetentionDate = (date) => {
      if (!date) return '-'
      const d = new Date(date)
      const month = d.toLocaleString('default', { month: 'long' })
      const day = d.getDate()
      const year = d.getFullYear()
      return `${month} ${day}, ${year}`
    }

    // Format created date
    const formatCreatedDate = (date) => {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
    }

    const consigneeResult = normalizeConsigneeName(bolFieldMap.consignee) || '-'
    console.log(`[getTruckingTableData] PRO ${pro.pro_number}: consignee raw="${bolFieldMap.consignee}", normalized="${consigneeResult}"`)
    
    // Determine trucking status based on container operations
    const determineTruckingStatus = async (proNumber) => {
      try {
        // First check if we have a persisted trucking_status in the pro table
        const { data: proData, error: proError } = await supabase
          .from('pro')
          .select('trucking_status')
          .eq('pro_number', proNumber)
          .single()
        
        if (!proError && proData?.trucking_status) {
          const statusMap = {
            'ongoing': { status: 'Ongoing', rawStatus: 'ongoing' },
            'completed': { status: 'Completed', rawStatus: 'completed' }
          }
          return statusMap[proData.trucking_status] || { status: 'Ongoing', rawStatus: 'ongoing' }
        }
        
        // Fallback: Check container operations if no persisted status
        const { data: containerOps, error } = await supabase
          .from('container_operations')
          .select('status')
          .eq('pro_number', proNumber)
        
        if (error || !containerOps || containerOps.length === 0) {
          return { status: 'Ongoing', rawStatus: 'ongoing' }
        }
        
        // If all containers are returned, shipment is completed
        const allReturned = containerOps.every(op => op.status === 'returned')
        return allReturned 
          ? { status: 'Completed', rawStatus: 'completed' }
          : { status: 'Ongoing', rawStatus: 'ongoing' }
      } catch (e) {
        console.error(`Error determining trucking status for PRO ${proNumber}:`, e)
        return { status: 'Ongoing', rawStatus: 'ongoing' }
      }
    }
    
    // Determine trucking status based on container operations
    const truckingStatus = await determineTruckingStatus(pro.pro_number)
    
    return {
      id: pro.pro_number,
      proNo: pro.pro_number,
      consigneeName: consigneeResult,
      portOfDischarge: bolFieldMap.port_of_discharge || '-',
      placeOfDelivery: bolFieldMap.place_of_delivery || '-',
      shippingLine: bolFieldMap.shipping_line || '-',
      containerNoSealNo: containerDisplay,
      emptyReturnLocation: doFieldMap.empty_return_location || '-', // From DO
      detentionStart: formatDetentionDate(doFieldMap.detention_free_time_end), // From DO, formatted
      createdOn: formatCreatedDate(pro.created_at),
      status: truckingStatus.status,
      rawStatus: truckingStatus.rawStatus,
      proNumber: pro.pro_number
    }
  }))
  
  // Filter out null values (PROs without BOL documents)
  return results.filter(row => row !== null)
}

export async function getTruckingContainerStatus(containerId) {
  const { data, error } = await supabase
    .from('trucking_container_status')
    .select('status, updated_at, updated_by')
    .eq('id', containerId)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error
  }
  
  return data || { status: 'booking', updated_at: null, updated_by: null }
}

export async function updateTruckingContainerStatus(containerId, newStatus, userId) {
  // Validate status
  const validStatuses = ['booking', 'delivering', 'returned']
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`)
  }

  // Update the trucking container status
  const { data, error } = await supabase
    .from('trucking_container_status')
    .update({
      status: newStatus,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', containerId)
    .select('status, updated_at')
    .single()

  if (error) throw error

  // Log the status change in actions_log
  await supabase
    .from('actions_log')
    .insert({
      user_id: userId,
      action: 'update_trucking_container_status',
      target_type: 'trucking_container',
      target_id: containerId,
      payload: {
        old_status: 'unknown', // We could fetch this if needed
        new_status: newStatus,
        container_id: containerId
      }
    })

  return data
}

export async function getAllTruckingContainerStatuses() {
  const { data, error } = await supabase
    .from('trucking_container_status')
    .select('id, pro_number, container_number, status, updated_at, updated_by')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Helper function to format status for display (individual container statuses)
export function formatStatusForDisplay(status) {
  const statusMap = {
    'booking': 'Booking',
    'delivering': 'Delivering',
    'returned': 'Returned'
  }
  return statusMap[status] || status
}

// Helper function to format trucking completion status for display
export function formatTruckingCompletionStatus(status) {
  const statusMap = {
    'ongoing': 'Ongoing',
    'completed': 'Completed'
  }
  return statusMap[status] || status
}

// Helper function to get trucking completion status CSS class
export function getTruckingCompletionStatusClass(status) {
  const classMap = {
    'ongoing': 'status-ongoing',
    'completed': 'status-complete'
  }
  return classMap[status] || 'status-pending'
}

// Helper function to get status CSS class
export function getTruckingStatusClass(status) {
  const classMap = {
    'booking': 'status-booking',
    'delivering': 'status-delivering', 
    'returned': 'status-returned'
  }
  return classMap[status] || 'status-pending'
}

// Get status counts for pie chart (individual container statuses) - simplified version
export async function getTruckingStatusCounts() {
  // For now, return mock data since we don't have the trucking_container_status table yet
  // This will be updated once we implement the full trucking system
  return {
    booking: 0,
    delivering: 0,
    returned: 0
  }
}

// Get trucking completion counts for pie chart (Ongoing vs Completed) - simplified version
export async function getTruckingCompletionCounts() {
  // For now, return mock data since we don't have the trucking_status column yet
  // This will be updated once we implement the full trucking system
  return {
    ongoing: 1, // Assuming 1 completed shipment is ongoing in trucking
    completed: 0
  }
}

// Update trucking completion status for a PRO
export async function updateTruckingCompletionStatus(proNumber, newStatus, userId) {
  // Validate status
  const validStatuses = ['ongoing', 'completed']
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid trucking status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`)
  }

  console.log(`Attempting to update trucking status for PRO ${proNumber} to ${newStatus}`)

  // Get current status for logging
  const { data: currentPro, error: fetchError } = await supabase
    .from('pro')
    .select('trucking_status')
    .eq('pro_number', proNumber)
    .single()

  const oldStatus = currentPro?.trucking_status || 'ongoing'

  // First, let's check if the trucking_status column exists
  try {
    // Prepare update object
    const updateData = {
      trucking_status: newStatus,
      updated_by: userId,
      updated_at: new Date().toISOString()
    }

    // If setting to completed, also ensure finance_status is set to Unpaid
    if (newStatus === 'completed') {
      updateData.finance_status = 'Unpaid'
    }

    // Try to update the pro table with new trucking status
    const { data, error } = await supabase
      .from('pro')
      .update(updateData)
      .eq('pro_number', proNumber)
      .select('trucking_status, updated_at')
      .single()

    if (error) {
      console.error('Error updating trucking status:', error)
      throw error
    }

    // Log the status change
    await logTruckingStatusAction({
      userId,
      proNumber,
      oldStatus,
      newStatus
    })

    console.log(`Successfully updated trucking status for PRO ${proNumber} to ${newStatus}`)
    return data
  } catch (error) {
    console.error('Error in updateTruckingCompletionStatus:', error)
    
    // If the error is about trucking_status column not existing, provide helpful message
    if (error.message && error.message.includes('trucking_status')) {
      throw new Error(`trucking_status column doesn't exist in pro table. Please run the SQL script: docs/02-architecture/sql/add_trucking_status_to_pro.sql`)
    }
    
    throw error
  }
}

// Check if all containers for a PRO are returned
export async function checkAllContainersReturned(proNumber) {
  const { data, error } = await supabase
    .from('container_operations')
    .select('status')
    .eq('pro_number', proNumber)

  if (error) {
    console.error('Error checking container status:', error)
    return false
  }

  if (!data || data.length === 0) {
    console.log(`[checkAllContainersReturned] No container operations found for PRO ${proNumber}`)
    return false
  }

  const allReturned = data.every(container => container.status === 'returned')
  console.log(`[checkAllContainersReturned] PRO ${proNumber}: ${data.length} containers, all returned: ${allReturned}`)
  
  return allReturned
}

// Get consignee name from BOL data for a specific PRO
export async function getConsigneeNameForPro(proNumber) {
  console.log('[getConsigneeNameForPro] Fetching consignee for PRO:', proNumber)
  
  const { data, error } = await supabase
    .from('documents')
    .select(`
      document_fields(
        canonical_key,
        raw_value,
        normalized_value
      )
    `)
    .eq('pro_number', proNumber)
    .eq('document_type', 'bill_of_lading')
    .eq('department', 'shipment')
    .single()

  console.log('[getConsigneeNameForPro] Query result:', { data, error })

  if (error && error.code !== 'PGRST116') {
    console.error('[getConsigneeNameForPro] Error:', error)
    throw error
  }

  if (!data || !data.document_fields) {
    console.log('[getConsigneeNameForPro] No data or document_fields found')
    return '-'
  }

  console.log('[getConsigneeNameForPro] Document fields:', data.document_fields)

  const consigneeField = data.document_fields.find(field => field.canonical_key === 'consignee')
  console.log('[getConsigneeNameForPro] Consignee field:', consigneeField)
  
  const result = consigneeField?.raw_value || consigneeField?.normalized_value || '-'
  console.log('[getConsigneeNameForPro] Final result:', result)
  
  return result
}

// Update empty return location
export async function updateEmptyReturnLocation(containerId, location, userId) {
  const { data, error } = await supabase
    .from('trucking_container_status')
    .update({
      empty_return_location: location,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', containerId)
    .select('empty_return_location')
    .single()

  if (error) throw error
  return data
}

// Update detention start date
export async function updateDetentionStart(containerId, date, userId) {
  const { data, error } = await supabase
    .from('trucking_container_status')
    .update({
      detention_start: date,
      updated_by: userId,
      updated_at: new Date().toISOString()
    })
    .eq('id', containerId)
    .select('detention_start')
    .single()

  if (error) throw error
  return data
}
