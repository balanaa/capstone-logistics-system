# Keyboard Navigation System Documentation

## Overview

This document outlines the implementation of Excel-like keyboard navigation for form inputs and table cells across the shipment management system. The system will provide seamless navigation between form fields and table cells using arrow keys, creating a professional data-entry experience.

## 🎯 **System Requirements**

### **Core Functionality**

- **Arrow Key Navigation**: Navigate between all form inputs and table cells
- **Excel-like Behavior**: Up/down for rows, left/right for columns
- **Wrap-around Logic**: Right edge → next row left, Left edge → previous row right
- **Cross-Section Navigation**: Form fields ↔ Table cells seamlessly
- **Action Button Navigation**: Delete buttons and "Add Item" button included
- **Global Handler**: Reusable across all forms (Invoice, Packing List, etc.)

### **Element Types Supported**

- **Input Fields**: All `<input>` elements (text, number, date, etc.)
- **Action Buttons**: Delete buttons, "Add Item" buttons
- **Excluded**: Span elements (not navigable)

## 🚀 **Implementation Strategy**

### **Phase 1: Table Navigation (Global)**

- **Scope**: Table cells only (no form integration yet)
- **Target**: All table-based components
- **Priority**: High - table navigation is consistent across mobile/desktop

### **Phase 2: Form Integration**

- **Scope**: Add form field navigation
- **Target**: InvoiceEditOverlay first, then other forms
- **Priority**: Medium - forms vary by component

### **Phase 3: Cross-Section Navigation**

- **Scope**: Form ↔ Table seamless navigation
- **Target**: Complete navigation system
- **Priority**: Low - advanced feature

## 📋 **Technical Specifications**

### **Navigation Logic**

#### **Table Navigation Rules**

```
Up Arrow (↑):     Move to cell above
Down Arrow (↓):   Move to cell below
Left Arrow (←):   Move to cell left
Right Arrow (→):  Move to cell right
```

#### **Wrap-around Behavior**

```
Right Edge:  Last column → First column of next row
Left Edge:   First column → Last column of previous row
Top Edge:    First row → Stay in place (or wrap to last row)
Bottom Edge: Last row → Stay in place (or wrap to first row)
```

#### **Button Navigation**

- **Delete Buttons**: Treated as "cells" in the grid
- **Add Item Button**: Navigable from last table cell
- **Focus State**: Buttons show focus outline when navigated to

### **Global Handler Structure**

```javascript
// Proposed global hook structure
const useTableNavigation = (tableRef, options = {}) => {
  const {
    rows = [],
    columns = [],
    onAddItem = null,
    onDeleteItem = null,
    wrapAround = true,
  } = options;

  // Navigation logic
  // Focus management
  // Event listeners
  // Return navigation state and handlers
};
```

## 🎨 **User Experience Design**

### **Visual Feedback**

- **Input Focus**: Browser default focus outline
- **Button Focus**: CSS focus outline for buttons
- **No Custom Indicators**: Use existing browser focus states

### **Mobile Compatibility**

- **Touch Devices**: Arrow keys work if external keyboard connected
- **Small Screens**: Navigation still functional
- **Responsive**: Table structure remains consistent across screen sizes

### **Accessibility**

- **Keyboard Only**: Full navigation without mouse
- **Screen Reader**: Compatible with existing focus management
- **Tab Order**: Maintains logical tab sequence

## 📁 **Implementation Scope**

### **Phase 1: Table Navigation (Global)**

#### **Target Components**

- **InvoiceEditOverlay**: Invoice line items table
- **PackingListOverlay**: Packing list items table
- **BillOfLadingOverlay**: BOL items table
- **Any Table Component**: Generic table navigation

#### **Table Structure**

```javascript
// Example table structure for navigation
const tableStructure = {
  rows: [
    { id: 1, cells: ["product", "quantity", "unitPrice", "amount", "delete"] },
    { id: 2, cells: ["product", "quantity", "unitPrice", "amount", "delete"] },
    // ... more rows
  ],
  addButton: "addItem", // Optional add item button
};
```

#### **Navigation Grid**

```
Row 1: [Product] [Quantity] [Unit Price] [Amount] [Delete]
Row 2: [Product] [Quantity] [Unit Price] [Amount] [Delete]
Row 3: [Product] [Quantity] [Unit Price] [Amount] [Delete]
       [Add Item Button]
```

### **Phase 2: Form Integration (InvoiceEditOverlay)**

#### **Form Fields**

- **Document Info**: Invoice No, Date, Incoterms, Currency
- **Totals**: Total Quantity, Total Amount
- **Navigation**: Form fields ↔ Table cells

#### **Navigation Flow**

```
Form Fields → Table Cells → Form Fields
     ↓              ↓           ↓
[Invoice No] → [Product] → [Total Qty]
[Date]       → [Quantity] → [Total Amt]
[Incoterms]  → [Unit Price] → [Submit]
[Currency]   → [Amount]    → [Cancel]
```

## 🔧 **Technical Implementation**

### **Event Handling**

```javascript
// Key event handling
const handleKeyDown = (event) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    navigateToCell(event.key);
  }
};
```

### **Focus Management**

```javascript
// Focus management
const setFocus = (element) => {
  if (element && element.focus) {
    element.focus();
  }
};
```

### **Grid Navigation Logic**

```javascript
// Navigation logic
const navigateToCell = (direction) => {
  const currentPosition = getCurrentPosition();
  const newPosition = calculateNewPosition(currentPosition, direction);
  const targetElement = getElementAtPosition(newPosition);
  setFocus(targetElement);
};
```

## 📊 **Component Integration**

### **InvoiceEditOverlay Integration**

