import React, { useState, useRef, useEffect } from 'react';
import CameraCapture from '../common/CameraCapture';
import { formatDateTime } from '../../utils/dateUtils';
import './DocumentUploadOverlay.css';

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

const DocumentUploadOverlay = ({
  title,
  proNumber,
  onClose,
  onSubmit,
  children,
  uploading = false,
  error = '',
  acceptedTypes = ACCEPTED_TYPES,
  footerButtons = null,
  lastSavedBy = null,
  lastSavedAt = null,
  className = ''
}) => {
  // File handling state
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [fileError, setFileError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef(null);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFilePick = () => inputRef.current?.click();

  const onFiles = (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    
    const f = list[0];
    if (!acceptedTypes.includes(f.type)) {
      setFileError(`Unsupported file type: ${f.type}`);
      return;
    }
    
    setFileError('');
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
  };

  const handleCameraCapture = (capturedFile) => {
    setFileError('');
    setFile(capturedFile);
    const url = URL.createObjectURL(capturedFile);
    setPreviewUrl(url);
  };

  const removeFile = () => {
    setFile(null);
    setPreviewUrl('');
    setFileError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setFileError('Please select a file or take a picture first');
      return;
    }
    
    // Get form data from the entire modal, not just the form element
    const modal = e.target.closest('.duo-modal');
    const formData = new FormData();
    
    // Collect all input fields in the modal
    const inputs = modal.querySelectorAll('input[name], textarea[name], select[name]');
    inputs.forEach(input => {
      if (input.name && input.value) {
        formData.append(input.name, input.value);
      }
    });
    
    const formDataObj = Object.fromEntries(formData.entries());
    
    try {
      await onSubmit(file, formDataObj);
    } catch (error) {
      // Don't close the overlay when validation fails
      return;
    }
  };

  const ext = (file?.name || '').split('.').pop()?.toLowerCase() || '';
  const canEmbed = ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg';

  // Default footer buttons
  const defaultFooterButtons = (
    <>
      <button className="duo-btn" type="button" onClick={onClose} disabled={uploading}>
        Cancel
      </button>
      <button className="duo-btn duo-primary" type="submit" disabled={uploading || !file}>
        {uploading ? 'Uploading...' : 'Submit'}
      </button>
    </>
  );

  return (
    <div className="duo-backdrop" onClick={onClose}>
      <div className={`duo-modal ${className}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="duo-header">
          <div className="duo-header-left">
            <h2 className="duo-header-title">{title}</h2>
          </div>
          <div className="duo-header-right">
            <button className="duo-close-btn" onClick={onClose} type="button">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="duo-body">
          {/* Left side - File upload/preview */}
          <div className="duo-left">
            {!previewUrl ? (
              <>
                <div 
                  className="duo-upload-area"
                  onClick={handleFilePick}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
                  onDrop={onDrop}
                >
                  <div 
                    className="duo-drop" 
                    role="button" 
                    tabIndex={0} 
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFilePick() }}
                  >
                    <strong>Upload Document</strong>
                    <div>Drag & drop or click to choose</div>
                    <div className="duo-accept">Accepted: jpg, png, pdf, docx, xlsx</div>
                    <input 
                      ref={inputRef} 
                      type="file" 
                      accept={acceptedTypes.join(',')} 
                      onChange={(e) => onFiles(e.target.files)} 
                      style={{ display: 'none' }} 
                    />
                  </div>
                </div>
                
                {/* Camera button - outside upload area */}
                <div className="duo-camera-section">
                  <button
                    type="button"
                    className="duo-btn camera-btn"
                    onClick={() => setShowCamera(true)}
                  >
                    <i className="fi fi-rs-camera"></i>
                    Take a Picture
                  </button>
                </div>
              </>
            ) : (
              <div className="duo-preview">
                <div className="duo-filename">{file?.name}</div>
                <div className="duo-preview-content">
                  {canEmbed ? (
                    ext === 'pdf' ? (
                      <iframe title={file?.name} src={previewUrl} className="duo-frame" />
                    ) : (
                      <img alt={file?.name} src={previewUrl} className="duo-image" />
                    )
                  ) : (
                    <div className="duo-fallback">Preview unavailable. Selected: {file?.name}</div>
                  )}
                </div>
                <div className="duo-preview-actions">
                  <button
                    type="button"
                    onClick={removeFile}
                    className="duo-btn remove-btn"
                  >
                  <i className="fi fi-rs-circle-cross"></i>
                  Remove File
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right side - Form content */}
          <div className="duo-right">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="duo-footer">
          <div className="duo-footer-left">
            {/* Error messages */}
            {fileError && <div className="duo-error">{fileError}</div>}
            {error && <div className="duo-error">{error}</div>}
            {/* Last saved info */}
            {!fileError && !error && lastSavedBy && lastSavedAt && (
              <div className="duo-saved-info">
                Last saved by: <strong>{lastSavedBy}</strong> on {formatDateTime(lastSavedAt)}
              </div>
            )}
          </div>
          <div className="duo-footer-right">
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              {footerButtons || defaultFooterButtons}
            </form>
          </div>
        </div>
      </div>

      {/* Camera Capture Modal */}
      <CameraCapture
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
};

export default DocumentUploadOverlay;
