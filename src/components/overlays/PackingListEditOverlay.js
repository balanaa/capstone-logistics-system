import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'

// Packing List-specific edit overlay with structured form layout:
// - Top: Document info (if any)
// - Middle: Line items table (editable)
// - Bottom: Totals (Total Quantity, Total Net Weight, Total Gross Weight)
export default function PackingListEditOverlay({
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
  // Line items
  const [items, setItems] = React.useState(() => {
    if (initialItems.length) return initialItems
    return [{ product: '', quantity: '', netWeight: '', grossWeight: '' }]
  })

  // Totals - manual input (no auto-calculation)
  const [totalQuantity, setTotalQuantity] = React.useState(initialValues.total_quantity || '')
  const [totalNetWeight, setTotalNetWeight] = React.useState(initialValues.total_net_weight || '')
  const [totalGrossWeight, setTotalGrossWeight] = React.useState(initialValues.total_gross_weight || '')

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, [field]: value }
    }))
  }

  const addItem = () => {
    setItems(prev => [...prev, { product: '', quantity: '', netWeight: '', grossWeight: '' }])
  }

  const fillDummyData = () => {
    setItems([
      { product: 'Sample Product A', quantity: '50', netWeight: '450.5', grossWeight: '500.0' },
      { product: 'Sample Product B', quantity: '30', netWeight: '280.0', grossWeight: '320.5' },
      { product: 'Sample Product C', quantity: '20', netWeight: '190.5', grossWeight: '220.0' }
    ])
    setTotalQuantity('100')
    setTotalNetWeight('921.0')
    setTotalGrossWeight('1040.5')
  }

  const removeItem = (idx) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const values = {
      items: items,
      total_quantity: totalQuantity,
      total_net_weight: totalNetWeight,
      total_gross_weight: totalGrossWeight
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
            <h2 className="cso-header-title">Edit {title || 'Packing List'}</h2>
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
                {/* Product Details */}
                <div className="packing-section">
                  <h3>Product Details</h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Net Weight</th>
                          <th>Gross Weight</th>
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
                                value={item.netWeight}
                                onChange={(e) => handleItemChange(idx, 'netWeight', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.grossWeight}
                                onChange={(e) => handleItemChange(idx, 'grossWeight', e.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                disabled={items.length <= 1}
                                className="packing-delete-btn"
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

                {/* Totals */}
                <div className="packing-section-with-border">
                  <h3>Totals</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Total Quantity</label>
                      <input
                        type="number"
                        value={totalQuantity}
                        onChange={(e) => setTotalQuantity(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Total Net Weight</label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalNetWeight}
                        onChange={(e) => setTotalNetWeight(e.target.value)}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label>Total Gross Weight</label>
                      <input
                        type="number"
                        step="0.01"
                        value={totalGrossWeight}
                        onChange={(e) => setTotalGrossWeight(e.target.value)}
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
