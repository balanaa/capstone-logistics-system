import React from 'react'
import DocumentUploadOverlay from './DocumentUploadOverlay'
import { supabase } from '../../services/supabase/client'

export default function CreateShipmentOverlay({ open, onClose, onConfirm, existingProNos = [] }) {
  const [proNumber, setProNumber] = React.useState('')
  const [error, setError] = React.useState('')
  const [checkingDb, setCheckingDb] = React.useState(false)
  const [existsInDb, setExistsInDb] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [generatedProNumber, setGeneratedProNumber] = React.useState('')
  const [file, setFile] = React.useState(null)
  const confirmButtonRef = React.useRef(null)

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

  // Debug button state after render - must be before conditional return
  React.useEffect(() => {
    if (open && confirmButtonRef.current) {
      // Button state debugging removed
    }
  })

  if (!open) return null

  const disabled = !validatePro(proNumber) || proExists(proNumber) || existsInDb || checkingDb

  const handleSubmit = (selectedFile, formData) => {
    
    if (!validatePro(proNumber) || proExists(proNumber) || existsInDb) {
      setError('Invalid or existing PRO number')
      return
    }
    
    if (!selectedFile) {
      setError('Please select a file first')
      return
    }
    
    const fullProNumber = `${currentYear}${proNumber}`
    setGeneratedProNumber(fullProNumber)
    setFile(selectedFile)
    setShowConfirm(true)
  }

  // Fallback: Direct confirm button handler
  const handleDirectConfirm = () => {
    
    if (!validatePro(proNumber) || proExists(proNumber) || existsInDb) {
      setError('Invalid or existing PRO number')
      return
    }
    
    // Get file from DocumentUploadOverlay - try multiple selectors
    let fileInput = document.querySelector('.duo-modal input[type="file"]')
    if (!fileInput) {
      fileInput = document.querySelector('input[type="file"]')
    }
    
    const file = fileInput?.files?.[0]
    
    if (!file) {
      setError('Please select a file first')
      return
    }
    
    const fullProNumber = `${currentYear}${proNumber}`
    setGeneratedProNumber(fullProNumber)
    setFile(file)
    setShowConfirm(true)
  }

  const handleConfirm = () => {
    const previewUrl = URL.createObjectURL(file)
    onConfirm({ proNumber: generatedProNumber, file, previewUrl, originalFileName: file.name })
    setShowConfirm(false)
  }

  const handleCancelConfirm = () => {
    setShowConfirm(false)
    setFile(null)
  }

  return (
    <>
      <DocumentUploadOverlay
        title="Create New Shipment"
        proNumber={generatedProNumber}
        onClose={onClose}
        onSubmit={handleSubmit}
        error={error}
        className="create-shipment-no-scroll"
        footerButtons={
          <>
            <button className="duo-btn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button 
              ref={confirmButtonRef}
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

      {/* Confirmation Mini Overlay */}
      {showConfirm && (
        <div className="duo-backdrop" onClick={handleCancelConfirm}>
          <div className="duo-modal" style={{ width: '400px', height: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="duo-header">
              <h2 className="duo-header-title">Confirm PRO Creation</h2>
              <button className="duo-close-btn" onClick={handleCancelConfirm} type="button">✕</button>
            </div>
            
            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 20px 0', fontSize: '1rem' }}>
                Create PRO number <strong>{generatedProNumber}</strong>?
              </p>
              <p style={{ margin: '0 0 20px 0', fontSize: '0.9rem', color: '#666' }}>
                This will create a new shipment and proceed to Bill of Lading upload.
              </p>
            </div>
            
            <div className="duo-footer">
              <div className="duo-footer-left"></div>
              <div className="duo-footer-right">
                <button className="duo-btn" type="button" onClick={handleCancelConfirm}>
                  Cancel
                </button>
                <button 
                  className="duo-btn duo-primary" 
                  type="button" 
                  onClick={handleConfirm}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}