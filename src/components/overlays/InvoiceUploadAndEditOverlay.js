import React from 'react'
import DocumentUploadOverlay from './DocumentUploadOverlay'
import { supabase } from '../../services/supabase/client'
import { upsertPro, insertDocument } from '../../services/supabase/documents'
import {
  handleDecimalNumberInput,
  handleWholeNumberInput,
  handleDateInput,
  numberInputProps,
} from '../../utils/numberInputHandlers'

// Invoice Upload + Edit Overlay using generic DocumentUploadOverlay
export default function InvoiceUploadAndEditOverlay({
  title,
  proNumber,
  onClose,
  onSuccess
}) {
  // Upload state
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState('')

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

  // Calculated totals from line items
  const [calculatedTotalQuantity, setCalculatedTotalQuantity] = React.useState(0)
  const [calculatedTotalAmount, setCalculatedTotalAmount] = React.useState(0)

  // Field validation state
  const [fieldErrors, setFieldErrors] = React.useState({})

  // Validation helper functions
  const getFieldStyles = (fieldName) => {
    const hasError = fieldErrors[fieldName]
    return {
      input: {
        borderColor: hasError ? '#ef4444' : undefined,
        borderWidth: hasError ? '2px' : undefined,
      },
      label: {
        color: hasError ? '#ef4444' : undefined,
      }
    }
  }

  const getItemFieldStyles = (idx, fieldName) => {
    const errorKey = `item_${idx}_${fieldName}`
    const hasError = fieldErrors[errorKey]
    return {
      borderColor: hasError ? '#ef4444' : undefined,
      borderWidth: hasError ? '2px' : undefined,
    }
  }

  // Auto-clear validation errors when user types
  React.useEffect(() => {
    const newErrors = { ...fieldErrors }
    let hasChanges = false

    // Check individual fields
    const fieldValues = {
      invoiceNo,
      invoiceDate,
      currency,
      totalQuantity,
      totalAmount,
    }

    Object.keys(fieldValues).forEach((key) => {
      if (
        fieldErrors[key] &&
        fieldValues[key] &&
        fieldValues[key].toString().trim() !== ''
      ) {
        delete newErrors[key]
        hasChanges = true
      }
    })

    // Check table row fields
    items.forEach((item, idx) => {
      const fields = ['product', 'quantity', 'unitPrice', 'amount']
      fields.forEach((field) => {
        const fieldKey = `item_${idx}_${field}`
        const fieldValue = (item[field] || '').toString().trim()
        if (fieldErrors[fieldKey] && fieldValue !== '') {
          delete newErrors[fieldKey]
          hasChanges = true
        }
      })
    })

    if (hasChanges) {
      setFieldErrors(newErrors)
    }
  }, [
    invoiceNo,
    invoiceDate,
    currency,
    totalQuantity,
    totalAmount,
    items,
    fieldErrors,
  ])

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

  React.useEffect(() => {
    handleWholeNumberInput(calculatedTotalQuantity.toString(), (value) => {
      setFormattedCalculatedQuantity(value)
    })
  }, [calculatedTotalQuantity])

  React.useEffect(() => {
    handleDecimalNumberInput(calculatedTotalAmount.toString(), (value) => {
      setFormattedCalculatedAmount(value)
    })
  }, [calculatedTotalAmount])

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
    setInvoiceDate('04/15/25')
    setIncoterms('FOB')
    setCurrency('USD')
    setItems([
      { product: 'NB CHEESE SANDWICH 190G', quantity: '92', unitPrice: '0.96', amount: '1059.84' },
      { product: 'NB JALAPENOS 720ML', quantity: '100', unitPrice: '1.25', amount: '1500.00' },
      { product: 'NB GB SANDWICH BISCUITS 208G', quantity: '18', unitPrice: '2.95', amount: '637.20' },
      { product: 'NB BOTANY CLASSIC BWASH PURE LAVENDERIL', quantity: '60', unitPrice: '3.07', amount: '1473.60' },
      { product: 'NB MUSHROM & CREAM SPAGHETTI 220G EA', quantity: '150', unitPrice: '1.34', amount: '804.00' },
      { product: 'NB FABRIC SOFTENER LAVENDER BLOOM 2.1L', quantity: '80', unitPrice: '1.38', amount: '441.60' },
      { product: 'NB ALOE 500ML', quantity: '160', unitPrice: '0.63', amount: '2016.00' },
      { product: 'NB BLACKRICE & NUT 1.5L', quantity: '120', unitPrice: '1.30', amount: '1872.00' },
      { product: 'NB GB MIX NUT 400G', quantity: '50', unitPrice: '0.03', amount: '12.00' },
      { product: 'NB STATIONERY PERMANENT MARKER', quantity: '10', unitPrice: '0.69', amount: '165.60' },
      { product: 'NB GB WHITEBOARD MARKER 3S', quantity: '10', unitPrice: '0.70', amount: '168.00' },
      { product: 'NB GB PVC BATHROOM SHOES', quantity: '6', unitPrice: '2.29', amount: '109.92' },
      { product: 'NB MEDIUM BLEND COFFEE 227G', quantity: '40', unitPrice: '2.30', amount: '1104.00' },
      { product: 'NB COLOMBIA AMERICANO BLACK 2.1L', quantity: '120', unitPrice: '1.97', amount: '945.60' },
      { product: 'NB DAILY MOISTURE SHAMPOO 1500ML', quantity: '64', unitPrice: '4.12', amount: '1582.08' },
      { product: 'NB 1 DRAWER', quantity: '4', unitPrice: '4.63', amount: '55.56' },
      { product: 'NB ROASTED SESAME 200G', quantity: '100', unitPrice: '1.80', amount: '1440.00' },
      { product: 'NB SWEET COATED SNACKS 280G', quantity: '92', unitPrice: '1.01', amount: '743.36' },
      { product: 'NB POTATO PANCAKE MIX 200G', quantity: '70', unitPrice: '1.25', amount: '1050.00' },
      { product: 'NB BLUEBERRY GRANOLA CEREAL 600G', quantity: '75', unitPrice: '3.23', amount: '1938.00' },
      { product: 'NB BEEF BONE STOCK 500G', quantity: '108', unitPrice: '0.67', amount: '1157.76' },
      { product: 'NB COLOMBIA AMERICANO SWEET 2.1L', quantity: '200', unitPrice: '1.95', amount: '1560.00' },
      { product: 'NB GB SQUID INK CREAM SPAGHETTI SAUCE180', quantity: '100', unitPrice: '1.20', amount: '1200.00' },
      { product: 'NB WASHABLE PAPER TOWEL 150 SHTS', quantity: '40', unitPrice: '3.44', amount: '825.60' }
    ])
    setTotalQuantity('1869')
    setTotalAmount('23861.72')
  }
  

  const removeItem = (idx) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (file, formData) => {
    setUploading(true)
    setUploadError('')
    
    // Basic validation
    const newErrors = {}
    
    // Validate required fields (Incoterms is optional)
    if (!invoiceNo.trim()) newErrors.invoiceNo = 'Invoice number is required'
    if (!invoiceDate.trim()) newErrors.invoiceDate = 'Invoice date is required'
    if (!currency.trim()) newErrors.currency = 'Currency is required'
    if (!totalQuantity.trim()) newErrors.totalQuantity = 'Total quantity is required'
    if (!totalAmount.trim()) newErrors.totalAmount = 'Total amount is required'
    
    // Validate file upload
    if (!file || !file.name) {
      newErrors.file = 'Please select a file to upload'
    }
    
    // Smart row validation - all or nothing for each row
    items.forEach((item, idx) => {
      const product = (item.product || '').toString().trim()
      const quantity = (item.quantity || '').toString().trim()
      const unitPrice = (item.unitPrice || '').toString().trim()
      const amount = (item.amount || '').toString().trim()
      
      const hasAnyValue = product !== '' || quantity !== '' || unitPrice !== '' || amount !== ''
      
      if (hasAnyValue) {
        // If any field has value, ALL fields in this row become required
        if (product === '') {
          newErrors[`item_${idx}_product`] = 'Product is required'
        }
        if (quantity === '') {
          newErrors[`item_${idx}_quantity`] = 'Quantity is required'
        }
        if (unitPrice === '') {
          newErrors[`item_${idx}_unitPrice`] = 'Unit Price is required'
        }
        if (amount === '') {
          newErrors[`item_${idx}_amount`] = 'Amount is required'
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
      newErrors.items = 'At least one complete product row is required'
    }
    
    // Validate calculated vs manual totals
    const manualQty = parseFloat((totalQuantity || '').toString().replace(/,/g, '')) || 0
    const manualAmt = parseFloat((totalAmount || '').toString().replace(/,/g, '')) || 0
    
    if (manualQty !== calculatedTotalQuantity) {
      newErrors.totalQuantityMismatch = `Total Quantity mismatch: Calculated (${calculatedTotalQuantity}) vs Input (${manualQty})`
    }
    
    if (manualAmt !== calculatedTotalAmount) {
      newErrors.totalAmountMismatch = `Total Amount mismatch: Calculated (${calculatedTotalAmount.toFixed(2)}) vs Input (${manualAmt.toFixed(2)})`
    }
    
    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      setUploading(false)
      return
    }
    
    // Clear errors if validation passes
    setFieldErrors({})
    
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
      
      // Debug: Log timestamp before document creation
      const now = new Date()
      const localTime = now.toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })
      const utcTime = now.toISOString()
      console.log('Green Invoice Upload Debug:')
      console.log('- Current time (local):', localTime)
      console.log('- Current time (UTC):', utcTime)
      console.log('- User ID:', userId)
      
      const documentId = await insertDocument({
        proNumber: proNumber,
        department: 'shipment',
        documentType: 'invoice',
        filePath: path,
        uploadedBy: userId,
        actionType: 'document_data_uploaded' // Upload to existing PRO
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
    <DocumentUploadOverlay
      title={title || 'Upload Commercial Invoice'}
      proNumber={proNumber}
      onClose={onClose}
      onSubmit={handleSubmit}
      uploading={uploading}
      error={uploadError || fieldErrors.file}
      className="invoice-upload-overlay"
    >
      <div>
        <div>
          {/* Top section - Invoice Information */}
          <div className="invoice-section" style={{ marginBottom: '1.5rem' }}>
            <h3>Invoice Information</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
               <div className="form-group">
                 <label style={getFieldStyles('invoiceNo').label}>Invoice No. <span style={{ color: '#ef4444' }}>*</span></label>
                 <input
                   type="text"
                   value={invoiceNo}
                   onChange={(e) => setInvoiceNo(e.target.value)}
                   style={getFieldStyles('invoiceNo').input}
                 />
                 {fieldErrors.invoiceNo && (
                   <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                     {fieldErrors.invoiceNo}
                   </div>
                 )}
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
                <label style={getFieldStyles('invoiceDate').label}>Invoice Date <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  placeholder="MM/DD/YY"
                  value={invoiceDate}
                  onChange={(e) => handleDateInput(e.target.value, setInvoiceDate)}
                  maxLength={8}
                  style={getFieldStyles('invoiceDate').input}
                />
                {fieldErrors.invoiceDate && (
                  <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {fieldErrors.invoiceDate}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label style={getFieldStyles('currency').label}>Currency <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    list="currency-options"
                    style={{ width: '100%', paddingRight: '2.5rem', ...getFieldStyles('currency').input }}
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
                {fieldErrors.currency && (
                  <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {fieldErrors.currency}
                  </div>
                )}
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
                    <th style={{ width: '0.22fr' }}></th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
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
                         <div>
                           <input
                             type="text"
                             value={item.product}
                             onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                             style={getItemFieldStyles(idx, 'product')}
                           />
                           {fieldErrors[`item_${idx}_product`] && (
                             <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                               {fieldErrors[`item_${idx}_product`]}
                             </div>
                           )}
                         </div>
                       </td>
                       <td>
                         <div>
                           <input
                             type="text"
                             value={item.quantity}
                             onChange={(e) => handleWholeNumberInput(e.target.value, (value) => handleItemChange(idx, 'quantity', value))}
                             {...numberInputProps}
                             style={{...numberInputProps.style, ...getItemFieldStyles(idx, 'quantity')}}
                           />
                           {fieldErrors[`item_${idx}_quantity`] && (
                             <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                               {fieldErrors[`item_${idx}_quantity`]}
                             </div>
                           )}
                         </div>
                       </td>
                       <td>
                         <div>
                           <input
                             type="text"
                             value={item.unitPrice}
                             onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => handleItemChange(idx, 'unitPrice', value))}
                             {...numberInputProps}
                             style={{...numberInputProps.style, ...getItemFieldStyles(idx, 'unitPrice')}}
                           />
                           {fieldErrors[`item_${idx}_unitPrice`] && (
                             <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                               {fieldErrors[`item_${idx}_unitPrice`]}
                             </div>
                           )}
                         </div>
                       </td>
                       <td>
                         <div>
                           <input
                             type="text"
                             value={item.amount}
                             onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => handleItemChange(idx, 'amount', value))}
                             {...numberInputProps}
                             style={{...numberInputProps.style, ...getItemFieldStyles(idx, 'amount')}}
                           />
                           {fieldErrors[`item_${idx}_amount`] && (
                             <div style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                               {fieldErrors[`item_${idx}_amount`]}
                             </div>
                           )}
                         </div>
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
            {fieldErrors.items && (
              <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {fieldErrors.items}
              </div>
            )}
          </div>

          {/* Bottom section - Totals (calculated + manual input) */}
          <div className="invoice-section">
            <h3>Totals</h3>
            
            {/* Single responsive layout - CSS handles desktop vs mobile */}
            <div className="invoice-totals-mobile">
              {/* Total Quantity */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={getFieldStyles('totalQuantity').label}>Total Quantity <span style={{ color: '#ef4444' }}>*</span></label>
                <div className="totals-row">
                  <span className="calculated-input">
                    <span className="calc-number">{formattedCalculatedQuantity}</span>
                  </span>
                  <input
                    type="text"
                    value={totalQuantity}
                    onChange={(e) => handleWholeNumberInput(e.target.value, setTotalQuantity)}
                    {...numberInputProps}
                    style={{...numberInputProps.style, ...getFieldStyles('totalQuantity').input, flex: 1}}
                    placeholder="Manual input"
                  />
                </div>
                {fieldErrors.totalQuantity && (
                  <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {fieldErrors.totalQuantity}
                  </div>
                )}
              </div>

              {/* Total Amount */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={getFieldStyles('totalAmount').label}>Total Amount <span style={{ color: '#ef4444' }}>*</span></label>
                <div className="totals-row">
                  <span className="calculated-input">
                    <span className="calc-number">{formattedCalculatedAmount}</span>
                  </span>
                  <input
                    type="text"
                    value={totalAmount}
                    onChange={(e) => handleDecimalNumberInput(e.target.value, setTotalAmount)}
                    {...numberInputProps}
                    style={{...numberInputProps.style, ...getFieldStyles('totalAmount').input, flex: 1}}
                    placeholder="Manual input"
                  />
                </div>
                {fieldErrors.totalAmount && (
                  <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {fieldErrors.totalAmount}
                  </div>
                )}
              </div>
            </div>

            {/* Error messages for calculated totals */}
            {fieldErrors.totalQuantityMismatch && (
              <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {fieldErrors.totalQuantityMismatch}
              </div>
            )}
            {fieldErrors.totalAmountMismatch && (
              <div style={{ color: '#ef4444', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                {fieldErrors.totalAmountMismatch}
              </div>
            )}
          </div>
        </div>

        {/* Debug - Dummy Data Button */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', padding: '0 0.75em' }}>
          <button 
            className="duo-btn" 
            type="button" 
            onClick={fillDummyData}
            style={{ 
              background: '#fef3c7', 
              borderColor: '#fbbf24', 
              width: '100%',
              fontSize: '0.875rem',
              padding: '0.75rem'
            }}
            disabled={uploading}
          >
            Fill Dummy Data
          </button>
        </div>
      </div>
    </DocumentUploadOverlay>
  )
}

