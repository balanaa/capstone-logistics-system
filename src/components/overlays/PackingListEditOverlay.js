import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'
import {
  handleDecimalNumberInput,
  handleWholeNumberInput,
  numberInputProps,
} from '../../utils/numberInputHandlers'
import CameraCapture from '../common/CameraCapture'
import { supabase } from '../../services/supabase/client'
import { logDocumentAction } from '../../services/supabase/documents'

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
  uploadedBy,
  documentId,
  proNumber
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

  // Calculated totals state
  const [calculatedTotalQuantity, setCalculatedTotalQuantity] = React.useState(0)
  const [calculatedTotalNetWeight, setCalculatedTotalNetWeight] = React.useState(0)
  const [calculatedTotalGrossWeight, setCalculatedTotalGrossWeight] = React.useState(0)

  // File management state
  const [newFile, setNewFile] = React.useState(null)
  const [newFileUrl, setNewFileUrl] = React.useState('')
  const [fileChanged, setFileChanged] = React.useState(false)
  const [fileRemoved, setFileRemoved] = React.useState(false)
  const [showCamera, setShowCamera] = React.useState(false)

  // Calculate totals from line items
  React.useEffect(() => {
    const totalQty = items.reduce((sum, item) => {
      const qty = parseFloat((item.quantity || '').toString().replace(/,/g, '')) || 0
      return sum + qty
    }, 0)
    
    const totalNet = items.reduce((sum, item) => {
      const net = parseFloat((item.netWeight || '').toString().replace(/,/g, '')) || 0
      return sum + net
    }, 0)
    
    const totalGross = items.reduce((sum, item) => {
      const gross = parseFloat((item.grossWeight || '').toString().replace(/,/g, '')) || 0
      return sum + gross
    }, 0)
    
    // Round final results to 2 decimal places using banking standards
    setCalculatedTotalQuantity(Math.round(totalQty * 100) / 100)
    setCalculatedTotalNetWeight(Math.round(totalNet * 100) / 100)
    setCalculatedTotalGrossWeight(Math.round(totalGross * 100) / 100)
  }, [items])

  // Format calculated values using global number handlers
  const [formattedCalculatedQuantity, setFormattedCalculatedQuantity] = React.useState('0')
  const [formattedCalculatedNetWeight, setFormattedCalculatedNetWeight] = React.useState('0')
  const [formattedCalculatedGrossWeight, setFormattedCalculatedGrossWeight] = React.useState('0')

  // Format calculated values using global number handlers
  React.useEffect(() => {
    // Use global handlers to format the calculated values
    let formattedQty = ''
    let formattedNet = ''
    let formattedGross = ''
    
    // Format quantity using whole number handler
    handleWholeNumberInput(calculatedTotalQuantity.toString(), (value) => {
      formattedQty = value
    })
    
    // Format weights using decimal number handler
    handleDecimalNumberInput(calculatedTotalNetWeight.toString(), (value) => {
      formattedNet = value
    })
    
    handleDecimalNumberInput(calculatedTotalGrossWeight.toString(), (value) => {
      formattedGross = value
    })
    
    setFormattedCalculatedQuantity(formattedQty)
    setFormattedCalculatedNetWeight(formattedNet)
    setFormattedCalculatedGrossWeight(formattedGross)
  }, [calculatedTotalQuantity, calculatedTotalNetWeight, calculatedTotalGrossWeight])

  // Validation state
  const [fieldErrors, setFieldErrors] = React.useState({})

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  // Validation helper function
  const getFieldStyles = (fieldKey) => ({
    label: { color: fieldErrors[fieldKey] ? '#dc2626' : 'inherit' },
    input: {
      borderColor: fieldErrors[fieldKey] ? '#dc2626' : '#d1d5db',
      borderWidth: fieldErrors[fieldKey] ? '2px' : '1px',
    },
    error: fieldErrors[fieldKey] ? (
      <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
        {fieldErrors[fieldKey]}
      </div>
    ) : null,
  })

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

  // File management functions
  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setNewFile(file)
      setNewFileUrl(URL.createObjectURL(file))
      setFileChanged(true)
      setFileRemoved(false) // Reset file removed state when new file is uploaded
    }
  }

  const removeFile = () => {
    setNewFile(null)
    setNewFileUrl('')
    setFileChanged(true)
    setFileRemoved(true)
  }

  const resetFileChange = () => {
    setNewFile(null)
    setNewFileUrl('')
    setFileChanged(false)
    setFileRemoved(false)
  }

  const handleCameraCapture = (capturedFile) => {
    setNewFile(capturedFile)
    setNewFileUrl(URL.createObjectURL(capturedFile))
    setFileChanged(true)
    setFileRemoved(false)
    setShowCamera(false)
  }

  // Auto-clear validation errors when fields are filled
  React.useEffect(() => {
    const newErrors = { ...fieldErrors }
    let hasChanges = false

    // Check totals fields
    const totalsFields = {
      totalQuantity,
      totalNetWeight,
      totalGrossWeight,
    }

    Object.keys(totalsFields).forEach((key) => {
      if (fieldErrors[key] && totalsFields[key] && totalsFields[key].toString().trim() !== '') {
        delete newErrors[key]
        hasChanges = true
      }
    })

    // Check table row fields - all or nothing validation
    items.forEach((item, idx) => {
      const fields = ['product', 'quantity', 'netWeight', 'grossWeight']
      fields.forEach((field) => {
        const fieldKey = `item_${idx}_${field}`
        const fieldValue = (item[field] || '').toString().trim()
        if (fieldErrors[fieldKey] && fieldValue !== '') {
          delete newErrors[fieldKey]
          hasChanges = true
        }
      })
    })

    // Check if at least one complete row exists - clear items error if complete row exists
    const hasCompleteRow = items.some(item => {
      const product = (item.product || '').toString().trim()
      const quantity = (item.quantity || '').toString().trim()
      const netWeight = (item.netWeight || '').toString().trim()
      const grossWeight = (item.grossWeight || '').toString().trim()
      return product !== '' && quantity !== '' && netWeight !== '' && grossWeight !== ''
    })
    
    if (fieldErrors.items && hasCompleteRow) {
      delete newErrors.items
      hasChanges = true
    }

    // Check file validation - clear error if file is uploaded or changes are cancelled
    if (fieldErrors.file && (newFile || (!fileChanged && fileUrl && !fileRemoved))) {
      delete newErrors.file
      hasChanges = true
    }

    if (hasChanges) {
      setFieldErrors(newErrors)
    }
  }, [totalQuantity, totalNetWeight, totalGrossWeight, items, fieldErrors, newFile, fileChanged, fileUrl, fileRemoved])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFieldErrors({})

    const errors = {}

    // Required totals validation
    const requiredTotals = [
      { key: 'totalQuantity', label: 'Total Quantity' },
      { key: 'totalNetWeight', label: 'Total Net Weight' },
      { key: 'totalGrossWeight', label: 'Total Gross Weight' },
    ]

    const totalsValues = {
      totalQuantity,
      totalNetWeight,
      totalGrossWeight,
    }

    requiredTotals.forEach((field) => {
      if (!totalsValues[field.key] || totalsValues[field.key].toString().trim() === '') {
        errors[field.key] = `${field.label} is required`
      }
    })

    // All or nothing table validation
    items.forEach((item, idx) => {
      const product = (item.product || '').toString().trim()
      const quantity = (item.quantity || '').toString().trim()
      const netWeight = (item.netWeight || '').toString().trim()
      const grossWeight = (item.grossWeight || '').toString().trim()

      const hasAnyValue = product !== '' || quantity !== '' || netWeight !== '' || grossWeight !== ''

      if (hasAnyValue) {
        if (product === '') errors[`item_${idx}_product`] = 'Product is required'
        if (quantity === '') errors[`item_${idx}_quantity`] = 'Quantity is required'
        if (netWeight === '') errors[`item_${idx}_netWeight`] = 'Net Weight is required'
        if (grossWeight === '') errors[`item_${idx}_grossWeight`] = 'Gross Weight is required'
      }
    })

    // Check if at least one complete row exists
    const hasCompleteRow = items.some(item => {
      const product = (item.product || '').toString().trim()
      const quantity = (item.quantity || '').toString().trim()
      const netWeight = (item.netWeight || '').toString().trim()
      const grossWeight = (item.grossWeight || '').toString().trim()
      return product !== '' && quantity !== '' && netWeight !== '' && grossWeight !== ''
    })
    
    if (!hasCompleteRow) {
      errors.items = 'At least one complete product row is required'
    }

    // Check if calculated and manual totals match
    const manualQty = parseFloat((totalQuantity || '').toString().replace(/,/g, '')) || 0
    const manualNet = parseFloat((totalNetWeight || '').toString().replace(/,/g, '')) || 0
    const manualGross = parseFloat((totalGrossWeight || '').toString().replace(/,/g, '')) || 0
    
    if (manualQty !== calculatedTotalQuantity) {
      errors.totalQuantityMismatch = `Total Quantity mismatch: Calculated (${calculatedTotalQuantity}) vs Input (${manualQty})`
    }
    
    if (manualNet !== calculatedTotalNetWeight) {
      errors.totalNetWeightMismatch = `Total Net Weight mismatch: Calculated (${calculatedTotalNetWeight.toFixed(2)}) vs Input (${manualNet.toFixed(2)})`
    }
    
    if (manualGross !== calculatedTotalGrossWeight) {
      errors.totalGrossWeightMismatch = `Total Gross Weight mismatch: Calculated (${calculatedTotalGrossWeight.toFixed(2)}) vs Input (${manualGross.toFixed(2)})`
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // File validation - prevent submission if no file exists
    if (fileChanged && !newFile && !fileUrl) {
      errors.file = 'A file is required. Please upload a file or cancel the removal.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    const values = {
      items: items,
      total_quantity: totalQuantity,
      total_net_weight: totalNetWeight,
      total_gross_weight: totalGrossWeight,
      fileChanged: fileChanged,
      newFile: newFile
    }
    
    // Log file replacement action (data updates are logged by Document.js)
    if (documentId && fileChanged) {
      try {
        // Get current user session
        const { data: sess } = await supabase.auth.getSession()
        const userId = sess?.session?.user?.id
        
        if (userId) {
          // Log file replacement
          console.log('[PackingList Edit] Logging file replacement action')
          await logDocumentAction({
            userId: userId,
            action: "document_file_replaced",
            documentId: documentId,
            proNumber: proNumber || 'unknown',
            department: "shipment",
            documentType: "packing_list",
          })
        } else {
          console.warn('[PackingList Edit] No user session found, skipping file replacement logging')
        }
      } catch (err) {
        console.error('[PackingList Edit] Error logging file replacement:', err)
        // Don't throw - the actual operation should continue
      }
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
        <div className="cso-header" style={{ background: '#e3f2fd' }}>
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
            {(fileUrl || newFileUrl) && !fileRemoved ? (
              <div style={{ position: 'relative', height: '100%' }}>
                {/* File preview */}
                <div style={{ height: 'calc(100% - 60px)' }}>
                  {newFileUrl ? (
                    // New file preview
                    canEmbed ? (
                      ext === 'pdf' ? (
                        <iframe title={newFile?.name || 'document'} src={newFileUrl} className="cso-frame" />
                      ) : (
                        <img alt={newFile?.name || 'document'} src={newFileUrl} className="cso-image" />
                      )
                    ) : (
                      <div className="cso-fallback">Preview unavailable. Selected: {newFile?.name || 'file'}</div>
                    )
                  ) : (
                    // Original file preview
                    canEmbed ? (
                      ext === 'pdf' ? (
                        <iframe title={fileName || 'document'} src={fileUrl} className="cso-frame" />
                      ) : (
                        <img alt={fileName || 'document'} src={fileUrl} className="cso-image" />
                      )
                    ) : (
                      <div className="cso-fallback">Preview unavailable. Selected: {fileName || 'file'}</div>
                    )
                  )}
                </div>
                
                {/* File controls */}
                <div style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  left: 0, 
                  right: 0, 
                  padding: '10px', 
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center'
                }}>
                  <button
                    type="button"
                    onClick={removeFile}
                    style={{
                      padding: '8px 16px',
                      background: '#ef4444',
                      color: 'white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      border: 'none'
                    }}
                  >
                    Remove File
                  </button>
                  {fileChanged && (
                    <button
                      type="button"
                      onClick={resetFileChange}
                      style={{
                        padding: '8px 16px',
                        background: '#6b7280',
                        color: 'white',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        border: 'none',
                        marginLeft: 'auto'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                
                {/* File validation error */}
                {fieldErrors.file && (
                  <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '10px',
                    right: '10px',
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: '1px solid #ef4444'
                  }}>
                    {fieldErrors.file}
                  </div>
                )}
              </div>
            ) : (
              /* Upload area when no file exists */
              <div style={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                background: '#f9fafb',
                position: 'relative'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '3rem', color: '#9ca3af', marginBottom: '10px' }}>📄</div>
                  <div style={{ fontSize: '1.125rem', color: '#374151', marginBottom: '5px' }}>No file uploaded</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Upload a file to get started</div>
                </div>
                
                {/* Upload controls */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="file"
                    id="file-upload"
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg"
                    style={{ display: 'none' }}
                  />
                  <label 
                    htmlFor="file-upload" 
                    style={{
                      padding: '10px 20px',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    📁 Upload File
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    style={{
                      padding: '10px 20px',
                      background: 'white',
                      color: '#374151',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    📷 Take a Picture
                  </button>
                </div>
                
                {/* File validation error */}
                {fieldErrors.file && (
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    color: '#ef4444',
                    fontSize: '0.875rem',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    border: '1px solid #ef4444',
                    textAlign: 'center'
                  }}>
                    {fieldErrors.file}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side - Structured form */}
          <div className="cso-right">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, padding: '0 0.75em' }}>
                {/* Product Details */}
                <div className="packing-section">
                  <h3>Product Details</h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th style={{ width: '0.22fr' }}></th>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Net Weight</th>
                          <th>Gross Weight</th>
                          <th style={{ width: '60px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ textAlign: 'center', padding: '0.5em', color: '#6b7280', fontSize: '0.875rem' }}>
                              {idx + 1}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.product}
                                onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                                style={getFieldStyles(`item_${idx}_product`).input}
                              />
                              {getFieldStyles(`item_${idx}_product`).error}
                            </td>
                            <td>
                              <input
                                {...numberInputProps}
                                value={item.quantity}
                                onChange={(e) => handleWholeNumberInput(e.target.value, (value) => handleItemChange(idx, 'quantity', value))}
                                style={getFieldStyles(`item_${idx}_quantity`).input}
                              />
                              {getFieldStyles(`item_${idx}_quantity`).error}
                            </td>
                            <td>
                              <input
                                {...numberInputProps}
                                value={item.netWeight}
                                onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => handleItemChange(idx, 'netWeight', value))}
                                style={getFieldStyles(`item_${idx}_netWeight`).input}
                              />
                              {getFieldStyles(`item_${idx}_netWeight`).error}
                            </td>
                            <td>
                              <input
                                {...numberInputProps}
                                value={item.grossWeight}
                                onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => handleItemChange(idx, 'grossWeight', value))}
                                style={getFieldStyles(`item_${idx}_grossWeight`).input}
                              />
                              {getFieldStyles(`item_${idx}_grossWeight`).error}
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
                  {fieldErrors.items && (
                    <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {fieldErrors.items}
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="packing-section-with-border">
                  <h3>Totals</h3>
                  
                  <div className="packing-totals-mobile">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={getFieldStyles('totalQuantity').label}>
                        Total Quantity <span style={{ color: 'red' }}>*</span>
                      </label>
                      <div className="totals-row">
                        <span className="calculated-input">
                          <span className="calc-number">{formattedCalculatedQuantity}</span>
                        </span>
                        <input
                          type="text"
                          value={totalQuantity}
                          onChange={(e) => handleWholeNumberInput(e.target.value, setTotalQuantity)}
                          style={{
                            ...numberInputProps.style,
                            ...getFieldStyles('totalQuantity').input,
                            flex: '1 1 0%',
                            appearance: 'none',
                            borderColor: getFieldStyles('totalQuantity').input.borderColor,
                            borderWidth: getFieldStyles('totalQuantity').input.borderWidth,
                          }}
                        />
                      </div>
                      {getFieldStyles('totalQuantity').error}
                      {fieldErrors.totalQuantityMismatch && (
                        <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {fieldErrors.totalQuantityMismatch}
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={getFieldStyles('totalNetWeight').label}>
                        Total Net Weight <span style={{ color: 'red' }}>*</span>
                      </label>
                      <div className="totals-row">
                        <span className="calculated-input">
                          <span className="calc-number">{formattedCalculatedNetWeight}</span>
                        </span>
                        <input
                          type="text"
                          value={totalNetWeight}
                          onChange={(e) => handleDecimalNumberInput(e.target.value, setTotalNetWeight)}
                          style={{
                            ...numberInputProps.style,
                            ...getFieldStyles('totalNetWeight').input,
                            flex: '1 1 0%',
                            appearance: 'none',
                            borderColor: getFieldStyles('totalNetWeight').input.borderColor,
                            borderWidth: getFieldStyles('totalNetWeight').input.borderWidth,
                          }}
                        />
                      </div>
                      {getFieldStyles('totalNetWeight').error}
                      {fieldErrors.totalNetWeightMismatch && (
                        <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {fieldErrors.totalNetWeightMismatch}
                        </div>
                      )}
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={getFieldStyles('totalGrossWeight').label}>
                        Total Gross Weight <span style={{ color: 'red' }}>*</span>
                      </label>
                      <div className="totals-row">
                        <span className="calculated-input">
                          <span className="calc-number">{formattedCalculatedGrossWeight}</span>
                        </span>
                        <input
                          type="text"
                          value={totalGrossWeight}
                          onChange={(e) => handleDecimalNumberInput(e.target.value, setTotalGrossWeight)}
                          style={{
                            ...numberInputProps.style,
                            ...getFieldStyles('totalGrossWeight').input,
                            flex: '1 1 0%',
                            appearance: 'none',
                            borderColor: getFieldStyles('totalGrossWeight').input.borderColor,
                            borderWidth: getFieldStyles('totalGrossWeight').input.borderWidth,
                          }}
                        />
                      </div>
                      {getFieldStyles('totalGrossWeight').error}
                      {fieldErrors.totalGrossWeightMismatch && (
                        <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {fieldErrors.totalGrossWeightMismatch}
                        </div>
                      )}
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

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  )
}
