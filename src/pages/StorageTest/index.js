import React from 'react'
import { supabase } from '../../services/supabase/client'
import { useAuth } from '../../context/AuthContext'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

function getDefaultDepartment(roles) {
  if (!Array.isArray(roles)) return 'shipment'
  if (roles.includes('shipment')) return 'shipment'
  if (roles.includes('trucking')) return 'trucking'
  if (roles.includes('finance')) return 'finance'
  // verifier is shipment-scoped per docs
  if (roles.includes('verifier')) return 'shipment'
  // admin can upload anywhere; default to shipment
  if (roles.includes('admin')) return 'shipment'
  return 'shipment'
}

function humanFileSize(bytes) {
  if (!Number.isFinite(bytes)) return ''
  const thresh = 1024
  if (Math.abs(bytes) < thresh) return bytes + ' B'
  const units = ['KB', 'MB', 'GB', 'TB']
  let u = -1
  do {
    bytes /= thresh
    ++u
  } while (Math.abs(bytes) >= thresh && u < units.length - 1)
  return bytes.toFixed(1) + ' ' + units[u]
}

export default function StorageTest() {
  const { user, roles } = useAuth()
  const [department, setDepartment] = React.useState(() => getDefaultDepartment(roles))
  const [isDragging, setIsDragging] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [objects, setObjects] = React.useState([])
  const fileInputRef = React.useRef(null)

  React.useEffect(() => {
    setDepartment(getDefaultDepartment(roles))
  }, [roles])

  const listObjects = React.useCallback(async () => {
    setError('')
    try {
      const { data, error: listErr } = await supabase.storage
        .from('documents')
        .list(`${department}`, { limit: 100, sortBy: { column: 'name', order: 'desc' } })
      if (listErr) throw listErr
      setObjects(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e?.message || 'Failed to list documents')
    }
  }, [department])

  React.useEffect(() => {
    listObjects()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [department])

  const handleSelectClick = () => {
    fileInputRef.current?.click()
  }

  const handleFiles = async (files) => {
    if (!user) {
      setError('Please sign in to upload files.')
      return
    }
    const list = Array.from(files || [])
    if (!list.length) return
    setUploading(true)
    setError('')
    setMessage('')
    try {
      for (const file of list) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          throw new Error(`Unsupported type: ${file.type}`)
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const stamp = Date.now()
        const path = `${department}/${stamp}-${safeName}`
        const { error: upErr } = await supabase.storage
          .from('documents')
          .upload(path, file, { upsert: false, contentType: file.type })
        if (upErr) throw upErr
        setMessage((m) => (m ? m + '\n' : '') + `Uploaded ${file.name}`)
      }
      await listObjects()
    } catch (e) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer?.files?.length) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const getSignedUrl = React.useCallback(async (path) => {
    const { data, error: signErr } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60 * 5) // 5 minutes
    if (signErr) throw signErr
    return data?.signedUrl
  }, [])

  const handleDownload = async (name) => {
    try {
      const path = `${department}/${name}`
      const url = await getSignedUrl(path)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (e) {
      setError(e?.message || 'Could not create download link')
    }
  }

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return
    setError('')
    try {
      const path = `${department}/${name}`
      const { error: delErr } = await supabase.storage
        .from('documents')
        .remove([path])
      if (delErr) throw delErr
      setObjects((prev) => prev.filter((o) => o.name !== name))
    } catch (e) {
      setError(e?.message || 'Delete failed')
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Supabase Storage Test</h2>
      <p>Bucket: <code>documents</code></p>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="dept">Department folder:&nbsp;</label>
        <select
          id="dept"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
        >
          <option value="shipment">shipment</option>
          <option value="trucking">trucking</option>
          <option value="finance">finance</option>
        </select>
      </div>

      {/* PRO input removed for now; will return when profile-based naming is enabled */}

      <div
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
        onDrop={onDrop}
        onClick={handleSelectClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectClick() }}
        style={{
          border: '2px dashed #888',
          borderColor: isDragging ? '#4f46e5' : '#888',
          padding: 28,
          borderRadius: 8,
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(79,70,229,0.06)' : 'transparent',
          marginBottom: 12
        }}
      >
        <strong>Drag & drop files here</strong>
        <div style={{ color: '#666', marginTop: 6 }}>
          or click to choose files
        </div>
        <div style={{ color: '#999', marginTop: 6, fontSize: 12 }}>
          Accepted: jpg, png, pdf, docx, xlsx
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div style={{ minHeight: 24 }}>
        {uploading && <span>Uploading...</span>}
        {message && (
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{message}</pre>
        )}
        {error && (
          <div style={{ color: 'crimson' }}>{error}</div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <button onClick={listObjects}>Refresh List</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Files in {department}/</h3>
        {objects.length === 0 && (
          <div style={{ color: '#666' }}>No files yet</div>
        )}
        {objects.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 4px' }}>Name</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 4px' }}>Size</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: '8px 4px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {objects.map((obj) => (
                <tr key={obj.name}>
                  <td style={{ padding: '6px 4px' }}>{obj.name}</td>
                  <td style={{ padding: '6px 4px' }}>{humanFileSize(obj.metadata?.size)}</td>
                  <td style={{ padding: '6px 4px' }}>
                    <button onClick={() => handleDownload(obj.name)}>Download</button>
                    <span style={{ display: 'inline-block', width: 8 }} />
                    <PreviewButton department={department} name={obj.name} getSignedUrl={getSignedUrl} />
                    <span style={{ display: 'inline-block', width: 8 }} />
                    <button onClick={() => handleDelete(obj.name)} style={{ color: '#a00' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function PreviewButton({ department, name, getSignedUrl }) {
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const ext = React.useMemo(() => name.split('.').pop()?.toLowerCase() || '', [name])
  const canEmbed = ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'pdf'

  const ensureUrl = React.useCallback(async () => {
    if (url) return url
    setLoading(true)
    try {
      const signed = await getSignedUrl(`${department}/${name}`)
      setUrl(signed)
      return signed
    } finally {
      setLoading(false)
    }
  }, [url, department, name, getSignedUrl])

  const onClick = async () => {
    if (canEmbed) {
      const u = await ensureUrl()
      if (!u) return
      setOpen(true)
    } else {
      const u = await ensureUrl()
      if (!u) return
      window.open(u, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      <button onClick={onClick} disabled={loading}>
        {canEmbed ? 'Preview' : 'Open'}
      </button>
      {open && canEmbed && url && (
        <div style={{ marginTop: 8 }}>
          {url.endsWith('.pdf') || name.toLowerCase().endsWith('.pdf') ? (
            <iframe title={name} src={url} style={{ width: '100%', height: 480, border: '1px solid #ddd' }} />
          ) : (
            <img alt={name} src={url} style={{ maxWidth: '100%', border: '1px solid #ddd' }} />
          )}
        </div>
      )}
    </>
  )
}


