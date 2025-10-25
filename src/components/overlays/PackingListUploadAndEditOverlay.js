import React from 'react'
import DocumentUploadOverlay from './DocumentUploadOverlay'
import { supabase } from '../../services/supabase/client'
import { upsertPro, insertDocument, logDocumentAction } from '../../services/supabase/documents'
import {
  handleDecimalNumberInput,
  handleWholeNumberInput,
  numberInputProps,
} from '../../utils/numberInputHandlers'

// Packing List Upload + Edit Overlay using generic DocumentUploadOverlay
export default function PackingListUploadAndEditOverlay({
  title,
  proNumber,
  onClose,
  onSuccess
}) {
  // Upload state
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState('')

  // Line items (no header fields for packing list)
  const [items, setItems] = React.useState([{ product: '', quantity: '', netWeight: '', grossWeight: '' }])

  // Totals - manual input
  const [totalQuantity, setTotalQuantity] = React.useState('')
  const [totalNetWeight, setTotalNetWeight] = React.useState('')
  const [totalGrossWeight, setTotalGrossWeight] = React.useState('')

  // Calculated totals state
  const [calculatedTotalQuantity, setCalculatedTotalQuantity] = React.useState(0)
  const [calculatedTotalNetWeight, setCalculatedTotalNetWeight] = React.useState(0)
  const [calculatedTotalGrossWeight, setCalculatedTotalGrossWeight] = React.useState(0)

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
      { product: 'NB CHEESE SANDWICH 190G', quantity: '92', netWeight: '209.76', grossWeight: '230.74' },
      { product: 'NB JALAPENOS 720ML', quantity: '100', netWeight: '864.00', grossWeight: '950.40' },
      { product: 'NB GB SANDWICH BISCUITS 208G', quantity: '18', netWeight: '44.93', grossWeight: '49.42' },
      { product: 'NB BOTANY CLASSIC BWASH PURE LAVENDERIL', quantity: '60', netWeight: '540.00', grossWeight: '594.00' },
      { product: 'NB MUSHROM & CREAM SPAGHETTI 220G EA', quantity: '150', netWeight: '132.00', grossWeight: '145.20' },
      { product: 'NB FABRIC SOFTENER LAVENDER BLOOM 2.1L', quantity: '80', netWeight: '1136.64', grossWeight: '1250.30' },
      { product: 'NB ALOE 500ML', quantity: '160', netWeight: '1600.00', grossWeight: '1760.00' },
      { product: 'NB BLACKRICE & NUT 1.5L', quantity: '120', netWeight: '2160.00', grossWeight: '2376.00' },
      { product: 'NB GB MIX NUT 400G', quantity: '50', netWeight: '160.00', grossWeight: '176.00' },
      { product: 'NB STATIONERY PERMANENT MARKER', quantity: '10', netWeight: '10.50', grossWeight: '11.55' },
      { product: 'NB GB WHITEBOARD MARKER 3S', quantity: '10', netWeight: '8.20', grossWeight: '9.02' },
      { product: 'NB GB PVC BATHROOM SHOES', quantity: '6', netWeight: '13.20', grossWeight: '14.52' },
      { product: 'NB MEDIUM BLEND COFFEE 227G', quantity: '40', netWeight: '136.20', grossWeight: '149.82' },
      { product: 'NB COLOMBIA AMERICANO BLACK 2.1L', quantity: '120', netWeight: '1080.00', grossWeight: '1188.00' },
      { product: 'NB DAILY MOISTURE SHAMPOO 1500ML', quantity: '64', netWeight: '659.20', grossWeight: '725.12' },
      { product: 'NB 1 DRAWER', quantity: '4', netWeight: '22.62', grossWeight: '24.88' },
      { product: 'NB ROASTED SESAME 200G', quantity: '100', netWeight: '224.00', grossWeight: '246.40' },
      { product: 'NB SWEET COATED SNACKS 280G', quantity: '92', netWeight: '206.08', grossWeight: '226.69' },
      { product: 'NB POTATO PANCAKE MIX 200G', quantity: '70', netWeight: '168.00', grossWeight: '184.80' },
      { product: 'NB BLUEBERRY GRANOLA CEREAL 600G', quantity: '75', netWeight: '360.00', grossWeight: '396.00' },
      { product: 'NB BEEF BONE STOCK 500G', quantity: '108', netWeight: '864.00', grossWeight: '950.40' },
      { product: 'NB COLOMBIA AMERICANO SWEET 2.1L', quantity: '200', netWeight: '1776.00', grossWeight: '1953.60' },
      { product: 'NB GB SQUID INK CREAM SPAGHETTI SAUCE180', quantity: '100', netWeight: '190.00', grossWeight: '209.00' },
      { product: 'NB WASHABLE PAPER TOWEL 150 SHTS', quantity: '40', netWeight: '145.20', grossWeight: '168.14' }
    ])
    setTotalQuantity('1869')
    setTotalNetWeight('12710.53')
    setTotalGrossWeight('13990.00')
  }
  

  const removeItem = (idx) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
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

    if (hasChanges) {
      setFieldErrors(newErrors)
    }
  }, [totalQuantity, totalNetWeight, totalGrossWeight, items, fieldErrors])

  const handleSubmit = async (file, formData) => {
    setUploading(true)
    setUploadError('')
    setFieldErrors({})

    const errors = {}

    // File validation - require file
    if (!file) {
      errors.file = 'A file is required'
    }

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
      setUploading(false)
      return
    }
    
    try {
      // 1) Upload file to storage
      const d = new Date()
      const HH = String(d.getHours()).padStart(2, '0')
      const MM = String(d.getMinutes()).padStart(2, '0')
      const SS = String(d.getSeconds()).padStart(2, '0')
      const timeTag = `${HH}${MM}${SS}`
      const safePro = String(proNumber).replace(/[^a-zA-Z0-9._-]/g, '_')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `shipment/${timeTag}-${safePro}-PL-${safeName}`
      
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
        uploadedBy: userId,
        actionType: 'document_data_uploaded' // Upload to existing PRO
      })

      // 4) Insert document_fields (totals only - no header fields)
      const fieldRows = []
      const pushNumber = (key, val) => {
        const cleaned = val.toString().replace(/,/g, '')
        const n = Number(cleaned)
        console.log(`[PackingList Upload] ${key}:`, {
          original: val,
          cleaned: cleaned,
          number: n,
          isFinite: Number.isFinite(n)
        })
        if (Number.isFinite(n)) fieldRows.push({ canonical_key: key, value_number: n })
      }
      
      console.log('[PackingList Upload] Processing totals:', {
        totalQuantity,
        totalNetWeight,
        totalGrossWeight
      })
      
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
      console.log('[PackingList Upload] Processing line items:', items)
      
      const itemRows = items
        .filter(item => item.product || item.quantity || item.netWeight || item.grossWeight)
        .map((item, idx) => {
          const processedItem = {
            document_id: documentId,
            line_no: idx + 1,
            product: item.product || null,
            quantity: item.quantity ? Number(item.quantity.toString().replace(/,/g, '')) : null,
            net_weight: item.netWeight ? Number(item.netWeight.toString().replace(/,/g, '')) : null,
            gross_weight: item.grossWeight ? Number(item.grossWeight.toString().replace(/,/g, '')) : null
          }
          
          console.log(`[PackingList Upload] Line ${idx + 1}:`, {
            original: {
              product: item.product,
              quantity: item.quantity,
              netWeight: item.netWeight,
              grossWeight: item.grossWeight
            },
            processed: {
              product: processedItem.product,
              quantity: processedItem.quantity,
              net_weight: processedItem.net_weight,
              gross_weight: processedItem.gross_weight
            }
          })
          
          return processedItem
        })

      if (itemRows.length) {
        console.log('[PackingList Upload] Final data being sent to Supabase:', {
          document_fields: fieldRows,
          document_items: itemRows
        })
        
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
    <DocumentUploadOverlay
      title={title || 'Upload Packing List'}
      proNumber={proNumber}
      onClose={onClose}
      onSubmit={handleSubmit}
      uploading={uploading}
      error={uploadError}
      className="packing-list-green"
    >
      <div>
        <div>
          {/* Packing List Line Items */}
          <div className="packing-section">
            <h3>Packing List Items</h3>
            
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
                          placeholder="Product description"
                          style={getFieldStyles(`item_${idx}_product`).input}
                        />
                        {getFieldStyles(`item_${idx}_product`).error}
                      </td>
                      <td>
                        <input
                          {...numberInputProps}
                          value={item.quantity}
                          onChange={(e) => handleWholeNumberInput(e.target.value, (value) => handleItemChange(idx, 'quantity', value))}
                          placeholder="0"
                          style={getFieldStyles(`item_${idx}_quantity`).input}
                        />
                        {getFieldStyles(`item_${idx}_quantity`).error}
                      </td>
                      <td>
                        <input
                          {...numberInputProps}
                          value={item.netWeight}
                          onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => handleItemChange(idx, 'netWeight', value))}
                          placeholder="0.00"
                          style={getFieldStyles(`item_${idx}_netWeight`).input}
                        />
                        {getFieldStyles(`item_${idx}_netWeight`).error}
                      </td>
                      <td>
                        <input
                          {...numberInputProps}
                          value={item.grossWeight}
                          onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => handleItemChange(idx, 'grossWeight', value))}
                          placeholder="0.00"
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

          {/* Totals Section */}
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
        <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
          <button 
            className="duo-btn" 
            type="button" 
            onClick={fillDummyData}
            style={{ background: '#fef3c7', borderColor: '#fbbf24', width: '100%' }}
            disabled={uploading}
          >
            Fill Dummy Data
          </button>
        </div>
      </div>
    </DocumentUploadOverlay>
  )
}