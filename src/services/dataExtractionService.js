// Data Extraction Service for OCR Results
// Extracts structured data from OCR text, focusing on commodity/description columns
import { tableParserService } from './tableParserService';

class DataExtractionService {
  constructor() {
    this.patterns = {
      // Common commodity/description patterns
      commodityDescription: [
        /commodity\s*[&:]\s*description/gi,
        /commodity\s*and\s*description/gi,
        /product\s*description/gi,
        /item\s*description/gi,
        /goods\s*description/gi,
        /description\s*of\s*goods/gi
      ],
      
      // Product name patterns (alphanumeric)
      productName: [
        /^[A-Z0-9\-\s]+$/i, // Alphanumeric with hyphens and spaces
        /^[A-Z]{2,}\d+[A-Z0-9\-\s]*$/i, // Starts with letters, contains numbers
        /^[A-Z0-9\-\s]{3,}$/i // At least 3 characters, alphanumeric
      ],
      
      // Quantity patterns
      quantity: [
        /qty[:\s]*(\d+)/gi,
        /quantity[:\s]*(\d+)/gi,
        /(\d+)\s*(?:pcs?|pieces?|units?|boxes?|cases?)/gi
      ],
      
      // Weight patterns
      weight: [
        /weight[:\s]*(\d+(?:\.\d+)?)\s*(?:lbs?|kg|pounds?)/gi,
        /(\d+(?:\.\d+)?)\s*(?:lbs?|kg|pounds?)/gi
      ],
      
      // Price patterns
      price: [
        /\$(\d+(?:\.\d+)?)/g,
        /(\d+(?:\.\d+)?)\s*dollars?/gi,
        /price[:\s]*\$?(\d+(?:\.\d+)?)/gi
      ]
    };
  }

  // Main extraction function
  extractStructuredData(ocrResult) {
    if (!ocrResult) {
      return {
        success: false,
        error: 'No OCR result available'
      };
    }

    // Check if we have Vision AI table data
    if (ocrResult.tableData && ocrResult.tableData.documentStructure) {
      return this.extractTableProducts(ocrResult);
    }

    // Fallback to text-based extraction
    if (!ocrResult.fullText) {
      return {
        success: false,
        error: 'No OCR text available'
      };
    }

    const text = ocrResult.fullText;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    return {
      success: true,
      data: {
        commodities: this.extractCommodities(text, lines),
        products: this.extractProducts(text, lines),
        quantities: this.extractQuantities(text),
        weights: this.extractWeights(text),
        prices: this.extractPrices(text),
        metadata: this.extractMetadata(ocrResult)
      }
    };
  }

  // Extract products from Vision AI table data
  extractTableProducts(ocrResult) {
    try {
      const parsedData = tableParserService.parseTableData(ocrResult.tableData);
      
      if (!parsedData.success) {
        return {
          success: false,
          error: parsedData.error
        };
      }

      return {
        success: true,
        data: {
          tables: parsedData.tables,
          commodityColumn: parsedData.commodityColumn,
          products: parsedData.productNames,
          summary: parsedData.summary,
          metadata: this.extractMetadata(ocrResult)
        }
      };
    } catch (error) {
      console.error('❌ Table product extraction failed:', error);
      return {
        success: false,
        error: 'Failed to extract table products: ' + error.message
      };
    }
  }

  // Extract commodity/description sections
  extractCommodities(text, lines) {
    const commodities = [];
    
    // Find commodity/description headers
    const commodityHeaders = [];
    lines.forEach((line, index) => {
      if (this.patterns.commodityDescription.some(pattern => pattern.test(line))) {
        commodityHeaders.push({
          line: line,
          index: index,
          type: 'header'
        });
      }
    });

    // Extract data under each header
    commodityHeaders.forEach(header => {
      const startIndex = header.index + 1;
      const endIndex = Math.min(startIndex + 20, lines.length); // Look at next 20 lines
      
      const commodityData = [];
      for (let i = startIndex; i < endIndex; i++) {
        const line = lines[i];
        
        // Skip empty lines and obvious headers
        if (line.length < 3 || this.isHeaderLine(line)) continue;
        
        // Extract product information from this line
        const productInfo = this.parseProductLine(line);
        if (productInfo) {
          commodityData.push(productInfo);
        }
      }
      
      if (commodityData.length > 0) {
        commodities.push({
          header: header.line,
          products: commodityData
        });
      }
    });

    return commodities;
  }

