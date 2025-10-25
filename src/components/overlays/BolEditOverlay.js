import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'
import { handleDecimalNumberInput, handleWholeNumberInput, handleDecimalNumberInputWithCaret, handleWholeNumberInputWithCaret, handleDateInput, cleanNumberFieldsForDatabase, numberInputProps } from '../../utils/numberInputHandlers'
import CameraCapture from '../common/CameraCapture'
import { supabase } from '../../services/supabase/client'
import { logDocumentAction } from '../../services/supabase/documents'

// BOL-specific edit overlay with structured form layout
export default function BolEditOverlay({
  title,
  fileUrl,
  fileName,
  initialValues = {},
  onClose,
  onSubmit,
  updatedAt,
  updatedBy,
  uploadedBy,
  documentId,
  proNumber
}) {
  // Header fields
  const [blNumber, setBlNumber] = React.useState(initialValues.bl_number || '')
  const [shippingLine, setShippingLine] = React.useState(initialValues.shipping_line || '')
  const [shipper, setShipper] = React.useState(initialValues.shipper || '')
  const [consignee, setConsignee] = React.useState(initialValues.consignee || '')
  
  // Vessel info
  const [vesselName, setVesselName] = React.useState(initialValues.vessel_name || '')
  const [voyageNo, setVoyageNo] = React.useState(initialValues.voyage_no || '')
  
  // Ports
  const [portOfLoading, setPortOfLoading] = React.useState(initialValues.port_of_loading || '')
  const [portOfDischarge, setPortOfDischarge] = React.useState(initialValues.port_of_discharge || '')
  const [placeOfDelivery, setPlaceOfDelivery] = React.useState(initialValues.place_of_delivery || '')
  
  // ETA field
  const [eta, setEta] = React.useState(() => {
    // Convert date format from "Month DD, YYYY" to "MM/DD/YY" if needed
    const dateValue = initialValues.eta || ''
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
        console.warn('Failed to parse ETA date:', dateValue)
      }
    }
    return dateValue
  })
  
  // Container/Seal pairs
  const [pairs, setContainerPairs] = React.useState(() => {
    console.log('[BolEditOverlay] initialValues:', initialValues)
    console.log('[BolEditOverlay] container_seal_pairs:', initialValues.container_seal_pairs)
    console.log('[BolEditOverlay] typeof container_seal_pairs:', typeof initialValues.container_seal_pairs)
    console.log('[BolEditOverlay] isArray:', Array.isArray(initialValues.container_seal_pairs))
    
    if (Array.isArray(initialValues.container_seal_pairs) && initialValues.container_seal_pairs.length) {
      const mappedPairs = initialValues.container_seal_pairs.map(p => ({ 
        containerNo: p.containerNo || '', 
        sealNo: p.sealNo || '' 
      }))
      console.log('[BolEditOverlay] Mapped pairs:', mappedPairs)
      return mappedPairs
    }
    console.log('[BolEditOverlay] Using default empty pair')
    return [{ containerNo: '', sealNo: '' }]
  })
  
  // Other fields
  const [containerSpecs, setContainerSpecs] = React.useState(initialValues.container_specs || '')
  const [noOfPackages, setNoOfPackages] = React.useState(initialValues.no_of_packages || '')
  const [packagingKind, setPackagingKind] = React.useState(initialValues.packaging_kind || '')
  const [goodsClassification, setGoodsClassification] = React.useState(initialValues.goods_classification || '')
  const [descriptionOfGoods, setDescriptionOfGoods] = React.useState(initialValues.description_of_goods || '')
  const [grossWeight, setGrossWeight] = React.useState(initialValues.gross_weight || '')
  
  const [userEditedPlace, setUserEditedPlace] = React.useState(false)
  const [fieldErrors, setFieldErrors] = React.useState({})

  // File management state
  const [newFile, setNewFile] = React.useState(null)
  const [newFileUrl, setNewFileUrl] = React.useState('')
  const [fileChanged, setFileChanged] = React.useState(false)
  const [fileRemoved, setFileRemoved] = React.useState(false)
  const [showCamera, setShowCamera] = React.useState(false)

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  const addPair = () => setContainerPairs(prev => [...prev, { containerNo: '', sealNo: '' }])
  const removePair = (idx) => setContainerPairs(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  const changePair = (idx, field, val) => setContainerPairs(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))

  // File management functions
  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      setNewFile(file)
      const url = URL.createObjectURL(file)
      setNewFileUrl(url)
      setFileChanged(true)
      setFileRemoved(false)
      setFieldErrors(prev => ({ ...prev, file: undefined }))
    }
  }

  const removeFile = () => {
    if (newFile) {
      setNewFile(null)
      setNewFileUrl('')
    }
    setFileRemoved(true)
    setFileChanged(true)
    setFieldErrors(prev => ({ ...prev, file: undefined }))
  }

  const resetFileChange = () => {
    setNewFile(null)
    setNewFileUrl('')
    setFileChanged(false)
    setFileRemoved(false)
    setFieldErrors(prev => ({ ...prev, file: undefined }))
  }

  const handleCameraCapture = (capturedFile) => {
    setNewFile(capturedFile)
    const url = URL.createObjectURL(capturedFile)
    setNewFileUrl(url)
    setFileChanged(true)
    setFileRemoved(false)
    setShowCamera(false)
    setFieldErrors(prev => ({ ...prev, file: undefined }))
  }

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

  // Auto-derive place of delivery from consignee
  const derivePlace = (text) => {
    if (!text) return ''
    const t = String(text).toUpperCase()
    if (t.includes('SUBIC')) return 'SUBIC'
    if (t.includes('CLARK')) return 'CLARK'
    return t.trim() ? 'MANILA' : ''
  }

  const handleConsigneeChange = (val) => {
    setConsignee(val)
  }

  // Clear field errors when ANY field value changes (including programmatic changes)
  React.useEffect(() => {
    // Clear errors for any field that now has a value
    const newErrors = { ...fieldErrors }
    let hasChanges = false
    
    // Check all individual fields
    const fieldValues = {
      blNumber, shippingLine, shipper, consignee, vesselName, voyageNo, eta,
      portOfLoading, portOfDischarge, placeOfDelivery, containerSpecs,
      noOfPackages, packagingKind, goodsClassification, descriptionOfGoods, grossWeight
    }
    
    Object.keys(fieldValues).forEach(key => {
      if (fieldErrors[key] && fieldValues[key] && fieldValues[key].toString().trim() !== '') {
        delete newErrors[key]
        hasChanges = true
      }
    })
    
    // Clear container pairs error if at least one container number exists (seal is optional)
    if (fieldErrors.containerPairs && pairs.some(pair => pair.containerNo.trim() !== '')) {
      delete newErrors.containerPairs
      hasChanges = true
    }
    
    if (hasChanges) {
      setFieldErrors(newErrors)
    }
  }, [blNumber, shippingLine, shipper, consignee, vesselName, voyageNo, eta, portOfLoading, portOfDischarge, placeOfDelivery, containerSpecs, noOfPackages, packagingKind, goodsClassification, descriptionOfGoods, grossWeight, pairs, fieldErrors])

  const handlePlaceChange = (val) => {
    setPlaceOfDelivery(val)
    setUserEditedPlace(true)
  }

  // Auto-derive place of delivery when consignee changes (including programmatic changes)
  React.useEffect(() => {
    if (!userEditedPlace && consignee) {
      const pod = derivePlace(consignee)
      if (pod && placeOfDelivery !== pod) {
        setPlaceOfDelivery(pod)
      }
    }
  }, [consignee, userEditedPlace, placeOfDelivery])

  // Auto-clear validation errors when conditions change
  React.useEffect(() => {
    const newErrors = { ...fieldErrors }
    let hasChanges = false

    // Check file validation - clear error if file is uploaded or changes are cancelled
    if (fieldErrors.file && (newFile || (!fileChanged && fileUrl && !fileRemoved))) {
      delete newErrors.file
      hasChanges = true
    }

    if (hasChanges) {
      setFieldErrors(newErrors)
    }
  }, [blNumber, shippingLine, shipper, consignee, vesselName, voyageNo, eta, portOfLoading, portOfDischarge, placeOfDelivery, containerSpecs, noOfPackages, packagingKind, goodsClassification, descriptionOfGoods, grossWeight, pairs, fieldErrors, newFile, fileChanged, fileUrl, fileRemoved])

  const fillDummyData = () => {
    setBlNumber('BL-2025-001')
    setShippingLine('Maersk Line')
    setShipper('ABC Exports Inc.\n123 Export St.\nShanghai, China')
    setConsignee('XYZ Imports Corp.\nSubic Bay, Philippines')
    setVesselName('MSC MAYA')
    setVoyageNo('V001')
    setPortOfLoading('Shanghai')
    setPortOfDischarge('Manila')
    setPlaceOfDelivery('SUBIC')
    setContainerPairs([
      { containerNo: 'MSCU1234567', sealNo: 'S123456' },
      { containerNo: 'MSCU7654321', sealNo: 'S654321' }
    ])
    setContainerSpecs('2x40FT HC')
    setNoOfPackages('100')
    setPackagingKind('Pallets')
    setGoodsClassification('General Cargo')
    setDescriptionOfGoods('Electronics and Computer Parts')
    setGrossWeight('15000')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const errors = {}
    
    // File validation - prevent submission if no file exists
    if (fileChanged && !newFile && !fileUrl) {
      errors.file = 'A file is required. Please upload a file or cancel the removal.'
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    // Log file replacement action (data updates are logged by Document.js)
    if (documentId && fileChanged) {
      try {
        // Get current user session
        const { data: sess } = await supabase.auth.getSession()
        const userId = sess?.session?.user?.id
        
        if (userId) {
          // Log file replacement
          console.log('[BOL Edit] Logging file replacement action')
          await logDocumentAction({
            userId: userId,
            action: "document_file_replaced",
            documentId: documentId,
            proNumber: proNumber || 'unknown',
            department: "shipment",
            documentType: "bill_of_lading",
          })
        } else {
          console.warn('[BOL Edit] No user session found, skipping file replacement logging')
        }
      } catch (err) {
        console.error('[BOL Edit] Error logging file replacement:', err)
        // Don't throw - the actual operation should continue
      }
    }

    // Clear previous errors
    setFieldErrors({})
    
    // Required field validation - ALL fields are required
    const requiredFields = [
      { key: 'shipper', label: 'Shipper' },
      { key: 'blNumber', label: 'B/L Number' },
      { key: 'consignee', label: 'Consignee' },
      { key: 'shippingLine', label: 'Shipping Line' },
      { key: 'vesselName', label: 'Vessel Name' },
      { key: 'voyageNo', label: 'Voyage Number' },
      { key: 'eta', label: 'ETA' },
      { key: 'portOfLoading', label: 'Port of Loading' },
      { key: 'portOfDischarge', label: 'Port of Discharge' },
      { key: 'placeOfDelivery', label: 'Place of Delivery' },
      { key: 'containerSpecs', label: 'Container Specs' },
      { key: 'noOfPackages', label: 'Number of Packages' },
      { key: 'packagingKind', label: 'Packaging Kind' },
      { key: 'goodsClassification', label: 'Goods Classification' },
      { key: 'descriptionOfGoods', label: 'Description of Goods' },
      { key: 'grossWeight', label: 'Gross Weight' }
    ]
    
    const values = {
      shipper,
      blNumber,
      consignee,
      shippingLine,
      vesselName,
      voyageNo,
      eta,
      portOfLoading,
      portOfDischarge,
      placeOfDelivery,
      containerSpecs,
      noOfPackages,
      packagingKind,
      goodsClassification,
      descriptionOfGoods,
      grossWeight
    }
    
    const fieldErrors = {}
    const missingFields = requiredFields.filter(field => !values[field.key] || values[field.key].toString().trim() === '')
    
    // Set field-level errors
    missingFields.forEach(field => {
      fieldErrors[field.key] = `${field.label} is required`
    })
    
    // Check if container/seal pairs have at least one container number (seal is optional)
    const hasValidContainer = pairs.some(pair => pair.containerNo.trim() !== '')
    if (!hasValidContainer) {
      fieldErrors.containerPairs = 'At least one Container number is required (Seal number is optional)'
    }
    
    if (Object.keys(fieldErrors).length > 0) {
      setFieldErrors(fieldErrors)
      return
    }
    
    const allValues = {
      bl_number: blNumber,
      shipper,
      consignee,
      shipping_line: shippingLine,
      vessel_name: vesselName,
      voyage_no: voyageNo,
      eta: eta,
      port_of_loading: portOfLoading,
      port_of_discharge: portOfDischarge,
      place_of_delivery: placeOfDelivery,
      container_specs: containerSpecs,
      no_of_packages: noOfPackages,
      packaging_kind: packagingKind,
      goods_classification: goodsClassification,
      description_of_goods: descriptionOfGoods,
      gross_weight: grossWeight,
      fileChanged: fileChanged,
      newFile: newFile
    }
    
    // Clean number fields before submission to database
    const cleanedAllValues = cleanNumberFieldsForDatabase(allValues, [
      'no_of_packages',
      'gross_weight'
    ])
    
    onSubmit(cleanedAllValues, pairs)
  }

  // Format the last edited timestamp
  const lastEditedText = updatedAt ? formatDateTime(updatedAt) : (initialValues.uploaded_at ? formatDateTime(initialValues.uploaded_at) : '')
  const lastSavedByText = updatedBy || uploadedBy || 'Unknown'

  return (
    <div className="cso-backdrop" onClick={onClose}>
      <div className="cso-modal" onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'white' }}>
        {/* Header */}
        <div className="cso-header">
          <div className="cso-header-left">
            <h2 className="cso-header-title">Edit {title || 'Bill of Lading'}</h2>
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
                        border: 'none'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                {fieldErrors.file && (
                  <div style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '10px',
                    right: '10px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    border: '1px solid #fecaca'
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
                padding: '20px',
                textAlign: 'center',
                background: '#f9fafb'
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <i className="fi fi-rs-cloud-upload" style={{ fontSize: '2rem', color: '#6b7280' }}></i>
                </div>
                <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>No file selected</p>
                <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'center' }}>
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
                      padding: '8px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      border: 'none'
                    }}
                  >
                    Choose File
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    style={{
                      padding: '8px 16px',
                      background: 'white',
                      color: '#374151',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      border: 'none'
                    }}
                  >
                    Take Photo
                  </button>
                </div>
                {fieldErrors.file && (
                  <div style={{
                    marginTop: '16px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    border: '1px solid #fecaca',
                    width: '100%'
                  }}>
                    {fieldErrors.file}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right side - BOL form */}
          <div className="cso-right">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Bill of Lading Information Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333' }}>Bill of Lading Information</h3>
                
                {/* ETA Row - At the top */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('eta').label}>
                      ETA <span style={{ color: 'red' }}>*</span>
                    </label>
                    <input
                      name="eta"
                      type="text"
                      placeholder="MM/DD/YY"
                      value={eta}
                      onChange={(e) => handleDateInput(e.target.value, setEta)}
                      style={getFieldStyles('eta').input}
                      maxLength={8}
                    />
                    {getFieldStyles('eta').error}
                  </div>
                </div>
                
                {/* First Row - Shipper */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('shipper').label}>
                      Shipper <span style={{ color: 'red' }}>*</span>
                    </label>
                     <textarea
                       value={shipper}
                       onChange={(e) => setShipper(e.target.value)}
                       rows={3}
                       style={getFieldStyles('shipper').input}
                     />
                     {getFieldStyles('shipper').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('blNumber').label}>
                      B/L No. <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={blNumber}
                       onChange={(e) => setBlNumber(e.target.value)}
                       style={getFieldStyles('blNumber').input}
                     />
                     {getFieldStyles('blNumber').error}
                  </div>
                </div>
                
                {/* Second Row - Consignee */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('consignee').label}>
                      Consignee <span style={{ color: 'red' }}>*</span>
                    </label>
                     <textarea
                       value={consignee}
                       onChange={(e) => handleConsigneeChange(e.target.value)}
                       rows={3}
                       style={getFieldStyles('consignee').input}
                     />
                     {getFieldStyles('consignee').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('shippingLine').label}>
                      Shipping Line <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={shippingLine}
                       onChange={(e) => setShippingLine(e.target.value)}
                       style={getFieldStyles('shippingLine').input}
                     />
                     {getFieldStyles('shippingLine').error}
                  </div>
                </div>

                {/* Vessel Info Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('vesselName').label}>
                      Vessel Name <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={vesselName}
                       onChange={(e) => setVesselName(e.target.value)}
                       style={getFieldStyles('vesselName').input}
                     />
                     {getFieldStyles('vesselName').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('voyageNo').label}>
                      Voyage No. <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={voyageNo}
                       onChange={(e) => setVoyageNo(e.target.value)}
                       style={getFieldStyles('voyageNo').input}
                     />
                     {getFieldStyles('voyageNo').error}
                  </div>
                </div>

                {/* Ports Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('portOfLoading').label}>
                      Port of Loading <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={portOfLoading}
                       onChange={(e) => setPortOfLoading(e.target.value)}
                       style={getFieldStyles('portOfLoading').input}
                     />
                     {getFieldStyles('portOfLoading').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('portOfDischarge').label}>
                      Port of Discharge <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={portOfDischarge}
                       onChange={(e) => setPortOfDischarge(e.target.value)}
                       style={getFieldStyles('portOfDischarge').input}
                     />
                     {getFieldStyles('portOfDischarge').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('placeOfDelivery').label}>
                      Place of Delivery <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={placeOfDelivery}
                       onChange={(e) => handlePlaceChange(e.target.value)}
                       style={getFieldStyles('placeOfDelivery').input}
                     />
                     {getFieldStyles('placeOfDelivery').error}
                  </div>
                </div>
              </div>

              {/* Cargo Table Section - Combined Line Items & Cargo Details */}
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333', borderTop: '2px solid #ddd', paddingTop: '1rem' }}>Cargo Table</h3>
                
                 {/* Container/Seal Pairs Table */}
                 <div style={{ overflowX: 'auto' }}>
                   <table className="cargo-table">
                     <thead>
                       <tr>
                         <th style={{ paddingRight: '5px' }}>Container No. <span style={{ color: 'red' }}>*</span></th>
                         <th style={{ paddingRight: '5px' }}>Seal No. <span style={{ color: '#666', fontSize: '0.8em' }}>(optional)</span></th>
                         <th style={{ visibility: 'hidden' }}>Actions</th>
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

                {/* Container Specs */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label style={getFieldStyles('containerSpecs').label}>
                    Container Specs <span style={{ color: 'red' }}>*</span>
                  </label>
                   <input
                     type="text"
                     value={containerSpecs}
                     onChange={(e) => setContainerSpecs(e.target.value)}
                     style={getFieldStyles('containerSpecs').input}
                   />
                   {getFieldStyles('containerSpecs').error}
                </div>

                {/* Packages Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label style={getFieldStyles('noOfPackages').label}>
                      No. of Packages <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={noOfPackages}
                       onChange={(e) => handleWholeNumberInputWithCaret(e, setNoOfPackages)}
                       style={{
                         ...numberInputProps.style,
                         ...getFieldStyles('noOfPackages').input
                       }}
                       onWheel={numberInputProps.onWheel}
                     />
                     {getFieldStyles('noOfPackages').error}
                  </div>
                  <div className="form-group">
                    <label style={getFieldStyles('packagingKind').label}>
                      Packaging Kind <span style={{ color: 'red' }}>*</span>
                    </label>
                     <input
                       type="text"
                       value={packagingKind}
                       onChange={(e) => setPackagingKind(e.target.value)}
                       style={getFieldStyles('packagingKind').input}
                     />
                     {getFieldStyles('packagingKind').error}
                  </div>
                </div>

                <div className="form-group">
                  <label style={getFieldStyles('goodsClassification').label}>
                    Goods Classification <span style={{ color: 'red' }}>*</span>
                  </label>
                   <input
                     type="text"
                     value={goodsClassification}
                     onChange={(e) => setGoodsClassification(e.target.value)}
                     style={getFieldStyles('goodsClassification').input}
                   />
                   {getFieldStyles('goodsClassification').error}
                </div>

                <div className="form-group">
                  <label style={getFieldStyles('descriptionOfGoods').label}>
                    Description of Goods <span style={{ color: 'red' }}>*</span>
                  </label>
                   <textarea
                     value={descriptionOfGoods}
                     onChange={(e) => setDescriptionOfGoods(e.target.value)}
                     rows={4}
                     style={getFieldStyles('descriptionOfGoods').input}
                   />
                   {getFieldStyles('descriptionOfGoods').error}
                </div>

                <div className="form-group">
                  <label style={getFieldStyles('grossWeight').label}>
                    Gross Weight (KGS) <span style={{ color: 'red' }}>*</span>
                  </label>
                   <input
                     type="text"
                     value={grossWeight}
                     onChange={(e) => handleDecimalNumberInputWithCaret(e, setGrossWeight)}
                     style={{
                       ...numberInputProps.style,
                       ...getFieldStyles('grossWeight').input
                     }}
                     onWheel={numberInputProps.onWheel}
                   />
                   {getFieldStyles('grossWeight').error}
                </div>
              </div>

              {/* Debug - Dummy Data Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
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

