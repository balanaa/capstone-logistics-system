// Container Operations Service
import { supabase } from './supabaseClient'

/**
 * Log container operation action to actions_log table for audit trail
 * @param {Object} params
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.action - Action type: 'container_status_changed', 'container_details_updated'
 * @param {string} params.containerId - Container operation UUID
 * @param {string} params.proNumber - PRO number
 * @param {string} params.containerNumber - Container number
 * @param {Object} params.payload - Additional context data
 */
export async function logContainerAction({
  userId,
  action,
  containerId,
  proNumber,
  containerNumber,
  payload = {}
}) {
  // Validate required fields
  if (!userId || !containerId) {
    console.warn("⚠️ Skipping container action log: missing userId or containerId", {
      userId,
      containerId,
    });
    return;
  }

  // Get user details for logging from profiles table
  let userName = 'Unknown User'
  try {
    console.log(`[logContainerAction] Fetching user name from profiles table for user: ${userId}`)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
    
    if (!profileError && profile?.full_name) {
      userName = profile.full_name
      console.log(`[logContainerAction] Found user name in profiles: ${userName}`)
    } else {
      console.warn(`[logContainerAction] Could not fetch user name from profiles:`, profileError)
      // Fallback to user ID if profile not found
      userName = `User ${userId.substring(0, 8)}`
    }
  } catch (err) {
    console.warn('Could not get user details from profiles:', err)
    userName = `User ${userId.substring(0, 8)}`
  }

  const { error } = await supabase.from("actions_log").insert({
    user_id: userId,
    action: action,
    target_type: "container_operation",
    target_id: containerId,
    payload: {
      pro_number: String(proNumber),
      container_number: String(containerNumber),
      user_name: userName, // Add username to payload
      ...payload
    },
  });

  if (error) {
    console.error("❌ Error logging container action:", error);
    // Don't throw - the actual operation was successful
  } else {
    console.log(
      `✅ Logged container action: ${action} for container ${containerNumber} (${containerId}) by ${userName}`
    );
  }
}

// Fetch container operations for a specific PRO
export async function getContainerOperations(proNumber) {
  const { data, error } = await supabase
    .from('container_operations')
    .select('*')
    .eq('pro_number', proNumber)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching container operations:', error)
    throw error
  }

  return data || []
}

// Create a new container operation
export async function createContainerOperation(proNumber, containerData) {
  const { data, error } = await supabase
    .from('container_operations')
    .insert({
      pro_number: proNumber,
      container_number: containerData.container_number,
      seal_number: containerData.seal_number || null,
      departure_date_from_port: containerData.departure_date_from_port || null,
      driver: containerData.driver || null,
      truck_plate_number: containerData.truck_plate_number || null,
      chassis_number: containerData.chassis_number || null,
      date_of_return_to_yard: containerData.date_of_return_to_yard || null,
      status: containerData.status || 'booking'
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating container operation:', error)
    throw error
  }

  return data
}

// Update a container operation
export async function updateContainerOperation(operationId, updates, userId = null) {
  // Get current user if not provided
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }

  // Get the container operation details for logging
  const { data: currentOperation, error: fetchError } = await supabase
    .from('container_operations')
    .select('pro_number, container_number, status, driver, departure_date_from_port, date_of_return_to_yard')
    .eq('id', operationId)
    .single()

  if (fetchError) {
    console.error('Error fetching container operation for logging:', fetchError)
  }

  const { data, error } = await supabase
    .from('container_operations')
    .update(updates)
    .eq('id', operationId)
    .select()
    .single()

  if (error) {
    console.error('Error updating container operation:', error)
    throw error
  }

  // Log the action if we have user and operation details
  if (userId && currentOperation) {
    // Determine what type of update this is
    if (updates.status && updates.status !== currentOperation.status) {
      // Status change
      await logContainerAction({
        userId,
        action: 'container_status_changed',
        containerId: operationId,
        proNumber: currentOperation.pro_number,
        containerNumber: currentOperation.container_number,
        payload: {
          old_status: currentOperation.status,
          new_status: updates.status,
          notification_message: `Container ${currentOperation.container_number} status changed to '${updates.status}'`
        }
      })
    } else {
      // Details update (driver, dates, etc.)
      const changedFields = Object.keys(updates).filter(key => 
        updates[key] !== currentOperation[key] && 
        ['driver', 'departure_date_from_port', 'date_of_return_to_yard', 'truck_plate_number'].includes(key)
      )
      
      if (changedFields.length > 0) {
        await logContainerAction({
          userId,
          action: 'container_details_updated',
          containerId: operationId,
          proNumber: currentOperation.pro_number,
          containerNumber: currentOperation.container_number,
          payload: {
            changed_fields: changedFields,
            old_values: changedFields.reduce((acc, field) => {
              acc[field] = currentOperation[field]
              return acc
            }, {}),
            new_values: changedFields.reduce((acc, field) => {
              acc[field] = updates[field]
              return acc
            }, {}),
            notification_message: `Container ${currentOperation.container_number} details updated`
          }
        })
      }
    }
  }

  return data
}

// Delete a container operation
export async function deleteContainerOperation(operationId) {
  const { error } = await supabase
    .from('container_operations')
    .delete()
    .eq('id', operationId)

  if (error) {
    console.error('Error deleting container operation:', error)
    throw error
  }

  return true
}

