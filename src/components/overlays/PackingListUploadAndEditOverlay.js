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

// Combined Packing List Upload + Edit Overlay
// Left: File upload/preview | Right: Line items table + totals
export default function PackingListUploadAndEditOverlay({
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

  // Line items (no header fields for packing list)
  const [items, setItems] = React.useState([{ product: '', quantity: '', netWeight: '', grossWeight: '' }])

  // Totals - manual input
  const [totalQuantity, setTotalQuantity] = React.useState('')
  const [totalNetWeight, setTotalNetWeight] = React.useState('')
  const [totalGrossWeight, setTotalGrossWeight] = React.useState('')

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
    setItems(prev => [...prev, { product: '', quantity: '', netWeight: '', grossWeight: '' }])
  }

  const add3Items = () => {
    setItems(prev => [
      ...prev,
      { product: '', quantity: '', netWeight: '', grossWeight: '' },
      { product: '', quantity: '', netWeight: '', grossWeight: '' },
      { product: '', quantity: '', netWeight: '', grossWeight: '' }
    ])
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
      const path = `shipment/${timeTag}-${safePro}-PACKING-LIST-${safeName}`
      
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
        documentType: 'packing_list',
        filePath: path,
        uploadedBy: userId
      })

      // 4) Insert document_fields (totals only - no header fields)
      const fieldRows = []
      const pushNumber = (key, val) => {
        const n = Number(val)
        if (Number.isFinite(n)) fieldRows.push({ canonical_key: key, value_number: n })
      }
      
      pushNumber('total_quantity', totalQuantity)
      pushNumber('total_net_weight', totalNetWeight)
      pushNumber('total_gross_weight', totalGrossWeight)

      if (fieldRows.length) {
        const { error: fieldsErr } = await supabase
          .from('document_fields')
          .insert(fieldRows.map(f => ({ ...f, document_id: documentId })))
        if (fieldsErr) throw fieldsErr
      }

      // 5) Insert document_items (line items)
      const itemRows = items
        .filter(item => item.product || item.quantity || item.netWeight || item.grossWeight)
        .map((item, idx) => ({
          document_id: documentId,
          line_no: idx + 1,
          product: item.product || null,
          quantity: item.quantity ? Number(item.quantity) : null,
          net_weight: item.netWeight ? Number(item.netWeight) : null,
          gross_weight: item.grossWeight ? Number(item.grossWeight) : null
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
      console.error('[Packing List Upload Error]', err)
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
            <h2 className="cso-header-title">{title || 'Upload Packing List'}</h2>
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
                <strong>Upload Packing List Document</strong>
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

          {/* Right side - Line items + totals form */}
          <div className="cso-right">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Line Items */}
              <div style={{ flex: 1, overflow: 'auto', marginBottom: '1rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333' }}>Line Items</h3>
                
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #ddd' }}>
                        <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600 }}>Product</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600, width: '80px' }}>Qty</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600, width: '100px' }}>Net Wt (KGS)</th>
                        <th style={{ textAlign: 'left', padding: '0.5rem', fontWeight: 600, width: '100px' }}>Gross Wt (KGS)</th>
                        <th style={{ width: '60px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="text"
                              value={item.product}
                              onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                              placeholder="Product description"
                              style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              placeholder="0"
                              style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={item.netWeight}
                              onChange={(e) => handleItemChange(idx, 'netWeight', e.target.value)}
                              placeholder="0.00"
                              style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            <input
                              type="number"
                              step="0.01"
                              value={item.grossWeight}
                              onChange={(e) => handleItemChange(idx, 'grossWeight', e.target.value)}
                              placeholder="0.00"
                              style={{ width: '100%', padding: '0.4rem', border: '1px solid #ddd', borderRadius: '4px' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeItem(idx)}
                              disabled={items.length <= 1}
                              style={{ 
                                padding: '0.3rem 0.6rem', 
                                fontSize: '0.8rem', 
                                color: '#a00',
                                background: 'none',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                cursor: items.length > 1 ? 'pointer' : 'not-allowed',
                                opacity: items.length > 1 ? 1 : 0.5
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={addItem}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    + Add Item
                  </button>
                  <button
                    type="button"
                    onClick={add3Items}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#e0f2fe',
                      border: '1px solid #7dd3fc',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      color: '#0369a1'
                    }}
                  >
                    + Add 3 Rows
                  </button>
                </div>
              </div>

              {/* Totals (manual input) */}
              <div style={{ borderTop: '2px solid #ddd', paddingTop: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333' }}>Totals</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Total Quantity</label>
                    <input
                      type="number"
                      value={totalQuantity}
                      onChange={(e) => setTotalQuantity(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Total Net Wt (KGS)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totalNetWeight}
                      onChange={(e) => setTotalNetWeight(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Total Gross Wt (KGS)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={totalGrossWeight}
                      onChange={(e) => setTotalGrossWeight(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* Debug - Dummy Data Button */}
              {error && <div className="cso-error">{error}</div>}
              {uploadError && <div className="cso-error">{uploadError}</div>}
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
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

