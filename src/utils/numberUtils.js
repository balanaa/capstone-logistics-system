// Number formatting utilities

/**
 * Format a number to display with at least 2 decimal places
 * Preserves more decimals if they exist (e.g., 3 decimals)
 * Examples:
 * - 100 → "100.00"
 * - 100.5 → "100.50"
 * - 100.567 → "100.567"
 * - 100.5678 → "100.5678"
 * @param {number|string} value - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  
  // Convert to string to check decimal places
  const str = num.toString()
  const decimalIndex = str.indexOf('.')
  
  if (decimalIndex === -1) {
    // No decimals, add .00
    return num.toFixed(2)
  }
  
  const decimalPlaces = str.length - decimalIndex - 1
  
  if (decimalPlaces < 2) {
    // Less than 2 decimals, show 2
    return num.toFixed(2)
  }
  
  // 2 or more decimals, keep as is
  return str
}

