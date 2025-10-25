import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'
import { handleDecimalNumberInput, handleWholeNumberInput, numberInputProps } from '../../utils/numberInputHandlers'

// Generic document edit overlay with preview on the left and configurable fields on the right
// Props:
// - title: string (e.g., 'Bill of Lading')
// - fileUrl: string | undefined (local object URL or signed URL)
// - fileName: string | undefined
// - fields: Array of field configs: { key, label, type: 'text'|'textarea'|'number', placeholder? }
// - dynamicPairs?: { key: string, labelLeft: string, labelRight: string, entries: Array<{ left: string, right: string }> }
// - initialValues?: Record<string, any>
// - onClose: () => void
// - onSubmit: (values: Record<string,any>, dynamicPairsEntries?: Array<{left:string,right:string}>) => void
export default function DocumentEditOverlay({
  title,
  fileUrl,
  fileName,
  fields,
  dynamicPairs,
  initialValues = {},
  sampleValues,
  samplePairs,
  insertPairsAfterKey,
  derivePlaceFromConsignee = false,
  updatedAt,
  updatedBy,
  uploadedBy,
  onClose,
  onSubmit
}) {
  const [values, setValues] = React.useState(() => {
    const start = {}
    for (const f of fields) start[f.key] = initialValues[f.key] ?? ''
    return start
  })
  const [userEditedPlace, setUserEditedPlace] = React.useState(false)
  const [pairs, setPairs] = React.useState(() => {
    if (Array.isArray(dynamicPairs?.entries) && dynamicPairs.entries.length) return dynamicPairs.entries
    return [{ left: '', right: '' }]
  })
  const [fieldErrors, setFieldErrors] = React.useState({})

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  const derivePlace = (text) => {
    if (!text) return ''
    const t = String(text).toUpperCase()
    if (t.includes('SUBIC')) return 'SUBIC'
    if (t.includes('CLARK')) return 'CLARK'
    return t.trim() ? 'MANILA' : ''
  }

  const onChange = (key, val) => {
    setValues(prev => {
      const next = { ...prev, [key]: val }
      if (key === 'place_of_delivery') setUserEditedPlace(true)
      return next
    })
  }

  // Clear field errors when ANY field value changes (including programmatic changes)
  React.useEffect(() => {
    // Clear errors for any field that now has a value
    const newErrors = { ...fieldErrors }
    let hasChanges = false
    
    Object.keys(values).forEach(key => {
      if (fieldErrors[key] && values[key] && values[key].toString().trim() !== '') {
        delete newErrors[key]
        hasChanges = true
      }
    })
    
    // Clear container pairs error if at least one container number exists (seal is optional)
    if (fieldErrors.containerPairs && pairs.some(pair => pair.left.trim() !== '')) {
      delete newErrors.containerPairs
      hasChanges = true
    }
    
    if (hasChanges) {
      setFieldErrors(newErrors)
    }
  }, [values, pairs, fieldErrors])

  // Auto-derive place of delivery when consignee changes (including programmatic changes)
  React.useEffect(() => {
    if (!userEditedPlace && values.consignee) {
      const pod = derivePlace(values.consignee)
      if (pod && values.place_of_delivery !== pod) {
        setValues(prev => ({ ...prev, place_of_delivery: pod }))
      }
    }
  }, [values.consignee, userEditedPlace, values.place_of_delivery])

  const addPair = () => setPairs(prev => [...prev, { left: '', right: '' }])
  const removePair = (idx) => setPairs(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  const changePair = (idx, which, val) => setPairs(prev => prev.map((p, i) => i === idx ? { ...p, [which]: val } : p))

  // Helper function for field styling
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


  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Clear previous errors
    setFieldErrors({})
    
    // Required field validation - ALL fields are required
    const requiredFields = [
      { key: 'shipper', label: 'Shipper' },
      { key: 'bl_number', label: 'B/L Number' },
      { key: 'consignee', label: 'Consignee' },
      { key: 'shipping_line', label: 'Shipping Line' },
      { key: 'vessel_name', label: 'Vessel Name' },
      { key: 'voyage_no', label: 'Voyage Number' },
      { key: 'port_of_loading', label: 'Port of Loading' },
      { key: 'port_of_discharge', label: 'Port of Discharge' },
      { key: 'place_of_delivery', label: 'Place of Delivery' },
      { key: 'container_specs', label: 'Container Specs' },
      { key: 'no_of_packages', label: 'Number of Packages' },
      { key: 'packaging_kind', label: 'Packaging Kind' },
      { key: 'goods_classification', label: 'Goods Classification' },
      { key: 'description_of_goods', label: 'Description of Goods' },
      { key: 'gross_weight', label: 'Gross Weight' }
    ]
    
    const errors = {}
    const missingFields = requiredFields.filter(field => !values[field.key] || values[field.key].toString().trim() === '')
    
    // Set field-level errors
    missingFields.forEach(field => {
      errors[field.key] = `${field.label} is required`
    })
    
    // Check if container/seal pairs have at least one container number (seal is optional)
    const hasValidContainer = pairs.some(pair => pair.left.trim() !== '')
    if (!hasValidContainer) {
      errors.containerPairs = 'At least one Container number is required'
    }
    
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    
    onSubmit(values, pairs)
  }

  // Format the last edited timestamp
  const lastEditedText = updatedAt ? formatDateTime(updatedAt) : (initialValues.uploaded_at ? formatDateTime(initialValues.uploaded_at) : '')
  const lastSavedByText = updatedBy || uploadedBy || 'Unknown'

  return (
    <div className="cso-backdrop" onClick={onClose}>
      <div className="cso-modal" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#e0f2fe' }}>
        {/* Header */}
        <div className="cso-header">
          <div className="cso-header-left">
            <h2 className="cso-header-title">Edit {title || 'Document'}</h2>
          </div>
          <div className="cso-header-right">
            {lastEditedText && <span>Last Edited On: {lastEditedText}</span>}
            <button className="cso-close-btn" onClick={onClose} type="button">✕</button>
          </div>
        </div>

        <div className="cso-body">
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
          <div className="cso-right">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Document Information Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333' }}>Document Information</h3>
                
                {/* First Row - Shipper */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('shipper').label}>
                      Shipper <span style={{ color: 'red' }}>*</span>
                    </label>
                    <textarea
                      value={values.shipper || ''}
                      onChange={(e) => onChange('shipper', e.target.value)}
                      rows={3}
                      style={getFieldStyles('shipper').input}
                    />
                    {getFieldStyles('shipper').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('bl_number').label}>
                      B/L No. <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.bl_number || ''}
                      onChange={(e) => onChange('bl_number', e.target.value)}
                      style={getFieldStyles('bl_number').input}
                    />
                    {getFieldStyles('bl_number').error}
                  </div>
                </div>
                
                {/* Second Row - Consignee */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('consignee').label}>
                      Consignee <span style={{ color: 'red' }}>*</span>
                    </label>
                    <textarea
                      value={values.consignee || ''}
                      onChange={(e) => onChange('consignee', e.target.value)}
                      rows={3}
                      style={getFieldStyles('consignee').input}
                    />
                    {getFieldStyles('consignee').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('shipping_line').label}>
                      Shipping Line <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.shipping_line || ''}
                      onChange={(e) => onChange('shipping_line', e.target.value)}
                      style={getFieldStyles('shipping_line').input}
                    />
                    {getFieldStyles('shipping_line').error}
                  </div>
                </div>

                {/* Vessel Info Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('vessel_name').label}>
                      Vessel Name <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.vessel_name || ''}
                      onChange={(e) => onChange('vessel_name', e.target.value)}
                      style={getFieldStyles('vessel_name').input}
                    />
                    {getFieldStyles('vessel_name').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('voyage_no').label}>
                      Voyage No. <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.voyage_no || ''}
                      onChange={(e) => onChange('voyage_no', e.target.value)}
                      style={getFieldStyles('voyage_no').input}
                    />
                    {getFieldStyles('voyage_no').error}
                  </div>
                </div>

                {/* Ports Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('port_of_loading').label}>
                      Port of Loading <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.port_of_loading || ''}
                      onChange={(e) => onChange('port_of_loading', e.target.value)}
                      style={getFieldStyles('port_of_loading').input}
                    />
                    {getFieldStyles('port_of_loading').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('port_of_discharge').label}>
                      Port of Discharge <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.port_of_discharge || ''}
                      onChange={(e) => onChange('port_of_discharge', e.target.value)}
                      style={getFieldStyles('port_of_discharge').input}
                    />
                    {getFieldStyles('port_of_discharge').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('place_of_delivery').label}>
                      Place of Delivery <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.place_of_delivery || ''}
                      onChange={(e) => onChange('place_of_delivery', e.target.value)}
                      style={getFieldStyles('place_of_delivery').input}
                    />
                    {getFieldStyles('place_of_delivery').error}
                  </div>
                </div>
              </div>

              {/* Cargo Table Section */}
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333', borderTop: '2px solid #ddd', paddingTop: '1rem' }}>Cargo Table</h3>
                
                {/* Container/Seal Pairs Table */}
                {dynamicPairs && (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="cargo-table">
                        <thead>
                          <tr>
                            <th style={{ paddingRight: '5px' }}>{dynamicPairs.labelLeft} <span style={{ color: 'red' }}>*</span></th>
                            <th style={{ paddingRight: '5px' }}>{dynamicPairs.labelRight} <span style={{ color: '#666', fontSize: '0.8em' }}>(optional)</span></th>
                            <th style={{ visibility: 'hidden' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pairs.map((p, idx) => (
                            <tr key={idx}>
                              <td>
                                <input
                                  type="text"
                                  value={p.left}
                                  onChange={(e) => changePair(idx, 'left', e.target.value)}
                                  style={{
                                    borderColor: (fieldErrors.containerPairs && p.left.trim() === '') ? '#dc2626' : '#d1d5db',
                                    borderWidth: (fieldErrors.containerPairs && p.left.trim() === '') ? '2px' : '1px'
                                  }}
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={p.right}
                                  onChange={(e) => changePair(idx, 'right', e.target.value)}
                                  style={{
                                    borderColor: '#d1d5db',
                                    borderWidth: '1px'
                                  }}
                                />
                              </td>
                              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                <button
                                  type="button"
                                  className="delete-pair-btn"
                                  onClick={() => removePair(idx)}
                                  disabled={pairs.length <= 1}
                                  style={{
                                    height: '3rem',
                                    width: '3rem',
                                    padding: '0',
                                    fontSize: '1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                >
                                  <i className="fi fi-rs-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {fieldErrors.containerPairs && (
                      <div style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                        {fieldErrors.containerPairs}
                      </div>
                    )}

                    <button 
                      type="button" 
                      onClick={addPair} 
                      className="add-pair-btn"
                      style={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      + Add Container No / Seal No Row
                    </button>
                  </>
                )}

                {/* Container Specs */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label style={getFieldStyles('container_specs').label}>
                    Container Specs <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={values.container_specs || ''}
                    onChange={(e) => onChange('container_specs', e.target.value)}
                    style={getFieldStyles('container_specs').input}
                  />
                  {getFieldStyles('container_specs').error}
                </div>

                {/* Packages Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('no_of_packages').label}>
                      No. of Packages <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.no_of_packages || ''}
                      onChange={(e) => handleWholeNumberInput(e.target.value, (value) => onChange('no_of_packages', value))}
                      style={{
                        ...getFieldStyles('no_of_packages').input,
                        ...numberInputProps.style
                      }}
                      onWheel={numberInputProps.onWheel}
                    />
                    {getFieldStyles('no_of_packages').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('packaging_kind').label}>
                      Packaging Kind <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={values.packaging_kind || ''}
                      onChange={(e) => onChange('packaging_kind', e.target.value)}
                      style={getFieldStyles('packaging_kind').input}
                    />
                    {getFieldStyles('packaging_kind').error}
                  </div>
                </div>

                <div className="form-group">
                  <label style={getFieldStyles('goods_classification').label}>
                    Goods Classification <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={values.goods_classification || ''}
                    onChange={(e) => onChange('goods_classification', e.target.value)}
                    style={getFieldStyles('goods_classification').input}
                  />
                  {getFieldStyles('goods_classification').error}
                </div>

                <div className="form-group">
                  <label style={getFieldStyles('description_of_goods').label}>
                    Description of Goods <span style={{ color: 'red' }}>*</span>
                  </label>
                  <textarea
                    value={values.description_of_goods || ''}
                    onChange={(e) => onChange('description_of_goods', e.target.value)}
                    rows={4}
                    style={getFieldStyles('description_of_goods').input}
                  />
                  {getFieldStyles('description_of_goods').error}
                </div>

                <div className="form-group">
                  <label style={getFieldStyles('gross_weight').label}>
                    Gross Weight (KGS) <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={values.gross_weight || ''}
                    onChange={(e) => handleDecimalNumberInput(e.target.value, (value) => onChange('gross_weight', value))}
                    style={{
                      ...getFieldStyles('gross_weight').input,
                      ...numberInputProps.style
                    }}
                    onWheel={numberInputProps.onWheel}
                  />
                  {getFieldStyles('gross_weight').error}
                </div>
              </div>

              {/* Debug - Sample Data Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="cso-btn"
                  onClick={() => {
                    if (sampleValues) setValues(prev => ({ ...prev, ...sampleValues }))
                    if (Array.isArray(samplePairs) && samplePairs.length) setPairs(samplePairs.map(p => ({ left: p.left || '', right: p.right || '' })))
                  }}
                  style={{ background: '#fef3c7', borderColor: '#fbbf24', width: '100%' }}
                >
                  Fill Sample Data
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="cso-footer">
          <div className="cso-footer-left">
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