// Get container/seal pairs from BOL for auto-generation
export async function getBolContainerPairs(proNumber) {
  console.log('[getBolContainerPairs] Looking for BOL for PRO:', proNumber)
  
  const { data, error } = await supabase
    .from('documents')
    .select(`
      id,
      document_type,
      department,
      document_fields (
        canonical_key,
        raw_value
      )
    `)
    .eq('pro_number', proNumber)
    .eq('document_type', 'bill_of_lading')

  if (error) {
    console.error('Error fetching BOL container pairs:', error)
    return []
  }

  console.log('[getBolContainerPairs] Found documents:', data)

  if (!data || data.length === 0) {
    console.log('[getBolContainerPairs] No BOL documents found')
    return []
  }

  // Find the BOL document (should be in shipment department)
  const bolDoc = data.find(doc => doc.document_type === 'bill_of_lading')
  
  if (!bolDoc?.document_fields) {
    console.log('[getBolContainerPairs] No document fields found')
    return []
  }

  console.log('[getBolContainerPairs] BOL document fields:', bolDoc.document_fields)

  const containerPairsField = bolDoc.document_fields.find(
    field => field.canonical_key === 'container_seal_pairs'
  )

  if (!containerPairsField?.raw_value) {
    console.log('[getBolContainerPairs] No container_seal_pairs field found')
    return []
  }

  console.log('[getBolContainerPairs] Raw container pairs value:', containerPairsField.raw_value)

  try {
    const pairs = JSON.parse(containerPairsField.raw_value)
    console.log('[getBolContainerPairs] Parsed pairs:', pairs)
    return Array.isArray(pairs) ? pairs : []
  } catch (e) {
    console.error('Error parsing container pairs:', e)
    return []
  }
}

// Auto-generate container operations from BOL data
export async function generateContainerOperationsFromBol(proNumber) {
  try {
    console.log('[generateContainerOperationsFromBol] Starting for PRO:', proNumber)
    
    // Check if operations already exist
    const existing = await getContainerOperations(proNumber)
    if (existing.length > 0) {
      console.log('[generateContainerOperationsFromBol] Container operations already exist for PRO:', proNumber)
      return existing
    }

    // Get BOL container pairs
    const bolPairs = await getBolContainerPairs(proNumber)
    console.log('[generateContainerOperationsFromBol] BOL pairs found:', bolPairs)
    
    if (bolPairs.length === 0) {
      console.log('[generateContainerOperationsFromBol] No BOL container pairs found for PRO:', proNumber)
      return []
    }

    // Create operations for each pair
    const operations = []
    for (const pair of bolPairs) {
      if (pair.containerNo) {
        console.log('[generateContainerOperationsFromBol] Creating operation for container:', pair.containerNo)
        const operation = await createContainerOperation(proNumber, {
          container_number: pair.containerNo,
          seal_number: pair.sealNo || null
        })
        operations.push(operation)
      }
    }

    console.log(`[generateContainerOperationsFromBol] Generated ${operations.length} container operations for PRO:`, proNumber)
    return operations
  } catch (error) {
    console.error('[generateContainerOperationsFromBol] Error generating container operations:', error)
    throw error
  }
}

// Format date for display (MM/DD/YY)
export function formatDateForDisplay(dateString) {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const year = String(date.getFullYear()).slice(-2)
    return `${month}/${day}/${year}`
  } catch (e) {
    return dateString
  }
}

// Parse date from MM/DD/YY format
export function parseDateFromInput(inputString) {
  if (!inputString || inputString.trim() === '') return null
  
  try {
    // Handle MM/DD/YY format
    const match = inputString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
    if (match) {
      let [, month, day, year] = match
      
      // Convert 2-digit year to 4-digit
      if (year.length === 2) {
        const currentYear = new Date().getFullYear()
        const currentCentury = Math.floor(currentYear / 100) * 100
        year = parseInt(year) + currentCentury
      }
      
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
    }
    
    // Try parsing as-is
    const date = new Date(inputString)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
    
    return null
  } catch (e) {
    console.error('Error parsing date:', e)
    return null
  }
}

// Get status counts for Container Status Pie Chart
export async function getContainerOperationsStatusCounts() {
  const { data, error } = await supabase
    .from('container_operations')
    .select('status')

  if (error) {
    console.error('Error fetching container operations status counts:', error)
    throw error
  }

  const counts = {
    booking: 0,
    delivering: 0,
    returned: 0
  }

  data.forEach(operation => {
    if (operation.status && counts.hasOwnProperty(operation.status)) {
      counts[operation.status]++
    }
  })

  console.log('[getContainerOperationsStatusCounts] Status counts:', counts)
  return counts
}

// Get completion counts for Trucking Pie Chart - based on trucking table data
export async function getContainerOperationsCompletionCounts() {
  // Import the trucking table data function
  const { getTruckingTableData } = await import('./truckingStatus')
  
  try {
    const truckingData = await getTruckingTableData()
    
    const counts = {
      ongoing: 0,
      completed: 0
    }

    // Count based on the status from trucking table data
    // Note: getTruckingTableData already filters out null values
    truckingData.forEach(row => {
      if (row && row.rawStatus === 'completed') {
        counts.completed++
      } else if (row && row.rawStatus) {
        counts.ongoing++
      }
    })

    console.log('[getContainerOperationsCompletionCounts] Trucking completion counts:', counts)
    return counts
  } catch (error) {
    console.error('Error fetching trucking completion counts:', error)
    throw error
  }
}
