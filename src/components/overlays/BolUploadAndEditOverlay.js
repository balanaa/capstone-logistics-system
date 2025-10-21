import React from 'react'
import './CreateShipmentOverlay.css'
import { supabase } from '../../services/supabase/client'
import { upsertPro, insertDocument, insertDocumentFields } from '../../services/supabase/documents'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

// Combined BOL Upload + Edit Overlay
// Left: File upload/preview | Right: BOL form with structured layout
export default function BolUploadAndEditOverlay({
  title,
  proNumber,
  onClose,
  onSuccess
}) {
  // Upload state
  const [uploading, setUploading] = React.useState(false)
  const [uploadError, setUploadError] = React.useState('')
  // File handling
  const [file, setFile] = React.useState(null)
  const [previewUrl, setPreviewUrl] = React.useState('')
  const [error, setError] = React.useState('')
  const inputRef = React.useRef(null)

  // Header fields
  const [blNumber, setBlNumber] = React.useState('')
  const [shippingLine, setShippingLine] = React.useState('')
  const [shipper, setShipper] = React.useState('')
  const [consignee, setConsignee] = React.useState('')
  
  // Vessel info
  const [vesselName, setVesselName] = React.useState('')
  const [voyageNo, setVoyageNo] = React.useState('')
  
  // Ports
  const [portOfLoading, setPortOfLoading] = React.useState('')
  const [portOfDischarge, setPortOfDischarge] = React.useState('')
  const [placeOfDelivery, setPlaceOfDelivery] = React.useState('')
  
  // Container/Seal pairs
  const [pairs, setPairs] = React.useState([{ containerNo: '', sealNo: '' }])
  
  // Other fields
  const [containerSpecs, setContainerSpecs] = React.useState('')
  const [noOfPackages, setNoOfPackages] = React.useState('')
  const [packagingKind, setPackagingKind] = React.useState('')
  const [goodsClassification, setGoodsClassification] = React.useState('')
  const [descriptionOfGoods, setDescriptionOfGoods] = React.useState('')
  const [grossWeight, setGrossWeight] = React.useState('')
  
  const [userEditedPlace, setUserEditedPlace] = React.useState(false)

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

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

  const addPair = () => setPairs(prev => [...prev, { containerNo: '', sealNo: '' }])
  const removePair = (idx) => setPairs(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)))
  const changePair = (idx, field, val) => setPairs(prev => prev.map((p, i) => i === idx ? { ...p, [field]: val } : p))

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
    if (!userEditedPlace) {
      const pod = derivePlace(val)
      if (pod) setPlaceOfDelivery(pod)
    }
  }

  const handlePlaceChange = (val) => {
    setPlaceOfDelivery(val)
    setUserEditedPlace(true)
  }

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
    setPairs([
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
    if (!file) {
      setError('Please select a file first')
      return
    }
    
    setUploading(true)
    setUploadError('')
    try {
      // 1) Upload file to storage
      const d = new Date()
      const HH = String(d.getHours()).padStart(2, '0')
      const MM = String(d.getMinutes()).padStart(2, '0')
      const SS = String(d.getSeconds()).padStart(2, '0')
      const timeTag = `${HH}${MM}${SS}`
      const safePro = String(proNumber).replace(/[^a-zA-Z0-9._-]/g, '_')
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `shipment/${timeTag}-${safePro}-BOL-${safeName}`
      
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
        documentType: 'bill_of_lading',
        filePath: path,
        uploadedBy: userId
      })

      // 4) Insert document_fields
      const rows = []
      const pushText = (key, val) => { 
        if (val !== undefined && val !== null && String(val).trim() !== '') 
          rows.push({ canonical_key: key, raw_value: String(val) }) 
      }
      const pushNumber = (key, val) => { 
        const n = Number(val)
        if (Number.isFinite(n)) 
          rows.push({ canonical_key: key, value_number: n }) 
      }
      
      pushText('bl_number', blNumber)
      pushText('shipper', shipper)
      pushText('consignee', consignee)
      pushText('shipping_line', shippingLine)
      pushText('vessel_name', vesselName)
      pushText('voyage_no', voyageNo)
      pushText('port_of_loading', portOfLoading)
      pushText('port_of_discharge', portOfDischarge)
      pushText('place_of_delivery', placeOfDelivery)
      
      // Container/Seal pairs as JSON
      const cleaned = pairs.map(p => ({ 
        containerNo: (p.containerNo || '').toString(), 
        sealNo: (p.sealNo || '').toString() 
      }))
      const nonEmpty = cleaned.filter(p => p.containerNo || p.sealNo)
      if (nonEmpty.length) {
        rows.push({ canonical_key: 'container_seal_pairs', raw_value: JSON.stringify(nonEmpty) })
      }
      
      pushText('container_specs', containerSpecs)
      pushNumber('no_of_packages', noOfPackages)
      pushText('packaging_kind', packagingKind)
      pushText('goods_classification', goodsClassification)
      pushText('description_of_goods', descriptionOfGoods)
      pushNumber('gross_weight', grossWeight)

      if (rows.length) {
        await insertDocumentFields(documentId, rows)
      }

      // Success!
      onSuccess()
    } catch (err) {
      console.error('[BOL Upload Error]', err)
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="cso-backdrop" onClick={onClose}>
      <div className="cso-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cso-header">
          <div className="cso-header-left">
            <h2 className="cso-header-title">{title || 'Upload Bill of Lading'}</h2>
          </div>
          <div className="cso-header-right">
            <button className="cso-close-btn" onClick={onClose} type="button">✕</button>
          </div>
        </div>

        <div className="cso-body">
          
          {/* Left side - File upload/preview */}
          <div className="cso-left" onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }} onDrop={onDrop}>
            {!previewUrl ? (
              <div className="cso-drop" role="button" tabIndex={0} onClick={handlePick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handlePick() }}>
                <strong>Upload Bill of Lading Document</strong>
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
                <button
                  type="button"
                  onClick={() => { setFile(null); setPreviewUrl(''); setError('') }}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.5rem 1rem',
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#991b1b'
                  }}
                >
                  Remove File
                </button>
              </div>
            )}
          </div>

          {/* Right side - BOL form */}
          <div className="cso-right">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
              
              {/* Bill of Lading Information Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333' }}>Bill of Lading Information</h3>
                
                {/* First Row - Shipper */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Shipper</label>
                     <textarea
                       value={shipper}
                       onChange={(e) => setShipper(e.target.value)}
                       rows={3}
                     />
                  </div>
                  <div className="form-group">
                    <label>B/L No.</label>
                     <input
                       type="text"
                       value={blNumber}
                       onChange={(e) => setBlNumber(e.target.value)}
                     />
                  </div>
                </div>
                
                {/* Second Row - Consignee */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Consignee</label>
                     <textarea
                       value={consignee}
                       onChange={(e) => handleConsigneeChange(e.target.value)}
                       rows={3}
                     />
                  </div>
                  <div className="form-group">
                    <label>Shipping Line</label>
                     <input
                       type="text"
                       value={shippingLine}
                       onChange={(e) => setShippingLine(e.target.value)}
                     />
                  </div>
                </div>

                {/* Vessel Info Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Vessel Name</label>
                     <input
                       type="text"
                       value={vesselName}
                       onChange={(e) => setVesselName(e.target.value)}
                     />
                  </div>
                  <div className="form-group">
                    <label>Voyage No.</label>
                     <input
                       type="text"
                       value={voyageNo}
                       onChange={(e) => setVoyageNo(e.target.value)}
                     />
                  </div>
                </div>

                {/* Ports Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>Port of Loading</label>
                     <input
                       type="text"
                       value={portOfLoading}
                       onChange={(e) => setPortOfLoading(e.target.value)}
                     />
                  </div>
                  <div className="form-group">
                    <label>Port of Discharge</label>
                     <input
                       type="text"
                       value={portOfDischarge}
                       onChange={(e) => setPortOfDischarge(e.target.value)}
                     />
                  </div>
                  <div className="form-group">
                    <label>Place of Delivery</label>
                     <input
                       type="text"
                       value={placeOfDelivery}
                       onChange={(e) => handlePlaceChange(e.target.value)}
                     />
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

                {/* Container Specs */}
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Container Specs</label>
                   <input
                     type="text"
                     value={containerSpecs}
                     onChange={(e) => setContainerSpecs(e.target.value)}
                   />
                </div>

                {/* Packages Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label>No. of Packages</label>
                     <input
                       type="number"
                       value={noOfPackages}
                       onChange={(e) => setNoOfPackages(e.target.value)}
                     />
                  </div>
                  <div className="form-group">
                    <label>Packaging Kind</label>
                     <input
                       type="text"
                       value={packagingKind}
                       onChange={(e) => setPackagingKind(e.target.value)}
                     />
                  </div>
                </div>

                <div className="form-group">
                  <label>Goods Classification</label>
                   <input
                     type="text"
                     value={goodsClassification}
                     onChange={(e) => setGoodsClassification(e.target.value)}
                   />
                </div>

                <div className="form-group">
                  <label>Description of Goods</label>
                   <textarea
                     value={descriptionOfGoods}
                     onChange={(e) => setDescriptionOfGoods(e.target.value)}
                     rows={4}
                   />
                </div>

                <div className="form-group">
                  <label>Gross Weight (KGS)</label>
                   <input
                     type="number"
                     step="0.01"
                     value={grossWeight}
                     onChange={(e) => setGrossWeight(e.target.value)}
                   />
                </div>
              </div>

              {/* Debug - Dummy Data Button */}
              {error && <div className="cso-error">{error}</div>}
              {uploadError && <div className="cso-error">{uploadError}</div>}
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <button 
                  className="cso-btn" 
                  type="button" 
                  onClick={fillDummyData}
                  style={{ background: '#fef3c7', borderColor: '#fbbf24', width: '100%' }}
                  disabled={uploading}
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
            {/* New document - no saved by info yet */}
          </div>
          <div className="cso-footer-right">
            <button className="cso-btn" type="button" onClick={onClose} disabled={uploading}>Cancel</button>
            <button className="cso-btn cso-primary" type="button" onClick={handleSubmit} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

