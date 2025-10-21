import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'

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
  uploadedBy
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
  
  // Container/Seal pairs
  const [pairs, setPairs] = React.useState(() => {
    if (Array.isArray(initialValues.container_seal_pairs) && initialValues.container_seal_pairs.length) {
      return initialValues.container_seal_pairs.map(p => ({ 
        containerNo: p.containerNo || '', 
        sealNo: p.sealNo || '' 
      }))
    }
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

  const ext = (fileName || '').split('.').pop()?.toLowerCase() || ''
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

  const handleSubmit = (e) => {
    e.preventDefault()
    const values = {
      bl_number: blNumber,
      shipper,
      consignee,
      shipping_line: shippingLine,
      vessel_name: vesselName,
      voyage_no: voyageNo,
      port_of_loading: portOfLoading,
      port_of_discharge: portOfDischarge,
      place_of_delivery: placeOfDelivery,
      container_specs: containerSpecs,
      no_of_packages: noOfPackages,
      packaging_kind: packagingKind,
      goods_classification: goodsClassification,
      description_of_goods: descriptionOfGoods,
      gross_weight: grossWeight
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
    </div>
  )
}

