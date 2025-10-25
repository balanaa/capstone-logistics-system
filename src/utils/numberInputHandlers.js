// Global number input handlers for consistent number formatting across all components
// Used for inputs that need number validation, formatting, and spinner removal

/**
 * Format number with commas while preserving caret position
 * @param {string} raw - Raw numeric string
 * @param {number} caretPos - Current caret position
 * @returns {object} - { value: formatted string, caret: new caret position }
 */
const formatWithCommasWhileTyping = (raw, caretPos) => {
  if (!raw) return { value: '', caret: 0 }
  
  // Count commas before caret position
  const beforeCaret = raw.substring(0, caretPos)
  const commasBefore = (beforeCaret.match(/,/g) || []).length
  
  // Remove all commas
  const cleaned = raw.replace(/,/g, '')
  
  // Add commas back
  const parts = cleaned.split('.')
  if (parts[0]) {
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  const newVal = parts.join('.')
  
  // Calculate new caret position
  const commasAfter = (newVal.match(/,/g) || []).length
  const commaDiff = commasAfter - commasBefore
  const newCaret = Math.max(0, Math.min(caretPos + commaDiff, newVal.length))
  
  return { value: newVal, caret: newCaret }
}

/**
 * Handles decimal number inputs with banking-standard precision and caret position
 * Used for: weights, prices, measurements, percentages, financial calculations
 * 
 * Banking Standards:
 * - Supports up to 2 decimal places (changed from 3 for consistency)
 * - Uses proper rounding for financial calculations
 * - Handles floating-point precision issues
 * - Maintains consistency across all financial operations
 * - Preserves caret position during formatting
 * 
 * @param {string} value - The input value
 * @param {function} onChange - Callback function to update the value
 * @param {object} inputRef - Optional ref to the input element for caret positioning
 */
export const handleDecimalNumberInput = (value, onChange, inputRef = null) => {
  // Remove all non-numeric characters except decimal point
  let cleanValue = value.replace(/[^0-9.]/g, '')
  
  // Ensure only one decimal point
  const decimalCount = (cleanValue.match(/\./g) || []).length
  if (decimalCount > 1) {
    cleanValue = cleanValue.replace(/\./g, '').replace(/(\d+)/, '$1.')
  }
  
  // Remove leading zeros except for decimal numbers
  if (cleanValue.length > 1 && cleanValue[0] === '0' && cleanValue[1] !== '.') {
    cleanValue = cleanValue.replace(/^0+/, '')
  }
  
  // Banking-standard decimal precision: limit to 2 decimal places
  // Compliant with ISO 4217 currency standards and GAAP/IFRS requirements
  // NOTE: Changed from 3 to 2 decimal places for consistency
  const DECIMAL_PLACES = 2
  
  if (cleanValue.includes('.')) {
    const parts = cleanValue.split('.')
    if (parts[1] && parts[1].length > DECIMAL_PLACES) {
      // Round to specified decimal places using bankers' rounding (round half to even)
      const numValue = parseFloat(cleanValue.replace(/,/g, ''))
      if (!isNaN(numValue)) {
        // Use bankers' rounding for financial accuracy
        const factor = Math.pow(10, DECIMAL_PLACES)
        const scaledValue = numValue * factor
        const roundedValue = Math.round(scaledValue) / factor
        cleanValue = roundedValue.toFixed(DECIMAL_PLACES)
      }
    }
  }
  
  // Add comma separators for thousands
  if (cleanValue && cleanValue !== '.') {
    const parts = cleanValue.split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    cleanValue = parts.join('.')
  }
  
  onChange(cleanValue)
}

/**
 * Handles decimal number inputs with caret position preservation
 * Enhanced version that maintains caret position during formatting
 * 
 * @param {Event} event - The input event
 * @param {function} onChange - Callback function to update the value
 */
export const handleDecimalNumberInputWithCaret = (event, onChange) => {
  const input = event.target
  const caretPos = input.selectionStart || 0
  const raw = input.value || ''
  
  // Remove all non-numeric characters except decimal point
  let cleaned = raw.replace(/[^0-9.]/g, '')
  
  // Ensure only one decimal point
  const decimalCount = (cleaned.match(/\./g) || []).length
  if (decimalCount > 1) {
    cleaned = cleaned.replace(/\./g, '').replace(/(\d+)/, '$1.')
  }
  
  // Remove leading zeros except for decimal numbers
  if (cleaned.length > 1 && cleaned[0] === '0' && cleaned[1] !== '.') {
    cleaned = cleaned.replace(/^0+/, '')
  }
  
  // Banking-standard decimal precision: limit to 2 decimal places
  const DECIMAL_PLACES = 2
  
  if (cleaned.includes('.')) {
    const parts = cleaned.split('.')
    if (parts[1] && parts[1].length > DECIMAL_PLACES) {
      const numValue = parseFloat(cleaned.replace(/,/g, ''))
      if (!isNaN(numValue)) {
        const factor = Math.pow(10, DECIMAL_PLACES)
        const scaledValue = numValue * factor
        const roundedValue = Math.round(scaledValue) / factor
        cleaned = roundedValue.toFixed(DECIMAL_PLACES)
      }
    }
  }
  
  // Format with commas while preserving caret position
  const result = formatWithCommasWhileTyping(cleaned, caretPos)
  
  if (result.value !== input.value) {
    input.value = result.value
    setTimeout(() => {
      try {
        input.selectionStart = input.selectionEnd = result.caret
      } catch (e) {
        // Ignore selection errors
      }
    }, 0)
  }
  
  onChange(result.value)
}

/**
 * Handles whole number inputs (no decimal points) with caret position
 * Used for: quantities, counts, packages, items
 * 
 * @param {string} value - The input value
 * @param {function} onChange - Callback function to update the value
 */
export const handleWholeNumberInput = (value, onChange) => {
  // Remove all non-numeric characters (no decimal points)
  let cleanValue = value.replace(/[^0-9]/g, '')
  
  // Remove leading zeros
  if (cleanValue.length > 1 && cleanValue[0] === '0') {
    cleanValue = cleanValue.replace(/^0+/, '')
  }
  
  // Add comma separators for thousands
  if (cleanValue) {
    cleanValue = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }
  
  onChange(cleanValue)
}

/**
 * Handles whole number inputs with caret position preservation
 * Enhanced version that maintains caret position during formatting
 * 
 * @param {Event} event - The input event
 * @param {function} onChange - Callback function to update the value
 */
export const handleWholeNumberInputWithCaret = (event, onChange) => {
  const input = event.target
  const caretPos = input.selectionStart || 0
  const raw = input.value || ''
  
  // Remove all non-numeric characters (no decimal points)
  let cleaned = raw.replace(/[^0-9]/g, '')
  
  // Remove leading zeros
  if (cleaned.length > 1 && cleaned[0] === '0') {
    cleaned = cleaned.replace(/^0+/, '')
  }
  
  // Format with commas while preserving caret position
  const result = formatWithCommasWhileTyping(cleaned, caretPos)
  
  if (result.value !== input.value) {
    input.value = result.value
    setTimeout(() => {
      try {
        input.selectionStart = input.selectionEnd = result.caret
      } catch (e) {
        // Ignore selection errors
      }
    }, 0)
  }
  
  onChange(result.value)
}

/**
 * Common input props for number inputs to remove spinner arrows
 * Apply these styles to any number input field
 */
export const numberInputProps = {
  type: 'text',
  style: {
    MozAppearance: 'textfield',
    WebkitAppearance: 'none'
  },
  onWheel: (e) => e.target.blur()
}

/**
 * Helper function to create a number input handler with proper styling
 * 
 * @param {string} inputType - 'decimal' or 'whole'
 * @param {function} onChange - The field's onChange handler
 * @returns {object} - Props object for the input
 */
export const createNumberInputHandler = (inputType, onChange) => {
  const handler = inputType === 'decimal' ? handleDecimalNumberInput : handleWholeNumberInput
  
  return {
    ...numberInputProps,
    onChange: (e) => handler(e.target.value, onChange)
  }
}

/**
 * Banking-standard calculation helper
 * Ensures precise decimal calculations for financial operations
 * 
 * @param {number} value - The numeric value to round
 * @param {number} decimalPlaces - Number of decimal places (default: 3)
 * @returns {number} - Properly rounded number
 */
export const bankingRound = (value, decimalPlaces = 3) => {
  if (isNaN(value)) return 0
  const factor = Math.pow(10, decimalPlaces)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Format number for display with banking standards
 * 
 * @param {number} value - The numeric value
 * @param {number} decimalPlaces - Number of decimal places (default: 3)
 * @returns {string} - Formatted string with commas and proper decimal places
 */
export const formatBankingNumber = (value, decimalPlaces = 3) => {
  if (isNaN(value)) return '0'
  const rounded = bankingRound(value, decimalPlaces)
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces
  })
}

