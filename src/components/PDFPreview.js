// PDF Preview Component
import React, { useState, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Vision AI function for scanned PDF pages
const extractTextWithVisionAI = async (base64Data) => {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      error: 'Google Vision API key not configured'
    };
  }

  try {
    const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Data
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.responses && data.responses[0] && data.responses[0].textAnnotations) {
      const textAnnotations = data.responses[0].textAnnotations;
      const fullText = textAnnotations[0] ? textAnnotations[0].description : '';
      
      return {
        success: true,
        fullText: fullText,
        confidence: 0.85 // OCR confidence is typically lower than text extraction
      };
    } else {
      return {
        success: false,
        error: 'No text detected in image'
      };
    }
  } catch (error) {
    console.error('Vision AI error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default function PDFPreview({ file, onTextExtracted }) {
  const [pdfPages, setPdfPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [textExtracted, setTextExtracted] = useState(false);

  const loadPDF = useCallback(async () => {
    if (!file || !file.name) return;
    
    try {
      setLoading(true);
      setError(null);
      setPdfPages([]);
      
      console.log('📄 Starting PDF processing...');
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      console.log(`📄 PDF loaded: ${pdf.numPages} pages`);
      
      const pages = [];
      let fullText = '';
      let isScannedPDF = false;
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        
        // Get text content
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        
        // Check if this page has very little text (indicating scanned PDF)
        if (pageText.trim().length < 50) {
          console.log(`📄 Page ${pageNum} appears to be scanned (little text found)`);
          isScannedPDF = true;
          
          // For scanned PDFs, we'll use Vision AI instead
          // Convert page to image and use Vision AI
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better OCR
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          // Convert canvas to base64 for Vision AI
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          const base64Data = imageDataUrl.split(',')[1];
          
          // Use Vision AI to extract text from the scanned page
          try {
            console.log(`📄 Using Vision AI for scanned page ${pageNum}...`);
            const visionResult = await extractTextWithVisionAI(base64Data);
            
            if (visionResult.success) {
              fullText += visionResult.fullText + '\n';
              console.log(`📄 Vision AI extracted text from page ${pageNum}`);
            } else {
              console.warn(`📄 Vision AI failed for page ${pageNum}:`, visionResult.error);
              fullText += `[Scanned page ${pageNum} - OCR failed]\n`;
            }
          } catch (visionError) {
            console.error(`📄 Vision AI error for page ${pageNum}:`, visionError);
            fullText += `[Scanned page ${pageNum} - OCR error]\n`;
          }
          
          pages.push({
            pageNumber: pageNum,
            canvas: canvas,
            text: `[Scanned page - OCR processed]`,
            isScanned: true
          });
        } else {
          // Regular text-based PDF page
          fullText += pageText + '\n';
          
          // Render page to canvas
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          const viewport = page.getViewport({ scale: 1.5 });
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;
          
          pages.push({
            pageNumber: pageNum,
            canvas: canvas,
            text: pageText,
            isScanned: false
          });
        }
        
        console.log(`📄 Page ${pageNum} processed`);
      }
      
      console.log('📄 All pages processed, setting state...');
      setPdfPages(pages);
      
      // Send extracted text to parent only once
      if (onTextExtracted && !textExtracted) {
        console.log('📄 Sending text to parent...');
        onTextExtracted({
          success: true,
          fullText: fullText.trim(),
          fileType: 'pdf',
          fileName: file.name,
          fileSize: file.size,
          words: fullText.split(/\s+/).filter(word => word.length > 0).map(word => ({
            text: word,
            confidence: isScannedPDF ? 0.85 : 0.95 // Lower confidence for scanned PDFs
          })),
          confidence: isScannedPDF ? 0.85 : 0.95,
          pageCount: pdf.numPages,
          isScannedPDF: isScannedPDF
        });
        setTextExtracted(true);
      }
      
    } catch (err) {
      console.error('❌ PDF processing failed:', err);
      setError('Failed to load PDF: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [file, onTextExtracted, textExtracted]);

  useEffect(() => {
    if (file && file.name && !textExtracted) {
      console.log('📄 File changed, loading PDF...');
      loadPDF();
    }
  }, [file, loadPDF, textExtracted]);

  // Early return after all hooks
  if (!file || !file.name) {
    return (
      <div className="pdf-preview-empty">
        <p>No PDF file selected</p>
      </div>
    );
  }

  // Show simple iframe preview while processing
  if (loading && pdfPages.length === 0) {
    return (
      <div className="pdf-preview-container">
        <div className="pdf-preview-header">
          <h3>📄 PDF Preview</h3>
          <p>Processing PDF...</p>
        </div>
        <div className="pdf-page-container">
          <iframe 
            src={URL.createObjectURL(file)}
            title="PDF Preview"
            className="pdf-iframe-preview"
            style={{ width: '100%', height: '600px', border: 'none' }}
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pdf-preview-loading">
        <div className="loading-spinner"></div>
        <p>Loading PDF preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pdf-preview-error">
        <p>❌ {error}</p>
      </div>
    );
  }

  if (pdfPages.length === 0) {
    return (
      <div className="pdf-preview-empty">
        <p>No pages found in PDF</p>
      </div>
    );
  }

  return (
    <div className="pdf-preview-container">
      <div className="pdf-preview-header">
        <h3>📄 PDF Preview</h3>
        <div className="pdf-page-controls">
          <button 
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="page-btn"
          >
            ← Previous
          </button>
          <span className="page-info">
            Page {currentPage} of {pdfPages.length}
          </span>
          <button 
            onClick={() => setCurrentPage(Math.min(pdfPages.length, currentPage + 1))}
            disabled={currentPage >= pdfPages.length}
            className="page-btn"
          >
            Next →
          </button>
        </div>
      </div>
      
      <div className="pdf-page-container">
        <div className="pdf-page-canvas">
          {pdfPages[currentPage - 1] && (
            <>
              <img 
                src={pdfPages[currentPage - 1].canvas.toDataURL()} 
                alt={`PDF Page ${currentPage}`}
                className="pdf-page-image"
              />
              {pdfPages[currentPage - 1].isScanned && (
                <div className="scanned-page-indicator">
                  <span className="scanned-badge">📷 OCR Processed</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      <div className="pdf-pages-thumbnails">
        <h4>All Pages:</h4>
        <div className="thumbnails-grid">
          {pdfPages.map((page, index) => (
            <div 
              key={index}
              className={`thumbnail ${currentPage === index + 1 ? 'active' : ''}`}
              onClick={() => setCurrentPage(index + 1)}
            >
              <img 
                src={page.canvas.toDataURL()} 
                alt={`Page ${index + 1}`}
                className="thumbnail-image"
              />
              <span className="thumbnail-number">{index + 1}</span>
              {page.isScanned && (
                <span className="thumbnail-scanned">📷</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
