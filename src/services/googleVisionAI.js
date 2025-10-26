// Google Vision AI Service for Document Processing
import { ImageAnnotatorClient } from '@google-cloud/vision';

class VisionAIService {
  constructor() {
    this.client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-service-account.json',
    });
  }

  // Extract text from document images
  async extractTextFromImage(imagePath) {
    try {
      console.log('🔍 Extracting text from image:', imagePath);
      
      const [result] = await this.client.textDetection(imagePath);
      const detections = result.textAnnotations;
      
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
          }))
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

  // Extract text from image URL
  async extractTextFromUrl(imageUrl) {
    try {
      console.log('🔍 Extracting text from URL:', imageUrl);
      
      const [result] = await this.client.textDetection(imageUrl);
      const detections = result.textAnnotations;
      
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
          }))
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
  async processReceiptImage(imagePath) {
    try {
      console.log('🧾 Processing receipt image:', imagePath);
      
      // Extract text first
      const textResult = await this.extractTextFromImage(imagePath);
      
      if (!textResult.success) {
        return textResult;
      }

      // Parse common receipt fields
      const receiptData = this.parseReceiptText(textResult.fullText);
      
      return {
        success: true,
        extractedText: textResult.fullText,
        parsedData: receiptData,
        confidence: textResult.words.length > 0 ? 
          textResult.words.reduce((sum, word) => sum + word.confidence, 0) / textResult.words.length : 0
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
  async detectDocumentType(imagePath) {
    try {
      console.log('🔍 Detecting document type:', imagePath);
      
      // Use label detection to identify document type
      const [labelResult] = await this.client.labelDetection(imagePath);
      const labels = labelResult.labelAnnotations || [];
      
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

  // Analyze image for business documents
  async analyzeBusinessDocument(imagePath) {
    try {
      console.log('📄 Analyzing business document:', imagePath);
      
      const [textResult, labelResult] = await Promise.all([
        this.client.textDetection(imagePath),
        this.client.labelDetection(imagePath)
      ]);

      const textData = textResult[0].textAnnotations || [];
      const labelData = labelResult[0].labelAnnotations || [];

      return {
        success: true,
        textFound: textData.length > 0,
        textContent: textData.length > 0 ? textData[0].description : '',
        documentLabels: labelData.map(label => ({
          name: label.description,
          confidence: label.score
        })),
        isBusinessDocument: labelData.some(label => 
          label.description.toLowerCase().includes('document') ||
          label.description.toLowerCase().includes('text') ||
          label.description.toLowerCase().includes('paper')
        )
      };
    } catch (error) {
      console.error('❌ Business document analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export singleton instance
export const visionAIService = new VisionAIService();
export default VisionAIService;
