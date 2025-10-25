import React from 'react';
import { formatNumber } from '../../utils/numberUtils';
import './ReceiptBlock.css';

export default function ReceiptBlock({ receipt, onEdit, onExport, onDelete }) {
  const { receipt_data, receipt_type, created_at } = receipt;
  
  // Format receipt type for display
  const receiptTypeDisplay = receipt_type === 'statement_of_accounts' 
    ? 'Statement of Account' 
    : 'Service Invoice';
  
  // Format creation date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency for display
  const formatToDisplay = (value) => {
    return formatNumber(value || 0);
  };

  return (
    <div className="receipt-block">
      <div className="receipt-header">
        <h3>{receiptTypeDisplay}</h3>
        <span className="date">{formatDate(created_at)}</span>
      </div>
      
      <div className="receipt-body">
        {receipt_data.groups && receipt_data.groups.map(group => (
          <div key={group.id} className="group-display">
            <h4 className="group-title">{group.title}</h4>
            <div className="group-rows">
              {group.rows.map((row, index) => (
                <div key={index} className="row-display">
                  <span className="label">{row.label}</span>
                  <span className="value">₱{formatToDisplay(row.value)}</span>
                </div>
              ))}
            </div>
             <div className="group-total">
               <span className="label">Total:</span>
               <span className="value">₱{formatToDisplay(receipt_data.totals?.[group.id])}</span>
             </div>
          </div>
        ))}
        
         <div className="grand-total">
           <span className="label">Grand Total:</span>
           <span className="value">₱{formatToDisplay(receipt_data.grandTotal)}</span>
         </div>
        
        {/* Service Invoice specific fields */}
        {receipt_type === 'service_invoice' && receipt_data.vatExemptChecked !== undefined && (
          <div className="service-invoice-details">
            <div className="vat-section">
              <div className="vat-columns">
                <div className="vat-column">
                  <div className="vat-row">
                    <span className="label">VATable Sales:</span>
                    <span className="value">₱{formatToDisplay(receipt_data.vatableSales)}</span>
                  </div>
                  <div className="vat-row">
                    <span className="label">VAT ({receipt_data.vatPercent || 0}%):</span>
                    <span className="value">₱{formatToDisplay(receipt_data.vatValue)}</span>
                  </div>
                  <div className="vat-row">
                    <span className="label">VAT Exempt Sales:</span>
                    <span className="value">₱{formatToDisplay(receipt_data.vatExemptSales)}</span>
                  </div>
                </div>
                <div className="vat-column">
                  <div className="vat-row">
                    <span className="label">Total Sales (VAT Inc.):</span>
                    <span className="value">₱{formatToDisplay(receipt_data.totalSalesVatInc)}</span>
                  </div>
                  <div className="vat-row">
                    <span className="label">Less: VAT:</span>
                    <span className="value">₱{formatToDisplay(receipt_data.lessVat)}</span>
                  </div>
                  <div className="vat-row">
                    <span className="label">Amount — Net of VAT:</span>
                    <span className="value">₱{formatToDisplay(receipt_data.amountNetOfVat)}</span>
                  </div>
                  <div className="vat-row">
                    <span className="label">Add: VAT:</span>
                    <span className="value">₱{formatToDisplay(receipt_data.addVat)}</span>
                  </div>
                  {receipt_data.withholdingTaxChecked && (
                    <div className="vat-row">
                      <span className="label">Less: Withholding Tax:</span>
                      <span className="value">₱{formatToDisplay(receipt_data.withholdingTax)}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="vat-row total-amount">
                <span className="label">TOTAL AMOUNT DUE:</span>
                <span className="value">₱{formatToDisplay(receipt_data.totalAmountDue)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="receipt-actions">
        <button className="btn-secondary" onClick={onEdit}>
          <i className="fi fi-rs-pencil"></i>
        </button>
        <button className="btn-primary" onClick={onExport}>
          <i className="fi fi-rs-download"></i>
          Download Word
        </button>
        <button className="btn-danger" onClick={onDelete}>
          <i className="fi fi-rs-trash"></i>
        </button>
      </div>
    </div>
  );
}
