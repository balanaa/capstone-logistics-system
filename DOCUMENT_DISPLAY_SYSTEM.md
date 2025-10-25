# Document Display System - Current Implementation

## Overview

The Document component displays various document types with their associated data. Currently, the system shows **actual stored data** without performing calculations.

## Current Behavior

### Data Display

- **Shows raw data** as stored in the database
- **No calculations performed** on totals or amounts
- **Direct field mapping** from `fieldValues` to display

### Document Types Supported

#### 1. Invoice

- **Product Table**: Shows individual line items
- **Total Amount**: Displays `fieldValues.total_amount` (stored value)
- **Total Quantity**: Displays `fieldValues.total_quantity` (stored value)

#### 2. Packing List

- **Product Table**: Shows individual line items
- **Total Quantity**: Displays `fieldValues.total_quantity` (stored value)
- **Total Net Weight**: Displays `fieldValues.total_net_weight` (stored value)
- **Total Gross Weight**: Displays `fieldValues.total_gross_weight` (stored value)

#### 3. General Information/Product Table

- **Product Table**: Shows individual line items
- **Totals**: Displays `fieldValues.__giTotals` (precomputed stored values)
  - `totalAmount`: Stored total amount
  - `totalQuantity`: Stored total quantity
  - `totalNet`: Stored total net weight
  - `totalGross`: Stored total gross weight

#### 4. Remarks

- **Date/Notes Table**: Shows individual remarks entries
- **No totals** (not applicable)

## Data Sources

### Field Values (`fieldValues`)

```javascript
// Example structure
fieldValues = {
  total_amount: 23861.72, // Stored total amount
  total_quantity: 100, // Stored total quantity
  total_net_weight: 1500.5, // Stored total net weight
  total_gross_weight: 1600.75, // Stored total gross weight
  __giTotals: {
    // Precomputed totals for General Info
    totalAmount: 23861.72,
    totalQuantity: 100,
    totalNet: 1500.5,
    totalGross: 1600.75,
  },
};
```

### Line Items (`items`)

```javascript
// Example structure
items = [
  {
    product: "Product A",
    quantity: 50,
    unitPrice: 100.5,
    amount: 5025.0,
    netWeight: 750.25,
    grossWeight: 800.3,
  },
  // ... more items
];
```

## Number Formatting

### Current Implementation

- **`formatNumber()` function**: Always rounds to 2 decimal places
- **Fixes floating-point precision issues**: `23861.719999999998` → `23861.72`
- **Consistent formatting**: All monetary values show exactly 2 decimal places

### Examples

```javascript
formatNumber(23861.719999999998); // → "23861.72"
formatNumber(100.567); // → "100.57"
formatNumber(100); // → "100.00"
formatNumber(100.5); // → "100.50"
```

## Pagination

### Current Implementation

- **10 items per page** maximum
- **Centered navigation**: `← Prev` + page numbers + `Next →`
- **Right-aligned info**: "Showing 1-10 of 24 items"
- **Responsive design**: Stacks vertically on mobile

### Supported Document Types

- ✅ Invoice
- ✅ Packing List
- ✅ General Information/Product Table
- ✅ Remarks

## Future Enhancements (Not Yet Implemented)

### Planned Calculations

- **Real-time totals**: Calculate totals from line items instead of using stored values
- **Validation**: Verify stored totals match calculated totals
- **Auto-calculation**: Update totals when line items change
- **Currency conversion**: Support for multiple currencies
- **Tax calculations**: Add tax fields and calculations

### Planned Features

- **Edit totals**: Allow manual override of calculated totals
- **Calculation methods**: Different calculation methods (sum, average, etc.)
- **Audit trail**: Track when totals are calculated vs. manually entered
- **Bulk operations**: Calculate totals for multiple documents

## Technical Notes

### Current Architecture

- **Display-only**: No calculation logic implemented
- **Database-driven**: All totals come from stored field values
- **Formatting-only**: `formatNumber()` only handles display formatting
- **No validation**: No verification that stored totals match line item sums

### Data Flow

```
Database → fieldValues → Document Component → formatNumber() → Display
```

### Key Files

- **`src/components/Document.js`**: Main display component
- **`src/utils/numberUtils.js`**: Number formatting utilities
- **`src/components/Document.css`**: Styling and pagination

## Summary

The current system is **display-focused** and shows actual stored data without performing calculations. This provides a stable foundation for displaying document information while calculations are planned for future implementation.

**Current State**: ✅ Data Display + ✅ Number Formatting + ✅ Pagination
**Future State**: 🔄 Real-time Calculations + 🔄 Validation + 🔄 Auto-updates
