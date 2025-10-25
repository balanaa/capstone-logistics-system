# Auto-Derive Field Pattern

## Overview

This pattern automatically derives field values from other fields when they change, including programmatic changes (like OCR, sample data, or API responses).

## Problem Solved

- **Manual typing only**: Original `onChange` handlers only trigger when user types
- **OCR/API integration**: When external systems populate fields, auto-derivation doesn't work
- **Sample data**: "Fill Sample Data" buttons don't trigger auto-derivation

## Solution: useEffect + onChange Pattern

### 1. Basic Structure

```javascript
const [userEditedTarget, setUserEditedTarget] = React.useState(false);

// Auto-derive function
const deriveTarget = (sourceValue) => {
  if (!sourceValue) return "";
  const t = String(sourceValue).toUpperCase();
  if (t.includes("KEYWORD1")) return "VALUE1";
  if (t.includes("KEYWORD2")) return "VALUE2";
  return t.trim() ? "DEFAULT_VALUE" : "";
};

// Simple onChange (no auto-derivation logic)
const onChange = (key, val) => {
  setValues((prev) => {
    const next = { ...prev, [key]: val };
    if (key === "target_field") setUserEditedTarget(true);
    return next;
  });
};

// Auto-derive when source field changes (including programmatic changes)
React.useEffect(() => {
  if (!userEditedTarget && values.source_field) {
    const derived = deriveTarget(values.source_field);
    if (derived && values.target_field !== derived) {
      setValues((prev) => ({ ...prev, target_field: derived }));
    }
  }
}, [values.source_field, userEditedTarget, values.target_field]);
```

### 2. Key Components

#### Auto-Derive Function

- **Purpose**: Contains the business logic for deriving target value
- **Input**: Source field value
- **Output**: Derived target value
- **Examples**:
  - Place of delivery from consignee
  - Country from address
  - Category from product name

#### User Edit Tracking

- **Purpose**: Prevents auto-derivation after user manually edits target field
- **State**: `userEditedTarget` boolean
- **Reset**: When user manually changes target field
- **Logic**: Only auto-derive if `!userEditedTarget`

#### useEffect Hook

- **Dependencies**: `[values.source_field, userEditedTarget, values.target_field]`
- **Triggers**: Any change to source field (typing, OCR, API, sample data)
- **Conditions**:
  - User hasn't manually edited target (`!userEditedTarget`)
  - Source field has value (`values.source_field`)
  - Derived value is different from current (`values.target_field !== derived`)

### 3. Benefits

✅ **Works with OCR**: When OCR populates source field, target auto-derives
✅ **Works with sample data**: "Fill Sample Data" buttons trigger auto-derivation  
✅ **Works with API responses**: External data updates trigger auto-derivation
✅ **Respects user edits**: Stops auto-deriving after manual user input
✅ **Prevents loops**: Only updates if derived value is different
✅ **Performance**: Only runs when dependencies change

### 4. Use Cases

#### Place of Delivery from Consignee

```javascript
const derivePlace = (text) => {
  if (!text) return "";
  const t = String(text).toUpperCase();
  if (t.includes("SUBIC")) return "SUBIC";
  if (t.includes("CLARK")) return "CLARK";
  return t.trim() ? "MANILA" : "";
};
```

````



### 5. Implementation Checklist

- [ ] Create derive function with business logic
- [ ] Add user edit tracking state
- [ ] Simplify onChange to only track user edits
- [ ] Add useEffect with proper dependencies
- [ ] Test with manual typing
- [ ] Test with programmatic changes (sample data, OCR)
- [ ] Verify user edit override works
- [ ] Verify no infinite loops

### 6. Files Using This Pattern

- `src/components/overlays/DocumentEditOverlay.js` - Place of delivery from consignee
- `src/components/overlays/BolEditOverlay.js` - Place of delivery from consignee
- `src/components/overlays/BolUploadAndEditOverlay.js` - Place of delivery from consignee

### 7. Future Applications

- **Address fields**: Auto-derive city/state from full address
- **Product fields**: Auto-derive category from product name
- **Contact fields**: Auto-derive country from phone number
- **Financial fields**: Auto-derive currency from country
- **Shipping fields**: Auto-derive carrier from destination

## Migration Notes

### From onChange-only pattern:

```javascript
// OLD - Only works with manual typing
const onChange = (key, val) => {
  if (key === "consignee" && !userEditedPlace) {
    const pod = derivePlace(val);
    if (pod) next["place_of_delivery"] = pod;
  }
};
````

### To useEffect + onChange pattern:

```javascript
// NEW - Works with all field changes
const onChange = (key, val) => {
  if (key === "place_of_delivery") setUserEditedPlace(true);
};

React.useEffect(() => {
  if (!userEditedPlace && values.consignee) {
    const pod = derivePlace(values.consignee);
    if (pod && values.place_of_delivery !== pod) {
      setValues((prev) => ({ ...prev, place_of_delivery: pod }));
    }
  }
}, [values.consignee, userEditedPlace, values.place_of_delivery]);
```
