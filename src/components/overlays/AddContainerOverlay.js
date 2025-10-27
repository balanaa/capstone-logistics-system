import React, { useState } from 'react';

const AddContainerOverlay = ({ 
  isOpen, 
  onConfirm, 
  onCancel 
}) => {
  const [containerNumber, setContainerNumber] = useState('');
  const [sealNumber, setSealNumber] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!containerNumber.trim()) {
      setError('Container number is required');
      return;
    }
    
    onConfirm({
      container_number: containerNumber.trim(),
      seal_number: sealNumber.trim() || null
    });
    
    // Reset form
    setContainerNumber('');
    setSealNumber('');
    setError('');
  };

  const handleCancel = () => {
    setContainerNumber('');
    setSealNumber('');
    setError('');
    onCancel();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={handleCancel}>
      <div style={{
        background: '#fff',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ 
          marginTop: 0,
          marginBottom: '20px', 
          color: '#333',
          fontSize: '1.5rem',
          fontWeight: '600',
          borderBottom: '3px solid #3498db',
          paddingBottom: '8px'
        }}>
          Add Container
        </h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#555',
            fontSize: '0.9rem'
          }}>
            Container Number <span style={{ color: '#e74c3c' }}>*</span>
          </label>
          <input
            type="text"
            value={containerNumber}
            onChange={(e) => {
              setContainerNumber(e.target.value);
              setError('');
            }}
            placeholder="Enter container number"
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${error ? '#e74c3c' : '#ddd'}`,
              borderRadius: '4px',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
          {error && (
            <div style={{
              color: '#e74c3c',
              fontSize: '0.8rem',
              marginTop: '4px'
            }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: '500',
            color: '#555',
            fontSize: '0.9rem'
          }}>
            Seal Number <span style={{ color: '#999', fontWeight: 'normal' }}>(Optional)</span>
          </label>
          <input
            type="text"
            value={sealNumber}
            onChange={(e) => setSealNumber(e.target.value)}
            placeholder="Enter seal number"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: '#fff',
              color: '#666',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#f8f9fa';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#fff';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              background: '#3498db',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = '#2980b9';
            }}
            onMouseOut={(e) => {
              e.target.style.background = '#3498db';
            }}
          >
            Add Container
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddContainerOverlay;

