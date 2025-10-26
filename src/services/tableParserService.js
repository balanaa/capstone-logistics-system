// Table Parser Service for Vision AI Results
// Processes Vision AI document structure to extract table data

class TableParserService {
  constructor() {
    // TODO: Add column selection feature (manual column picker UI) in future
    this.commodityKeywords = [
      'commodity',
      'description', 
      'product',
      'item',
      'goods',
      'material',
      'article'
    ];
    
    this.borderKeywords = [
      'total',
      'subtotal',
      'grand total',
      'sum',
      'amount',
      'end',
      'footer'
    ];
  }

  // Main method to parse table data from Vision AI
  parseTableData(visionAIResult) {
    if (!visionAIResult || !visionAIResult.success) {
      return {
        success: false,
        error: 'No valid Vision AI result'
      };
    }

    const documentStructure = visionAIResult.documentStructure;
    
    if (!documentStructure || !documentStructure.pages) {
      return {
        success: false,
        error: 'No document structure found'
      };
    }

    // Extract table data from Vision AI document structure
    const tableData = this.extractTableFromVisionResponse(documentStructure);
    
    return {
      success: true,
      tables: tableData.tables,
      commodityColumn: tableData.commodityColumn,
      productNames: this.extractProductNames(tableData),
      summary: this.generateSummary(tableData)
    };
  }

  // Extract table structure from Vision AI response
  extractTableFromVisionResponse(documentStructure) {
    const tables = [];
    const allWords = [];
    
    // Extract all words with bounding boxes from all pages
    documentStructure.pages.forEach((page, pageIndex) => {
      if (page.blocks) {
        page.blocks.forEach(block => {
          if (block.paragraphs) {
            block.paragraphs.forEach(paragraph => {
              if (paragraph.words) {
                paragraph.words.forEach(word => {
                  const wordText = this.extractWordText(word);
                  if (wordText && wordText.trim().length > 0) {
                    allWords.push({
                      text: wordText,
                      boundingBox: word.boundingBox,
                      confidence: word.confidence || 0.9,
                      pageIndex: pageIndex,
                      blockIndex: block.blockType || 'TEXT'
                    });
                  }
                });
              }
            });
          }
        });
      }
    });

    // Group words into rows and columns
    const tableStructure = this.identifyColumns(allWords);
    
    if (tableStructure.rows.length > 0) {
      tables.push({
        tableIndex: 0,
        headers: this.extractHeaders(tableStructure.rows),
        rows: this.extractRows(tableStructure.rows),
        totalRows: tableStructure.rows.length,
        totalColumns: tableStructure.columns.length,
        hasCommodityColumn: this.hasCommodityColumn(tableStructure.rows)
      });
    }

    return {
      tables: tables,
      commodityColumn: this.findCommodityColumn(tables),
      words: allWords
    };
  }

  // Extract text from Vision AI word object
  extractWordText(word) {
    if (!word.symbols) return '';
    
    return word.symbols.map(symbol => symbol.text).join('');
  }

  // Identify columns based on vertical alignment of text blocks
  identifyColumns(words) {
    // Sort words by Y-coordinate (top to bottom)
    const sortedWords = words.sort((a, b) => {
      const aY = a.boundingBox.vertices[0].y;
      const bY = b.boundingBox.vertices[0].y;
      return aY - bY;
    });

    // Group words into rows based on Y-coordinate similarity
    const rows = this.extractRows(sortedWords);
    
    // Identify column boundaries based on X-coordinates
    const columns = this.identifyColumnBoundaries(rows);
    
    return { rows, columns };
  }

  // Group words into rows based on vertical position
  extractRows(words) {
    const rows = [];
    const Y_THRESHOLD = 30; // pixels - words within this distance are in same row
    
    let currentRow = [];
    let currentY = null;
    
    words.forEach(word => {
      const wordY = word.boundingBox.vertices[0].y;
      
      if (currentY === null || Math.abs(wordY - currentY) <= Y_THRESHOLD) {
        currentRow.push(word);
        currentY = currentY === null ? wordY : (currentY + wordY) / 2;
      } else {
        if (currentRow.length > 0) {
          rows.push({
            words: currentRow.sort((a, b) => a.boundingBox.vertices[0].x - b.boundingBox.vertices[0].x),
            y: currentY,
            text: currentRow.map(w => w.text).join(' ')
          });
        }
        currentRow = [word];
        currentY = wordY;
      }
    });
    
    // Add the last row
    if (currentRow.length > 0) {
      rows.push({
        words: currentRow.sort((a, b) => a.boundingBox.vertices[0].x - b.boundingBox.vertices[0].x),
        y: currentY,
        text: currentRow.map(w => w.text).join(' ')
      });
    }
    
    return rows;
  }