/**
 * Usage Examples:
 * 
 * // For decimal numbers (weights, prices, financial amounts)
 * <input
 *   {...createNumberInputHandler('decimal', (value) => setWeight(value))}
 *   value={weight}
 * />
 * 
 * // For whole numbers (quantities, counts)
 * <input
 *   {...createNumberInputHandler('whole', (value) => setQuantity(value))}
 *   value={quantity}
 * />
 * 
 * // Manual usage with banking standards
 * <input
 *   type="text"
 *   value={value}
 *   onChange={(e) => handleDecimalNumberInput(e.target.value, setValue)}
 *   style={{ MozAppearance: 'textfield', WebkitAppearance: 'none' }}
 *   onWheel={(e) => e.target.blur()}
 * />
 * 
 * // Banking calculations
 * const total = bankingRound(price * quantity, 3)
 * const displayValue = formatBankingNumber(total, 3)
 */

/**
 * Handles date input formatting for MM/DD/YY format
 * Used for: invoice dates, document dates, any date fields requiring MM/DD/YY format
 * 
 * Features:
 * - Only accepts digits
 * - Automatically adds slashes at MM/DD positions
 * - Formats as MM/DD/YY
 * - Handles backspace and delete properly
 * - Prevents invalid date entries
 * 
 * @param {string} value - The input value
 * @param {function} onChange - Callback function to update the value
 */
