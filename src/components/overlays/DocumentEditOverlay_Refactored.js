import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'
import BolForm, { validateBolForm } from '../forms/BolForm'
import { useBolForm, useContainerPairs } from '../../hooks/useBolForm'

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
  // Use the reusable BOL form hook
  const { values, onChange } = useBolForm(initialValues)
  const { pairs, addPair, removePair, changePair } = useContainerPairs(dynamicPairs?.entries)

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Use the reusable validation function
    const validationErrors = validateBolForm(values, pairs)
    
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join('\n')
      alert(errorMessage)
      return
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
              
              {/* Use the reusable BOL form component */}
              <BolForm
                values={values}
                onChange={onChange}
                pairs={pairs}
                onPairChange={changePair}
                onAddPair={addPair}
                onRemovePair={removePair}
              />

              {/* Debug - Sample Data Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <button
                  type="button"
                  className="cso-btn"
                  onClick={() => {
                    if (sampleValues) {
                      Object.keys(sampleValues).forEach(key => {
                        onChange(key, sampleValues[key])
                      })
                    }
                    if (Array.isArray(samplePairs) && samplePairs.length) {
                      // This would need to be handled by the hook
                      console.log('Sample pairs would be set here')
                    }
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