  // Identify column boundaries based on X-coordinates
  identifyColumnBoundaries(rows) {
    const allXPositions = [];
    
    rows.forEach(row => {
      row.words.forEach(word => {
        allXPositions.push(word.boundingBox.vertices[0].x);
      });
    });
    
    // Sort X positions and find gaps to identify columns
    const sortedX = [...new Set(allXPositions)].sort((a, b) => a - b);
    const columns = [];
    const X_THRESHOLD = 50; // pixels - minimum gap between columns
    
    let currentColumn = { start: sortedX[0], words: [] };
    
    for (let i = 1; i < sortedX.length; i++) {
      if (sortedX[i] - sortedX[i-1] > X_THRESHOLD) {
        // Gap detected, end current column
        currentColumn.end = sortedX[i-1];
        columns.push(currentColumn);
        currentColumn = { start: sortedX[i], words: [] };
      }
    }
    
    // Add the last column
    if (sortedX.length > 0) {
      currentColumn.end = sortedX[sortedX.length - 1];
      columns.push(currentColumn);
    }
    
    return columns;
  }

  // Extract headers from first few rows
  extractHeaders(rows) {
    const headers = [];
    const headerRows = rows.slice(0, 2); // First 2 rows are likely headers
    
    headerRows.forEach(row => {
      row.words.forEach((word, index) => {
        headers.push({
          text: word.text,
          columnIndex: index,
          confidence: word.confidence,
          isCommodityColumn: this.isCommodityColumn(word.text)
        });
      });
    });
    
    return headers;
  }

  // Extract data rows (skip headers)
  extractRows(rows) {
    return rows.slice(2).map((row, index) => ({
      rowIndex: index,
      words: row.words.map((word, wordIndex) => ({
        text: word.text,
        columnIndex: wordIndex,
        confidence: word.confidence,
        boundingBox: word.boundingBox
      })),
      text: row.text,
      isBorderRow: this.isBorderRow(row),
      isEmpty: this.isEmptyRow(row)
    }));
  }

  // Check if header is commodity/description column
  isCommodityColumn(headerText) {
    if (!headerText) return false;
    
    const text = headerText.toLowerCase().trim();
    return this.commodityKeywords.some(keyword => text.includes(keyword));
  }

  // Check if table has commodity column
  hasCommodityColumn(rows) {
    return rows.some(row => 
      row.words.some(word => this.isCommodityColumn(word.text))
    );
  }

  // Check if row is a border/end row
  isBorderRow(row) {
    if (!row.words || row.words.length === 0) return false;
    
    // Check if any word contains border keywords
    return row.words.some(word => {
      if (!word.text) return false;
      const text = word.text.toLowerCase().trim();
      return this.borderKeywords.some(keyword => text.includes(keyword));
    });
  }

  // Check if row is empty
  isEmptyRow(row) {
    if (!row.words || row.words.length === 0) return true;
    
    return row.words.every(word => !word.text || word.text.trim().length === 0);
  }

  // Extract product names from commodity column
  extractProductNames(tableData) {
    const productNames = [];
    
    if (tableData.commodityColumn) {
      const table = tableData.tables[tableData.commodityColumn.tableIndex];
      const columnIndex = tableData.commodityColumn.columnIndex;
      
      table.rows.forEach(row => {
        // Skip border rows and empty rows
        if (!this.isBorderRow(row) && !this.isEmptyRow(row)) {
          const cell = row.words[columnIndex];
          if (cell && cell.text && cell.text.trim().length > 0) {
            productNames.push({
              name: cell.text.trim(),
              rowIndex: row.rowIndex,
              tableIndex: table.tableIndex,
              confidence: cell.confidence,
              context: row.text
            });
          }
        }
      });
    }

    return productNames;
  }

  // Find commodity column in tables
  findCommodityColumn(tables) {
    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex];
      
      for (let columnIndex = 0; columnIndex < table.headers.length; columnIndex++) {
        const header = table.headers[columnIndex];
        
        if (this.isCommodityColumn(header.text)) {
          return {
            tableIndex: tableIndex,
            columnIndex: columnIndex,
            headerText: header.text,
            confidence: header.confidence
          };
        }
      }
    }

    return null;
  }

  // Generate summary of table data
  generateSummary(tableData) {
    const totalTables = tableData.tables.length;
    const totalRows = tableData.tables.reduce((sum, table) => sum + table.totalRows, 0);
    const totalColumns = tableData.tables.reduce((sum, table) => sum + table.totalColumns, 0);
    const tablesWithCommodity = tableData.tables.filter(table => table.hasCommodityColumn).length;

    return {
      totalTables,
      totalRows,
      totalColumns,
      tablesWithCommodity,
      commodityColumnFound: !!tableData.commodityColumn,
      productNamesCount: this.extractProductNames(tableData).length
    };
  }

  // Detect table borders (for stopping reading)
  detectTableBorders(tableData) {
    const borders = [];
    
    tableData.tables.forEach((table, tableIndex) => {
      table.rows.forEach((row, rowIndex) => {
        if (this.isBorderRow(row)) {
          borders.push({
            tableIndex: tableIndex,
            rowIndex: rowIndex,
            type: 'keyword_border',
            text: row.text
          });
        }
      });
    });

    return borders;
  }

  // Get table structure for display
  getTableStructure(tableData) {
    return tableData.tables.map(table => ({
      tableIndex: table.tableIndex,
      headers: table.headers.map(header => ({
        text: header.text,
        isCommodityColumn: header.isCommodityColumn,
        confidence: header.confidence
      })),
      rowCount: table.totalRows,
      columnCount: table.totalColumns,
      hasCommodityColumn: table.hasCommodityColumn
    }));
  }
}

// Export singleton instance
export const tableParserService = new TableParserService();
export default TableParserService;