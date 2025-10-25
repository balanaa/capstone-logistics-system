// Dashboard Actions Service - Real Implementation
// This service fetches recent actions from the actions_log table
import { supabase } from './supabaseClient';

/**
 * Format relative time dynamically (seconds/minutes/hours/days ago)
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted relative time
 */
export function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 60) return `${diffSeconds} second${diffSeconds !== 1 ? 's' : ''} ago`;
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

/**
 * Map action type to user-friendly description
 * @param {Object} logEntry - Raw log entry from actions_log table
 * @returns {string} Human-readable action description
 */
function formatActionDescription(logEntry) {
  const { action, payload } = logEntry;
  const proNumber = payload?.pro_number || 'Unknown PRO';
  const containerNumber = payload?.container_number;
  const documentType = payload?.document_type;
  const notificationMessage = payload?.notification_message;
  
  // Use notification message if available (most descriptive)
  if (notificationMessage) {
    return notificationMessage;
  }
  
  // Map action types to descriptions
  switch (action) {
    case 'document_file_uploaded':
      return `${documentType ? documentType.replace('_', ' ').toUpperCase() : 'Document'} uploaded for ${proNumber}`;
    case 'document_data_uploaded':
      return `${documentType ? documentType.replace('_', ' ').toUpperCase() : 'Document'} data uploaded for ${proNumber}`;
    case 'document_file_replaced':
      return `${documentType ? documentType.replace('_', ' ').toUpperCase() : 'Document'} file replaced for ${proNumber}`;
    case 'document_data_updated':
      return `${documentType ? documentType.replace('_', ' ').toUpperCase() : 'Document'} data updated for ${proNumber}`;
    case 'document_deleted':
      return `${documentType ? documentType.replace('_', ' ').toUpperCase() : 'Document'} deleted for ${proNumber}`;
    case 'container_status_changed':
      return `Container ${containerNumber ? containerNumber + ' ' : ''}status changed for ${proNumber}`;
    case 'container_details_updated':
      return `Container ${containerNumber ? containerNumber + ' ' : ''}details updated for ${proNumber}`;
    case 'trucking_status_changed':
      return `Trucking status changed for ${proNumber}`;
    default:
      return `Action performed on ${proNumber}`;
  }
}

/**
 * Determine department based on action type and payload
 * @param {Object} logEntry - Raw log entry from actions_log table
 * @returns {string} Department name
 */
function determineDepartment(logEntry) {
  const { action, payload } = logEntry;
  
  // Check if department is explicitly set in payload
  if (payload?.department) {
    return payload.department;
  }
  
  // Map action types to departments
  switch (action) {
    case 'document_file_uploaded':
    case 'document_data_uploaded':
    case 'document_file_replaced':
    case 'document_data_updated':
    case 'document_deleted':
      return 'shipment';
    case 'container_status_changed':
    case 'container_details_updated':
      return 'shipment';
    case 'trucking_status_changed':
      return 'trucking';
    default:
      return 'shipment';
  }
}

/**
 * Fetch recent actions from actions_log table
 * @param {number} limit - Number of actions to fetch
 * @returns {Promise<Array>} Array of recent actions
 */
export async function getRecentActions(limit = 20) {
  try {
    console.log(`📊 Dashboard Actions: Fetching ${limit} recent actions from actions_log table`);
    
    // Fetch recent actions from actions_log table
    const { data: logs, error } = await supabase
      .from('actions_log')
      .select(`
        id,
        created_at,
        action,
        target_type,
        target_id,
        payload,
        user_id
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching actions from actions_log:', error);
      throw error;
    }

    if (!logs || logs.length === 0) {
      console.log('📭 No actions found in actions_log table');
      return [];
    }

    // Transform raw log entries into dashboard format
    const actions = logs.map(log => {
      const userName = log.payload?.user_name || 'Unknown User';
      const department = determineDepartment(log);
      const description = formatActionDescription(log);
      const relativeTime = formatRelativeTime(log.created_at);

      return {
        id: log.id,
        actionType: log.action,
        targetType: log.target_type,
        targetId: log.target_id,
        department: department,
        userName: userName,
        userEmail: log.payload?.user_email || '',
        createdAt: log.created_at,
        description: description,
        relativeTime: relativeTime,
        payload: log.payload
      };
    });

    console.log(`✅ Dashboard Actions: Successfully fetched ${actions.length} actions`);
    return actions;
    
  } catch (error) {
    console.error('❌ Error fetching recent actions:', error);
    throw error;
  }
}

/**
 * Get actions count by department (for statistics)
 * @returns {Promise<Object>} Department action counts
 */
export async function getActionsCountByDepartment() {
  try {
    const actions = await getRecentActions(50); // Get more for better stats
    
    const counts = actions.reduce((acc, action) => {
      acc[action.department] = (acc[action.department] || 0) + 1;
      return acc;
    }, {});

    return {
      shipment: counts.shipment || 0,
      trucking: counts.trucking || 0,
      finance: counts.finance || 0,
      verifier: counts.verifier || 0,
      total: actions.length
    };
  } catch (error) {
    console.error('❌ Error fetching actions count:', error);
    return { shipment: 0, trucking: 0, finance: 0, verifier: 0, total: 0 };
  }
}
