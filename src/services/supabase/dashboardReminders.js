// Dashboard Reminders Service - Mock Data Implementation
// This service simulates fetching reminders from a future reminders system
// Future: Replace mock data with real Supabase queries from reminders table

/**
 * Format reminder deadline relative to now
 * @param {string|Date} deadline - The deadline timestamp
 * @returns {string} Formatted relative deadline
 */
export function formatReminderDeadline(deadline) {
  const now = new Date();
  const due = new Date(deadline);
  const diffMs = due - now;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // If deadline is in the past
  if (diffMs < 0) {
    const absDiffMs = Math.abs(diffMs);
    const absDiffSeconds = Math.floor(absDiffMs / 1000);
    const absDiffMinutes = Math.floor(absDiffSeconds / 60);
    const absDiffHours = Math.floor(absDiffMinutes / 60);
    const absDiffDays = Math.floor(absDiffHours / 24);
    
    if (absDiffSeconds < 60) return `Overdue by ${absDiffSeconds} second${absDiffSeconds !== 1 ? 's' : ''}`;
    if (absDiffMinutes < 60) return `Overdue by ${absDiffMinutes} minute${absDiffMinutes !== 1 ? 's' : ''}`;
    if (absDiffHours < 24) return `Overdue by ${absDiffHours} hour${absDiffHours !== 1 ? 's' : ''}`;
    return `Overdue by ${absDiffDays} day${absDiffDays !== 1 ? 's' : ''}`;
  }
  
  // If deadline is now
  if (diffMs === 0) return 'Due now';
  
  // If deadline is in the future
  if (diffSeconds < 60) return `Due in ${diffSeconds} second${diffSeconds !== 1 ? 's' : ''}`;
  if (diffMinutes < 60) return `Due in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `Due in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

/**
 * Group reminders by urgency level
 * @param {Array} reminders - Array of reminder objects
 * @returns {Object} Grouped reminders by urgency
 */
export function groupRemindersByUrgency(reminders) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  
  return reminders.reduce((groups, reminder) => {
    const dueDate = new Date(reminder.dueDate);
    
    if (dueDate < now) {
      groups.overdue.push(reminder);
    } else if (dueDate < tomorrow) {
      groups.today.push(reminder);
    } else {
      groups.upcoming.push(reminder);
    }
    
    return groups;
  }, { overdue: [], today: [], upcoming: [] });
}

/**
 * Generate mock reminders data from all departments
 * @returns {Array} Array of mock reminder objects
 */
