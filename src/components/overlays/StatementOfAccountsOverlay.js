import React, { useState, useCallback, useEffect } from 'react';
import './StatementOfAccountsOverlay.css';
import { ReceiptGroup, DEFAULT_RECEIPT_DATA } from '../receipts/ReceiptCalculator';
import { createReceipt, updateReceipt, exportReceiptToWord } from '../../services/supabase/financeReceipts';

export default function StatementOfAccountsOverlay({
  proNumber,
  onClose,
  existingReceipt = null
}) {
  const [groups, setGroups] = useState([]);
  const [groupTotals, setGroupTotals] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Initialize groups from defaults or existing data
  useEffect(() => {
    if (existingReceipt?.receipt_data?.groups) {
      setGroups(existingReceipt.receipt_data.groups);
    } else {
      // Initialize with default data
      const defaultGroups = Object.entries(DEFAULT_RECEIPT_DATA.statement_of_accounts).map(([title, items], index) => ({
        id: `group_${index + 1}`,
        title,
        rows: items.map((item, rowIndex) => ({
          id: `row_${index}_${rowIndex}`,
          label: typeof item === 'string' ? item : Object.keys(item)[0],
          value: 0,
          isChild: false
        }))
      }));
      setGroups(defaultGroups);
    }
  }, [existingReceipt]);

  // Calculate totals whenever groups change
  useEffect(() => {
    const totals = {};
    let grand = 0;
    
    groups.forEach(group => {
      const groupTotal = group.rows.reduce((sum, row) => sum + (row.value || 0), 0);
      totals[group.id] = groupTotal;
      grand += groupTotal;
    });
    
    setGroupTotals(totals);
    setGrandTotal(grand);
  }, [groups]);

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
    const defaultItems = DEFAULT_RECEIPT_DATA.statement_of_accounts[groupName];
    const newGroup = {
      id: `group_${Date.now()}`,
      title: groupName,
      rows: defaultItems.map((item, index) => ({
        id: `row_${Date.now()}_${index}`,
        label: item,
        value: 0,
        isChild: false
      }))
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
        lastUpdated: new Date().toISOString()
      };

      if (existingReceipt) {
        await updateReceipt(existingReceipt.id, receiptData);
      } else {
        await createReceipt(proNumber, 'statement_of_accounts', receiptData);
      }
      
      alert('Statement of Account saved successfully!');
      onClose();
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Error saving receipt. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [groups, groupTotals, grandTotal, proNumber, existingReceipt, onClose]);

  // Export to Word
  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const receiptData = {
        groups,
        totals: groupTotals,
        grandTotal,
        lastUpdated: new Date().toISOString()
      };

      // Generate Word document HTML directly
      const { generateStatementOfAccountsDoc } = await import('../../utils/receiptExportUtils');
      const htmlContent = generateStatementOfAccountsDoc(receiptData, proNumber);

      // Create blob and download
      const blob = new Blob([htmlContent], { type: 'application/msword' });
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `statement_of_accounts_${proNumber}_${timestamp}.doc`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('Statement of Account exported successfully!');
    } catch (error) {
      console.error('Error exporting receipt:', error);
      alert('Error exporting receipt. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groups, groupTotals, grandTotal, proNumber]);

  return (
    <div className="statement-overlay-wrapper">
      <div className="overlay-background">
        <div className="overlay-form statement-overlay">
        <div className="overlay-header">
          <h2>{existingReceipt ? 'Edit Statement of Account' : 'Statement of Account Calculator'}</h2>
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
                    onTitleChange={(newTitle) => handleGroupTitleChange(group.id, newTitle)}
                    onAddRow={() => handleAddRow(group.id)}
                    onDeleteRow={(rowIndex, field, value) => handleRowChange(group.id, rowIndex, field, value)}
                    onDeleteGroup={() => handleDeleteGroup(group.id)}
                  />
                ))}
              </div>
              
              {/* Add Group Buttons */}
              <div className="add-group-buttons">
                {Object.keys(DEFAULT_RECEIPT_DATA.statement_of_accounts).map(groupName => (
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
                <div className="grand-total-label">Grand Total (Statement of Account)</div>
                <div className="grand-total-value">
                  ₱{grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {(!grandTotal || grandTotal <= 0) && (
                  <div className="grand-total-warning" style={{ color: '#e74c3c', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    ⚠️ Cannot save with zero or negative total
                  </div>
                )}
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
