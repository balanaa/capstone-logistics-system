// Google Document AI Service for Table Extraction
// Uses Document AI Form Parser for robust table detection

class DocumentAIService {
  constructor() {
    // TODO: Add column selection feature (manual column picker UI) in future
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'your-project-id';
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'us';
    this.processorId = process.env.DOCUMENT_AI_PROCESSOR_ID || 'your-processor-id';
    this.apiEndpoint = `https://${this.location}-documentai.googleapis.com/v1`;
  }

  // Process document for table extraction
  async processDocument(file) {
    try {
      console.log('📄 Processing document with Document AI...');
      
      // Convert file to base64
      const base64Data = await this.fileToBase64(file);
      
      // Prepare request for Document AI
      const requestBody = {
        name: `projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}`,
        document: {
          content: base64Data,
          mimeType: this.getMimeType(file)
        }
      };

      // Make API call to Document AI
      const response = await fetch(`${this.apiEndpoint}/projects/${this.projectId}/locations/${this.location}/processors/${this.processorId}:process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAccessToken()}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Document AI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Extract table data from Document AI response
      const tableData = this.extractTableData(result);
      
      return {
        success: true,
        tableData: tableData,
        rawResponse: result,
        fileName: file.name,
        fileSize: file.size,
        fileType: this.getFileType(file)
      };

    } catch (error) {
      console.error('❌ Document AI processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Extract table data from Document AI response
  extractTableData(response) {
    const tables = [];
    
    if (response.document && response.document.pages) {
      response.document.pages.forEach((page, pageIndex) => {
        if (page.tables) {
          page.tables.forEach((table, tableIndex) => {
            const parsedTable = this.parseTable(table, pageIndex, tableIndex);
            if (parsedTable) {
              tables.push(parsedTable);
            }
          });
        }
      });
    }

    return {
      tables: tables,
      totalTables: tables.length,
      commodityColumn: this.findCommodityColumn(tables)
    };
  }

  // Parse individual table from Document AI response
  parseTable(table, pageIndex, tableIndex) {
    try {
      const rows = [];
      
      if (table.bodyRows) {
        table.bodyRows.forEach((row, rowIndex) => {
          const cells = [];
          
          if (row.cells) {
            row.cells.forEach((cell, cellIndex) => {
              const cellText = this.extractCellText(cell);
              cells.push({
                text: cellText,
                columnIndex: cellIndex,
                rowIndex: rowIndex,
                confidence: cell.confidence || 0.9
              });
            });
          }
          
          rows.push({
            rowIndex: rowIndex,
            cells: cells,
            isHeader: rowIndex === 0 // Assume first row is header
          });
        });
      }

      // Extract headers if available
      const headers = [];
      if (table.headerRows && table.headerRows.length > 0) {
        table.headerRows[0].cells.forEach((cell, index) => {
          headers.push({
            text: this.extractCellText(cell),
            columnIndex: index,
            confidence: cell.confidence || 0.9
          });
        });
      } else if (rows.length > 0) {
        // Use first row as headers if no explicit header rows
        headers.push(...rows[0].cells);
        rows[0].isHeader = true;
      }

      return {
        pageIndex: pageIndex,
        tableIndex: tableIndex,
        headers: headers,
        rows: rows,
        totalRows: rows.length,
        totalColumns: headers.length
      };

    } catch (error) {
      console.error('❌ Table parsing failed:', error);
      return null;
    }
  }

  // Extract text from table cell
  extractCellText(cell) {
    if (!cell.layout || !cell.layout.textAnchor) {
      return '';
    }

    // Document AI provides text segments in cells
    let text = '';
    if (cell.layout.textAnchor.textSegments) {
      cell.layout.textAnchor.textSegments.forEach(segment => {
        if (segment.text) {
          text += segment.text + ' ';
        }
      });
    }

    return text.trim();
  }

  // Find commodity/description column in tables
  findCommodityColumn(tables) {
    const commodityKeywords = [
      'commodity',
      'description',
      'product',
      'item',
      'goods',
      'material'
    ];

    for (const table of tables) {
      for (const header of table.headers) {
        const headerText = header.text.toLowerCase();
        if (commodityKeywords.some(keyword => headerText.includes(keyword))) {
          return {
            tableIndex: table.tableIndex,
            columnIndex: header.columnIndex,
            headerText: header.text,
            confidence: header.confidence
          };
        }
      }
    }

    return null;
  }

  // Extract product names from commodity column
  extractProductNames(tableData) {
    const productNames = [];
    
    if (tableData.commodityColumn) {
      const table = tableData.tables[tableData.commodityColumn.tableIndex];
      const columnIndex = tableData.commodityColumn.columnIndex;
      
      table.rows.forEach(row => {
        if (!row.isHeader && row.cells[columnIndex]) {
          const productName = row.cells[columnIndex].text.trim();
          if (productName && productName.length > 0) {
            productNames.push({
              name: productName,
              rowIndex: row.rowIndex,
              confidence: row.cells[columnIndex].confidence,
              tableIndex: table.tableIndex
            });
          }
        }
      });
    }

    return productNames;
  }

  // Convert file to base64
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Get MIME type for file
  getMimeType(file) {
    if (file.type) {
      return file.type;
    }
    
    const extension = file.name.split('.').pop().toLowerCase();
    const mimeTypes = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'webp': 'image/webp'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
  }

  // Get file type
  getFileType(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else if (['xlsx', 'xls', 'csv'].includes(extension)) {
      return 'excel';
    }
    
    return 'unknown';
  }

  // Get access token for API authentication
  async getAccessToken() {
    // This would typically use service account credentials
    // For now, we'll need to implement proper authentication
    // This is a placeholder - actual implementation would use Google Auth
    throw new Error('Document AI authentication not implemented. Please set up service account authentication.');
  }
}

// Export singleton instance
export const documentAIService = new DocumentAIService();
export default DocumentAIService;

