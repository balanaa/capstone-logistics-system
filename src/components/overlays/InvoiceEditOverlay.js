import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'

// Invoice-specific edit overlay with structured form layout:
// - Top: Document info (Invoice No., Invoice Date, Incoterms)
// - Middle: Line items table (editable)
// - Bottom: Totals (Total Quantity, Total Amount)
export default function InvoiceEditOverlay({
  title,
  fileUrl,
  fileName,
  initialValues = {},
  initialItems = [],
  onClose,
  onSubmit,
  updatedAt,
  updatedBy,
  uploadedBy
}) {
  // Document info fields
  const [invoiceNo, setInvoiceNo] = React.useState(initialValues.invoice_no || '')
  const [invoiceDate, setInvoiceDate] = React.useState(initialValues.invoice_date || '')
  const [incoterms, setIncoterms] = React.useState(initialValues.incoterms || '')
  const [currency, setCurrency] = React.useState(initialValues.invoice_currency || 'USD')

  // Line items
  const [items, setItems] = React.useState(() => {
    if (initialItems.length) return initialItems
    return [{ product: '', quantity: '', unitPrice: '', amount: '' }]
  })

  // Totals - manual input (no auto-calculation)
  const [totalQuantity, setTotalQuantity] = React.useState(initialValues.total_quantity || '')
  const [totalAmount, setTotalAmount] = React.useState(initialValues.total_amount || '')

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      
      // Auto-calculate amount if quantity and unitPrice are both present
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = parseFloat(field === 'quantity' ? value : item.quantity) || 0
        const price = parseFloat(field === 'unitPrice' ? value : item.unitPrice) || 0
        if (qty && price) {
          updated.amount = (qty * price).toFixed(2)
        }
      }
      
      return updated
    }))
  }

  const addItem = () => {
    setItems(prev => [...prev, { product: '', quantity: '', unitPrice: '', amount: '' }])
  }

  const add3Items = () => {
    setItems(prev => [
      ...prev,
      { product: '', quantity: '', unitPrice: '', amount: '' },
      { product: '', quantity: '', unitPrice: '', amount: '' },
      { product: '', quantity: '', unitPrice: '', amount: '' }
    ])
  }

  const fillDummyData = () => {
    setInvoiceNo('INV-2025-001')
    setInvoiceDate('2025-04-15')
    setIncoterms('FOB')
    setCurrency('USD')
    setItems([
      { product: 'Sample Product A', quantity: '10', unitPrice: '500.00', amount: '5000.00' },
      { product: 'Sample Product B', quantity: '20', unitPrice: '300.00', amount: '6000.00' },
      { product: 'Sample Product C', quantity: '15', unitPrice: '400.00', amount: '6000.00' }
    ])
    setTotalQuantity('45')
    setTotalAmount('17000.00')
  }

  const removeItem = (idx) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const values = {
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      incoterms: incoterms,
      invoice_currency: currency,
      items: items,
      total_quantity: totalQuantity,
      total_amount: totalAmount
    }
    onSubmit(values)
  }

  // Format the last edited timestamp
  const lastEditedText = updatedAt ? formatDateTime(updatedAt) : (initialValues.uploaded_at ? formatDateTime(initialValues.uploaded_at) : '')
  const lastSavedByText = updatedBy || uploadedBy || 'Unknown'

  return (
    <div className="cso-backdrop" onClick={onClose}>
      <div className="cso-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cso-header">
          <div className="cso-header-left">
            <h2 className="cso-header-title">Edit {title || 'Commercial Invoice'}</h2>
          </div>
          <div className="cso-header-right">
            {lastEditedText && <span>Last Edited On: {lastEditedText}</span>}
            <button className="cso-close-btn" onClick={onClose} type="button">✕</button>
          </div>
        </div>

        <div className="cso-body">
          {/* Left side - File preview */}
          <div className="cso-left">
            {fileUrl ? (
              canEmbed ? (
                ext === 'pdf' ? (
                  <iframe title={fileName || 'document'} src={fileUrl} className="cso-frame" />
                ) : (
                  <img alt={fileName || 'document'} src={fileUrl} className="cso-image" />
                )
              ) : (
                <div className="cso-fallback">Preview unavailable. Selected: {fileName || 'file'}</div>
              )
            ) : (
              <div className="cso-fallback">No file selected</div>
            )}
          </div>

          {/* Right side - Structured form */}
          <div className="cso-right">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: '0 0.75em' }}>
                {/* Top section - Invoice Information */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3>Invoice Information</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                    <div className="form-group">
                      <label>Invoice No.</label>
                      <input
                        type="text"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Incoterms</label>
                      <input
                        type="text"
                        value={incoterms}
                        onChange={(e) => setIncoterms(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Invoice Date</label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Currency</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          list="currency-options"
                          style={{ width: '100%', paddingRight: '2.5rem' }}
                        />
                        <select
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          style={{ 
                            position: 'absolute', 
                            right: '0.5rem', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'transparent',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            width: '2rem'
                          }}
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="PHP">PHP</option>
                          <option value="GBP">GBP</option>
                          <option value="JPY">JPY</option>
                          <option value="CNY">CNY</option>
                        </select>
                        <datalist id="currency-options">
                          <option value="USD" />
                          <option value="EUR" />
                          <option value="PHP" />
                          <option value="GBP" />
                          <option value="JPY" />
                          <option value="CNY" />
                        </datalist>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle section - Product Details */}
                <div className="invoice-section">
                  <h3>Product Details</h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Amount</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                value={item.product}
                                onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => handleItemChange(idx, 'amount', e.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                disabled={items.length <= 1}
                                className="invoice-delete-btn"
                              >
                                <i className="fi fi-rs-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="add-pair-btn"
                  >
                    + Add Item
                  </button>
                </div>

                {/* Bottom section - Totals (manual input) */}
                <div className="invoice-section">
                  <h3>Totals</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Total Quantity</label>
                      <input
                        type="number"
                        value={totalQuantity}
                        onChange={(e) => setTotalQuantity(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Total Amount</label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => setTotalAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Debug - Dummy Data Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', padding: '0 0.75em' }}>
                <button 
                  className="cso-btn" 
                  type="button" 
                  onClick={fillDummyData}
                  style={{ background: '#fef3c7', borderColor: '#fbbf24', width: '100%' }}
                >
                  Fill Dummy Data
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="cso-footer">
          <div className="cso-footer-left">
            Last Save By: {lastSavedByText}
          </div>
          <div className="cso-footer-right">
            <button className="cso-btn" type="button" onClick={onClose}>Cancel</button>
            <button className="cso-btn cso-primary" type="button" onClick={handleSubmit}>Submit</button>
          </div>
        </div>
      </div>
    </div>
  )
}

