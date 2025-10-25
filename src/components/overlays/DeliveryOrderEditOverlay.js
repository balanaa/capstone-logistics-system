import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'
import CameraCapture from '../common/CameraCapture'
import { supabase } from '../../services/supabase/client'
import { logDocumentAction } from '../../services/supabase/documents'

// Delivery Order-specific edit overlay with structured form layout
export default function DeliveryOrderEditOverlay({
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
  // Delivery Order fields
  const [pickupLocation, setPickupLocation] = React.useState(initialValues.pickup_location || '')
  const [emptyReturnLocation, setEmptyReturnLocation] = React.useState(initialValues.empty_return_location || '')
  const [detentionFreeTimeEnd, setDetentionFreeTimeEnd] = React.useState(initialValues.detention_free_time_end || '')
  const [registryNumber, setRegistryNumber] = React.useState(initialValues.registry_number || '')
  
  // Container/Seal pairs
  const [pairs, setContainerPairs] = React.useState(() => {
    console.log('[DeliveryOrderEditOverlay] initialValues:', initialValues)
    console.log('[DeliveryOrderEditOverlay] container_seal_pairs:', initialValues.container_seal_pairs)
    console.log('[DeliveryOrderEditOverlay] typeof container_seal_pairs:', typeof initialValues.container_seal_pairs)
    console.log('[DeliveryOrderEditOverlay] isArray:', Array.isArray(initialValues.container_seal_pairs))
    
    if (Array.isArray(initialValues.container_seal_pairs) && initialValues.container_seal_pairs.length) {
      const mappedPairs = initialValues.container_seal_pairs.map(p => ({ 
        containerNo: p.containerNo || '', 
        sealNo: p.sealNo || '' 
      }))
      console.log('[DeliveryOrderEditOverlay] Mapped pairs:', mappedPairs)
      return mappedPairs
    }
    console.log('[DeliveryOrderEditOverlay] Using default empty pair')
    return [{ containerNo: '', sealNo: '' }]
  })

  // File management state
  const [newFile, setNewFile] = React.useState(null)
  const [newFileUrl, setNewFileUrl] = React.useState('')
  const [fileChanged, setFileChanged] = React.useState(false)
  const [fileRemoved, setFileRemoved] = React.useState(false)
  const [showCamera, setShowCamera] = React.useState(false)
  const [fieldErrors, setFieldErrors] = React.useState({})

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  const addPair = () => setContainerPairs(prev => [...prev, { containerNo: '', sealNo: '' }])
  const removePair = (idx) => setContainerPairs(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  const changePair = (idx, field, val) => setContainerPairs(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))

  const fillDummyData = () => {
    setPickupLocation('Port of Manila\nSouth Harbor, Manila\nPhilippines')
    setEmptyReturnLocation('Subic Bay Freeport Zone\nSubic, Zambales\nPhilippines')
    setDetentionFreeTimeEnd('12/31/2025')
    setRegistryNumber('REG-2025-001')
    setContainerPairs([
      { containerNo: 'MSCU1234567', sealNo: 'S123456' },
      { containerNo: 'MSCU7654321', sealNo: 'S654321' }
    ])
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
  }, [pickupLocation, emptyReturnLocation, detentionFreeTimeEnd, registryNumber, pairs, fieldErrors, newFile, fileChanged, fileUrl, fileRemoved])

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
          console.log('[DeliveryOrder Edit] Logging file replacement action')
          await logDocumentAction({
            userId: userId,
            action: "document_file_replaced",
            documentId: documentId,
            proNumber: proNumber || 'unknown',
            department: "shipment",
            documentType: "delivery_order",
          })
        } else {
          console.warn('[DeliveryOrder Edit] No user session found, skipping file replacement logging')
        }
      } catch (err) {
        console.error('[DeliveryOrder Edit] Error logging file replacement:', err)
        // Don't throw - the actual operation should continue
      }
    }

    const values = {
      pickup_location: pickupLocation,
      empty_return_location: emptyReturnLocation,
      detention_free_time_end: detentionFreeTimeEnd,
      registry_number: registryNumber,
      container_seal_pairs: pairs,
      fileChanged: fileChanged,
      newFile: newFile
    }
    onSubmit(values, pairs)
  }

  // Format the last edited timestamp
  const lastEditedText = updatedAt ? formatDateTime(updatedAt) : (initialValues.uploaded_at ? formatDateTime(initialValues.uploaded_at) : '')
  const lastSavedByText = updatedBy || uploadedBy || 'Unknown'

  return (
    <div className="cso-backdrop" onClick={onClose}>
      <div className="cso-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cso-header" style={{ background: "#e3f2fd" }}>
          <div className="cso-header-left">
            <h2 className="cso-header-title">Edit {title || 'Delivery Order'}</h2>
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

          {/* Right side - Delivery Order form */}
          <div className="cso-right">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Delivery Order Information Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333' }}>Delivery Order Information</h3>
                
                {/* First Row - Pickup Location and Empty Return Location */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Pickup Location</label>
                    <textarea
                      value={pickupLocation}
                      onChange={(e) => setPickupLocation(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>Empty Return Location</label>
                    <textarea
                      value={emptyReturnLocation}
                      onChange={(e) => setEmptyReturnLocation(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Registry Number */}
                <div className="form-group">
                  <label>Registry Number</label>
                  <input
                    type="text"
                    value={registryNumber}
                    onChange={(e) => setRegistryNumber(e.target.value)}
                    placeholder="Enter registry number"
                  />
                </div>

                {/* Detention Free Time End */}
                <div className="form-group">
                  <label>Detention Free Time End (MM/DD/YYYY)</label>
                  <input
                    type="text"
                    value={detentionFreeTimeEnd}
                    onChange={(e) => setDetentionFreeTimeEnd(e.target.value)}
                    placeholder="MM/DD/YYYY"
                  />
                </div>
              </div>

              {/* Container Table Section */}
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333', borderTop: '2px solid #ddd', paddingTop: '1rem' }}>Container Table</h3>
                
                {/* Container/Seal Pairs Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="cargo-table">
                    <thead>
                      <tr>
                        <th>Container No.</th>
                        <th>Seal No.</th>
                        <th></th>
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
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={pair.sealNo}
                              onChange={(e) => changePair(idx, 'sealNo', e.target.value)}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="delete-pair-btn"
                              onClick={() => removePair(idx)}
                              disabled={pairs.length <= 1}
                            >
                              <i className="fi fi-rs-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="button" onClick={addPair} className="add-pair-btn">
                  + Add Container/Seal Pair
                </button>
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
