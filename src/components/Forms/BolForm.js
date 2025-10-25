import React from 'react'

// Reusable BOL Form Component
// Props:
// - values: object with all field values
// - onChange: function(key, value) to handle field changes
// - pairs: array of container/seal pairs
// - onPairChange: function(idx, field, value) to handle pair changes
// - onAddPair: function to add new pair
// - onRemovePair: function(idx) to remove pair
// - showValidation: boolean to show validation errors
// - validationErrors: array of validation error messages
export default function BolForm({
  values = {},
  onChange,
  pairs = [],
  onPairChange,
  onAddPair,
  onRemovePair,
  showValidation = false,
  validationErrors = []
}) {
  
  // Required field validation
  const validateAllFields = () => {
    const requiredFields = [
      { key: 'shipper', label: 'Shipper' },
      { key: 'bl_number', label: 'B/L Number' },
      { key: 'consignee', label: 'Consignee' },
      { key: 'shipping_line', label: 'Shipping Line' },
      { key: 'vessel_name', label: 'Vessel Name' },
      { key: 'voyage_no', label: 'Voyage Number' },
      { key: 'port_of_loading', label: 'Port of Loading' },
      { key: 'port_of_discharge', label: 'Port of Discharge' },
      { key: 'place_of_delivery', label: 'Place of Delivery' },
      { key: 'container_specs', label: 'Container Specs' },
      { key: 'no_of_packages', label: 'Number of Packages' },
      { key: 'packaging_kind', label: 'Packaging Kind' },
      { key: 'goods_classification', label: 'Goods Classification' },
      { key: 'description_of_goods', label: 'Description of Goods' },
      { key: 'gross_weight', label: 'Gross Weight' }
    ]
    
    const missingFields = requiredFields.filter(field => 
      !values[field.key] || values[field.key].toString().trim() === ''
    )
    
    // Check if container/seal pairs have at least one complete pair
    const hasValidPair = pairs.some(pair => 
      (pair.left || pair.containerNo)?.trim() !== '' && 
      (pair.right || pair.sealNo)?.trim() !== ''
    )
    
    const errors = []
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(f => f.label).join(', ')
      errors.push(`Please fill in the following required fields: ${fieldNames}`)
    }
    
    if (!hasValidPair) {
      errors.push('Please fill in at least one complete Container/Seal pair')
    }
    
    return errors
  }

  // Expose validation function for parent components
  React.useImperativeHandle(React.forwardRef(() => {}), () => ({
    validateAllFields
  }))

  return (
    <div>
      {/* Bill of Lading Information Section */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333' }}>
          Bill of Lading Information
        </h3>
        
        {/* First Row - Shipper */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Shipper <span style={{ color: 'red' }}>*</span></label>
            <textarea
              value={values.shipper || ''}
              onChange={(e) => onChange('shipper', e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>B/L No. <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={values.bl_number || ''}
              onChange={(e) => onChange('bl_number', e.target.value)}
            />
          </div>
        </div>
        
        {/* Second Row - Consignee */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Consignee <span style={{ color: 'red' }}>*</span></label>
            <textarea
              value={values.consignee || ''}
              onChange={(e) => onChange('consignee', e.target.value)}
              rows={3}
            />
          </div>
          <div className="form-group">
            <label>Shipping Line <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={values.shipping_line || ''}
              onChange={(e) => onChange('shipping_line', e.target.value)}
            />
          </div>
        </div>

        {/* Vessel Info Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Vessel Name <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={values.vessel_name || ''}
              onChange={(e) => onChange('vessel_name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Voyage No. <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={values.voyage_no || ''}
              onChange={(e) => onChange('voyage_no', e.target.value)}
            />
          </div>
        </div>

        {/* Ports Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Port of Loading <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={values.port_of_loading || ''}
              onChange={(e) => onChange('port_of_loading', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Port of Discharge <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={values.port_of_discharge || ''}
              onChange={(e) => onChange('port_of_discharge', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Place of Delivery <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={values.place_of_delivery || ''}
              onChange={(e) => onChange('place_of_delivery', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cargo Table Section */}
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', fontWeight: 600, color: '#333', borderTop: '2px solid #ddd', paddingTop: '1rem' }}>
          Cargo Table
        </h3>
        
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
                      value={pair.left || pair.containerNo || ''}
                      onChange={(e) => onPairChange(idx, 'left', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={pair.right || pair.sealNo || ''}
                      onChange={(e) => onPairChange(idx, 'right', e.target.value)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="delete-pair-btn"
                      onClick={() => onRemovePair(idx)}
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

        <button type="button" onClick={onAddPair} className="add-pair-btn">
          + Add Container/Seal Pair
        </button>

        {/* Container Specs */}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label>Container Specs <span style={{ color: 'red' }}>*</span></label>
          <input
            type="text"
            value={values.container_specs || ''}
            onChange={(e) => onChange('container_specs', e.target.value)}
          />
        </div>

        {/* Packages Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>No. of Packages <span style={{ color: 'red' }}>*</span></label>
            <input
              type="number"
              value={values.no_of_packages || ''}
              onChange={(e) => onChange('no_of_packages', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Packaging Kind <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              value={values.packaging_kind || ''}
              onChange={(e) => onChange('packaging_kind', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Goods Classification <span style={{ color: 'red' }}>*</span></label>
          <input
            type="text"
            value={values.goods_classification || ''}
            onChange={(e) => onChange('goods_classification', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Description of Goods <span style={{ color: 'red' }}>*</span></label>
          <textarea
            value={values.description_of_goods || ''}
            onChange={(e) => onChange('description_of_goods', e.target.value)}
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>Gross Weight (KGS) <span style={{ color: 'red' }}>*</span></label>
          <input
            type="number"
            step="0.01"
            value={values.gross_weight || ''}
            onChange={(e) => onChange('gross_weight', e.target.value)}
          />
        </div>
      </div>

      {/* Validation Errors */}
      {showValidation && validationErrors.length > 0 && (
        <div style={{ 
          backgroundColor: '#fee2e2', 
          border: '1px solid #fca5a5', 
          borderRadius: '6px', 
          padding: '12px', 
          marginBottom: '1rem' 
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#dc2626', fontSize: '0.9rem' }}>
            Please fix the following errors:
          </h4>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {validationErrors.map((error, idx) => (
              <li key={idx} style={{ color: '#dc2626', fontSize: '0.9rem' }}>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Export validation function for use in parent components
export const validateBolForm = (values, pairs) => {
  const requiredFields = [
    { key: 'shipper', label: 'Shipper' },
    { key: 'bl_number', label: 'B/L Number' },
    { key: 'consignee', label: 'Consignee' },
    { key: 'shipping_line', label: 'Shipping Line' },
    { key: 'vessel_name', label: 'Vessel Name' },
    { key: 'voyage_no', label: 'Voyage Number' },
    { key: 'port_of_loading', label: 'Port of Loading' },
    { key: 'port_of_discharge', label: 'Port of Discharge' },
    { key: 'place_of_delivery', label: 'Place of Delivery' },
    { key: 'container_specs', label: 'Container Specs' },
    { key: 'no_of_packages', label: 'Number of Packages' },
    { key: 'packaging_kind', label: 'Packaging Kind' },
    { key: 'goods_classification', label: 'Goods Classification' },
    { key: 'description_of_goods', label: 'Description of Goods' },
    { key: 'gross_weight', label: 'Gross Weight' }
  ]
  
  const missingFields = requiredFields.filter(field => 
    !values[field.key] || values[field.key].toString().trim() === ''
  )
  
  // Check if container/seal pairs have at least one complete pair
  const hasValidPair = pairs.some(pair => 
    (pair.left || pair.containerNo)?.trim() !== '' && 
    (pair.right || pair.sealNo)?.trim() !== ''
  )
  
  const errors = []
  if (missingFields.length > 0) {
    const fieldNames = missingFields.map(f => f.label).join(', ')
    errors.push(`Please fill in the following required fields: ${fieldNames}`)
  }
  
  if (!hasValidPair) {
    errors.push('Please fill in at least one complete Container/Seal pair')
  }
  
  return errors
}
