import React from 'react'
import './CreateShipmentOverlay.css'
import { formatDateTime } from '../../utils/dateUtils'

// Remarks edit overlay with structured form layout:
// - Table with Date (auto-filled) and Notes (user input) columns
export default function RemarksEditOverlay({
  title,
  initialValues = {},
  initialRemarks = [],
  onClose,
  onSubmit,
  updatedAt,
  updatedBy,
  uploadedBy
}) {
  // Remarks entries
  const [remarks, setRemarks] = React.useState(() => {
    if (initialRemarks.length) return initialRemarks
    return [{ date: new Date().toISOString().split('T')[0], notes: '' }]
  })

  const handleRemarkChange = (idx, field, value) => {
    setRemarks(prev => prev.map((remark, i) => {
      if (i !== idx) return remark
      return { ...remark, [field]: value }
    }))
  }

  const addRemark = () => {
    setRemarks(prev => [...prev, { 
      date: new Date().toISOString().split('T')[0], 
      notes: '' 
    }])
  }

  const fillDummyData = () => {
    setRemarks([
      { date: '2025-01-15', notes: 'Shipment arrived at port' },
      { date: '2025-01-16', notes: 'Customs clearance completed' },
      { date: '2025-01-17', notes: 'Container loaded for delivery' },
      { date: new Date().toISOString().split('T')[0], notes: 'Ready for final delivery' }
    ])
  }

  const removeRemark = (idx) => {
    if (remarks.length <= 1) return
    setRemarks(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const values = {
      remarks: remarks
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
            <h2 className="cso-header-title">Edit {title || 'Remarks'}</h2>
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
                {/* Remarks Table */}
                <div className="invoice-section">
                  <h3>Shipment Updates</h3>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="invoice-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Notes</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {remarks.map((remark, idx) => (
                          <tr key={idx}>
                            <td>
                              <input
                                type="date"
                                value={remark.date}
                                onChange={(e) => handleRemarkChange(idx, 'date', e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={remark.notes}
                                onChange={(e) => handleRemarkChange(idx, 'notes', e.target.value)}
                                placeholder="Enter remarks or notes..."
                                style={{ width: '100%' }}
                              />
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => removeRemark(idx)}
                                disabled={remarks.length <= 1}
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
                    onClick={addRemark}
                    className="add-pair-btn"
                  >
                    + Add Shipment Update
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
