# Field-Level Validation System - Implementation Guide

## Overview

This guide documents the comprehensive field-level validation system implemented across the BOL overlay components. This system provides professional, user-friendly validation feedback and serves as a template for implementing similar validation in other overlays throughout the application.

## Key Features Implemented

### 1. Field-Level Validation System

#### Problem Solved

- **Before**: Alert dialogs and footer text for validation errors
- **After**: Individual field highlighting with red borders and error messages

#### Core Implementation

```javascript
// 1. State Management
const [fieldErrors, setFieldErrors] = React.useState({})

// 2. Helper Function for Consistent Styling
const getFieldStyles = (fieldKey) => ({
  label: { color: fieldErrors[fieldKey] ? '#dc2626' : 'inherit' },
  input: {
    borderColor: fieldErrors[fieldKey] ? '#dc2626' : '#d1d5db',
    borderWidth: fieldErrors[fieldKey] ? '2px' : '1px'
  },
  error: fieldErrors[fieldKey] ? (
    <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
      {fieldErrors[fieldKey]}
    </div>
  ) : null
})

// 3. Form Field Implementation
<div className="form-group">
  <label style={getFieldStyles('fieldName').label}>
    Field Label <span style={{ color: 'red' }}>*</span>
  </label>
  <input
    type="text"
    value={fieldValue}
    onChange={(e) => setFieldValue(e.target.value)}
    style={getFieldStyles('fieldName').input}
  />
  {getFieldStyles('fieldName').error}
</div>
```

#### Visual Features

- ✅ **Red labels** when field has error
- ✅ **Red borders** (2px thick) on invalid inputs
- ✅ **Error messages** below each invalid field
- ✅ **Auto-clear errors** when user types

### 2. Auto-Clear Validation Pattern

#### Implementation

```javascript
// Clear field errors when ANY field value changes (including programmatic changes)
React.useEffect(() => {
  const newErrors = { ...fieldErrors };
  let hasChanges = false;

  // Check all individual fields
  const fieldValues = {
    field1,
    field2,
    field3, // ... all form fields
  };

  Object.keys(fieldValues).forEach((key) => {
    if (
      fieldErrors[key] &&
      fieldValues[key] &&
      fieldValues[key].toString().trim() !== ""
    ) {
      delete newErrors[key];
      hasChanges = true;
    }
  });

  // Clear container pairs error if at least one container number exists (seal is optional)
  if (
    fieldErrors.containerPairs &&
    pairs.some((pair) => pair.containerNo.trim() !== "")
  ) {
    delete newErrors.containerPairs;
    hasChanges = true;
  }

  if (hasChanges) {
    setFieldErrors(newErrors);
  }
}, [field1, field2, field3 /* ... all form fields */, , pairs, fieldErrors]);
```

#### Benefits

- ✅ **Works with OCR**: When OCR populates fields, validation errors clear automatically
- ✅ **Works with sample data**: "Fill Sample Data" buttons clear validation errors
- ✅ **Works with API responses**: External data updates clear validation errors
- ✅ **Works with auto-derivation**: When fields auto-fill, errors clear
- ✅ **Performance**: Only runs when field values actually change

### 3. Global Number Input Handlers

#### File: `src/utils/numberInputHandlers.js`

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

#### Usage in Form Fields

```javascript
// For whole numbers (quantities, packages)
<input
  type="text"
  value={quantity}
  onChange={(e) => handleWholeNumberInput(e.target.value, setQuantity)}
  style={{
    ...numberInputProps.style,
    ...getFieldStyles('quantity').input
  }}
  onWheel={numberInputProps.onWheel}
/>

// For decimal numbers (weights, prices)
<input
  type="text"
  value={weight}
  onChange={(e) => handleDecimalNumberInput(e.target.value, setWeight)}
  style={{
    ...numberInputProps.style,
    ...getFieldStyles('weight').input
  }}
  onWheel={numberInputProps.onWheel}
/>
```

### 4. Smart Container/Seal Pairs Validation

#### Problem Solved

- **Before**: Required both container AND seal numbers
- **After**: Only container numbers required, seal numbers optional

#### Implementation

```javascript
// Check if container/seal pairs have at least one container number (seal is optional)
const hasValidContainer = pairs.some((pair) => pair.containerNo.trim() !== "");
if (!hasValidContainer) {
  errors.containerPairs =
    "At least one Container number is required (Seal number is optional)";
}
```

#### Visual Indicators

