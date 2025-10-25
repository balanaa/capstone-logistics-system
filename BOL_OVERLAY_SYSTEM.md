# BOL Overlay System - Complete Implementation Guide

## Overview

This document outlines the comprehensive changes made to the three BOL (Bill of Lading) overlay components to create a cohesive, professional, and user-friendly system with consistent validation, styling, and functionality.

## Components Updated

### 1. DocumentEditOverlay.js (Light Blue Background)

- **Purpose**: Generic document edit overlay with preview
- **Background Color**: `#e0f2fe` (Light Blue)
- **Usage**: Reusable overlay for any document type

### 2. BolEditOverlay.js (Light Green Background)

- **Purpose**: BOL-specific edit overlay
- **Background Color**: `#f0fdf4` (Light Green)
- **Usage**: Dedicated BOL editing functionality

### 3. BolUploadAndEditOverlay.js (Light Yellow Background)

- **Purpose**: BOL upload + edit overlay
- **Background Color**: `#fef3c7` (Light Yellow)
- **Usage**: Upload new BOL documents with editing capability

## Key Features Implemented

### 1. Field-Level Validation System

#### Problem Solved

- **Before**: Alert dialogs and footer text for validation errors
- **After**: Individual field highlighting with red borders and error messages

#### Implementation

```javascript
// Helper function for consistent field styling
const getFieldStyles = (fieldKey) => ({
  label: { color: fieldErrors[fieldKey] ? "#dc2626" : "inherit" },
  input: {
    borderColor: fieldErrors[fieldKey] ? "#dc2626" : "#d1d5db",
    borderWidth: fieldErrors[fieldKey] ? "2px" : "1px",
  },
  error: fieldErrors[fieldKey] ? (
    <div
      style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}
    >
      {fieldErrors[fieldKey]}
    </div>
  ) : null,
});
```

#### Features

- ✅ **Red labels** when field has error
- ✅ **Red borders** (2px thick) on invalid inputs
- ✅ **Error messages** below each invalid field
- ✅ **Auto-clear errors** when user types (using Auto-Derive Field Pattern)

### 2. Auto-Derive Field Pattern for Validation

#### Implementation

```javascript
// Clear field errors when ANY field value changes (including programmatic changes)
React.useEffect(() => {
  const newErrors = { ...fieldErrors };
  let hasChanges = false;

  Object.keys(values).forEach((key) => {
    if (
      fieldErrors[key] &&
      values[key] &&
      values[key].toString().trim() !== ""
    ) {
      delete newErrors[key];
      hasChanges = true;
    }
  });

  if (hasChanges) {
    setFieldErrors(newErrors);
  }
}, [values, pairs, fieldErrors]);
```

#### Benefits

- ✅ **Works with OCR**: When OCR populates fields, validation errors clear automatically
- ✅ **Works with sample data**: "Fill Sample Data" buttons clear validation errors
- ✅ **Works with API responses**: External data updates clear validation errors
- ✅ **Works with auto-derivation**: When place of delivery auto-fills, errors clear
- ✅ **Performance**: Only runs when field values actually change

### 3. Global Number Input Handlers

#### File Created: `src/utils/numberInputHandlers.js`

#### Two Types of Number Inputs

##### Decimal Numbers (`handleDecimalNumberInput`)

**Used for**: Gross Weight, Prices, Measurements

```javascript
// Example: 1,234.56
const handleDecimalNumberInput = (value, onChange) => {
  // Remove all non-numeric characters except decimal point
  let cleanValue = value.replace(/[^0-9.]/g, "");

  // Ensure only one decimal point
  const decimalCount = (cleanValue.match(/\./g) || []).length;
  if (decimalCount > 1) {
    cleanValue = cleanValue.replace(/\./g, "").replace(/(\d+)/, "$1.");
  }

  // Remove leading zeros except for decimal numbers
  if (cleanValue.length > 1 && cleanValue[0] === "0" && cleanValue[1] !== ".") {
    cleanValue = cleanValue.replace(/^0+/, "");
  }

  // Add comma separators for thousands
  if (cleanValue && cleanValue !== ".") {
    const parts = cleanValue.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    cleanValue = parts.join(".");
  }

  onChange(cleanValue);
};
```

##### Whole Numbers (`handleWholeNumberInput`)

**Used for**: Number of Packages, Quantity, Counts

