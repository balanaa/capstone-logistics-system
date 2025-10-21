// Date formatting utilities

/**
 * Format a date string or Date object to "Month DD, YYYY" format
 * Examples:
 * - "2025-04-15" → "April 15, 2025"
 * - "2025-01-05" → "January 5, 2025"
 * @param {string|Date} dateValue - Date in YYYY-MM-DD format or Date object
 * @returns {string} Formatted date string
 */
export function formatDateDisplay(dateValue) {
  if (!dateValue) return ''
  
  try {
    let date
    if (typeof dateValue === 'string') {
      // Handle YYYY-MM-DD format
      date = new Date(dateValue + 'T00:00:00')
    } else {
      date = new Date(dateValue)
    }
    
    if (isNaN(date.getTime())) return dateValue // Return original if invalid
    
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    const month = months[date.getMonth()]
    const day = date.getDate() // Already returns without leading zero (1-31)
    const year = date.getFullYear()
    
    return `${month} ${day}, ${year}`
  } catch (e) {
    return dateValue // Return original if error
  }
}

/**
 * Format a timestamp to display date and time
 * Examples:
 * - "2025-02-20T15:45:30.000Z" → "February 20, 2025 at 3:45 PM"
 * @param {string|Date} timestamp - ISO timestamp or Date object
 * @returns {string} Formatted datetime string
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return ''
  
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return timestamp

    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' }
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true }
    
    const datePart = date.toLocaleDateString('en-US', dateOptions)
    const timePart = date.toLocaleTimeString('en-US', timeOptions)
    
    return `${datePart} at ${timePart}`
  } catch (e) {
    console.error('Error formatting datetime:', e)
    return timestamp
  }
}