```javascript
// Table Headers
<th style={{ paddingRight: '5px' }}>
  Container No. <span style={{ color: 'red' }}>*</span>
</th>
<th style={{ paddingRight: '5px' }}>
  Seal No. <span style={{ color: '#666', fontSize: '0.8em' }}>(optional)</span>
</th>

// Input Styling
// Container input - red only when empty AND validation error exists
style={{
  borderColor: (fieldErrors.containerPairs && pair.containerNo.trim() === '') ? '#dc2626' : '#d1d5db',
  borderWidth: (fieldErrors.containerPairs && pair.containerNo.trim() === '') ? '2px' : '1px'
}}

// Seal input - always normal border (never red)
style={{
  borderColor: '#d1d5db',
  borderWidth: '1px'
}}
```

#### Error Display

```javascript
{
  fieldErrors.containerPairs && (
    <div
      style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}
    >
      {fieldErrors.containerPairs}
    </div>
  );
}
```

### 5. Professional Table Styling

#### Table Headers

```javascript
<thead>
  <tr>
    <th style={{ paddingRight: "5px" }}>
      Container No. <span style={{ color: "red" }}>*</span>
    </th>
    <th style={{ paddingRight: "5px" }}>
      Seal No.{" "}
      <span style={{ color: "#666", fontSize: "0.8em" }}>(optional)</span>
    </th>
    <th style={{ visibility: "hidden" }}>Actions</th> {/* For alignment */}
  </tr>
</thead>
```

#### Delete Buttons

```javascript
<td style={{ textAlign: "center", verticalAlign: "middle" }}>
  <button
    className="delete-pair-btn"
    onClick={() => removePair(idx)}
    style={{
      height: "3rem",
      width: "3rem",
      padding: "0",
      fontSize: "1rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    ×
  </button>
</td>
```

#### Add Button

```javascript
<button
  onClick={addPair}
  style={{
    backgroundColor: "#1976d2",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
  }}
>
  + Add Container No / Seal No Row
</button>
```

### 6. Form Submission Validation

#### Implementation

```javascript
const handleSubmit = (e) => {
  e.preventDefault();

  // Clear previous errors
  setFieldErrors({});

  // Required field validation - ALL fields are required
  const requiredFields = [
    { key: "field1", label: "Field 1" },
    { key: "field2", label: "Field 2" },
    // ... all required fields
  ];

  const values = {
    field1,
    field2, // ... all form values
  };

  const errors = {};
  const missingFields = requiredFields.filter(
    (field) => !values[field.key] || values[field.key].toString().trim() === ""
  );

  // Set field-level errors
  missingFields.forEach((field) => {
    errors[field.key] = `${field.label} is required`;
  });

  // Check container/seal pairs (if applicable)
  const hasValidContainer = pairs.some(
    (pair) => pair.containerNo.trim() !== ""
  );
  if (!hasValidContainer) {
    errors.containerPairs =
      "At least one Container number is required (Seal number is optional)";
  }

  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    return;
  }

  // Proceed with form submission
  // ... rest of submission logic
};
```

## Implementation Checklist for New Overlays

### Required Imports

```javascript
import {
  handleDecimalNumberInput,
  handleWholeNumberInput,
  numberInputProps,
} from "../../utils/numberInputHandlers";
```

### State Management

```javascript
const [fieldErrors, setFieldErrors] = React.useState({});
```

### Helper Function

```javascript
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

### Auto-Clear Validation

```javascript
React.useEffect(() => {
  const newErrors = { ...fieldErrors }
  let hasChanges = false

  // Check all form fields
  const fieldValues = { /* all form field values */ }

  Object.keys(fieldValues).forEach(key => {
    if (fieldErrors[key] && fieldValues[key] && fieldValues[key].toString().trim() !== '') {
      delete newErrors[key]
      hasChanges = true
    }
  })

  // Check pairs/tables if applicable
  if (fieldErrors.pairs && pairs.some(pair => /* validation logic */)) {
    delete newErrors.pairs
    hasChanges = true
  }

  if (hasChanges) {
    setFieldErrors(newErrors)
  }
}, [/* all form fields and pairs */, fieldErrors])
```

### Form Field Template

```javascript
<div className="form-group">
  <label style={getFieldStyles("fieldName").label}>
    Field Label <span style={{ color: "red" }}>*</span>
  </label>
  <input
    type="text"
    value={fieldValue}
    onChange={(e) => setFieldValue(e.target.value)}
    style={getFieldStyles("fieldName").input}
  />
  {getFieldStyles("fieldName").error}
</div>
```

### Number Input Template

```javascript
<div className="form-group">
  <label style={getFieldStyles("numberField").label}>
    Number Field <span style={{ color: "red" }}>*</span>
  </label>
  <input
    type="text"
    value={numberValue}
    onChange={(e) => handleWholeNumberInput(e.target.value, setNumberValue)}
    style={{
      ...numberInputProps.style,
      ...getFieldStyles("numberField").input,
    }}
    onWheel={numberInputProps.onWheel}
  />
  {getFieldStyles("numberField").error}
