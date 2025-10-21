import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'

// General Information edit overlay with structured form layout:
// - Top: General shipment information (Port of Loading, Port of Discharge, ETA, etc.)
// - Middle: Combined product table (columns from Invoice + Packing List)
export default function GeneralInfoEditOverlay({
  title,
  initialValues = {},
  initialItems = [],
  onClose,
  onSubmit,
  updatedAt,
  updatedBy,
  uploadedBy
}) {
  // General shipment information fields
  const [portOfLoading, setPortOfLoading] = React.useState(initialValues.port_of_loading || '')
  const [portOfDischarge, setPortOfDischarge] = React.useState(initialValues.port_of_discharge || '')
  const [eta, setEta] = React.useState(initialValues.eta || '')
  const [supplierShipper, setSupplierShipper] = React.useState(initialValues.supplier_shipper || '')
  const [containerNo, setContainerNo] = React.useState(initialValues.container_no || '')
  const [containerSizeType, setContainerSizeType] = React.useState(initialValues.container_size_type || '')
  const [vesselStatus, setVesselStatus] = React.useState(initialValues.vessel_status || '')
  const [blNo, setBlNo] = React.useState(initialValues.bl_number || '')
  const [shippingLines, setShippingLines] = React.useState(initialValues.shipping_lines || '')
  const [consignee, setConsignee] = React.useState(initialValues.consignee || '')

  // Combined product items (Invoice + Packing List columns)
  const [items, setItems] = React.useState(() => {
    if (initialItems.length) return initialItems
    return [{ 
      product: '', 
      pcsBox: '', 
      quantityPieces: '', 
      quantityCarton: '', 
      unitPrice: '', 
      totalAmount: '', 
      netWeight: '', 
      grossWeight: '', 
      measurement: '' 
    }]
  })

  const handleItemChange = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      
      // Auto-calculate total amount if quantity pieces and unit price are both present
      if (field === 'quantityPieces' || field === 'unitPrice') {
        const qty = parseFloat(field === 'quantityPieces' ? value : item.quantityPieces) || 0
        const price = parseFloat(field === 'unitPrice' ? value : item.unitPrice) || 0
        if (qty && price) {
          updated.totalAmount = (qty * price).toFixed(2)
        }
      }
      
      return updated
    }))
  }

  const addItem = () => {
    setItems(prev => [...prev, { 
      product: '', 
      pcsBox: '', 
      quantityPieces: '', 
      quantityCarton: '', 
      unitPrice: '', 
      totalAmount: '', 
      netWeight: '', 
      grossWeight: '', 
      measurement: '' 
    }])
  }

  const fillDummyData = () => {
    setPortOfLoading('Port of Loading Sample')
    setPortOfDischarge('Port of Discharge Sample')
    setEta('2025-02-02')
    setSupplierShipper('Supplier/Shipper Sample')
    setContainerNo('CONTAINER123')
    setContainerSizeType('1×20\' RF')
    setVesselStatus('Arrived')
    setBlNo('BL123456')
    setShippingLines('Shipping Lines Sample')
    setConsignee('Consignee Sample')
    setItems([
      { 
        product: 'Sample Product A', 
        pcsBox: '10', 
        quantityPieces: '100', 
        quantityCarton: '10', 
        unitPrice: '50.00', 
        totalAmount: '5000.00', 
        netWeight: '450.5', 
        grossWeight: '500.0', 
        measurement: '2.5x1.5x1.0' 
      },
      { 
        product: 'Sample Product B', 
        pcsBox: '20', 
        quantityPieces: '200', 
        quantityCarton: '10', 
        unitPrice: '30.00', 
        totalAmount: '6000.00', 
        netWeight: '280.0', 
        grossWeight: '320.5', 
        measurement: '3.0x2.0x1.5' 
      }
    ])
  }

  const removeItem = (idx) => {
    if (items.length <= 1) return
    setItems(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const values = {
      port_of_loading: portOfLoading,
      port_of_discharge: portOfDischarge,
      eta: eta,
      supplier_shipper: supplierShipper,
      container_no: containerNo,
      container_size_type: containerSizeType,
      vessel_status: vesselStatus,
      bl_number: blNo,
      shipping_lines: shippingLines,
      consignee: consignee,
      items: items
    }
    onSubmit(values)
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
            <h2 className="cso-header-title">Edit {title || 'General Information'}</h2>
          </div>
          <div className="cso-header-right">
            {lastEditedText && <span>Last Edited On: {lastEditedText}</span>}
            <button className="cso-close-btn" onClick={onClose} type="button">✕</button>
          </div>
        </div>

        <div className="cso-body">
          {/* Full width form */}
          <div className="cso-right" style={{ width: '100%' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflow: 'auto', padding: '0 0.75em' }}>
                {/* Top section - General Shipment Information */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3>General Shipment Information</h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1rem' }}>
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
                      <label>ETA</label>
                      <input
                        type="date"
                        value={eta}
                        onChange={(e) => setEta(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Supplier/Shipper</label>
                      <input
                        type="text"
                        value={supplierShipper}
                        onChange={(e) => setSupplierShipper(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Container No.</label>
                      <input
                        type="text"
                        value={containerNo}
                        onChange={(e) => setContainerNo(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Size and Type of Container</label>
                      <input
                        type="text"
                        value={containerSizeType}
                        onChange={(e) => setContainerSizeType(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Vessel Status</label>
                      <input
                        type="text"
                        value={vesselStatus}
                        onChange={(e) => setVesselStatus(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>B/L No.</label>
                      <input
                        type="text"
                        value={blNo}
                        onChange={(e) => setBlNo(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Shipping Lines</label>
                      <input
                        type="text"
                        value={shippingLines}
                        onChange={(e) => setShippingLines(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>Consignee</label>
                      <input
                        type="text"
                        value={consignee}
                        onChange={(e) => setConsignee(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Middle section - Combined Product Details */}
                <div className="invoice-section">
                  <h3>Product Details (Combined Invoice & Packing List)</h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Pcs/Box</th>
                          <th>Quantity Pieces</th>
                          <th>Quantity Carton</th>
                          <th>Unit Price</th>
                          <th>Total Amount</th>
                          <th>Net Weight</th>
                          <th>Gross Weight</th>
                          <th>Measurement</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="text"
                                value={item.product}
                                onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.pcsBox}
                                onChange={(e) => handleItemChange(idx, 'pcsBox', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantityPieces}
                                onChange={(e) => handleItemChange(idx, 'quantityPieces', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={item.quantityCarton}
                                onChange={(e) => handleItemChange(idx, 'quantityCarton', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.totalAmount}
                                onChange={(e) => handleItemChange(idx, 'totalAmount', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.netWeight}
                                onChange={(e) => handleItemChange(idx, 'netWeight', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.grossWeight}
                                onChange={(e) => handleItemChange(idx, 'grossWeight', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={item.measurement}
                                onChange={(e) => handleItemChange(idx, 'measurement', e.target.value)}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeItem(idx)}
                                disabled={items.length <= 1}
                                className="invoice-delete-btn"
                              >
                                <i className="fi fi-rs-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    type="button"
                    onClick={addItem}
                    className="add-pair-btn"
                  >
                    + Add Item
                  </button>
                </div>
              </div>

              {/* Debug - Dummy Data Button */}
              <div style={{ marginTop: 'auto', paddingTop: '1rem', padding: '0 0.75em' }}>
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