export const handleDateInput = (value, onChange) => {
  // Remove all non-digit characters
  let digitsOnly = value.replace(/\D/g, '')
  
  // Limit to 6 digits (MMDDYY)
  if (digitsOnly.length > 6) {
    digitsOnly = digitsOnly.substring(0, 6)
  }
  
  // Format with slashes and validate as we go
  let formatted = ''
  let month = ''
  let day = ''
  let year = ''
  
  if (digitsOnly.length >= 1) {
    month = digitsOnly.substring(0, 2)
    
    // Validate month (01-12, no 00)
    if (month.length === 2) {
      const monthNum = parseInt(month, 10)
      if (monthNum === 0) {
        month = '01' // Prevent 00, default to 01
      } else if (monthNum > 12) {
        month = '12' // Cap at 12
      }
    }
    
    formatted = month
  }
  
  if (digitsOnly.length >= 3) {
    day = digitsOnly.substring(2, 4)
    
    // Validate day based on month
    if (day.length === 2 && month.length === 2) {
      const dayNum = parseInt(day, 10)
      const monthNum = parseInt(month, 10)
      
      if (dayNum === 0) {
        day = '01' // Prevent 00, default to 01
      } else {
        // Get max days for the month
        const maxDays = getMaxDaysInMonth(monthNum)
        if (dayNum > maxDays) {
          day = maxDays.toString().padStart(2, '0')
        }
      }
    }
    
    formatted += '/' + day
  }
  
  if (digitsOnly.length >= 5) {
    year = digitsOnly.substring(4, 6)
    
    // Validate year (no 00)
    if (year.length === 2) {
      const yearNum = parseInt(year, 10)
      if (yearNum === 0) {
        year = '01' // Prevent 00, default to 01
      }
    }
    
    formatted += '/' + year
  }
  
  onChange(formatted)
}

/**
 * Get maximum days in a month
 * @param {number} month - Month number (1-12)
 * @returns {number} - Maximum days in that month
 */
const getMaxDaysInMonth = (month) => {
  switch (month) {
    case 1: case 3: case 5: case 7: case 8: case 10: case 12:
      return 31 // January, March, May, July, August, October, December
    case 4: case 6: case 9: case 11:
      return 30 // April, June, September, November
    case 2:
      return 29 // February (simplified - doesn't handle leap years)
    default:
      return 31
  }
}

/**
 * Validates if a date string is in valid MM/DD/YY format
 * 
 * @param {string} dateString - The date string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDate = (dateString) => {
  if (!dateString || dateString.length !== 8) return false // MM/DD/YY = 8 chars
  
  const parts = dateString.split('/')
  if (parts.length !== 3) return false
  
  const month = parseInt(parts[0], 10)
  const day = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)
  
  // Basic validation
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  if (year < 0 || year > 99) return false
  
  // More detailed validation
  const fullYear = year < 50 ? 2000 + year : 1900 + year // Assume 00-49 = 2000s, 50-99 = 1900s
  const date = new Date(fullYear, month - 1, day)
  
  return date.getFullYear() === fullYear && 
         date.getMonth() === month - 1 && 
         date.getDate() === day
}

/**
 * Removes commas from formatted numbers for database storage
 * Used before saving number fields to database
 * 
 * @param {string} value - The formatted number string (may contain commas)
 * @returns {string} - Clean number string without commas
 */
export const cleanNumberForDatabase = (value) => {
  if (!value || typeof value !== 'string') return value
  return value.replace(/,/g, '')
}

/**
 * Cleans all number fields in an object for database storage
 * Removes commas from all numeric fields before saving to database
 * 
 * @param {object} data - Object containing form data
 * @param {array} numberFields - Array of field names that contain numbers
 * @returns {object} - Object with cleaned number fields
 */
export const cleanNumberFieldsForDatabase = (data, numberFields = []) => {
  const cleaned = { ...data }
  
  numberFields.forEach(field => {
    if (cleaned[field] !== undefined && cleaned[field] !== null) {
      cleaned[field] = cleanNumberForDatabase(cleaned[field])
    }
  })
  
  return cleaned
}

/**
 * Converts MM/DD/YY format to a more readable format
 * 
 * @param {string} dateString - The date string in MM/DD/YY format
 * @returns {string} - Formatted date string
 */
export const formatDateDisplay = (dateString) => {
  if (!dateString || dateString.length !== 8) return dateString
  
  const parts = dateString.split('/')
  if (parts.length !== 3) return dateString
  
  const month = parts[0]
  const day = parts[1]
  const year = parts[2]
  const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  
  const monthName = monthNames[parseInt(month) - 1] || month
  
  return `${monthName} ${day}, ${fullYear}`
}
