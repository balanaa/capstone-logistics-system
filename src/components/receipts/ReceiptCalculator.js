import React, { useState, useCallback } from 'react';
import './ReceiptCalculator.css';

// ReceiptRow component for individual rows with editable label and numeric input
export const ReceiptRow = ({ 
  label = 'New label', 
  value = 0, 
  onLabelChange, 
  onValueChange, 
  onDelete, 
  isChild = false,
  withholdingParent = false,
  withholdingChild = false,
  defaultPct = 0,
  withholdingTaxChecked = true,
  onPercentChange
}) => {
  const [localValue, setLocalValue] = useState(value);
  const [localLabel, setLocalLabel] = useState(label);
  const [isEditing, setIsEditing] = useState(false);

  // Format number for display
  const formatToDisplay = useCallback((num) => {
    if (!isFinite(num)) return "0.00";
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(num);
  }, []);

  // Parse input to number
  const parseInputToNumber = useCallback((str) => {
    if (!str) return 0;
    const cleaned = String(str).replace(/,/g, '').trim();
    if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') return 0;
    const n = Number(cleaned);
    return isFinite(n) ? n : 0;
  }, []);

  // Format with commas while typing
  const formatWithCommasWhileTyping = useCallback((raw, caretPos) => {
    if (raw === '' || raw === '-' || raw === '.' || raw === '-.') return { value: raw, caret: caretPos };

    let nonCommaLeft = 0;
    for (let i = 0; i < Math.min(caretPos, raw.length); i++) {
      if (raw[i] !== ',') nonCommaLeft++;
    }

    let stripped = String(raw).replace(/,/g, '');
    const hasMinus = stripped.startsWith('-');
    if (hasMinus) stripped = stripped.slice(1);

    const hasDot = stripped.indexOf('.') !== -1;
    const parts = stripped.split('.');
    const intPart = parts.shift() || '0';
    const decPart = parts.join('');

    const intNumber = intPart === '' ? 0 : Number(intPart);
    const intFormatted = isFinite(intNumber) ? intNumber.toLocaleString('en-US') : intPart;

    let newVal;
    if (hasDot) {
      newVal = (hasMinus ? '-' : '') + intFormatted + (decPart ? ('.' + decPart) : '.');
    } else {
      newVal = (hasMinus ? '-' : '') + (decPart ? (intFormatted + '.' + decPart) : intFormatted);
    }

    let counted = 0;
    let newCaret = 0;
    for (let i = 0; i < newVal.length; i++) {
      if (newVal[i] !== ',') counted++;
      if (counted >= nonCommaLeft) {
        newCaret = i + 1;
        break;
      }
    }
    if (counted < nonCommaLeft) {
      newCaret = newVal.length;
    }

    return { value: newVal, caret: newCaret };
  }, []);

  // Handle numeric input
  const handleNumericInput = useCallback((e) => {
    const caret = e.target.selectionStart || 0;
    const raw = e.target.value || '';
    let cleaned = raw.replace(/[^0-9.\-]/g, '');
    
    // Ensure only one minus and at start
    if ((cleaned.match(/-/g) || []).length > 1) cleaned = '-' + cleaned.replace(/-/g, '');
    if (cleaned.includes('-') && cleaned.indexOf('-') > 0) cleaned = '-' + cleaned.replace(/-/g, '');
    
    // Ensure single dot
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex !== -1) {
      const left = cleaned.slice(0, dotIndex + 1);
      const right = cleaned.slice(dotIndex + 1).replace(/\./g, '');
      cleaned = left + right;
    }
    
    const result = formatWithCommasWhileTyping(cleaned, caret);
    if (result.value !== e.target.value) {
      e.target.value = result.value;
      try { 
        e.target.selectionStart = e.target.selectionEnd = result.caret; 
      } catch(e) {}
    }
    
    const numValue = parseInputToNumber(result.value);
    setLocalValue(numValue);
    onValueChange?.(numValue);
  }, [formatWithCommasWhileTyping, parseInputToNumber, onValueChange]);

  // Handle input focus
  const handleInputFocus = useCallback((e) => {
    const current = e.target.value || '';
    const cleaned = String(current).replace(/,/g, '');
    if (cleaned === '0' || cleaned === '0.00') { 
      e.target.value = ''; 
      return; 
    }
    e.target.value = cleaned;
    setTimeout(() => { 
      try { 
        e.target.selectionStart = e.target.selectionEnd = e.target.value.length; 
      } catch(e) {} 
    }, 0);
  }, []);

  // Handle input blur
  const handleInputBlur = useCallback((e) => {
    e.target.value = formatToDisplay(parseInputToNumber(e.target.value));
    const numValue = parseInputToNumber(e.target.value);
    setLocalValue(numValue);
    onValueChange?.(numValue);
  }, [formatToDisplay, parseInputToNumber, onValueChange]);

  // Handle label change
  const handleLabelChange = useCallback((e) => {
    const newLabel = e.target.value;
    setLocalLabel(newLabel);
    onLabelChange?.(newLabel);
  }, [onLabelChange]);

  // Handle percent input for withholding
  const handlePercentInput = useCallback((e) => {
    let raw = e.target.value.replace(/%/g, '').replace(/[^0-9.\-]/g, '');
    e.target.value = raw + '%';
  }, []);

  const handlePercentBlur = useCallback((e) => {
    const raw = e.target.value.replace(/%/g, '').replace(/[^0-9.\-]/g, '');
    const n = parseInputToNumber(raw);
    const percentValue = isFinite(n) ? n : 0;
    e.target.value = String(percentValue) + '%';
    onPercentChange?.(percentValue);
  }, [parseInputToNumber, onPercentChange]);

  return (
    <div className={`row ${isChild ? 'child-row' : ''}`}>
      <div className="del-wrap">
        <button 
          className="del delete-button" 
          onClick={onDelete}
          title="Delete row"
        >
          <i className="fi fi-rs-trash"></i>
        </button>
      </div>
      
      <input
        className="label"
        value={localLabel}
        onChange={handleLabelChange}
        onFocus={() => setIsEditing(true)}
        onBlur={() => setIsEditing(false)}
        placeholder="Enter label"
        title="Click to edit label"
      />
      
      <div className="right-controls">
        {withholdingParent && withholdingTaxChecked && (
          <>
            <input
              className="percent-input withholding-percent"
              defaultValue={`${defaultPct}%`}
              onInput={handlePercentInput}
              onBlur={handlePercentBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
            <input
              className="value withholding-base"
              defaultValue={formatToDisplay(localValue)}
              onInput={handleNumericInput}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            />
          </>
        )}
        {withholdingParent && !withholdingTaxChecked && (
          <input
            className="value"
            defaultValue={formatToDisplay(localValue)}
            onInput={handleNumericInput}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
        )}
        {withholdingChild && (
          <input
            className="value withholding-base"
            defaultValue={formatToDisplay(localValue)}
            onInput={handleNumericInput}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
        )}
        {!withholdingParent && !withholdingChild && (
          <input
            className="value"
            defaultValue={formatToDisplay(localValue)}
            onInput={handleNumericInput}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
          />
        )}
      </div>
    </div>
  );
};

