# Status Validation & Highlighting System

## Overview

This document describes the status validation and field highlighting system implemented for Container Operations and Trucking Status management.

---

## Container Status Validation

### Feature: Conditional Status Changes

Container statuses ("Delivering" and "Returned") are disabled until specific field requirements are met.

### Requirements

#### For "Delivering" Status:

- ✅ Departure Date from Port
- ✅ Driver Name
- ✅ Truck Plate Number

#### For "Returned" Status:

- ✅ Departure Date from Port
- ✅ Driver Name
- ✅ Truck Plate Number
- ✅ Date of Return to Yard

### Implementation

**File:** `src/components/ContainerStatusDropdown.js`

```javascript
// Props received
{
  operationId,
    currentStatus,
    returnDate,
    departureDate,
    driver,
    truckPlateNumber,
    onHighlightMissingFields; // Callback for field highlighting
}

// Validation logic
const isDeliveringDisabled = !departureDate || !driver || !truckPlateNumber;
const isReturnedDisabled = !returnDate;
```

### Visual Feedback

**Disabled Status Options:**

- Opacity: 50%
- Cursor: not-allowed
- Tooltip: Shows requirements
- Grayed out appearance

**On Hover (Disabled Status):**

- Missing fields are highlighted with orange border and background
- Pulsing animation draws attention
- Highlights clear when hover ends

---

## Field Highlighting System

### Purpose

Visually indicate which fields need to be filled when a status change is blocked.

### Behavior

**Trigger:** Hover over disabled status option in dropdown

**Effect:** Missing required fields pulse with orange highlight

**Implementation:**

**File:** `src/components/ContainerBlock.js`

```javascript
// State management
const [highlightedFields, setHighlightedFields] = useState([])

// Passed to status dropdown
<ContainerStatusDropdown
  onHighlightMissingFields={setHighlightedFields}
  // ... other props
/>

// Applied to input fields
className={`${highlightedFields.includes('field_name') ? 'field-highlight' : ''}`}
```

**CSS Animation:** `src/components/ContainerBlock.css`

```css
.field-group input.field-highlight {
  border-color: #ff9800;
  background-color: #fff3e0;
  animation: highlight-pulse 1s ease-in-out infinite;
}

@keyframes highlight-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(255, 152, 0, 0.1);
  }
}
```

---

## Trucking Status Validation

### Feature: Completion Status Lock

The "Completed" status in trucking is locked until all containers are returned.

### Requirements

**For "Completed" Status:**

- ✅ All containers must have status = "returned"

### Implementation

**File:** `src/components/TruckingStatusDropdown.js`

```javascript
// Check container status
useEffect(() => {
  const { data: operations } = await supabase
    .from('container_operations')
    .select('id, status')
    .eq('pro_number', proNumber);

  const allReturned = operations.every(op => op.status === 'returned');
  const nonReturnedIds = operations
    .filter(op => op.status !== 'returned')
    .map(op => op.id);

  setAllContainersReturned(allReturned);
  setNonReturnedContainerIds(nonReturnedIds);
}, [proNumber, refreshTrigger]);
```

### Container Highlighting

**Trigger:** Hover over disabled "Completed" status option

**Effect:** Non-returned containers are highlighted in the Container Operations section

**Visual Style:**

- Border: Orange (#f59e0b)
- Background: Light yellow (#fffbeb)
- Pulsing shadow animation
- Entire container card highlighted

**Implementation Flow:**

1. **TruckingStatusDropdown** → Identifies non-returned container IDs
2. **ProfileHeader** → Forwards highlight callback
3. **TruckingProfile** → Manages highlighted state
4. **ContainerBlock** → Applies highlight class to matching containers

```javascript
// Data flow
TruckingStatusDropdown (onMouseEnter)
  → onHighlightContainers([containerIds])
    → TruckingProfile (setHighlightedContainerIds)
      → ContainerBlock (highlightedContainerIds prop)
        → ContainerOperationBlock (isHighlighted prop)
          → CSS class: "container-highlight"
```

**CSS Animation:** `src/components/ContainerBlock.css`

```css
.container-block.container-highlight {
  border-color: #f59e0b;
  background-color: #fffbeb;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  animation: container-pulse 2s ease-in-out infinite;
}

@keyframes container-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.3);
  }
}
```

---

## User Experience

### Container Level

1. User attempts to change status to "Delivering" or "Returned"
2. If requirements not met → status option is grayed out
3. Hover over disabled status → missing fields pulse orange
4. User fills required fields → status becomes available

### Trucking Level

1. User attempts to mark trucking as "Completed"
2. If containers not all returned → status option is locked
3. Hover over "Completed" → non-returned containers highlight
4. User returns all containers → "Completed" status unlocks

---

## Files Modified

### Core Components

- `src/components/ContainerStatusDropdown.js` - Container status validation
- `src/components/TruckingStatusDropdown.js` - Trucking status validation
- `src/components/ContainerBlock.js` - Field & container highlighting
- `src/components/ProfileHeader.js` - Prop forwarding
- `src/pages/Trucking/TruckingProfile.js` - State management

### Styling

- `src/components/ContainerBlock.css` - Highlight animations

---

## Key Benefits

✅ **Clear Validation** - Users immediately see what's blocking status changes
✅ **Visual Guidance** - Highlighted fields/containers show exactly what needs attention
✅ **Prevents Errors** - Can't set invalid statuses
✅ **Better UX** - No confusing error messages, visual feedback is intuitive
✅ **Workflow Enforcement** - Ensures proper data entry sequence

---

## Technical Notes

- Highlighting uses React state management for real-time updates
- CSS animations are hardware-accelerated (transform/opacity)
- Database queries are debounced via useEffect dependencies
- All validations happen client-side for instant feedback
- Status changes are logged to audit trail (existing functionality)
