// Browser-Compatible Google Vision AI Service
// Uses REST API instead of Node.js client library
import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Configure PDF.js worker - use local worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

class BrowserVisionAIService {
  constructor() {
    this.apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    this.baseUrl = 'https://vision.googleapis.com/v1/images:annotate';
  }

  // Extract text from image URL
  async extractTextFromUrl(imageUrl) {
    try {
      console.log('🔍 Extracting text from URL:', imageUrl);
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUrl
                }
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

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'API request failed');
      }

      const detections = result.responses?.[0]?.textAnnotations;
      
      if (detections && detections.length > 0) {
        const fullText = detections[0].description;
        console.log('✅ Text extracted successfully');
        
        return {
          success: true,
          fullText: fullText,
          words: detections.slice(1).map(detection => ({
            text: detection.description,
            confidence: detection.score,
            boundingBox: detection.boundingPoly
          })),
          confidence: detections.length > 1 ? 
            detections.slice(1).reduce((sum, word) => sum + word.score, 0) / (detections.length - 1) : 0
        };
      } else {
        return {
          success: false,
          message: 'No text found in image'
        };
      }
    } catch (error) {
      console.error('❌ Text extraction failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extract text from base64 image data
  async extractTextFromBase64(base64Data) {
    try {
      console.log('🔍 Extracting text from base64 data...');
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
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

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'API request failed');
      }

      const detections = result.responses?.[0]?.textAnnotations;
      
      if (detections && detections.length > 0) {
        const fullText = detections[0].description;
        console.log('✅ Text extracted successfully');
        
        return {
          success: true,
          fullText: fullText,
          words: detections.slice(1).map(detection => ({
            text: detection.description,
            confidence: detection.score,
            boundingBox: detection.boundingPoly
          })),
          confidence: detections.length > 1 ? 
            detections.slice(1).reduce((sum, word) => sum + word.score, 0) / (detections.length - 1) : 0
        };
      } else {
        return {
          success: false,
          message: 'No text found in image'
        };
      }
    } catch (error) {
      console.error('❌ Text extraction failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Process receipt/invoice images
  async processReceiptImage(imageUrl) {
    try {
      console.log('🧾 Processing receipt image:', imageUrl);
      
      // Extract text first
      const textResult = await this.extractTextFromUrl(imageUrl);
      
      if (!textResult.success) {
        return textResult;
      }

      // Parse common receipt fields
      const receiptData = this.parseReceiptText(textResult.fullText);
      
      return {
        success: true,
        extractedText: textResult.fullText,
        parsedData: receiptData,
        confidence: textResult.confidence
      };
    } catch (error) {
      console.error('❌ Receipt processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Parse receipt text to extract structured data
  parseReceiptText(text) {
    const receiptData = {
      total: null,
      date: null,
      vendor: null,
      items: [],
      tax: null
    };

    // Extract total amount (look for patterns like $123.45, Total: $123.45)
    const totalMatch = text.match(/(?:total|amount|sum)[:\s]*\$?(\d+\.?\d*)/i);
    if (totalMatch) {
      receiptData.total = parseFloat(totalMatch[1]);
    }

    // Extract date (various formats)
    const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/);
    if (dateMatch) {
      receiptData.date = dateMatch[0];
    }

    // Extract vendor/company name (usually at the top)
    const lines = text.split('\n');
    if (lines.length > 0) {
      receiptData.vendor = lines[0].trim();
    }

    // Extract tax amount
    const taxMatch = text.match(/(?:tax|vat)[:\s]*\$?(\d+\.?\d*)/i);
    if (taxMatch) {
      receiptData.tax = parseFloat(taxMatch[1]);
    }

    return receiptData;
  }

  // Detect document type
  async detectDocumentType(imageUrl) {
    try {
      console.log('🔍 Detecting document type:', imageUrl);
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                source: {
                  imageUri: imageUrl
                }
              },
              features: [
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 5
                }
              ]
            }
          ]
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'API request failed');
      }

      const labels = result.responses?.[0]?.labelAnnotations || [];
      
      // Check for document-related labels
      const documentLabels = labels.filter(label => 
        label.description.toLowerCase().includes('document') ||
        label.description.toLowerCase().includes('receipt') ||
        label.description.toLowerCase().includes('invoice') ||
        label.description.toLowerCase().includes('bill') ||
        label.description.toLowerCase().includes('statement')
      );

      return {
        success: true,
        documentType: documentLabels.length > 0 ? documentLabels[0].description : 'Unknown',
        confidence: documentLabels.length > 0 ? documentLabels[0].score : 0,
        allLabels: labels.map(label => ({
          name: label.description,
          confidence: label.score
        }))
      };
    } catch (error) {
      console.error('❌ Document type detection failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Convert file to base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Remove data:image/jpeg;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // Detect file type and process accordingly
  async processFile(file) {
    const fileType = this.getFileType(file);
    console.log('🔍 Processing file type:', fileType);

    switch (fileType) {
      case 'image':
        return await this.processImageFile(file);
      case 'pdf':
        return await this.processPDFFile(file);
      case 'excel':
        return await this.processExcelFile(file);
      default:
        return {
          success: false,
          error: `Unsupported file type: ${fileType}`
        };
    }
  }

  // Get file type based on extension and MIME type
  getFileType(file) {
    if (!file || !file.name) {
      return 'unknown';
    }
    
    const extension = file.name.split('.').pop().toLowerCase();
    const mimeType = file.type ? file.type.toLowerCase() : '';

    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'].includes(extension) ||
        mimeType.startsWith('image/')) {
      return 'image';
    }

    // PDF files
    if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    }

    // Excel files
    if (['xlsx', 'xls', 'csv'].includes(extension) ||
        mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return 'excel';
    }

    return 'unknown';
  }

  // Extract table data using Vision AI DOCUMENT_TEXT_DETECTION
  async extractTableData(base64Data) {
    try {
      console.log('🔍 Extracting table data with Vision AI DOCUMENT_TEXT_DETECTION...');
      
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
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
                  type: 'DOCUMENT_TEXT_DETECTION',
                  maxResults: 1
                }
              ]
            }
          ]
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error?.message || 'API request failed');
      }

      const documentData = result.responses?.[0]?.fullTextAnnotation;
      
      if (documentData && documentData.pages) {
        console.log('✅ Document structure detected');
        
        return {
          success: true,
          documentStructure: documentData,
          pages: documentData.pages,
          text: documentData.text || '',
          confidence: this.calculateDocumentConfidence(documentData)
        };
      } else {
        return {
          success: false,
          error: 'No document structure found'
        };
      }
    } catch (error) {
      console.error('❌ Table data extraction failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate confidence from document structure
  calculateDocumentConfidence(documentData) {
    if (!documentData.pages) return 0;
    
    let totalConfidence = 0;
    let blockCount = 0;
    
    documentData.pages.forEach(page => {
      if (page.blocks) {
        page.blocks.forEach(block => {
          if (block.confidence) {
            totalConfidence += block.confidence;
            blockCount++;
          }
        });
      }
    });
    
    return blockCount > 0 ? totalConfidence / blockCount : 0;
  }

  // Process image files with Vision AI table detection
  async processImageFile(file) {
    try {
      console.log('🔍 Processing image file with Vision AI table detection...');
      
      const base64Data = await this.fileToBase64(file);
      
      // Try DOCUMENT_TEXT_DETECTION for table structure
      const tableResult = await this.extractTableData(base64Data);
      
      if (tableResult.success) {
        console.log('✅ Document structure detected');
        return {
          success: true,
          tableData: tableResult,
          fileName: file.name,
          fileSize: file.size,
          fileType: 'image',
          processingMethod: 'Vision AI Document Detection'
        };
      } else {
        console.log('⚠️ Document structure not detected, falling back to text extraction');
        
        // Fallback to regular text detection
        const result = await this.extractTextFromBase64(base64Data);
        
        if (result.success) {
          return {
            ...result,
            fileType: 'image',
            fileName: file.name,
            fileSize: file.size,
            processingMethod: 'Vision AI Text Detection'
          };
        }
        return result;
      }
    } catch (error) {
      console.error('❌ Image processing failed:', error);
      return {
        success: false,
        error: 'Failed to process image: ' + error.message
      };
    }
  }

  // Process PDF files using pdf.js
  async processPDFFile(file) {
    try {
      console.log('📄 Processing PDF file with pdf.js...');
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      return {
        success: true,
        fullText: fullText.trim(),
        fileType: 'pdf',
        fileName: file.name,
        fileSize: file.size,
        words: fullText.split(/\s+/).filter(word => word.length > 0).map(word => ({
          text: word,
          confidence: 0.95 // PDF text extraction is usually high confidence
        })),
        confidence: 0.95,
        pageCount: pdf.numPages
      };
    } catch (error) {
      console.error('❌ PDF processing failed:', error);
      return {
        success: false,
        error: 'Failed to process PDF: ' + error.message
      };
    }
  }

  // Simple PDF text extraction (placeholder - you'd use pdf.js in production)
  async extractTextFromPDF(uint8Array) {
    // This is a simplified placeholder
    // In production, you'd use pdf.js library
    return "PDF text extraction not implemented yet. Please use pdf.js library for full PDF support.";
  }

  // Process Excel files using xlsx library
  async processExcelFile(file) {
    try {
      console.log('📊 Processing Excel file with xlsx library...');
      
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      let fullText = '';
      const excelData = [];
      
      // Process each worksheet
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Add sheet data to excelData
        excelData.push({
          sheetName: sheetName,
          data: jsonData
        });
        
        // Convert to text
        const sheetText = XLSX.utils.sheet_to_txt(worksheet);
        fullText += `Sheet: ${sheetName}\n${sheetText}\n\n`;
      });
      
      return {
        success: true,
        fullText: fullText.trim(),
        fileType: 'excel',
        fileName: file.name,
        fileSize: file.size,
        excelData: excelData,
        words: fullText.split(/\s+/).filter(word => word.length > 0).map(word => ({
          text: word,
          confidence: 0.98 // Excel data is usually very high confidence
        })),
        confidence: 0.98,
        sheetCount: workbook.SheetNames.length,
        sheetNames: workbook.SheetNames
      };
    } catch (error) {
      console.error('❌ Excel processing failed:', error);
      return {
        success: false,
        error: 'Failed to process Excel file: ' + error.message
      };
    }
  }

  // Get supported file types
  getSupportedFileTypes() {
    return {
      images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'],
      pdfs: ['pdf'],
      excel: ['xlsx', 'xls', 'csv'],
      all: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'pdf', 'xlsx', 'xls', 'csv']
    };
  }
}

// Export singleton instance
export const browserVisionAIService = new BrowserVisionAIService();
export default BrowserVisionAIService;