- **Target**: Invoice line items table
- **Implementation**: Use global table navigation hook
- **Testing**: Verify navigation works with existing validation

### **Future Components**

- **PackingListOverlay**: Apply same navigation system
- **BillOfLadingOverlay**: Apply same navigation system
- **Any Table Component**: Generic implementation

## 🧪 **Testing Strategy**

### **Unit Tests**

- **Navigation Logic**: Test wrap-around behavior
- **Focus Management**: Test focus state changes
- **Event Handling**: Test key event processing

### **Integration Tests**

- **Table Navigation**: Test within InvoiceEditOverlay
- **Button Navigation**: Test delete and add item buttons
- **Responsive**: Test on different screen sizes

### **User Testing**

- **Keyboard Users**: Test with keyboard-only navigation
- **Mobile Users**: Test with external keyboard
- **Accessibility**: Test with screen readers

## 📈 **Success Metrics**

### **Functionality**

- ✅ Arrow keys navigate between table cells
- ✅ Wrap-around works correctly
- ✅ Delete buttons are navigable
- ✅ Add item button is accessible
- ✅ Focus state is visible

### **Performance**

- ✅ Navigation is smooth and responsive
- ✅ No impact on existing functionality
- ✅ Minimal memory footprint

### **User Experience**

- ✅ Feels like Excel navigation
- ✅ Intuitive for keyboard users
- ✅ Works on all screen sizes

## 🔮 **Future Enhancements**

### **Phase 2: Form Integration**

- Form field navigation
- Cross-section navigation
- Advanced keyboard shortcuts

### **Phase 3: Advanced Features**

- **Keyboard Shortcuts**: Ctrl+A for add item, Delete for remove
- **Bulk Operations**: Select multiple rows
- **Copy/Paste**: Excel-like copy/paste behavior

### **Phase 4: Global System**

- **Configuration**: Customizable navigation rules
- **Plugins**: Extensible navigation system
- **Documentation**: Complete API documentation

## 📝 **Documentation Integration**

### **Current Status**

- **Documentation**: This file (KEYBOARD_NAVIGATION_SYSTEM.md)
- **Status**: Planning phase
- **Next Step**: Implementation of Phase 1

### **Future Integration**

- **Link to INVOICE_COMPONENTS_ANALYSIS.md**: After successful implementation
- **Component Documentation**: Update component docs with navigation features
- **User Guide**: Create user-facing documentation

## 🎯 **Implementation Priority**

### **Immediate (Phase 1)**

1. **Global Table Navigation Hook**: Reusable table navigation
2. **InvoiceEditOverlay Integration**: Apply to invoice table
3. **Testing**: Verify functionality works correctly

### **Short Term (Phase 2)**

1. **Form Integration**: Add form field navigation
2. **Cross-Section Navigation**: Form ↔ Table navigation
3. **Additional Components**: Apply to other forms

### **Long Term (Phase 3)**

1. **Advanced Features**: Keyboard shortcuts, bulk operations
2. **Global System**: Complete navigation system
3. **Documentation**: Full API and user documentation

## 📋 **Decision Summary**

### **Confirmed Decisions**

- ✅ **Element Types**: Inputs and buttons only (no spans)
- ✅ **Visual Feedback**: Use existing browser focus states
- ✅ **Mobile Support**: Works on small screens with external keyboard
- ✅ **Implementation Order**: Global table navigation first
- ✅ **Target Component**: InvoiceEditOverlay for initial testing

### **Implementation Approach**

- **Start Global**: Create reusable table navigation hook
- **Apply Locally**: Integrate with InvoiceEditOverlay
- **Test Thoroughly**: Verify functionality before expansion
- **Document Progress**: Update documentation as features are added

## 🚀 **Phase 1 Implementation Complete**

### **✅ What's Been Implemented**

#### **Global Table Navigation Hook**

- **File**: `src/hooks/useTableNavigation.js`
- **Features**:
  - Excel-like arrow key navigation
  - Wrap-around behavior (right edge → next row left)
  - Focus management for inputs and buttons
  - Event handling for special keys (Enter, Delete)
  - Dynamic row/column support

#### **InvoiceEditOverlay Integration**

- **File**: `src/components/overlays/InvoiceEditOverlay.js`
- **Integration**:
  - Added `useTableNavigation` hook import
  - Configured for 5 columns (product, quantity, unitPrice, amount, delete)
  - Dynamic row count based on items array
  - Table ref attached to table container

#### **Technical Implementation**

```javascript
// Hook configuration
const { tableRef } = useTableNavigation({
  rows: items.length,
  columns: 5, // product, quantity, unitPrice, amount, delete
  wrapAround: true,
  tableSelector: '.invoice-table'
})

// Table integration
<div style={{ overflowX: 'auto' }} ref={tableRef}>
  <table className="invoice-table">
    {/* Table content */}
  </table>
</div>
```

### **🎯 Navigation Features**

- **Arrow Keys**: ↑↓←→ for cell navigation
- **Wrap-around**: Right edge wraps to next row left
- **Button Navigation**: Delete buttons are navigable
- **Focus Management**: Automatic focus on inputs and buttons
- **Special Keys**: Enter activates buttons, Delete removes items

### **📋 Testing Checklist**

- [ ] Arrow keys navigate between table cells
- [ ] Wrap-around works correctly (right → next row left)
- [ ] Delete buttons are navigable and functional
- [ ] Focus state is visible on inputs and buttons
- [ ] Navigation works with existing validation system
- [ ] No conflicts with existing keyboard shortcuts

---

**Status**: Phase 1 Implementation Complete  
**Next Step**: Test navigation functionality and expand to other components  
**Target**: InvoiceEditOverlay table navigation ✅  
**Timeline**: Phase 1 implementation ✅
