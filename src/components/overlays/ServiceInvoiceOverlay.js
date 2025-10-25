import React, { useState, useCallback, useEffect } from 'react';
import './ServiceInvoiceOverlay.css';
import { ReceiptGroup, DEFAULT_RECEIPT_DATA } from '../receipts/ReceiptCalculator';
import { createReceipt, updateReceipt, exportReceiptToWord } from '../../services/supabase/financeReceipts';

export default function ServiceInvoiceOverlay({
  proNumber,
  onClose,
  existingReceipt = null
}) {
  const [groups, setGroups] = useState([]);
  const [groupTotals, setGroupTotals] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // VAT and Tax calculations
  const [vatExemptChecked, setVatExemptChecked] = useState(false);
  const [vatPercent, setVatPercent] = useState(12);
  const [withholdingTaxChecked, setWithholdingTaxChecked] = useState(true);
  const [manualWithholding, setManualWithholding] = useState(0);
  
  // Computed values
  const [vatableSales, setVatableSales] = useState(0);
  const [vatValue, setVatValue] = useState(0);
  const [vatExemptSales, setVatExemptSales] = useState(0);
  const [totalSalesVatInc, setTotalSalesVatInc] = useState(0);
  const [lessVat, setLessVat] = useState(0);
  const [amountNetOfVat, setAmountNetOfVat] = useState(0);
  const [addVat, setAddVat] = useState(0);
  const [withholdingTax, setWithholdingTax] = useState(0);
  const [totalAmountDue, setTotalAmountDue] = useState(0);

  // Initialize groups from defaults or existing data
  useEffect(() => {
    if (existingReceipt?.receipt_data?.groups) {
      setGroups(existingReceipt.receipt_data.groups);
      setVatExemptChecked(existingReceipt.receipt_data.vatExemptChecked || false);
      setVatPercent(existingReceipt.receipt_data.vatPercent || 12);
      setWithholdingTaxChecked(existingReceipt.receipt_data.withholdingTaxChecked !== false);
      setManualWithholding(existingReceipt.receipt_data.manualWithholding || 0);
    } else {
      // Initialize with default data
      const defaultGroups = Object.entries(DEFAULT_RECEIPT_DATA.service_invoice).map(([title, items], index) => ({
        id: `group_${index + 1}`,
        title,
        rows: items.map((item, rowIndex) => {
          if (typeof item === 'string') {
            // Special handling for withholding rows
            if (item.toLowerCase().includes('brokerage')) {
              return {
                id: `row_${index}_${rowIndex}`,
                label: item,
                value: 0,
                withholdingParent: true,
                defaultPct: 20
              };
            } else if (item.toLowerCase().includes('hauling')) {
              return {
                id: `row_${index}_${rowIndex}`,
                label: item,
                value: 0,
                withholdingParent: true,
                defaultPct: 2
              };
            } else {
              return {
                id: `row_${index}_${rowIndex}`,
                label: item,
                value: 0,
                isChild: false
              };
            }
          } else {
            // Handle nested objects like Documentation & Processing
            const parentLabel = Object.keys(item)[0];
            const children = item[parentLabel];
            return {
              id: `row_${index}_${rowIndex}`,
              label: parentLabel,
              value: 0,
              withholdingParent: parentLabel.toLowerCase().includes('documentation'),
              defaultPct: 2,
              children: children.map((child, childIndex) => ({
                id: `row_${index}_${rowIndex}_${childIndex}`,
                label: child,
                value: 0,
                withholdingChild: true
              }))
            };
          }
        })
      }));
      setGroups(defaultGroups);
    }
  }, [existingReceipt]);

  // Calculate totals whenever groups change
  useEffect(() => {
    const totals = {};
    let grand = 0;
    
    groups.forEach(group => {
      const groupTotal = group.rows.reduce((sum, row) => {
        let rowTotal = row.value || 0;
        // Add child values for withholding rows
        if (row.children) {
          rowTotal += row.children.reduce((childSum, child) => childSum + (child.value || 0), 0);
        }
        return sum + rowTotal;
      }, 0);
      totals[group.id] = groupTotal;
      grand += groupTotal;
    });
    
    setGroupTotals(totals);
    setGrandTotal(grand);
  }, [groups]);

  // Calculate VAT and tax values
  useEffect(() => {
    const serviceChargesTotal = grandTotal;
    
    if (vatExemptChecked) {
      // VAT Exempt flow: Service Charges → VAT Exempt Sales → Total Sales (VAT Inc.)
      setVatableSales(0);
      setVatValue(0);
      setVatExemptSales(serviceChargesTotal);
      setTotalSalesVatInc(serviceChargesTotal);
      setLessVat(0);
      setAmountNetOfVat(serviceChargesTotal);
      setAddVat(0);
    } else {
      // Normal VAT flow: Service Charges → VATable Sales → calculate VAT → Total Sales (VAT Inc.)
      setVatableSales(serviceChargesTotal);
      setVatExemptSales(0);
      
      const vat = serviceChargesTotal * (vatPercent / 100);
      setVatValue(vat);
      
      const totalVatInc = serviceChargesTotal + vat;
      setTotalSalesVatInc(totalVatInc);
      setLessVat(vat);
      setAmountNetOfVat(serviceChargesTotal);
      setAddVat(vat);
    }
    
    // Calculate withholding tax
    let withholding = 0;
    if (withholdingTaxChecked) {
      // Calculate from withholding rows with adjustable percentages
      groups.forEach(group => {
        group.rows.forEach(row => {
          if (row.withholdingParent) {
            const pct = row.withholdingPercent || row.defaultPct || 0;
            const base = row.value || 0;
            let childBase = 0;
            if (row.children) {
              childBase = row.children.reduce((sum, child) => sum + (child.value || 0), 0);
            }
            withholding += (base + childBase) * (pct / 100);
          }
        });
      });
    }
    
    setWithholdingTax(withholding);
    setTotalAmountDue(totalSalesVatInc - withholding);
  }, [grandTotal, vatExemptChecked, vatPercent, withholdingTaxChecked, groups]);

  // Add new group
  const handleAddGroup = useCallback(() => {
    const newGroup = {
      id: `group_${Date.now()}`,
      title: 'New Group',
      rows: [{
        id: `row_${Date.now()}`,
        label: 'New Item',
        value: 0,
        isChild: false
      }]
    };
    setGroups(prev => [...prev, newGroup]);
  }, []);

  // Add group from defaults
  const handleAddGroupFromDefaults = useCallback((groupName) => {
    const defaultItems = DEFAULT_RECEIPT_DATA.service_invoice[groupName];
    const newGroup = {
      id: `group_${Date.now()}`,
      title: groupName,
      rows: defaultItems.map((item, index) => {
        if (typeof item === 'string') {
          // Special handling for withholding rows
          if (item.toLowerCase().includes('brokerage')) {
            return {
              id: `row_${Date.now()}_${index}`,
              label: item,
              value: 0,
              withholdingParent: true,
              defaultPct: 20
            };
          } else if (item.toLowerCase().includes('hauling')) {
            return {
              id: `row_${Date.now()}_${index}`,
              label: item,
              value: 0,
              withholdingParent: true,
              defaultPct: 2
            };
          } else {
            return {
              id: `row_${Date.now()}_${index}`,
              label: item,
              value: 0,
              isChild: false
            };
          }
        } else {
          // Handle nested objects like Documentation & Processing
          const parentLabel = Object.keys(item)[0];
          const children = item[parentLabel];
          return {
            id: `row_${Date.now()}_${index}`,
            label: parentLabel,
            value: 0,
            withholdingParent: parentLabel.toLowerCase().includes('documentation'),
            defaultPct: 2,
            children: children.map((child, childIndex) => ({
              id: `row_${Date.now()}_${index}_${childIndex}`,
              label: child,
              value: 0,
              withholdingChild: true
            }))
          };
        }
      })
    };
    setGroups(prev => [...prev, newGroup]);
  }, []);

  // Update group title
  const handleGroupTitleChange = useCallback((groupId, newTitle) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId ? { ...group, title: newTitle } : group
    ));
  }, []);

  // Delete group
  const handleDeleteGroup = useCallback((groupId) => {
    if (window.confirm('Delete this group? This will remove all its rows.')) {
      setGroups(prev => prev.filter(group => group.id !== groupId));
    }
  }, []);

  // Add row to group
  const handleAddRow = useCallback((groupId) => {
    const newRow = {
      id: `row_${Date.now()}`,
      label: 'New Item',
      value: 0,
      isChild: false
    };
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, rows: [...group.rows, newRow] }
        : group
    ));
  }, []);

  // Update row data
  const handleRowChange = useCallback((groupId, rowIndex, field, value) => {
    if (field === 'delete') {
      setGroups(prev => prev.map(group => 
        group.id === groupId 
          ? { ...group, rows: group.rows.filter((_, i) => i !== rowIndex) }
          : group
      ));
    } else {
      setGroups(prev => prev.map(group => 
        group.id === groupId 
          ? { 
              ...group, 
              rows: group.rows.map((row, i) => 
                i === rowIndex ? { ...row, [field]: value } : row
              )
            }
          : group
      ));
    }
  }, []);

  // Save receipt
  const handleSave = useCallback(async () => {
    // Validate grand total
    if (!grandTotal || grandTotal <= 0) {
      alert('Cannot save receipt with zero or negative grand total. Please add some items with amounts.');
      return;
    }

    setSaving(true);
    try {
      const receiptData = {
        groups,
        totals: groupTotals,
        grandTotal,
        vatExemptChecked,
        vatPercent,
        withholdingTaxChecked,
        vatableSales,
        vatValue,
        vatExemptSales,
        totalSalesVatInc,
        lessVat,
        amountNetOfVat,
        addVat,
        withholdingTax,
        totalAmountDue,
        lastUpdated: new Date().toISOString()
      };

      if (existingReceipt) {
        await updateReceipt(existingReceipt.id, receiptData);
      } else {
        await createReceipt(proNumber, 'service_invoice', receiptData);
      }
      
      alert('Service Invoice saved successfully!');
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Error saving receipt. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [groups, groupTotals, grandTotal, vatExemptChecked, vatPercent, withholdingTaxChecked, vatableSales, vatValue, vatExemptSales, totalSalesVatInc, lessVat, amountNetOfVat, addVat, withholdingTax, totalAmountDue, proNumber, existingReceipt]);

  // Export to Word
  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const receiptData = {
        groups,
        totals: groupTotals,
        grandTotal,
        vatExemptChecked,
        vatPercent,
        withholdingTaxChecked,
        vatableSales,
        vatValue,
        vatExemptSales,
        totalSalesVatInc,
        lessVat,
        amountNetOfVat,
        addVat,
        withholdingTax,
        totalAmountDue,
        lastUpdated: new Date().toISOString()
      };

      // Generate Word document HTML directly
      const { generateServiceInvoiceDoc } = await import('../../utils/receiptExportUtils');
      const htmlContent = generateServiceInvoiceDoc(receiptData, proNumber);

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `service_invoice_${proNumber}_${timestamp}.doc`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Service Invoice exported successfully!');
    } catch (error) {
      console.error('Error exporting receipt:', error);
      alert('Error exporting receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groups, groupTotals, grandTotal, vatExemptChecked, vatPercent, withholdingTaxChecked, vatableSales, vatValue, vatExemptSales, totalSalesVatInc, lessVat, amountNetOfVat, addVat, withholdingTax, totalAmountDue, proNumber]);

  const formatCurrency = (amount) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="service-invoice-wrapper">
      <div className="overlay-background">
        <div className="overlay-form service-invoice-overlay">
        <div className="overlay-header">
          <h2>{existingReceipt ? 'Edit Service Invoice' : 'Service Invoice Calculator'}</h2>
        </div>
        
        <div className="overlay-body">
          <div className="calculator-container">
            <div className="receipt-calculator">
              <div className="groups">
                {groups.map(group => (
                  <ReceiptGroup
                    key={group.id}
                    title={group.title}
                    rows={group.rows}
                    groupTotal={groupTotals[group.id] || 0}
                    withholdingTaxChecked={withholdingTaxChecked}
                    onTitleChange={(newTitle) => handleGroupTitleChange(group.id, newTitle)}
                    onAddRow={() => handleAddRow(group.id)}
                    onDeleteRow={(rowIndex, field, value) => handleRowChange(group.id, rowIndex, field, value)}
                    onDeleteGroup={() => handleDeleteGroup(group.id)}
                  />
                ))}
              </div>
              
              {/* Add Group Buttons */}
              <div className="add-group-buttons">
                {Object.keys(DEFAULT_RECEIPT_DATA.service_invoice).map(groupName => (
                  <button
                    key={groupName}
                    className="add-group-btn"
                    onClick={() => handleAddGroupFromDefaults(groupName)}
                  >
                    <i className="fi fi-rs-square-plus"></i>
                    {groupName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
              
              <div className="grand-total">
                <div className="grand-total-label">Total - Service Invoice</div>
                <div className="grand-total-value">
                  ₱{formatCurrency(grandTotal)}
                </div>
                {(!grandTotal || grandTotal <= 0) && (
                  <div className="grand-total-warning" style={{ color: '#e74c3c', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    ⚠️ Cannot save with zero or negative total
                  </div>
                )}
              </div>
              
              
              {/* VAT and Tax Calculations */}
              <div className="computed-block">
                <h3 className="computed-title">Totals & Taxes</h3>
              
              <div className="computed-table">
                <div className="computed-cell">
                  <div className="pair">
                    <div className="lbl">VATable Sales <span className="muted small">(from Service Charges)</span></div>
                    <div className="readonly">₱{formatCurrency(vatableSales)}</div>
                  </div>
                  <div className="pair-3">
                    <div className="lbl">VAT</div>
                    <input 
                      className="percent-input" 
                      value={`${vatPercent}%`}
                      onChange={(e) => {
                        const value = e.target.value.replace(/%/g, '');
                        const num = parseFloat(value) || 0;
                        setVatPercent(num);
                      }}
                      disabled={vatExemptChecked}
                    />
                    <div className="readonly">₱{formatCurrency(vatValue)}</div>
                  </div>
                  <div className="pair">
                    <div className="left-checkbox">
                      <input 
                        type="checkbox" 
                        checked={vatExemptChecked}
                        onChange={(e) => setVatExemptChecked(e.target.checked)}
                      />
                    </div>
                    <div className="lbl">VAT Exempt Sales</div>
                    <div className="readonly">₱{formatCurrency(vatExemptSales)}</div>
                  </div>
                </div>
                
                <div className="computed-cell">
                  <div className="pair">
                    <div className="lbl">Total Sales (Vat Inc.)</div>
                    <div className="readonly">₱{formatCurrency(totalSalesVatInc)}</div>
                  </div>
                  <div className="pair">
                    <div className="lbl">Less: Vat</div>
                    <div className="readonly">₱{formatCurrency(lessVat)}</div>
                  </div>
                  <div className="pair">
                    <div className="lbl">Amount — Net of Vat</div>
                    <div className="readonly">₱{formatCurrency(amountNetOfVat)}</div>
                  </div>
                  <div className="pair">
                    <div className="lbl">Add: VAT</div>
                    <div className="readonly">₱{formatCurrency(addVat)}</div>
                  </div>
                  <div className="pair">
                    <div className="left-checkbox">
                      <input 
                        type="checkbox" 
                        checked={withholdingTaxChecked}
                        onChange={(e) => setWithholdingTaxChecked(e.target.checked)}
                      />
                    </div>
                    <div className="lbl">Less: Withholding Tax</div>
                    <div className="readonly">₱{formatCurrency(withholdingTax)}</div>
                  </div>
                  <div className="pair total-due">
                    <div className="lbl">TOTAL AMOUNT DUE</div>
                    <div className="readonly">₱{formatCurrency(totalAmountDue)}</div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
        
        <div className="overlay-footer">
          <button 
            className="btn-secondary" 
            onClick={onClose}
            disabled={loading || saving}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={loading || saving || !grandTotal || grandTotal <= 0}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button 
            className="btn-primary" 
            onClick={handleExport}
            disabled={loading || saving}
          >
            {loading ? 'Exporting...' : 'Export to Word'}
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
