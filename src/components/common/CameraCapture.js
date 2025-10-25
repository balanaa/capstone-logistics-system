import React, { useState, useRef, useEffect } from 'react';
import './CameraCapture.css';

const CameraCapture = ({ isOpen, onClose, onCapture }) => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [capturing, setCapturing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment' // Prefer back camera on mobile
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access to take photos.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Failed to access camera. Please try again.');
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create File object with proper name and MIME type
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = new File([blob], `camera-capture-${timestamp}.jpg`, {
          type: 'image/jpeg'
        });
        
        onCapture(file);
        onClose();
      }
      setCapturing(false);
    }, 'image/jpeg', 0.9); // JPEG with 90% quality
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="camera-capture-overlay" onClick={handleClose}>
      <div className="camera-capture-modal" onClick={(e) => e.stopPropagation()}>
        <div className="camera-capture-header">
          <h3>Take a Picture</h3>
          <button className="camera-close-btn" onClick={handleClose}>✕</button>
        </div>

        <div className="camera-capture-body">
          {error ? (
            <div className="camera-error">
              <div className="camera-error-icon">📷</div>
              <div className="camera-error-message">{error}</div>
              <button className="camera-retry-btn" onClick={startCamera}>
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="camera-video-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="camera-video"
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
              
              <div className="camera-controls">
                <button
                  className="camera-capture-btn"
                  onClick={capturePhoto}
                  disabled={capturing || !stream}
                >
                  {capturing ? 'Capturing...' : '📷 Capture Photo'}
                </button>
                <button
                  className="camera-cancel-btn"
                  onClick={handleClose}
                  disabled={capturing}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
