import React from 'react';

const CompletionConfirmOverlay = ({ 
  isOpen, 
  heading, 
  bodyText, 
  onConfirm, 
  onCancel 
}) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onCancel}>
      <div style={{
        background: '#fff',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ 
          marginTop: 0,
          marginBottom: '20px', 
          color: '#333',
          fontSize: '1.5rem',
          fontWeight: '600',
          borderBottom: '3px solid #10b981',
          paddingBottom: '8px'
        }}>
          {heading}
        </h2>
        
        <div style={{ 
          marginBottom: '24px', 
          color: '#666',
          fontSize: '1rem',
          lineHeight: '1.6'
        }}>
          {bodyText.split('\n').map((line, index) => (
            <p key={index} style={{ 
              margin: index === 0 ? '0 0 8px 0' : '8px 0',
              fontWeight: line.includes('PRO number:') ? '600' : 'normal',
              color: line.includes('PRO number:') ? '#1f2937' : '#666'
            }}>
              {line}
            </p>
          ))}
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#e5e7eb'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#f3f4f6'}
          >
            No
          </button>
          
          <button
            onClick={onConfirm}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '500'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#004a8f'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'var(--primary-color)'}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletionConfirmOverlay;
