import React from 'react'
import DocumentUploadOverlay from './DocumentUploadOverlay'
import { supabase } from '../../services/supabase/client'

export default function SimpleCreateShipmentOverlay({ open, onClose, onConfirm, existingProNos = [] }) {
  const [proNumber, setProNumber] = React.useState('')
  const [error, setError] = React.useState('')
  const [checkingDb, setCheckingDb] = React.useState(false)
  const [existsInDb, setExistsInDb] = React.useState(false)
  const [generatedProNumber, setGeneratedProNumber] = React.useState('')

  // Get current year
  const currentYear = new Date().getFullYear()
  
  // Generate next PRO number based on highest existing + 1
  React.useEffect(() => {
    const generateNextProNumber = async () => {
      try {
        // Get highest PRO number from database
        const { data, error } = await supabase
          .from('pro')
          .select('pro_number')
          .order('pro_number', { ascending: false })
          .limit(1)
        
        if (error) throw error
        
        let nextNumber = 1
        if (data && data.length > 0) {
          const highestPro = data[0].pro_number
          const year = parseInt(highestPro.toString().substring(0, 4))
          const number = parseInt(highestPro.toString().substring(4))
          
          if (year === currentYear) {
            nextNumber = number + 1
          }
        }
        
        const paddedNumber = nextNumber.toString().padStart(3, '0')
        const fullProNumber = `${currentYear}${paddedNumber}`
        setGeneratedProNumber(fullProNumber)
        setProNumber(paddedNumber)
      } catch (err) {
        console.error('Error generating PRO number:', err)
        // Fallback to 001
        setGeneratedProNumber(`${currentYear}001`)
        setProNumber('001')
      }
    }
    
    if (open) {
      generateNextProNumber()
    }
  }, [open, currentYear])

  const validatePro = (val) => /^\d{3}$/.test(val)
  const proExists = (val) => Array.isArray(existingProNos) && existingProNos.includes(val)
  
  // DB uniqueness check
  React.useEffect(() => {
    let active = true
    const run = async () => {
      const val = proNumber
      if (!validatePro(val)) { setExistsInDb(false); return }
      setCheckingDb(true)
      try {
        const fullPro = `${currentYear}${val}`
        const { data, error } = await supabase
          .from('pro')
          .select('pro_number')
          .eq('pro_number', fullPro)
          .limit(1)
        if (!active) return
        if (error) { setExistsInDb(false) }
        else setExistsInDb(Array.isArray(data) && data.length > 0)
      } finally {
        if (active) setCheckingDb(false)
      }
    }
    run()
    return () => { active = false }
  }, [proNumber, currentYear])

  if (!open) return null

  const disabled = !validatePro(proNumber) || proExists(proNumber) || existsInDb || checkingDb

  const handleConfirmClick = (file) => {
    console.log('SimpleCreateShipmentOverlay - Confirm clicked')
    
    if (!validatePro(proNumber) || proExists(proNumber) || existsInDb) {
      setError('Invalid or existing PRO number')
      return
    }
    
    if (!file) {
      setError('Please select a file first')
      return
    }
    
    const fullProNumber = `${currentYear}${proNumber}`
    const previewUrl = URL.createObjectURL(file)
    
    console.log('Calling onConfirm with:', { fullProNumber, file: file.name })
    onConfirm({ proNumber: fullProNumber, file, previewUrl, originalFileName: file.name })
  }

  return (
    <DocumentUploadOverlay
      title="Create New Shipment (NEW SIMPLE VERSION)"
      proNumber={generatedProNumber}
      onClose={onClose}
      onSubmit={handleConfirmClick}
      error={error}
      className="create-shipment"
      footerButtons={
        <>
          <button className="duo-btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="duo-btn duo-primary" 
            type="submit" 
            disabled={disabled}
          >
            Confirm
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Visual indicator - NEW SIMPLE VERSION */}
        <div style={{ 
          padding: '8px 12px', 
          backgroundColor: 'white', 
          color: '#374151', 
          borderRadius: '6px', 
          marginBottom: '1rem',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          ✓ NEW SIMPLE VERSION - Working!
        </div>
        <div className="form-group">
          <label htmlFor="pro">PRO Number</label>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: '#fff',
            overflow: 'hidden',
            width: '200px',
            margin: '0 auto'
          }}>
            <input 
              type="text" 
              value={currentYear}
              readOnly
              style={{ 
                width: '100px', 
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                color: '#666',
                cursor: 'not-allowed',
                border: 'none',
                outline: 'none',
                padding: '12px 8px',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            />
            <div style={{
              width: '1px',
              height: '24px',
              backgroundColor: '#d1d5db',
              margin: '0 8px'
            }}></div>
            <input 
              id="pro" 
              name="pro"
              type="text" 
              value={proNumber} 
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 3)
                setProNumber(val)
              }}
              placeholder="001"
              style={{ 
                width: '80px', 
                textAlign: 'center',
                border: 'none',
                outline: 'none',
                padding: '12px 8px',
                fontSize: '1rem',
                fontWeight: '500'
              }}
              maxLength={3}
            />
          </div>
          {!validatePro(proNumber) && proNumber && (
            <div className="duo-hint">Enter 3 digits (001-999)</div>
          )}
          {validatePro(proNumber) && proExists(proNumber) && (
            <div className="duo-error">This PRO Number already exists.</div>
          )}
          {validatePro(proNumber) && !proExists(proNumber) && existsInDb && (
            <div className="duo-error">This PRO Number already exists in database.</div>
          )}
          {checkingDb && (
            <div className="duo-hint">Checking availability…</div>
          )}
          {validatePro(proNumber) && !proExists(proNumber) && !existsInDb && !checkingDb && (
            <div className="duo-hint" style={{ color: '#059669' }}>✓ PRO Number {currentYear}{proNumber} is available</div>
          )}
        </div>
      </div>
    </DocumentUploadOverlay>
  )
}