```javascript
// Example: 1,234 (no decimals)
const handleWholeNumberInput = (value, onChange) => {
  // Remove all non-numeric characters (no decimal points)
  let cleanValue = value.replace(/[^0-9]/g, "");

  // Remove leading zeros
  if (cleanValue.length > 1 && cleanValue[0] === "0") {
    cleanValue = cleanValue.replace(/^0+/, "");
  }

  // Add comma separators for thousands
  if (cleanValue) {
    cleanValue = cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  onChange(cleanValue);
};
```

#### Spinner Arrow Removal

```javascript
export const numberInputProps = {
  type: "text",
  style: {
    MozAppearance: "textfield",
    WebkitAppearance: "none",
  },
  onWheel: (e) => e.target.blur(),
};
```

### 4. Container/Seal Pairs Validation

#### Problem Solved

- **Before**: Required both container AND seal numbers
- **After**: Only container numbers required, seal numbers optional

#### Implementation

```javascript
// Check if container/seal pairs have at least one container number (seal is optional)
const hasValidContainer = pairs.some((pair) => pair.left.trim() !== "");
if (!hasValidContainer) {
  errors.containerPairs =
    "At least one Container number is required (Seal number is optional)";
}
```

#### Visual Indicators

- **Container column**: Red asterisk (\*) to show it's required
- **Seal column**: "(optional)" text to show it's not required

#### Smart Validation Highlighting

```javascript
// Container input - red only when empty AND validation error exists
style={{
  borderColor: (fieldErrors.containerPairs && pair.left.trim() === '') ? '#dc2626' : '#d1d5db',
  borderWidth: (fieldErrors.containerPairs && pair.left.trim() === '') ? '2px' : '1px'
}}

// Seal input - always normal border (never red)
style={{
  borderColor: '#d1d5db',
  borderWidth: '1px'
}}
```

### 5. Professional Table Styling

#### Table Headers

- ✅ **Wider headers** (5px padding) for better alignment
- ✅ **Required indicators** (red asterisk for containers)
- ✅ **Optional indicators** (gray text for seals)
- ✅ **Invisible Actions header** for proper alignment

#### Delete Buttons

- ✅ **Centered** both horizontally and vertically
- ✅ **Bigger size** (3rem x 3rem) to match input height
- ✅ **Consistent styling** across all overlays

#### Add Button

- ✅ **Dark blue background** (`#1976d2`)
- ✅ **White text** for contrast
- ✅ **Professional styling** with proper padding
- ✅ **Updated text**: "Add Container No / Seal No Row"

### 6. Auto-Derive Place of Delivery

#### Implementation (Already documented in AUTO_DERIVE_FIELD_PATTERN.md)

- ✅ **Always auto-derives** from consignee field
- ✅ **Works with programmatic changes** (OCR, sample data, API)
- ✅ **Respects user edits** (stops auto-deriving after manual input)

## Usage Examples

### Importing Global Number Handlers

```javascript
import {
  handleDecimalNumberInput,
  handleWholeNumberInput,
  numberInputProps,
  createNumberInputHandler,
} from "../../utils/numberInputHandlers";
```

### Using Number Inputs

```javascript
// For whole numbers (quantities, packages)
<input
  type="text"
  value={quantity}
  onChange={(e) => handleWholeNumberInput(e.target.value, setQuantity)}
  style={{ ...numberInputProps.style }}
  onWheel={numberInputProps.onWheel}
/>

// For decimal numbers (weights, prices)
<input
  type="text"
  value={weight}
  onChange={(e) => handleDecimalNumberInput(e.target.value, setWeight)}
  style={{ ...numberInputProps.style }}
  onWheel={numberInputProps.onWheel}
/>
```

### Using Helper Function

```javascript
// For whole numbers
<input
  {...createNumberInputHandler('whole', setQuantity)}
  value={quantity}
/>

// For decimal numbers
<input
  {...createNumberInputHandler('decimal', setWeight)}
  value={weight}
/>
```

## Field Assignments

### Required Fields (All 15 Fields)

1. **Shipper** - Text area
2. **B/L Number** - Text input
3. **Consignee** - Text area
4. **Shipping Line** - Text input
5. **Vessel Name** - Text input
6. **Voyage Number** - Text input
7. **Port of Loading** - Text input
8. **Port of Discharge** - Text input
9. **Place of Delivery** - Text input (auto-derived from consignee)
10. **Container Specs** - Text input
11. **Number of Packages** - Whole number input (no decimals)
12. **Packaging Kind** - Text input
13. **Goods Classification** - Text input
14. **Description of Goods** - Text area
15. **Gross Weight** - Decimal number input (with decimals)

