// Number formatting utilities

/**
 * Format a number to display with exactly 2 decimal places
 * Always rounds to 2 decimal places to avoid floating-point precision issues
 * Examples:
 * - 100 → "100.00"
 * - 100.5 → "100.50"
 * - 100.567 → "100.57"
 * - 100.5678 → "100.57"
 * - 23861.719999999998 → "23861.72"
 * @param {number|string} value - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(value) {
  if (value === null || value === undefined || value === '') return ''
  
  const num = Number(value)
  if (!Number.isFinite(num)) return value
  
  // Always round to 2 decimal places to avoid floating-point precision issues
  return num.toFixed(2)
}

