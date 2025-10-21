import React from 'react'
import './CreateShipmentOverlay.css'
import { supabase } from '../../services/supabase/client'
import { upsertPro, insertDocument } from '../../services/supabase/documents'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

// Combined Invoice Upload + Edit Overlay
// Left: File upload/preview | Right: Invoice form with line items
export default function InvoiceUploadAndEditOverlay({
  title,
  proNumber,
  onClose,
  onSuccess
}) {
  // Upload state
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState('')
  // File handling
  const [file, setFile] = React.useState(null)
  const [previewUrl, setPreviewUrl] = React.useState('')
  const [error, setError] = React.useState('')
  const inputRef = React.useRef(null)

  // Document info fields
  const [invoiceNo, setInvoiceNo] = React.useState('')
  const [invoiceDate, setInvoiceDate] = React.useState('')
  const [incoterms, setIncoterms] = React.useState('')
  const [currency, setCurrency] = React.useState('USD')

  // Line items
  const [items, setItems] = React.useState([{ product: '', quantity: '', unitPrice: '', amount: '' }])

  // Totals - manual input
  const [totalQuantity, setTotalQuantity] = React.useState('')
  const [totalAmount, setTotalAmount] = React.useState('')

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handlePick = () => inputRef.current?.click()

  const onFiles = (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    const f = list[0]
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError(`Unsupported type: ${f.type}`)
      return
    }
    setError('')
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
  }

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files)
  }

  const ext = (file?.name || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, [field]: value }
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file first')
      return
    }
    
    setUploading(true)
    setUploadError('')
    
    try {
      // 1) Upload file to storage
      const d = new Date()
      const HH = String(d.getHours()).padStart(2, '0')
      const MM = String(d.getMinutes()).padStart(2, '0')
      const SS = String(d.getSeconds()).padStart(2, '0')
      const timeTag = `${HH}${MM}${SS}`
      const safePro = String(proNumber).replace(/[^a-zA-Z0-9._-]/g, '_')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `shipment/${timeTag}-${safePro}-CI-${safeName}`
      
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (upErr) throw upErr

      // 2) Upsert PRO
      await upsertPro(proNumber)

      // 3) Insert document row
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess?.session?.user?.id
      const documentId = await insertDocument({
        proNumber: proNumber,
        department: 'shipment',
        documentType: 'invoice',
        filePath: path,
        uploadedBy: userId
      })
      
      // Also update doc_no in documents table
      await supabase
        .from('documents')
        .update({ doc_no: invoiceNo })
        .eq('id', documentId)

      // 4) Insert document_fields
      const fieldRows = []
      const pushText = (key, val) => {
        if (val === undefined || val === null || val === '') return
        fieldRows.push({ canonical_key: key, raw_value: String(val) })
      }
      const pushNumber = (key, val) => {
        const n = Number(val)
        if (Number.isFinite(n)) fieldRows.push({ canonical_key: key, value_number: n })
      }
      const pushDate = (key, val) => {
        if (val) fieldRows.push({ canonical_key: key, value_date: val })
      }
      
      pushText('invoice_no', invoiceNo)
      pushDate('invoice_date', invoiceDate)
      pushText('incoterms', incoterms)
      pushText('invoice_currency', currency)
      pushNumber('total_quantity', totalQuantity)
      pushNumber('total_amount', totalAmount)

      if (fieldRows.length) {
        const { error: fieldsErr } = await supabase
          .from('document_fields')
          .insert(fieldRows.map(f => ({ ...f, document_id: documentId })))
        if (fieldsErr) throw fieldsErr
      }

      // 5) Insert document_items (line items)
      const itemRows = items
        .filter(item => item.product || item.quantity || item.unitPrice || item.amount)
        .map((item, idx) => ({
          document_id: documentId,
          line_no: idx + 1,
          product: item.product || null,
          quantity: item.quantity ? Number(item.quantity) : null,
          unit_price: item.unitPrice ? Number(item.unitPrice) : null,
          amount: item.amount ? Number(item.amount) : null
        }))

      if (itemRows.length) {
        const { error: itemsErr } = await supabase
          .from('document_items')
          .insert(itemRows)
        if (itemsErr) throw itemsErr
      }

      // Success!
      onSuccess()
    } catch (err) {
      console.error('[Invoice Upload Error]', err)
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="cso-backdrop" onClick={onClose}>
      <div className="cso-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cso-header">
          <div className="cso-header-left">
            <h2 className="cso-header-title">{title || 'Upload Commercial Invoice'}</h2>
          </div>
          <div className="cso-header-right">
            <button className="cso-close-btn" onClick={onClose} type="button">✕</button>
          </div>
        </div>

        <div className="cso-body">
          
          {/* Left side - File upload/preview */}
          <div className="cso-left" onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }} onDrop={onDrop}>
            {!previewUrl ? (
              <div className="cso-drop" role="button" tabIndex={0} onClick={handlePick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePick() }}>
                <strong>Upload Invoice Document</strong>
                <div>Drag & drop or click to choose</div>
                <div className="cso-accept">Accepted: jpg, png, pdf, docx, xlsx</div>
                <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={(e) => onFiles(e.target.files)} style={{ display: 'none' }} />
              </div>
            ) : (
              <div className="cso-preview">
                <div className="cso-filename">{file?.name}</div>
                {canEmbed ? (
                  ext === 'pdf' ? (
                    <iframe title={file?.name} src={previewUrl} className="cso-frame" />
                  ) : (
                    <img alt={file?.name} src={previewUrl} className="cso-image" />
                  )
                ) : (
                  <div className="cso-fallback">Preview unavailable. Selected: {file?.name}</div>
                )}
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreviewUrl(''); setError('') }}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#991b1b'
                  }}
                >
                  Remove File
                </button>
              </div>
            )}
          </div>

          {/* Right side - Invoice form */}
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
              {error && <div className="cso-error">{error}</div>}
              {uploadError && <div className="cso-error">{uploadError}</div>}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', padding: '0 0.75em' }}>
                <button 
                  className="cso-btn" 
                  type="button" 
                  onClick={fillDummyData}
                  style={{ background: '#fef3c7', borderColor: '#fbbf24', width: '100%' }}
                  disabled={uploading}
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
            {/* New document - no saved by info yet */}
          </div>
          <div className="cso-footer-right">
            <button className="cso-btn" type="button" onClick={onClose} disabled={uploading}>Cancel</button>
            <button className="cso-btn cso-primary" type="button" onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