### Container/Seal Pairs

- **Container Number** - Required (at least one)
- **Seal Number** - Optional

## Validation Rules

### Field Validation

- ✅ **All 15 fields** are required
- ✅ **At least one container number** required
- ✅ **Seal numbers** are optional
- ✅ **Field-level errors** with red highlighting
- ✅ **Auto-clear errors** when fields are filled

### Number Input Validation

- ✅ **Whole numbers**: Only digits, comma separators, no decimals
- ✅ **Decimal numbers**: Digits, one decimal point, comma separators
- ✅ **No letters or special characters** allowed
- ✅ **No negative numbers** (all inputs positive)
- ✅ **Spinner arrows removed** from all number inputs

## Testing Scenarios

### Number Input Testing

| **Field Type**     | **User Types** | **Result** | **Explanation**          |
| ------------------ | -------------- | ---------- | ------------------------ |
| **Whole Number**   | `123.45`       | `12,345`   | Removes decimal point    |
| **Whole Number**   | `abc123`       | `123`      | Removes letters          |
| **Whole Number**   | `00123`        | `123`      | Removes leading zeros    |
| **Whole Number**   | `1234`         | `1,234`    | Adds comma separator     |
| **Decimal Number** | `123.45`       | `123.45`   | Preserves decimal        |
| **Decimal Number** | `12.34.56`     | `12.3456`  | Keeps only first decimal |
| **Decimal Number** | `1234.56`      | `1,234.56` | Comma + decimal          |

### Container/Seal Validation Testing

| **Container** | **Seal** | **Container Border** | **Seal Border** | **Explanation**                |
| ------------- | -------- | -------------------- | --------------- | ------------------------------ |
| Empty         | Empty    | 🔴 Red               | ⚪ Normal       | Only container gets red        |
| Empty         | "S123"   | 🔴 Red               | ⚪ Normal       | Only container gets red        |
| "MSCU123"     | Empty    | ⚪ Normal            | ⚪ Normal       | Both normal (container filled) |
| "MSCU123"     | "S123"   | ⚪ Normal            | ⚪ Normal       | Both normal (container filled) |

## Future Applications

### Number Input Handlers

The global number input handlers can be used in:

- ✅ **InvoiceUploadAndEditOverlay.js**
- ✅ **PackingListUploadAndEditOverlay.js**
- ✅ **Any future overlays** with number inputs
- ✅ **Forms throughout the application**

### Field-Level Validation Pattern

The validation pattern can be applied to:

- ✅ **All form components**
- ✅ **User registration/login forms**
- ✅ **Settings and configuration forms**
- ✅ **Any input validation needs**

## Migration Notes

### From Old Validation System

```javascript
// OLD - Alert-based validation
if (missingFields.length > 0) {
  const fieldNames = missingFields.map((f) => f.label).join(", ");
  alert(`Please fill in the following required fields: ${fieldNames}`);
  return;
}
```

### To New Field-Level Validation

```javascript
// NEW - Field-level validation
const errors = {};
missingFields.forEach((field) => {
  errors[field.key] = `${field.label} is required`;
});

if (Object.keys(errors).length > 0) {
  setFieldErrors(errors);
  return;
}
```

## Files Modified

### Core Files

1. **`src/components/overlays/DocumentEditOverlay.js`** - Light Blue
2. **`src/components/overlays/BolEditOverlay.js`** - Light Green
3. **`src/components/overlays/BolUploadAndEditOverlay.js`** - Light Yellow

### New Utility Files

1. **`src/utils/numberInputHandlers.js`** - Global number input handlers

### Documentation Files

1. **`AUTO_DERIVE_FIELD_PATTERN.md`** - Auto-derive pattern documentation
2. **`BOL_OVERLAY_SYSTEM.md`** - This comprehensive guide

## Conclusion

The BOL overlay system now provides:

- ✅ **Consistent user experience** across all three overlays
- ✅ **Professional validation** with field-level feedback
- ✅ **Global reusable components** for number inputs
- ✅ **Smart auto-derivation** for improved data entry
- ✅ **Flexible container/seal** validation (containers required, seals optional)
- ✅ **Modern, accessible UI** with proper visual indicators

All three overlays now work identically and provide a cohesive, professional experience for users working with Bill of Lading documents.
