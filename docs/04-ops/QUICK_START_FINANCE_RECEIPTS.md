# Finance Receipts - Quick Implementation Guide

## Overview

Finance receipts system for generating Statement of Accounts and Service Invoice documents with dynamic calculators, VAT logic, and Word export.

---

## Quick Start

### 1. Database Setup

Run this SQL script in your Supabase SQL Editor:

```sql
-- File: docs/02-architecture/sql/create_finance_receipts.sql
-- Creates finance_receipts table with proper indexes and RLS policies
```

### 2. Test the Feature

1. Navigate to Finance Profile page
2. Scroll to "Generate Receipts" section
3. Click "Create Statement of Accounts" or "Create Service Invoice"
4. Use the calculator to add groups and rows
5. Click "Save" to store in database
6. Click "Export to Word" to download document

---

## Key Features

### Statement of Accounts Calculator

- ✅ Add/delete groups and rows
- ✅ Dynamic calculations
- ✅ Predefined group templates
- ✅ Word document export

### Service Invoice Calculator

- ✅ All Statement of Accounts features
- ✅ VAT exempt toggle logic
- ✅ Withholding tax calculations
- ✅ Readonly computed fields
- ✅ Professional invoice formatting

---

## Architecture

### Data Storage

- **Metadata**: `finance_receipts` table
- **Receipt Data**: `actions_log.payload` (JSON)
- **Export**: Local download only (no storage uploads)

### Components

- `ReceiptCalculator` - Core calculator logic
- `StatementOfAccountsOverlay` - Statement calculator UI
- `ServiceInvoiceOverlay` - Invoice calculator UI
- `financeReceipts.js` - Database service layer

---

## VAT Logic (Service Invoice)

### VAT Exempt Sales (Checked)

```
Service Charges → VAT Exempt Sales → Total Sales (VAT Inc.)
VATable Sales = 0.00
VAT = 0.00
Less: VAT = 0.00
Add: VAT = 0.00
```

### VAT Exempt Sales (Unchecked)

```
Service Charges → VATable Sales → VAT (calculated) → Total Sales (VAT Inc.)
VAT Exempt Sales = 0.00
```

### Withholding Tax

- Toggle checkbox to show/hide percentage inputs
- Calculate per row: `amount × withholding_percent`
- Sum all row calculations to "Less: Withholding Tax"

---

## Default Group Templates

### Statement of Accounts

- Facilitation Expenses
- Documentation Expenses
- Handling Expenses
- Storage Expenses

### Service Invoice

- Service Charges (with withholding tax support)
- Facilitation Expenses
- Documentation Expenses
- Handling Expenses
- Storage Expenses

---

## Troubleshooting

### Export Not Working

1. Check browser console for errors
2. Verify `receiptExportUtils.js` is imported correctly
3. Ensure Word document generation is working

### Save Not Working

1. Check Supabase connection
2. Verify `finance_receipts` table exists
3. Check RLS policies are correct
4. Verify user permissions

### VAT Calculations Wrong

1. Check VAT exempt checkbox state
2. Verify withholding tax checkbox state
3. Check percentage inputs are numeric
4. Verify readonly fields are not editable

---

## Files Reference

### Core Files

- `src/components/receipts/ReceiptCalculator.js` - Calculator logic
- `src/components/receipts/ReceiptCalculator.css` - Calculator styles
- `src/services/supabase/financeReceipts.js` - Database operations
- `src/utils/receiptExportUtils.js` - Word export

### Overlay Files

- `src/components/overlays/StatementOfAccountsOverlay.js`
- `src/components/overlays/StatementOfAccountsOverlay.css`
- `src/components/overlays/ServiceInvoiceOverlay.js`
- `src/components/overlays/ServiceInvoiceOverlay.css`

### Database Files

- `docs/02-architecture/sql/create_finance_receipts.sql`

---

## Status

✅ **Ready for Production** - All code complete, database setup required

**Next Step**: Run SQL script in Supabase to enable full functionality
