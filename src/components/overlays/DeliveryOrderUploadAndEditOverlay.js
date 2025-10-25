import React from 'react'
import DocumentUploadOverlay from './DocumentUploadOverlay'
import { supabase } from '../../services/supabase/client'
import { upsertPro, insertDocument, insertDocumentFields } from '../../services/supabase/documents'
import { handleDateInput } from '../../utils/numberInputHandlers'
import { useTableNavigation } from '../../hooks/useTableNavigation'

// Delivery Order Upload + Edit Overlay using generic DocumentUploadOverlay
export default function DeliveryOrderUploadAndEditOverlay({
  title,
  proNumber,
  department = 'shipment', // Always use 'shipment' for delivery orders
  onClose,
  onSuccess
}) {
  // Upload state
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState('')

  // Delivery Order fields
  const [pickupLocation, setPickupLocation] = React.useState('')
  const [emptyReturnLocation, setEmptyReturnLocation] = React.useState('')
  const [detentionFreeTimeEnd, setDetentionFreeTimeEnd] = React.useState('')
  const [registryNumber, setRegistryNumber] = React.useState('')
  
  // Container/Seal pairs
  const [pairs, setPairs] = React.useState([{ containerNo: '', sealNo: '' }])

  // Field validation state
  const [fieldErrors, setFieldErrors] = React.useState({})

  // Table navigation hook for Excel-like keyboard navigation
  const { tableRef } = useTableNavigation({
    rows: pairs.length,
    columns: 3, // containerNo, sealNo, delete
    wrapAround: true,
    tableSelector: '.cargo-table'
  })

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

  // Auto-clear validation errors when fields are populated
  React.useEffect(() => {
    const newErrors = { ...fieldErrors }
    let hasChanges = false

    // Check all individual fields
    const fieldValues = {
      pickupLocation,
      emptyReturnLocation,
      detentionFreeTimeEnd,
      registryNumber
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

    // Check container pairs for individual field validation
    pairs.forEach((pair, idx) => {
      const containerKey = `container_${idx}`
      const containerValue = (pair.containerNo || '').toString().trim()
      if (fieldErrors[containerKey] && containerValue !== '') {
        delete newErrors[containerKey]
        hasChanges = true
      }
    })

    // Clear container pairs error if at least one container number exists
    if (fieldErrors.containerPairs && pairs.some(pair => pair.containerNo.trim() !== '')) {
      delete newErrors.containerPairs
      hasChanges = true
    }

    if (hasChanges) {
      setFieldErrors(newErrors)
    }
  }, [pickupLocation, emptyReturnLocation, detentionFreeTimeEnd, registryNumber, pairs, fieldErrors])

  const addPair = () => setPairs(prev => [...prev, { containerNo: '', sealNo: '' }])
  const removePair = (idx) => setPairs(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  const changePair = (idx, field, val) => setPairs(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))

  const fillDummyData = () => {
    setPickupLocation('Port of Manila\nSouth Harbor, Manila\nPhilippines')
    setEmptyReturnLocation('Subic Bay Freeport Zone\nSubic, Zambales\nPhilippines')
    setDetentionFreeTimeEnd('12/31/2025')
    setRegistryNumber('REG-2025-001')
    setPairs([
      { containerNo: 'MSCU1234567', sealNo: 'S123456' },
      { containerNo: 'MSCU7654321', sealNo: 'S654321' }
    ])
  }

  const handleSubmit = async (file, formData) => {
    setUploading(true)
    setUploadError('')

    // Clear previous errors
    setFieldErrors({})

    // Required field validation - ALL fields are required
    const requiredFields = [
      { key: 'pickupLocation', label: 'Pickup Location' },
      { key: 'emptyReturnLocation', label: 'Empty Return Location' },
      { key: 'detentionFreeTimeEnd', label: 'Detention Free Time End' },
      { key: 'registryNumber', label: 'Registry Number' }
    ]

    const values = {
      pickupLocation,
      emptyReturnLocation,
      detentionFreeTimeEnd,
      registryNumber
    }

    const errors = {}
    const missingFields = requiredFields.filter(
      (field) => !values[field.key] || values[field.key].toString().trim() === ""
    )

    // Set field-level errors for missing fields
    missingFields.forEach((field) => {
      errors[field.key] = `${field.label} is required`
    })

    // Check container/seal pairs validation
    pairs.forEach((pair, idx) => {
      const containerNo = (pair.containerNo || '').toString().trim()
      const sealNo = (pair.sealNo || '').toString().trim()
      
      // If seal number is provided but container number is empty, show error on container
      if (sealNo !== '' && containerNo === '') {
        errors[`container_${idx}`] = 'Container number is required when seal number is provided'
      }
    })

    // Check if at least one container number exists
    const hasValidContainer = pairs.some(pair => pair.containerNo.trim() !== '')
    if (!hasValidContainer) {
      errors.containerPairs = 'At least one Container number is required (Seal number is optional)'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setUploading(false)
      return
    }

    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `documents/${proNumber}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { upsert: false })

      if (uploadError) throw uploadError

      // Upsert PRO
      await upsertPro(proNumber)

      // Insert document
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess?.session?.user?.id
      const documentId = await insertDocument({
        proNumber: proNumber,
        department: department,
        documentType: 'delivery_order',
        filePath: filePath,
        uploadedBy: userId,
        actionType: 'document_data_uploaded' // Upload to existing PRO
      })

      // Insert document fields
      const rows = []
      const pushText = (key, val) => { 
        if (val !== undefined && val !== null && String(val).trim() !== '') 
          rows.push({ canonical_key: key, raw_value: String(val) }) 
      }
      
      pushText('pickup_location', pickupLocation)
      pushText('empty_return_location', emptyReturnLocation)
      pushText('detention_free_time_end', detentionFreeTimeEnd)
      pushText('registry_number', registryNumber)
      
      // Container/Seal pairs as JSON
      const cleaned = pairs.map(p => ({ 
        containerNo: (p.containerNo || '').toString(), 
        sealNo: (p.sealNo || '').toString() 
      }))
      const nonEmpty = cleaned.filter(p => p.containerNo || p.sealNo)
      if (nonEmpty.length) {
        rows.push({ canonical_key: 'container_seal_pairs', raw_value: JSON.stringify(nonEmpty) })
      }

      if (rows.length) {
        await insertDocumentFields(documentId, rows)
      }

      // Success!
      onSuccess()
    } catch (err) {
      console.error('[Delivery Order Upload Error]', err)
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <DocumentUploadOverlay
      title="Upload Delivery Order"
      proNumber={proNumber}
      onClose={onClose}
      onSubmit={handleSubmit}
      uploading={uploading}
      error={uploadError}
      className="delivery-order-green"
    >
      <div>
        
        {/* Delivery Order Information Section */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333' }}>Delivery Order Information</h3>
          
          {/* Pickup Location */}
          <div className="form-group">
            <label style={getFieldStyles('pickupLocation').label}>
              Pickup Location <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              rows={3}
              style={getFieldStyles('pickupLocation').input}
            />
            {getFieldStyles('pickupLocation').error}
          </div>

          {/* Empty Return Location */}
          <div className="form-group">
            <label style={getFieldStyles('emptyReturnLocation').label}>
              Empty Return Location <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              value={emptyReturnLocation}
              onChange={(e) => setEmptyReturnLocation(e.target.value)}
              rows={3}
              style={getFieldStyles('emptyReturnLocation').input}
            />
            {getFieldStyles('emptyReturnLocation').error}
          </div>

          {/* Detention Free Time End */}
          <div className="form-group">
            <label style={getFieldStyles('detentionFreeTimeEnd').label}>
              Detention Free Time End <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={detentionFreeTimeEnd}
              onChange={(e) => handleDateInput(e.target.value, setDetentionFreeTimeEnd)}
              style={getFieldStyles('detentionFreeTimeEnd').input}
              maxLength={8}
            />
            {getFieldStyles('detentionFreeTimeEnd').error}
          </div>

          {/* Registry Number */}
          <div className="form-group">
            <label style={getFieldStyles('registryNumber').label}>
              Registry Number <span style={{ color: 'red' }}>*</span>
            </label>
            <input
              type="text"
              value={registryNumber}
              onChange={(e) => setRegistryNumber(e.target.value)}
              style={getFieldStyles('registryNumber').input}
            />
            {getFieldStyles('registryNumber').error}
          </div>
        </div>

        {/* Container/Seal Pairs Section */}
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333', borderTop: '2px solid #ddd', paddingTop: '1rem' }}>Container/Seal Pairs</h3>
          
          {/* Container/Seal Pairs Table */}
          <div style={{ width: '100%' }} ref={tableRef}>
            <table className="cargo-table">
              <thead>
                <tr>
                  <th style={{ paddingRight: '5px' }}>Container No. <span style={{ color: 'red' }}>*</span></th>
                  <th style={{ paddingRight: '5px' }}>Seal No.</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((pair, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        value={pair.containerNo}
                        onChange={(e) => changePair(idx, 'containerNo', e.target.value)}
                        style={{
                          borderColor: (fieldErrors.containerPairs && pair.containerNo.trim() === '') ? '#dc2626' : '#d1d5db',
                          borderWidth: (fieldErrors.containerPairs && pair.containerNo.trim() === '') ? '2px' : '1px'
                        }}
                      />
                      {getFieldStyles(`container_${idx}`).error}
                    </td>
                    <td>
                      <input
                        type="text"
                        value={pair.sealNo}
                        onChange={(e) => changePair(idx, 'sealNo', e.target.value)}
                        style={{
                          borderColor: '#d1d5db',
                          borderWidth: '1px'
                        }}
                      />
                   </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle', width: '60px' }}>
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