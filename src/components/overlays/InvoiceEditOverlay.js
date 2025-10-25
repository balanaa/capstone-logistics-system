import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'
import {
  handleDecimalNumberInput,
  handleWholeNumberInput,
  handleDateInput,
  numberInputProps,
} from '../../utils/numberInputHandlers'
import { useTableNavigation } from '../../hooks/useTableNavigation'
import { getLastEditorInfo } from '../../services/supabase/documents'
import { supabase } from '../../services/supabase/client'
import { logDocumentAction } from '../../services/supabase/documents'
import CameraCapture from '../common/CameraCapture'

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
  uploadedBy,
  documentId,
  proNumber
}) {
  // Document info fields
  const [invoiceNo, setInvoiceNo] = React.useState(initialValues.invoice_no || '')
  const [invoiceDate, setInvoiceDate] = React.useState(() => {
    // Convert date format from "Month DD, YYYY" to "MM/DD/YY" if needed
    const dateValue = initialValues.invoice_date || ''
    if (dateValue && dateValue.includes(',')) {
      // Format: "October 24, 2025" -> "10/24/25"
      try {
        const date = new Date(dateValue)
        if (!isNaN(date.getTime())) {
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const year = String(date.getFullYear()).substring(2)
          return `${month}/${day}/${year}`
        }
      } catch (e) {
        console.warn('Failed to parse date:', dateValue)
      }
    }
    return dateValue
  })
  const [incoterms, setIncoterms] = React.useState(initialValues.incoterms || '')
  const [currency, setCurrency] = React.useState(initialValues.invoice_currency || 'USD')

  // Line items
  const [items, setItems] = React.useState(() => {
    if (initialItems.length) return initialItems
    return [{ product: '', quantity: '', unitPrice: '', amount: '' }]
  })

  // Totals - both calculated and manual input
  const [totalQuantity, setTotalQuantity] = React.useState(initialValues.total_quantity || '')
  const [totalAmount, setTotalAmount] = React.useState(initialValues.total_amount || '')
  
  // Calculated totals from line items
  const [calculatedTotalQuantity, setCalculatedTotalQuantity] = React.useState(0)
  const [calculatedTotalAmount, setCalculatedTotalAmount] = React.useState(0)

  // Field validation state
  const [fieldErrors, setFieldErrors] = React.useState({})

  // File management state
  const [newFile, setNewFile] = React.useState(null)
  const [newFileUrl, setNewFileUrl] = React.useState('')
  const [fileChanged, setFileChanged] = React.useState(false)
  const [fileRemoved, setFileRemoved] = React.useState(false)
  const [showCamera, setShowCamera] = React.useState(false)

  // Audit data state
  const [lastEditorInfo, setLastEditorInfo] = React.useState(null)
  const [loadingAuditData, setLoadingAuditData] = React.useState(false)

  // Table navigation hook for Excel-like keyboard navigation
  const { tableRef } = useTableNavigation({
    rows: items.length,
    columns: 6, // line number, product, quantity, unitPrice, amount, delete
    wrapAround: true,
    tableSelector: '.invoice-table'
  })

  // Fetch audit data when component mounts
  React.useEffect(() => {
    const fetchAuditData = async () => {
      if (!documentId) return
      
      setLoadingAuditData(true)
      try {
        const auditData = await getLastEditorInfo(documentId)
        setLastEditorInfo(auditData)
      } catch (error) {
        console.error('Error fetching audit data:', error)
      } finally {
        setLoadingAuditData(false)
      }
    }

    fetchAuditData()
  }, [documentId])

  // Helper function for consistent field styling
  const getFieldStyles = (fieldKey) => ({
    label: { color: fieldErrors[fieldKey] ? '#dc2626' : 'inherit' },
    input: {
      borderColor: fieldErrors[fieldKey] ? '#dc2626' : '#d1d5db',
      borderWidth: fieldErrors[fieldKey] ? '2px' : '1px'
    },
    error: fieldErrors[fieldKey] ? (
      <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
        {fieldErrors[fieldKey]}
      </div>
    ) : null
  })

  // Calculate totals from line items
  React.useEffect(() => {
    // Calculate totals with full precision, then round final result
    const totalQty = items.reduce((sum, item) => {
      const qty = parseFloat((item.quantity || '').toString().replace(/,/g, '')) || 0
      return sum + qty
    }, 0)
    
    const totalAmt = items.reduce((sum, item) => {
      const amt = parseFloat((item.amount || '').toString().replace(/,/g, '')) || 0
      return sum + amt
    }, 0)
    
    // Round final results to 2 decimal places using banking standards
    setCalculatedTotalQuantity(Math.round(totalQty * 100) / 100)
    setCalculatedTotalAmount(Math.round(totalAmt * 100) / 100)
  }, [items])

  // Format calculated values using global number handlers
  const [formattedCalculatedQuantity, setFormattedCalculatedQuantity] = React.useState('0')
  const [formattedCalculatedAmount, setFormattedCalculatedAmount] = React.useState('0')

  // Format calculated values using global number handlers
  React.useEffect(() => {
    // Use global handlers to format the calculated values
    let formattedQty = ''
    let formattedAmt = ''
    
    // Format quantity using whole number handler
    handleWholeNumberInput(calculatedTotalQuantity.toString(), (value) => {
      formattedQty = value
    })
    
    // Format amount using decimal number handler  
    handleDecimalNumberInput(calculatedTotalAmount.toString(), (value) => {
      formattedAmt = value
    })
    
    setFormattedCalculatedQuantity(formattedQty)
    setFormattedCalculatedAmount(formattedAmt)
  }, [calculatedTotalQuantity, calculatedTotalAmount])

  // Auto-clear validation errors when fields are populated
  React.useEffect(() => {
    const newErrors = { ...fieldErrors }
    let hasChanges = false

    // Check all individual fields
    const fieldValues = {
      invoiceNo,
      invoiceDate,
      currency,
      totalQuantity,
      totalAmount
    }

    Object.keys(fieldValues).forEach((key) => {
      if (
        fieldErrors[key] &&
        fieldValues[key] &&
        fieldValues[key].toString().trim() !== ""
      ) {
        delete newErrors[key]
        hasChanges = true
      }
    })

    // Check items for individual field validation
    items.forEach((item, idx) => {
      const fields = ['product', 'quantity', 'unitPrice', 'amount']
      fields.forEach(field => {
        const fieldKey = `item_${idx}_${field}`
        const fieldValue = (item[field] || '').toString().trim()
        if (fieldErrors[fieldKey] && fieldValue !== '') {
          delete newErrors[fieldKey]
          hasChanges = true
        }
      })
    })

    // Check file validation - clear error if file is uploaded or changes are cancelled
    if (fieldErrors.file && (newFile || (!fileChanged && fileUrl && !fileRemoved))) {
      delete newErrors.file
      hasChanges = true
    }

    if (hasChanges) {
      setFieldErrors(newErrors)
    }
  }, [invoiceNo, invoiceDate, currency, totalQuantity, totalAmount, items, fieldErrors, newFile, fileChanged, fileUrl, fileRemoved])

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
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

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Clear previous errors
    setFieldErrors({})

    // Required field validation
    const requiredFields = [
      { key: 'invoiceNo', label: 'Invoice No.' },
      { key: 'invoiceDate', label: 'Invoice Date' },
      { key: 'currency', label: 'Currency' },
      { key: 'totalQuantity', label: 'Total Quantity' },
      { key: 'totalAmount', label: 'Total Amount' }
    ]

    // File validation - prevent submission if no file exists
    if (fileChanged && !newFile && !fileUrl) {
      errors.file = 'A file is required. Please upload a file or cancel the removal.'
    }

    const values = {
      invoiceNo,
      invoiceDate,
      incoterms,
      currency,
      totalQuantity,
      totalAmount
    }

    const errors = {}
    const missingFields = requiredFields.filter(
      (field) => !values[field.key] || values[field.key].toString().trim() === ""
    )

    // Set field-level errors for missing fields
    missingFields.forEach((field) => {
      errors[field.key] = `${field.label} is required`
    })

    // Check items for row validation (if one field has value, all fields in that row are required)
    items.forEach((item, idx) => {
      const product = (item.product || '').toString().trim()
      const quantity = (item.quantity || '').toString().trim()
      const unitPrice = (item.unitPrice || '').toString().trim()
      const amount = (item.amount || '').toString().trim()
      
      const hasAnyValue = product !== '' || quantity !== '' || unitPrice !== '' || amount !== ''
      
      if (hasAnyValue) {
        // If any field has value, check all fields in this row
        if (product === '') {
          errors[`item_${idx}_product`] = 'Product is required'
        }
        if (quantity === '') {
          errors[`item_${idx}_quantity`] = 'Quantity is required'
        }
        if (unitPrice === '') {
          errors[`item_${idx}_unitPrice`] = 'Unit Price is required'
        }
        if (amount === '') {
          errors[`item_${idx}_amount`] = 'Amount is required'
        }
      }
    })

    // Check if at least one complete row exists
    const hasCompleteRow = items.some(item => {
      const product = (item.product || '').toString().trim()
      const quantity = (item.quantity || '').toString().trim()
      const unitPrice = (item.unitPrice || '').toString().trim()
      const amount = (item.amount || '').toString().trim()
      return product !== '' && quantity !== '' && unitPrice !== '' && amount !== ''
    })
    
    if (!hasCompleteRow) {
      errors.items = 'At least one complete product row is required'
    }

    // Check if calculated and manual totals match
    const manualQty = parseFloat((totalQuantity || '').toString().replace(/,/g, '')) || 0
    const manualAmt = parseFloat((totalAmount || '').toString().replace(/,/g, '')) || 0
    
    if (manualQty !== calculatedTotalQuantity) {
      errors.totalQuantityMismatch = `Total Quantity mismatch: Calculated (${calculatedTotalQuantity}) vs Input (${manualQty})`
    }
    
    if (manualAmt !== calculatedTotalAmount) {
      errors.totalAmountMismatch = `Total Amount mismatch: Calculated (${calculatedTotalAmount.toFixed(2)}) vs Input (${manualAmt.toFixed(2)})`
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Proceed with form submission
    const submitValues = {
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      incoterms: incoterms,
      invoice_currency: currency,
      items: items,
      total_quantity: totalQuantity,
      total_amount: totalAmount,
      fileChanged: fileChanged,
      newFile: newFile
    }
    
    // Log actions based on what was changed
    if (documentId) {
      // Get current user session
      supabase.auth.getSession().then(({ data: sess }) => {
        const userId = sess?.session?.user?.id
        
        if (userId) {
          if (fileChanged) {
            // Log file replacement
            logDocumentAction({
              userId: userId,
              action: "document_file_replaced",
              documentId: documentId,
              proNumber: proNumber || 'unknown',
              department: "shipment",
              documentType: "invoice",
            }).catch(err => console.error('Error logging file replacement:', err))
          } else {
            // Log data-only update
            logDocumentAction({
              userId: userId,
              action: "document_data_updated",
              documentId: documentId,
              proNumber: proNumber || 'unknown',
              department: "shipment",
              documentType: "invoice",
            }).catch(err => console.error('Error logging data update:', err))
          }
        }
      }).catch(err => console.error('Error getting session:', err))
    }
    
    onSubmit(submitValues)
  }

  // Format the last edited timestamp
  const lastEditedText = updatedAt ? formatDateTime(updatedAt) : (initialValues.uploaded_at ? formatDateTime(initialValues.uploaded_at) : '')
  const lastSavedByText = updatedBy || uploadedBy || 'Unknown'

  return (
    <div className="cso-backdrop" onClick={onClose}>
      <div className="cso-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cso-header" style={{ background: '#3b82f6', color: 'white' }}>
          <div className="cso-header-left">
            <h2 className="cso-header-title">Edit {title || 'Commercial Invoice'}</h2>
          </div>
          <div className="cso-header-right">
            {loadingAuditData ? (
              <span>Loading...</span>
            ) : lastEditorInfo ? (
              <span>Last Updated: {formatDateTime(lastEditorInfo.created_at)}</span>
            ) : lastEditedText ? (
              <span>Last Edited On: {lastEditedText}</span>
            ) : null}
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
Upload File
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
Take a Picture
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
                {/* Top section - Invoice Information */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3>Invoice Information</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                    <div className="form-group">
                      <label style={getFieldStyles('invoiceNo').label}>
                        Invoice No. <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={invoiceNo}
                        onChange={(e) => setInvoiceNo(e.target.value)}
                        style={getFieldStyles('invoiceNo').input}
                      />
                      {getFieldStyles('invoiceNo').error}
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
                      <label style={getFieldStyles('invoiceDate').label}>
                        Invoice Date <span style={{ color: 'red' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="MM/DD/YY"
                        value={invoiceDate}
                        onChange={(e) => handleDateInput(e.target.value, setInvoiceDate)}
                        style={getFieldStyles('invoiceDate').input}
                        maxLength={8}
                      />
                      {getFieldStyles('invoiceDate').error}
                    </div>

                    <div className="form-group">
                      <label style={getFieldStyles('currency').label}>
                        Currency <span style={{ color: 'red' }}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          list="currency-options"
                          style={{ 
                            width: '100%', 
                            paddingRight: '2.5rem',
                            ...getFieldStyles('currency').input
                          }}
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
                      {getFieldStyles('currency').error}
                    </div>
                  </div>
                </div>

                {/* Middle section - Product Details */}
                <div className="invoice-section">
                  <h3>Product Details</h3>
                  
                  <div style={{ overflowX: 'auto' }} ref={tableRef}>
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th></th>
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
                                type="text"
                                value={item.quantity}
                                onChange={(e) => handleWholeNumberInput(e.target.value, (value) => handleItemChange(idx, 'quantity', value))}
                                style={{
                                  ...numberInputProps.style,
                                  ...getFieldStyles(`item_${idx}_quantity`).input
                                }}
                                onWheel={numberInputProps.onWheel}
                              />
                              {getFieldStyles(`item_${idx}_quantity`).error}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.unitPrice}
                                onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => handleItemChange(idx, 'unitPrice', value))}
                                style={{
                                  ...numberInputProps.style,
                                  ...getFieldStyles(`item_${idx}_unitPrice`).input
                                }}
                                onWheel={numberInputProps.onWheel}
                              />
                              {getFieldStyles(`item_${idx}_unitPrice`).error}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.amount}
                                onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => handleItemChange(idx, 'amount', value))}
                                style={{
                                  ...numberInputProps.style,
                                  ...getFieldStyles(`item_${idx}_amount`).input
                                }}
                                onWheel={numberInputProps.onWheel}
                              />
                              {getFieldStyles(`item_${idx}_amount`).error}
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

                {/* Bottom section - Totals (calculated + manual input) */}
                <div className="invoice-section">
                  <h3>Totals</h3>
                  
                  {/* Desktop: Single row design, Mobile: Stacked design */}
                  <div className="invoice-totals-mobile">
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
                            flex: 1
                          }}
                          onWheel={numberInputProps.onWheel}
                          placeholder="Manual input"
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
                      <label style={getFieldStyles('totalAmount').label}>
                        Total Amount <span style={{ color: 'red' }}>*</span>
                      </label>
                      <div className="totals-row">
                        <span className="calculated-input">
                          <span className="calc-number">{formattedCalculatedAmount}</span>
                        </span>
                        <input
                          type="text"
                          value={totalAmount}
                          onChange={(e) => handleDecimalNumberInput(e.target.value, setTotalAmount)}
                          style={{
                            ...numberInputProps.style,
                            ...getFieldStyles('totalAmount').input,
                            flex: 1
                          }}
                          onWheel={numberInputProps.onWheel}
                          placeholder="Manual input"
                        />
                      </div>
                      {getFieldStyles('totalAmount').error}
                      {fieldErrors.totalAmountMismatch && (
                        <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {fieldErrors.totalAmountMismatch}
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
            {loadingAuditData ? (
              <span>Loading...</span>
            ) : lastEditorInfo ? (
              <span>Last Saved By: {lastEditorInfo.auth?.users?.raw_user_meta_data?.full_name || lastEditorInfo.auth?.users?.email || 'Unknown'}</span>
            ) : (
              <span>Last Save By: {lastSavedByText}</span>
            )}
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

