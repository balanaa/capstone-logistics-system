// OCR Test Page - Google Vision AI Integration
import React, { useState } from 'react';
import { browserVisionAIService } from '../services/browserVisionAI';
import PDFPreview from '../components/PDFPreview';
import DataDisplay from '../components/DataDisplay';
import './OCRTest.css';

export default function OCRTest() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if API key is configured
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
  const hasApiKey = apiKey && apiKey !== 'your_api_key_here';

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setOcrResult(null);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Process file with appropriate method
  const processFile = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    const fileType = browserVisionAIService.getFileType(selectedFile);
    
    // For PDFs, the PDFPreview component handles text extraction
    if (fileType === 'pdf') {
      setError('PDF text extraction is handled automatically in the preview above');
      return;
    }

    setLoading(true);
    setError(null);
    setOcrResult(null);

    try {
      console.log('🔍 Processing file with appropriate method...');
      
      // Process file based on type
      const result = await browserVisionAIService.processFile(selectedFile);
      
      if (result.success) {
        console.log('✅ File processing completed successfully');
        setOcrResult(result);
      } else {
        setError(result.error || 'Failed to process file');
      }
    } catch (err) {
      console.error('❌ File processing failed:', err);
      setError('File processing failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Clear all data
  const clearAll = () => {
    setSelectedFile(null);
    setImagePreview(null);
    setOcrResult(null);
    setError(null);
    setLoading(false);
  };

  return (
    <div className="ocr-test-container">
      <div className="ocr-header">
        <h1>🔍 OCR Test - Google Vision AI</h1>
        <p>Upload an image to extract text using Google Vision AI</p>
      </div>

      <div className="ocr-content">
        {/* API Key Warning */}
        {!hasApiKey && (
          <div className="api-key-warning">
            <h3>⚠️ API Key Required</h3>
            <p>To use OCR functionality, you need to add your Google Vision API key to the .env file:</p>
            <div className="code-block">
              <code>REACT_APP_GOOGLE_API_KEY=your_api_key_here</code>
            </div>
            <p>Get your API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a></p>
          </div>
        )}

        {/* File Upload Section */}
        <div className="upload-section">
          <div className="file-input-container">
            <input
              type="file"
              id="file-upload"
              accept=".jpg,.jpeg,.png,.gif,.bmp,.webp,.tiff,.pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect}
              className="file-input"
            />
            <label htmlFor="file-upload" className="file-input-label">
              📁 Choose File (Images, PDF, Excel)
            </label>
          </div>
          
          {selectedFile && (
            <div className="file-info">
              <p><strong>Selected:</strong> {selectedFile.name}</p>
              <p><strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB</p>
              <p><strong>Type:</strong> {selectedFile.type || 'Unknown'}</p>
              <p><strong>File Type:</strong> {browserVisionAIService.getFileType(selectedFile)}</p>
            </div>
          )}
        </div>

        {/* File Preview Section */}
        {imagePreview && browserVisionAIService.getFileType(selectedFile) === 'image' && (
          <div className="preview-section">
            <h3>📷 Image Preview</h3>
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
            </div>
          </div>
        )}

        {/* PDF Preview */}
        {selectedFile && browserVisionAIService.getFileType(selectedFile) === 'pdf' && (
          <PDFPreview 
            file={selectedFile} 
            onTextExtracted={(result) => {
              setOcrResult(result);
              setLoading(false);
            }}
          />
        )}

        {/* Excel Preview */}
        {selectedFile && browserVisionAIService.getFileType(selectedFile) === 'excel' && (
          <div className="preview-section">
            <h3>📊 Excel File Preview</h3>
            <div className="file-preview">
              <div className="file-icon">
                📊
              </div>
              <p><strong>File:</strong> {selectedFile.name}</p>
              <p><strong>Type:</strong> EXCEL</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            onClick={processFile} 
            disabled={!selectedFile || loading || !hasApiKey}
            className="process-btn"
          >
            {loading ? '🔄 Processing...' : 
             selectedFile && browserVisionAIService.getFileType(selectedFile) === 'pdf' ? '📄 PDF Auto-Processed' :
             selectedFile && browserVisionAIService.getFileType(selectedFile) === 'excel' ? '📊 Process Excel' :
             '🚀 Process File'}
          </button>
          
          <button 
            onClick={clearAll}
            className="clear-btn"
          >
            🗑️ Clear All
          </button>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Processing image with Google Vision AI...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="error-section">
            <h3>❌ Error</h3>
            <p>{error}</p>
          </div>
        )}

        {/* Processing Results Section */}
        {ocrResult && (
          <div className="results-section">
            <h3>📝 Processing Results</h3>
            
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">File Type:</span>
                <span className="stat-value">{ocrResult.fileType?.toUpperCase() || 'Unknown'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Processing Method:</span>
                <span className="stat-value">{ocrResult.processingMethod || 'Vision AI Text Detection'}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Words Found:</span>
                <span className="stat-value">{ocrResult.words?.length || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Confidence:</span>
                <span className="stat-value">
                  {ocrResult.confidence ? `${(ocrResult.confidence * 100).toFixed(1)}%` : 'N/A'}
                </span>
              </div>
              {ocrResult.tableData && (
                <div className="stat-item table-detection">
                  <span className="stat-label">Tables Detected:</span>
                  <span className="stat-value">{ocrResult.tableData.totalTables || 0}</span>
                </div>
              )}
            </div>

            <div className="text-content">
              <h4>Full Text:</h4>
              <div className="text-output">
                {ocrResult.fullText || 'No text detected'}
              </div>
            </div>

            {/* Additional info for PDFs */}
            {ocrResult.fileType === 'pdf' && ocrResult.pageCount && (
              <div className="additional-info">
                <h4>📄 PDF Information:</h4>
                <p><strong>Pages:</strong> {ocrResult.pageCount}</p>
                {ocrResult.isScannedPDF && (
                  <p className="scanned-pdf-info">
                    <strong>📷 Scanned PDF:</strong> This PDF contains scanned pages that were processed with Google Vision AI OCR
                  </p>
                )}
                {ocrResult.warning && (
                  <p className="warning-text">⚠️ {ocrResult.warning}</p>
                )}
              </div>
            )}

            {/* Additional info for Excel files */}
            {ocrResult.fileType === 'excel' && ocrResult.sheetNames && (
              <div className="additional-info">
                <h4>📊 Excel Information:</h4>
                <p><strong>Sheets:</strong> {ocrResult.sheetCount}</p>
                <p><strong>Sheet Names:</strong> {ocrResult.sheetNames.join(', ')}</p>
              </div>
            )}

            {/* Structured Data Display */}
            <DataDisplay ocrResult={ocrResult} />

            {ocrResult.words && ocrResult.words.length > 0 && (
              <div className="words-breakdown">
                <h4>Individual Words:</h4>
                <div className="words-list">
                  {ocrResult.words.slice(0, 20).map((word, index) => (
                    <div key={index} className="word-item">
                      <span className="word-text">{word.text}</span>
                      <span className="word-confidence">
                        {(word.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {ocrResult.words.length > 20 && (
                    <p className="more-words">... and {ocrResult.words.length - 20} more words</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="instructions-section">
          <h3>💡 How to Use</h3>
          <ol>
            <li>Click "Choose File" to select an image, PDF, or Excel file</li>
            <li>Preview your file to make sure it's correct</li>
            <li>Click "Process File" to extract text/data</li>
            <li>View the extracted content and confidence scores</li>
            <li>Use "Clear All" to start over</li>
          </ol>
          
          <div className="tips">
            <h4>📋 Supported File Types:</h4>
            <ul>
              <li><strong>Images:</strong> JPG, PNG, GIF, BMP, WebP, TIFF</li>
              <li><strong>PDFs:</strong> PDF documents (text extraction)</li>
              <li><strong>Excel:</strong> XLSX, XLS, CSV files</li>
            </ul>
            
            <h4>💡 Tips for Better Results:</h4>
            <ul>
              <li><strong>Images:</strong> Use clear, high-contrast images with readable text</li>
              <li><strong>PDFs:</strong> Ensure PDFs contain selectable text (not scanned images)</li>
              <li><strong>Excel:</strong> Structured data will be parsed automatically</li>
              <li>Try different file formats if one doesn't work well</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
