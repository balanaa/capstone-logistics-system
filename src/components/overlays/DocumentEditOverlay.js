import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'

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
      if (derivePlaceFromConsignee && key === 'consignee' && !userEditedPlace) {
        const pod = derivePlace(val)
        if (pod) next['place_of_delivery'] = pod
      }
      if (key === 'place_of_delivery') setUserEditedPlace(true)
      return next
    })
  }

  const addPair = () => setPairs(prev => [...prev, { left: '', right: '' }])
  const removePair = (idx) => setPairs(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  const changePair = (idx, which, val) => setPairs(prev => prev.map((p, i) => i === idx ? { ...p, [which]: val } : p))

  const handleSubmit = (e) => {
    e.preventDefault()
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
            <form onSubmit={handleSubmit}>
              {fields.map(f => (
                <React.Fragment key={f.key}>
                  <div className="form-group">
                    <label>{f.label}</label>
                  {f.type === 'textarea' ? (
                      <textarea
                        value={values[f.key]}
                      onChange={(e) => onChange(f.key, e.target.value)}
                        placeholder={f.placeholder || ''}
                        rows={4}
                        style={{ resize: 'vertical' }}
                      />
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={values[f.key]}
                      onChange={(e) => onChange(f.key, e.target.value)}
                        placeholder={f.placeholder || ''}
                      />
                    )}
                  </div>
                  {dynamicPairs && insertPairsAfterKey === f.key && (
                    <div className="form-group">
                      <label>{dynamicPairs.labelLeft} / {dynamicPairs.labelRight}</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pairs.map((p, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: 8 }}>
                            <input
                              type="text"
                              placeholder={dynamicPairs.labelLeft}
                              value={p.left}
                              onChange={(e) => changePair(idx, 'left', e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <input
                              type="text"
                              placeholder={dynamicPairs.labelRight}
                              value={p.right}
                              onChange={(e) => changePair(idx, 'right', e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <button type="button" onClick={() => removePair(idx)} style={{ color: '#a00' }} disabled={pairs.length <= 1}>Remove</button>
                          </div>
                        ))}
                        <button type="button" onClick={addPair}>Add Pair</button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              ))}

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
            Last Save By: {lastSavedByText}
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