// ReceiptGroup component for group containers
export const ReceiptGroup = ({ 
  title = 'New Group', 
  rows = [], 
  onTitleChange, 
  onAddRow, 
  onDeleteRow, 
  onDeleteGroup,
  groupTotal = 0,
  withholdingTaxChecked = true
}) => {
  const [localTitle, setLocalTitle] = useState(title);

  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);
    onTitleChange?.(newTitle);
  }, [onTitleChange]);

  const formatToDisplay = useCallback((num) => {
    if (!isFinite(num)) return "0.00";
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(num);
  }, []);

  return (
    <div className="group">
      <div className="group-head">
        <input
          className="group-title"
          value={localTitle}
          onChange={handleTitleChange}
          placeholder="Enter group title"
          title="Click to edit group name"
        />
        <div className="group-controls">
          <button 
            className="del-group-btn delete-button"
            onClick={onDeleteGroup}
            title="Delete group"
          >
            <i className="fi fi-rs-trash"></i>
            Delete Group
          </button>
        </div>
      </div>
      
      <div className="rows">
        {rows.map((row, index) => (
          <ReceiptRow
            key={row.id || index}
            label={row.label}
            value={row.value}
            isChild={row.isChild}
            withholdingParent={row.withholdingParent}
            withholdingChild={row.withholdingChild}
            defaultPct={row.defaultPct}
            withholdingTaxChecked={withholdingTaxChecked}
            onLabelChange={(newLabel) => onDeleteRow?.(index, 'label', newLabel)}
            onValueChange={(newValue) => onDeleteRow?.(index, 'value', newValue)}
            onPercentChange={(newPercent) => onDeleteRow?.(index, 'withholdingPercent', newPercent)}
            onDelete={() => onDeleteRow?.(index, 'delete')}
          />
        ))}
      </div>
      
      <div className="add-area">
        <button 
          className="add"
          onClick={onAddRow}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'block',
            width: '100%',
            textAlign: 'center'
          }}
        >
          Add Row
        </button>
      </div>
      
       <div className="summary">
         <div className="label">{localTitle.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())} - Total</div>
         <div className="value">{formatToDisplay(groupTotal)}</div>
       </div>
    </div>
  );
};

// Default data structure
export const DEFAULT_RECEIPT_DATA = {
  statement_of_accounts: {
    "REIMBURSABLE CHARGES": [
      "Handling Expenses"
    ],
    "ADVANCES (REFUNDABLE CHARGES)": [
      "Terminal Handling Charges",
      "AISL Container Clearance", 
      "Wharfage",
      "Cargo Charges",
      "TABS Early Penalty Fee",
      "Manpower for Unloading"
    ],
    "FACILITATION EXPENSES": [
      "Incidental Expenses"
    ]
  },
  service_invoice: {
    "SERVICE CHARGES": [
      "Brokerage Fee",
      { "Documentation & Processing": ["Processing Charges"] },
      "Hauling Charges"
    ]
  }
};
