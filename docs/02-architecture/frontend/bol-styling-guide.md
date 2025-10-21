# BOL Styling Guide & Reference

## Overview

This document outlines the styling patterns and responsive design principles used in the Bill of Lading (BOL) overlays. These patterns should be applied consistently across all document overlay forms.

## File Structure

- **CSS**: `src/components/overlays/CreateShipmentOverlay.css`
- **Components**: `src/components/overlays/BolUploadAndEditOverlay.js`, `src/components/overlays/BolEditOverlay.js`

## Responsive Units & Typography

### Font Sizes (rem)

```css
/* Main header title */
.cso-header-title {
  font-size: 1.5rem;
}

/* Section titles */
h3 {
  font-size: 1rem;
}

/* Form inputs and labels */
.cso-right input,
.cso-right textarea {
  font-size: 0.875rem;
}
.cargo-table input {
  font-size: 0.875rem !important;
}
.cargo-table thead th {
  font-size: 0.875rem;
}

/* Small text */
.cso-hint {
  font-size: 0.75rem;
}
```

### Spacing (em)

```css
/* Form padding */
.cso-right form {
  padding: 0 0.75em;
}

/* Label spacing */
.cso-right label {
  margin-bottom: 0.375em;
}

/* Input padding */
.cso-right input {
  padding: 0 0.625em;
}
.cso-right textarea {
  padding: 0.5em 0.625em;
}

/* Table gaps */
.cargo-table thead tr {
  gap: 0.5em;
  margin-bottom: 0.75em;
}
.cargo-table tbody tr {
  gap: 0.5em;
  padding-bottom: 0.5em;
}
```

### Heights (rem)

```css
/* Input height - 48px equivalent */
.cso-right input {
  height: 3rem;
}
.cargo-table input {
  height: 3rem;
}
.delete-pair-btn {
  height: 3rem;
  width: 3rem;
}
```

## Layout Patterns

### CSS Grid for Form Layouts

```css
/* Two-column layout */
display: grid;
grid-template-columns: 1fr 1fr;
gap: 1rem;

/* Three-column layout */
display: grid;
grid-template-columns: 1fr 1fr 1fr;
gap: 1rem;
```

### Table with CSS Grid (No Padding)

```css
.cargo-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.cargo-table thead tr {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.5em;
  margin-bottom: 0.75em;
}

.cargo-table tbody tr {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.5em;
  padding-bottom: 0.5em;
  border-bottom: 1px solid #eee;
}

.cargo-table td {
  padding: 0;
} /* No padding - use gaps instead */
```

## Component Styling

### Form Groups

```css
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.375em;
  font-weight: 600;
}
```

### Buttons

```css
/* Primary action button */
.cso-btn {
  padding: 0.6em 1.1em;
  border-radius: 8px;
  border: 1px solid #ddd;
  background: #fff;
  cursor: pointer;
}

.cso-primary {
  background: #005cab;
  color: #fff;
  border-color: #005cab;
}

/* Delete button in table */
.delete-pair-btn {
  background: #f44336;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.75em;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  height: 3rem;
  width: 3rem;
}

.delete-pair-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.5;
}

.delete-pair-btn:not(:disabled):hover {
  background: #da190b;
}

/* Full-width add button */
.add-pair-btn {
  margin-top: 0.75em;
  padding: 0.75em 1em;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  width: 100%;
  text-align: center;
  display: block;
}
```

## Key Design Principles

### 1. Responsive Units

- **rem** for font sizes (scales with root font size)
- **em** for padding/margins (scales with element font size)
- **fr** for grid layouts (flexible fractions)

### 2. Consistent Input Sizing

- All inputs: `height: 3rem` (48px)
- All inputs: `font-size: 0.875rem`
- All inputs: `padding: 0 0.625em`

### 3. No Placeholders

- Remove all `placeholder` attributes for cleaner UI
- Labels provide context instead

### 4. Gap-Based Spacing

- Use CSS Grid `gap` instead of padding on table cells
- Maintains consistent spacing regardless of content

### 5. CSS Separation

- Move all inline styles to CSS classes
- Use semantic class names (`.cargo-table`, `.delete-pair-btn`)
- Avoid `!important` except when necessary for specificity

## Color Palette

```css
/* Primary blue */
#005CAB

/* Delete red */
#f44336
#da190b (hover)

/* Neutral grays */
#1f2937 (text)
#6b7280 (secondary text)
#d1d5db (borders)
#f3f4f6 (backgrounds)
```

## Implementation Checklist

When creating new document overlays:

- [ ] Use `rem` for all font sizes
- [ ] Use `em` for padding and margins
- [ ] Set input height to `3rem`
- [ ] Remove all placeholders
- [ ] Use CSS Grid for layouts
- [ ] Apply consistent gap spacing
- [ ] Move styles to CSS classes
- [ ] Use semantic class names
- [ ] Test responsive behavior

## Example Usage

```jsx
// Good: Clean JSX with CSS classes
<table className="cargo-table">
  <thead>
    <tr>
      <th>Container No.</th>
      <th>Seal No.</th>
      <th></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><input type="text" /></td>
      <td><input type="text" /></td>
      <td><button className="delete-pair-btn">×</button></td>
    </tr>
  </tbody>
</table>

// Avoid: Inline styles
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <tr style={{ borderBottom: '1px solid #eee' }}>
    <td style={{ padding: '0.5rem' }}>
      <input style={{ width: '100%', padding: '0.4rem' }} />
    </td>
  </tr>
</table>
```

This guide ensures consistent, maintainable, and responsive styling across all document overlay forms.
