// Word Export Utility for Finance Receipts
import { formatDateTime } from './dateUtils';

// Escape HTML to prevent XSS
function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Format currency
function formatCurrency(amount) {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Generate Statement of Account Word document
export function generateStatementOfAccountsDoc(receiptData, proNumber) {
  const { groups, totals, grandTotal } = receiptData;
  const timestamp = new Date().toLocaleString();
  
  let htmlRows = '';
  
  groups.forEach(group => {
    const groupTitle = group.title || '';
    htmlRows += `<tr><td colspan="2" style="background:#f0f0f0;padding:8px;"><strong>${escapeHtml(groupTitle)}</strong></td></tr>`;
    
    group.rows.forEach(row => {
      const label = (row.label || '').trim();
      const value = formatCurrency(row.value || 0);
      htmlRows += `
        <tr>
          <td style="padding:6px 8px; vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 8px; text-align:right; vertical-align:top;">₱${escapeHtml(value)}</td>
        </tr>
      `;
    });
    
    const groupTotal = formatCurrency(totals[group.id] || 0);
    htmlRows += `
      <tr>
        <td style="padding:8px 8px; font-weight:700;">Group Total</td>
        <td style="padding:8px 8px; text-align:right; font-weight:700;">₱${escapeHtml(groupTotal)}</td>
      </tr>
    `;
  });
  
  const grandTotalFormatted = formatCurrency(grandTotal || 0);
  
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            color: #222; 
            margin: 20px;
            line-height: 1.4;
          }
          h1 { 
            color: #005CAB; 
            margin-bottom: 10px;
            font-size: 24px;
          }
          h2 { 
            margin-top: 20px; 
            margin-bottom: 10px;
            color: #005CAB;
            font-size: 18px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 12px; 
            margin-bottom: 20px;
          }
          td { 
            border: 1px solid #ddd; 
            padding: 8px;
          }
          .header-info {
            margin-bottom: 20px;
            font-size: 14px;
            color: #666;
          }
          .total-row {
            background-color: #f8f9fa;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>Statement of Account</h1>
        <div class="header-info">
          <strong>PRO Number:</strong> ${escapeHtml(proNumber)}<br>
          <strong>Generated:</strong> ${escapeHtml(timestamp)}
        </div>
        
        <table>
          ${htmlRows}
          <tr class="total-row">
            <td style="padding:12px; font-weight:900; font-size:16px;">TOTAL AMOUNT</td>
            <td style="padding:12px; text-align:right; font-weight:900; font-size:16px;">₱${escapeHtml(grandTotalFormatted)}</td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666;">
          <p><strong>Note:</strong> This statement of accounts is generated automatically and includes all applicable charges and fees.</p>
        </div>
      </body>
    </html>
  `;
}

// Generate Service Invoice Word document
export function generateServiceInvoiceDoc(receiptData, proNumber) {
  const { 
    groups, 
    totals, 
    grandTotal,
    vatExemptChecked,
    vatPercent,
    vatableSales,
    vatValue,
    vatExemptSales,
    totalSalesVatInc,
    lessVat,
    amountNetOfVat,
    addVat,
    withholdingTax,
    totalAmountDue
  } = receiptData;
  
  const timestamp = new Date().toLocaleString();
  
  let htmlRows = '';
  
  groups.forEach(group => {
    const groupTitle = group.title || '';
    htmlRows += `<tr><td colspan="2" style="background:#f0f0f0;padding:8px;"><strong>${escapeHtml(groupTitle)}</strong></td></tr>`;
    
    group.rows.forEach(row => {
      const label = (row.label || '').trim();
      const value = formatCurrency(row.value || 0);
      htmlRows += `
        <tr>
          <td style="padding:6px 8px; vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 8px; text-align:right; vertical-align:top;">₱${escapeHtml(value)}</td>
        </tr>
      `;
    });
    
    const groupTotal = formatCurrency(totals[group.id] || 0);
    htmlRows += `
      <tr>
        <td style="padding:8px 8px; font-weight:700;">Group Total</td>
        <td style="padding:8px 8px; text-align:right; font-weight:700;">₱${escapeHtml(groupTotal)}</td>
      </tr>
    `;
  });
  
  const serviceChargesTotal = formatCurrency(grandTotal || 0);
  const vatableSalesFormatted = formatCurrency(vatableSales || 0);
  const vatValueFormatted = formatCurrency(vatValue || 0);
  const vatExemptSalesFormatted = formatCurrency(vatExemptSales || 0);
  const totalSalesVatIncFormatted = formatCurrency(totalSalesVatInc || 0);
  const lessVatFormatted = formatCurrency(lessVat || 0);
  const amountNetOfVatFormatted = formatCurrency(amountNetOfVat || 0);
  const addVatFormatted = formatCurrency(addVat || 0);
  const withholdingTaxFormatted = formatCurrency(withholdingTax || 0);
  const totalAmountDueFormatted = formatCurrency(totalAmountDue || 0);
  
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            color: #222; 
            margin: 20px;
            line-height: 1.4;
          }
          h1 { 
            color: #005CAB; 
            margin-bottom: 10px;
            font-size: 24px;
          }
          h2 { 
            margin-top: 20px; 
            margin-bottom: 10px;
            color: #005CAB;
            font-size: 18px;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 12px; 
            margin-bottom: 20px;
          }
          td { 
            border: 1px solid #ddd; 
            padding: 8px;
          }
          .header-info {
            margin-bottom: 20px;
            font-size: 14px;
            color: #666;
          }
          .total-row {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .tax-table {
            margin-top: 20px;
          }
          .tax-section {
            display: inline-block;
            width: 48%;
            vertical-align: top;
            margin-right: 2%;
          }
          .final-total {
            background-color: #e3f2fd;
            font-weight: bold;
            font-size: 16px;
          }
        </style>
      </head>
      <body>
        <h1>Service Invoice</h1>
        <div class="header-info">
          <strong>PRO Number:</strong> ${escapeHtml(proNumber)}<br>
          <strong>Generated:</strong> ${escapeHtml(timestamp)}
        </div>
        
        <h2>Service Charges</h2>
        <table>
          ${htmlRows}
          <tr class="total-row">
            <td style="padding:12px; font-weight:900;">Service Charges Total</td>
            <td style="padding:12px; text-align:right; font-weight:900;">₱${escapeHtml(serviceChargesTotal)}</td>
          </tr>
        </table>
        
        <h2>Taxes & Totals</h2>
        <table class="tax-table">
          <tr>
            <td style="vertical-align:top; width:50%;">
              <table style="width:100%; border-collapse: collapse;">
                <tr>
                  <td style="padding:6px 8px;">VATable Sales</td>
                  <td style="padding:6px 8px; text-align:right;">₱${escapeHtml(vatableSalesFormatted)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;">VAT (${vatPercent}%)</td>
                  <td style="padding:6px 8px; text-align:right;">₱${escapeHtml(vatValueFormatted)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;">VAT Exempt Sales</td>
                  <td style="padding:6px 8px; text-align:right;">₱${escapeHtml(vatExemptSalesFormatted)}</td>
                </tr>
              </table>
            </td>
            <td style="vertical-align:top; width:50%;">
              <table style="width:100%; border-collapse: collapse;">
                <tr>
                  <td style="padding:6px 8px;">Total Sales (VAT Inc.)</td>
                  <td style="padding:6px 8px; text-align:right;">₱${escapeHtml(totalSalesVatIncFormatted)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;">Less: VAT</td>
                  <td style="padding:6px 8px; text-align:right;">₱${escapeHtml(lessVatFormatted)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;">Amount - Net of VAT</td>
                  <td style="padding:6px 8px; text-align:right;">₱${escapeHtml(amountNetOfVatFormatted)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;">Add: VAT</td>
                  <td style="padding:6px 8px; text-align:right;">₱${escapeHtml(addVatFormatted)}</td>
                </tr>
                ${receiptData.withholdingTaxChecked ? `
                <tr>
                  <td style="padding:6px 8px;">Less: Withholding Tax</td>
                  <td style="padding:6px 8px; text-align:right;">₱${escapeHtml(withholdingTaxFormatted)}</td>
                </tr>
                ` : ''}
                <tr class="final-total">
                  <td style="padding:10px 8px; font-weight:800;">TOTAL AMOUNT DUE</td>
                  <td style="padding:10px 8px; text-align:right; font-weight:800;">₱${escapeHtml(totalAmountDueFormatted)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <div style="margin-top: 30px; font-size: 12px; color: #666;">
          <p><strong>Note:</strong> This service invoice is generated automatically and includes all applicable taxes and fees.</p>
          ${vatExemptChecked ? '<p><strong>VAT Status:</strong> This invoice is VAT exempt.</p>' : ''}
        </div>
      </body>
    </html>
  `;
}
