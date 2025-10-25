import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Camera.css';

const Camera = () => {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const initCamera = async () => {
    try {
      setError(null);
      console.log("Requesting camera access...");
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }
      
      // Try different camera constraints for better mobile compatibility
      let mediaStream;
      try {
        // First try with mobile-friendly constraints
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
      } catch (err) {
        console.log("First attempt failed, trying simple constraint:", err);
        // Fallback to simple constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      console.log("Camera access granted!", mediaStream);
      setStream(mediaStream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log("Video stream attached to video element");
        
        // Wait for video to load
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded, dimensions:", videoRef.current.videoWidth, "x", videoRef.current.videoHeight);
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      let errorMessage = `Failed to access camera: ${err.message}`;
      
      // More specific error messages
      if (err.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied. Please allow camera access and try again.";
      } else if (err.name === 'NotFoundError') {
        errorMessage = "No camera found on this device.";
      } else if (err.name === 'NotSupportedError') {
        errorMessage = "Camera not supported in this browser.";
      } else if (err.name === 'NotReadableError') {
        errorMessage = "Camera is already in use by another application.";
      }
      
      setError(errorMessage);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob and download
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cross-port-photo-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    }
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="camera-container">
      <div className="camera-header">
        <h1>📱 LIVE - Cross-Port Camera</h1>
        <p>PWA Camera Application - Mobile Ready</p>
        <div style={{ 
          background: '#28a745', 
          color: 'white', 
          padding: '5px 10px', 
          borderRadius: '15px', 
          fontSize: '0.9rem',
          display: 'inline-block',
          marginTop: '10px'
        }}>
          ✅ LIVE PAGE - Camera Route Active
        </div>
        <button 
          className="back-button" 
          onClick={() => navigate('/')}
          style={{
            background: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          ← Back to App
        </button>
      </div>

      <div className="camera-controls">
        {!isCameraActive ? (
          <button 
            className="access-button" 
            onClick={initCamera}
          >
            Request Camera Access
          </button>
        ) : (
          <button 
            className="stop-button" 
            onClick={stopCamera}
          >
            Stop Camera
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <p><strong>Error:</strong> {error}</p>
          <p className="error-hint">
            Note: Camera access requires HTTPS in production. 
            For testing, use localhost or deploy to HTTPS hosting.
          </p>
          <details style={{ marginTop: '10px', fontSize: '0.9rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Debug Info</summary>
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              <p><strong>User Agent:</strong> {navigator.userAgent}</p>
              <p><strong>Media Devices Support:</strong> {navigator.mediaDevices ? 'Yes' : 'No'}</p>
              <p><strong>getUserMedia Support:</strong> {navigator.mediaDevices?.getUserMedia ? 'Yes' : 'No'}</p>
              <p><strong>HTTPS:</strong> {window.location.protocol === 'https:' ? 'Yes' : 'No'}</p>
              <p><strong>Current URL:</strong> {window.location.href}</p>
              <p><strong>Timestamp:</strong> {new Date().toLocaleString()}</p>
            </div>
          </details>
        </div>
      )}

      <div className="camera-preview">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
          className="camera-video"
        />
        
        {isCameraActive && (
          <div className="capture-controls">
            <button 
              className="snap-button" 
              onClick={capturePhoto}
              title="Capture Photo"
            >
              📸 Snap
            </button>
          </div>
        )}
      </div>

      <canvas 
        ref={canvasRef}
        className="hidden-canvas"
      />

      <div className="camera-info">
        <h3>Instructions:</h3>
        <ul>
          <li>Click "Request Camera Access" to start the camera</li>
          <li>Allow camera permissions when prompted</li>
          <li>Click "📸 Snap" to capture a photo</li>
          <li>Photos will be automatically downloaded</li>
        </ul>
        
        <h3>PWA Installation:</h3>
        <p>This app can be installed as a PWA on your device. 
        Look for the "Install" option in your browser menu.</p>
      </div>
    </div>
  );
};

export default Camera;