</div>
```

### Validation Logic

```javascript
const handleSubmit = (e) => {
  e.preventDefault();
  setFieldErrors({});

  const requiredFields = [
    { key: "field1", label: "Field 1" },
    // ... all required fields
  ];

  const values = {
    /* all form values */
  };
  const errors = {};

  const missingFields = requiredFields.filter(
    (field) => !values[field.key] || values[field.key].toString().trim() === ""
  );

  missingFields.forEach((field) => {
    errors[field.key] = `${field.label} is required`;
  });

  // Additional validation logic

  if (Object.keys(errors).length > 0) {
    setFieldErrors(errors);
    return;
  }

  // Proceed with submission
};
```

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

## Benefits of This System

### User Experience

- ✅ **Immediate feedback** - Users see errors as they type
- ✅ **Clear visual indicators** - Red borders and labels show exactly what's wrong
- ✅ **Professional appearance** - No jarring alert dialogs
- ✅ **Accessible** - Screen readers can announce error messages

### Developer Experience

- ✅ **Reusable patterns** - Easy to implement in new overlays
- ✅ **Consistent behavior** - All forms work the same way
- ✅ **Maintainable** - Centralized validation logic
- ✅ **Extensible** - Easy to add new validation rules

### Performance

- ✅ **Efficient** - Only validates when necessary
- ✅ **Responsive** - Errors clear immediately when fields are filled
- ✅ **Optimized** - useEffect only runs when values change

## Future Applications

This field-level validation system can be applied to:

- ✅ **InvoiceUploadAndEditOverlay.js**
- ✅ **PackingListUploadAndEditOverlay.js**
- ✅ **User registration/login forms**
- ✅ **Settings and configuration forms**
- ✅ **Any form component** requiring validation

## Responsive Scroll Behavior Pattern

### Overview

For overlays with two-column layouts (file preview + form), implement responsive scroll behavior that adapts to screen size for optimal user experience.

### Implementation

**CSS Structure:**

```css
/* Base styles */
.duo-left,
.duo-right {
  display: flex;
  flex-direction: column;
}

.duo-left {
  flex: 1;
  max-height: calc(95vh - 180px);
  min-height: 400px;
  overflow-y: auto;
}

/* Desktop - 2 columns: each column scrolls independently */
@media (min-width: 769px) {
  .duo-body {
    overflow-y: visible;
  }

  .duo-left,
  .duo-right {
    overflow-y: auto;
  }
}

/* Mobile - 1 column: body scrolls, columns don't */
@media (max-width: 768px) {
  .duo-body {
    overflow-y: auto;
  }

  .duo-left,
  .duo-right {
    overflow-y: visible;
  }
}
```

### Behavior

**Desktop (2 columns)**:

- ✅ **Independent scrolling** - Left panel (file preview) and right panel (form) scroll separately
- ✅ **Content visibility** - Preview content doesn't get stuck at top when scrolling
- ✅ **Optimal space usage** - Each panel uses available space efficiently
- ✅ **Better UX** - Users can scroll preview while keeping form fields visible

**Mobile (1 column)**:

- ✅ **Unified scrolling** - Single scroll for entire body content
- ✅ **No competing scrollbars** - Clean mobile experience
- ✅ **Touch-friendly** - Natural mobile scrolling behavior

### Benefits

1. **Responsive Design** - Adapts to different screen sizes automatically
2. **Better File Preview** - Desktop users can zoom and scroll documents independently
3. **Form Accessibility** - Form fields remain accessible while previewing documents
4. **Mobile Optimization** - Single scroll prevents confusion on small screens
5. **Consistent UX** - Predictable behavior across different devices

### Usage

Apply this pattern to any overlay with:

- File upload/preview functionality
- Two-column layout (preview + form)
- Responsive design requirements
- Document viewing capabilities

**Examples:**

- ✅ **BolUploadAndEditOverlay.js**
- ✅ **DocumentUploadOverlay.js**
- ✅ **Any upload + edit overlay**
- ✅ **Document preview interfaces**

## Conclusion

The field-level validation system provides a professional, user-friendly approach to form validation that enhances both user experience and developer productivity. By following this guide, any overlay can implement consistent, accessible validation that works seamlessly with manual input, OCR data, sample data, and programmatic field changes.

The responsive scroll behavior pattern ensures optimal user experience across all devices, with independent scrolling on desktop for better document preview and unified scrolling on mobile for natural touch interaction.