function generateMockReminders() {
  const departments = [
    {
      name: 'shipment',
      reminders: [
        { type: 'document_approval_needed', title: 'BOL approval needed', description: 'Bill of Lading requires approval' },
        { type: 'invoice_verification', title: 'Invoice verification pending', description: 'Invoice needs verification' },
        { type: 'document_upload', title: 'Packing list upload required', description: 'Packing list document missing' },
        { type: 'eta_update', title: 'ETA update needed', description: 'Estimated arrival time needs update' }
      ]
    },
    {
      name: 'trucking',
      reminders: [
        { type: 'container_return', title: 'Container return deadline', description: 'Container must be returned to yard' },
        { type: 'driver_assignment', title: 'Driver assignment needed', description: 'No driver assigned to container' },
        { type: 'booking_confirmation', title: 'Booking confirmation pending', description: 'Container booking needs confirmation' },
        { type: 'route_update', title: 'Route update required', description: 'Delivery route needs update' }
      ]
    },
    {
      name: 'finance',
      reminders: [
        { type: 'payment_followup', title: 'Payment follow-up', description: 'Payment overdue, follow-up required' },
        { type: 'receipt_upload', title: 'Receipt upload required', description: 'Service receipt needs to be uploaded' },
        { type: 'invoice_generation', title: 'Invoice generation needed', description: 'Invoice needs to be generated' },
        { type: 'payment_confirmation', title: 'Payment confirmation pending', description: 'Payment confirmation required' }
      ]
    }
  ];

  const proNumbers = [
    'PRO-2025001', 'PRO-2025002', 'PRO-2025003', 'PRO-2025004', 'PRO-2025005',
    'PRO-2025006', 'PRO-2025007', 'PRO-2025008', 'PRO-2025009', 'PRO-2025010'
  ];

  const priorities = ['low', 'normal', 'high', 'urgent'];
  const assignedUsers = [
    'John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'David Brown', 'Lisa Davis'
  ];

  const reminders = [];
  const now = new Date();
  let reminderId = 1;

  departments.forEach(dept => {
    dept.reminders.forEach(reminderTemplate => {
      // Create 2-3 reminders per type
      const count = Math.floor(Math.random() * 2) + 2;
      
      for (let i = 0; i < count; i++) {
        const proNumber = proNumbers[Math.floor(Math.random() * proNumbers.length)];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];
        const assignedTo = assignedUsers[Math.floor(Math.random() * assignedUsers.length)];
        
        // Generate due date (mix of overdue, today, upcoming)
        let dueDate;
        const random = Math.random();
        if (random < 0.2) {
          // 20% overdue (1-3 days ago)
          const daysAgo = Math.floor(Math.random() * 3) + 1;
          dueDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
        } else if (random < 0.4) {
          // 20% due today
          dueDate = new Date(now.getTime() + Math.random() * 24 * 60 * 60 * 1000);
        } else {
          // 60% upcoming (1-7 days)
          const daysAhead = Math.floor(Math.random() * 7) + 1;
          dueDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
        }

        const reminder = {
          id: `reminder-${reminderId++}`,
          proNumber,
          department: dept.name,
          reminderType: reminderTemplate.type,
          title: reminderTemplate.title,
          description: reminderTemplate.description,
          dueDate: dueDate.toISOString(),
          priority,
          status: 'active',
          assignedTo,
          createdBy: 'System',
          createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        };

        reminder.relativeDeadline = formatReminderDeadline(reminder.dueDate);
        reminders.push(reminder);
      }
    });
  });

  // Sort by due date (earliest first)
  return reminders.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

/**
 * Fetch all reminders from all departments (mock implementation)
 * @returns {Promise<Array>} Array of all reminders
 */
export async function getAllReminders() {
  try {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const reminders = generateMockReminders();
    
    console.log(`📋 Dashboard Reminders: Fetched ${reminders.length} reminders`);
    return reminders;
  } catch (error) {
    console.error('❌ Error fetching reminders:', error);
    throw error;
  }
}

/**
 * Get reminders count by department
 * @returns {Promise<Object>} Department reminder counts
 */
export async function getRemindersCountByDepartment() {
  try {
    const reminders = await getAllReminders();
    
    const counts = reminders.reduce((acc, reminder) => {
      acc[reminder.department] = (acc[reminder.department] || 0) + 1;
      return acc;
    }, {});

    return {
      shipment: counts.shipment || 0,
      trucking: counts.trucking || 0,
      finance: counts.finance || 0,
      total: reminders.length
    };
  } catch (error) {
    console.error('❌ Error fetching reminders count:', error);
    return { shipment: 0, trucking: 0, finance: 0, total: 0 };
  }
}

/**
 * Get reminders count by urgency
 * @returns {Promise<Object>} Urgency reminder counts
 */
export async function getRemindersCountByUrgency() {
  try {
    const reminders = await getAllReminders();
    const grouped = groupRemindersByUrgency(reminders);
    
    return {
      overdue: grouped.overdue.length,
      today: grouped.today.length,
      upcoming: grouped.upcoming.length,
      total: reminders.length
    };
  } catch (error) {
    console.error('❌ Error fetching urgency counts:', error);
    return { overdue: 0, today: 0, upcoming: 0, total: 0 };
  }
}