  // Extract product names (alphanumeric)
  extractProducts(text, lines) {
    const products = [];
    
    lines.forEach((line, index) => {
      // Skip header lines
      if (this.isHeaderLine(line)) return;
      
      // Look for alphanumeric product names
      const words = line.split(/\s+/);
      words.forEach(word => {
        const cleanWord = word.replace(/[^\w\-\s]/g, '').trim();
        
        if (cleanWord.length >= 3 && this.patterns.productName.some(pattern => pattern.test(cleanWord))) {
          products.push({
            name: cleanWord,
            line: index + 1,
            context: line,
            confidence: this.calculateProductConfidence(cleanWord)
          });
        }
      });
    });

    // Remove duplicates and sort by confidence
    const uniqueProducts = this.removeDuplicateProducts(products);
    return uniqueProducts.sort((a, b) => b.confidence - a.confidence);
  }

  // Parse a single line for product information
  parseProductLine(line) {
    const parts = line.split(/\s+/);
    const productInfo = {
      rawLine: line,
      productName: null,
      quantity: null,
      weight: null,
      price: null
    };

    // Extract product name (usually first alphanumeric part)
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].replace(/[^\w\-\s]/g, '').trim();
      if (part.length >= 3 && this.patterns.productName.some(pattern => pattern.test(part))) {
        productInfo.productName = part;
        break;
      }
    }

    // Extract quantity
    const qtyMatch = line.match(/(\d+)\s*(?:pcs?|pieces?|units?|boxes?|cases?)/i);
    if (qtyMatch) {
      productInfo.quantity = parseInt(qtyMatch[1]);
    }

    // Extract weight
    const weightMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:lbs?|kg|pounds?)/i);
    if (weightMatch) {
      productInfo.weight = parseFloat(weightMatch[1]);
    }

    // Extract price
    const priceMatch = line.match(/\$(\d+(?:\.\d+)?)/);
    if (priceMatch) {
      productInfo.price = parseFloat(priceMatch[1]);
    }

    return productInfo.productName ? productInfo : null;
  }

  // Extract quantities
  extractQuantities(text) {
    const quantities = [];
    const matches = text.matchAll(this.patterns.quantity[0]);
    
    for (const match of matches) {
      quantities.push({
        value: parseInt(match[1]),
        context: match[0],
        confidence: 0.9
      });
    }
    
    return quantities;
  }

  // Extract weights
  extractWeights(text) {
    const weights = [];
    const matches = text.matchAll(this.patterns.weight[0]);
    
    for (const match of matches) {
      weights.push({
        value: parseFloat(match[1]),
        unit: match[0].match(/(lbs?|kg|pounds?)/i)?.[0] || 'unknown',
        context: match[0],
        confidence: 0.9
      });
    }
    
    return weights;
  }

  // Extract prices
  extractPrices(text) {
    const prices = [];
    const matches = text.matchAll(this.patterns.price[0]);
    
    for (const match of matches) {
      prices.push({
        value: parseFloat(match[1]),
        context: match[0],
        confidence: 0.9
      });
    }
    
    return prices;
  }

  // Extract metadata
  extractMetadata(ocrResult) {
    return {
      fileName: ocrResult.fileName,
      fileSize: ocrResult.fileSize,
      fileType: ocrResult.fileType,
      confidence: ocrResult.confidence,
      isScannedPDF: ocrResult.isScannedPDF || false,
      pageCount: ocrResult.pageCount || 1,
      extractedAt: new Date().toISOString()
    };
  }

  // Helper methods
  isHeaderLine(line) {
    const headerKeywords = ['total', 'subtotal', 'tax', 'amount', 'date', 'invoice', 'bill', 'receipt'];
    return headerKeywords.some(keyword => line.toLowerCase().includes(keyword));
  }

  calculateProductConfidence(productName) {
    let confidence = 0.5;
    
    // Higher confidence for longer names
    if (productName.length >= 5) confidence += 0.2;
    if (productName.length >= 10) confidence += 0.1;
    
    // Higher confidence for mixed alphanumeric
    if (/[A-Z]/.test(productName) && /[0-9]/.test(productName)) confidence += 0.2;
    
    // Higher confidence for common product patterns
    if (/^[A-Z]{2,}\d+/.test(productName)) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  removeDuplicateProducts(products) {
    const seen = new Set();
    return products.filter(product => {
      const key = product.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Format data for display
  formatForDisplay(extractedData) {
    if (!extractedData.success) {
      return {
        error: extractedData.error
      };
    }

    const { data } = extractedData;
    
    return {
      summary: {
        totalCommodities: data.commodities.length,
        totalProducts: data.products.length,
        totalQuantities: data.quantities.length,
        totalWeights: data.weights.length,
        totalPrices: data.prices.length
      },
      commodities: data.commodities,
      products: data.products,
      quantities: data.quantities,
      weights: data.weights,
      prices: data.prices,
      metadata: data.metadata
    };
  }
}

// Export singleton instance
export const dataExtractionService = new DataExtractionService();
export default DataExtractionService;
