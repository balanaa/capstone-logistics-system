import React from 'react'
import './CreateShipmentOverlay.css'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

export default function UploadDocumentOverlay({ open, onClose, onConfirm, documentType }) {
  const [file, setFile] = React.useState(null)
  const [previewUrl, setPreviewUrl] = React.useState('')
  const [error, setError] = React.useState('')
  const inputRef = React.useRef(null)

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  if (!open) return null

  const handlePick = () => inputRef.current?.click()

  const onFiles = (files) => {
    const list = Array.from(files || [])
    if (!list.length) return
    const f = list[0]
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError(`Unsupported type: ${f.type}`)
      return
    }
    setError('')
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreviewUrl(url)
  }

  const onDrop = (e) => {
    e.preventDefault(); e.stopPropagation()
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files)
  }

  const ext = (file?.name || '').split('.').pop()?.toLowerCase() || ''
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg'

  const disabled = !file

  const handleConfirm = () => {
    if (disabled) return
    onConfirm({ file, previewUrl, originalFileName: file.name })
  }

  return (
    <div className="cso-backdrop" onClick={onClose}>
      <div className="cso-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Upload {documentType}</h2>
        <div className="cso-body">
          <div className="cso-left" onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }} onDrop={onDrop}>
            {!previewUrl ? (
              <div className="cso-drop" role="button" tabIndex={0} onClick={handlePick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePick() }}>
                <strong>Upload {documentType}</strong>
                <div>Drag & drop or click to choose</div>
                <div className="cso-accept">Accepted: jpg, png, pdf, docx, xlsx</div>
                <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} onChange={(e) => onFiles(e.target.files)} style={{ display: 'none' }} />
              </div>
            ) : (
              <div className="cso-preview">
                <div className="cso-filename">{file?.name}</div>
                {canEmbed ? (
                  ext === 'pdf' ? (
                    <iframe title={file?.name} src={previewUrl} className="cso-frame" />
                  ) : (
                    <img alt={file?.name} src={previewUrl} className="cso-image" />
                  )
                ) : (
                  <div className="cso-fallback">Preview unavailable. Selected: {file?.name}</div>
                )}
              </div>
            )}
          </div>
          <div className="cso-right">
            {error && <div className="cso-error">{error}</div>}
            <div className="cso-actions">
              <button className="cso-btn" onClick={onClose}>Cancel</button>
              <button className="cso-btn cso-primary" onClick={handleConfirm} disabled={disabled}>Confirm</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

