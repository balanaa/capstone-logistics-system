// Data Display Component for Extracted OCR Data
import React, { useState } from 'react';
import { dataExtractionService } from '../services/dataExtractionService';
import './DataDisplay.css';

export default function DataDisplay({ ocrResult }) {
  const [extractedData, setExtractedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  // Extract data when OCR result changes
  React.useEffect(() => {
    if (ocrResult && ocrResult.success) {
      extractData();
    }
  }, [ocrResult]);

  const extractData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = dataExtractionService.extractStructuredData(ocrResult);
      const formattedData = dataExtractionService.formatForDisplay(result);
      setExtractedData(formattedData);
    } catch (err) {
      setError('Failed to extract structured data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="data-display-container">
        <div className="loading-section">
          <div className="loading-spinner"></div>
          <p>Extracting structured data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-display-container">
        <div className="error-section">
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!extractedData) {
    return (
      <div className="data-display-container">
        <div className="no-data-section">
          <p>No data to display. Process a file first.</p>
        </div>
      </div>
    );
  }

  const { summary, commodities, tables, products, quantities, weights, prices, metadata } = extractedData;

  return (
    <div className="data-display-container">
      <div className="data-header">
        <h3>📊 Extracted Data</h3>
        <div className="data-summary">
          <div className="summary-item">
            <span className="summary-label">Commodities:</span>
            <span className="summary-value">{summary.totalCommodities}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Products:</span>
            <span className="summary-value">{summary.totalProducts}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Quantities:</span>
            <span className="summary-value">{summary.totalQuantities}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Weights:</span>
            <span className="summary-value">{summary.totalWeights}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Prices:</span>
            <span className="summary-value">{summary.totalPrices}</span>
          </div>
        </div>
      </div>

      <div className="data-tabs">
        <button 
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📋 Summary
        </button>
        <button 
          className={`tab-btn ${activeTab === 'commodities' ? 'active' : ''}`}
          onClick={() => setActiveTab('commodities')}
        >
          📦 Commodities
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveTab('tables')}
        >
          📊 Table Data
        </button>
        <button 
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          🏷️ Products
        </button>
        <button 
          className={`tab-btn ${activeTab === 'quantities' ? 'active' : ''}`}
          onClick={() => setActiveTab('quantities')}
        >
          🔢 Quantities
        </button>
        <button 
          className={`tab-btn ${activeTab === 'weights' ? 'active' : ''}`}
          onClick={() => setActiveTab('weights')}
        >
          ⚖️ Weights
        </button>
        <button 
          className={`tab-btn ${activeTab === 'prices' ? 'active' : ''}`}
          onClick={() => setActiveTab('prices')}
        >
          💰 Prices
        </button>
      </div>

      <div className="data-content">
        {activeTab === 'summary' && (
          <div className="tab-content">
            <h4>📋 Data Summary</h4>
            <div className="summary-grid">
              <div className="summary-card">
                <h5>📦 Commodities</h5>
                <p className="summary-number">{summary.totalCommodities}</p>
                <p className="summary-desc">Commodity sections found</p>
              </div>
              <div className="summary-card">
                <h5>🏷️ Products</h5>
                <p className="summary-number">{summary.totalProducts}</p>
                <p className="summary-desc">Product names extracted</p>
              </div>
              <div className="summary-card">
                <h5>🔢 Quantities</h5>
                <p className="summary-number">{summary.totalQuantities}</p>
                <p className="summary-desc">Quantity values found</p>
              </div>
              <div className="summary-card">
                <h5>⚖️ Weights</h5>
                <p className="summary-number">{summary.totalWeights}</p>
                <p className="summary-desc">Weight values found</p>
              </div>
              <div className="summary-card">
                <h5>💰 Prices</h5>
                <p className="summary-number">{summary.totalPrices}</p>
                <p className="summary-desc">Price values found</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'commodities' && (
          <div className="tab-content">
            <h4>📦 Commodities & Descriptions</h4>
            {commodities && commodities.length === 0 ? (
              <p className="no-data">No commodity sections found</p>
            ) : (
              <div className="commodities-list">
                {commodities && commodities.map((commodity, index) => (
                  <div key={index} className="commodity-item">
                    <h5 className="commodity-header">{commodity.header}</h5>
                    <div className="commodity-products">
                      {commodity.products.map((product, pIndex) => (
                        <div key={pIndex} className="product-item">
                          <div className="product-name">{product.productName}</div>
                          <div className="product-details">
                            {product.quantity && <span className="detail">Qty: {product.quantity}</span>}
                            {product.weight && <span className="detail">Weight: {product.weight}</span>}
                            {product.price && <span className="detail">Price: ${product.price}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tables' && (
          <div className="tab-content">
            <h4>📊 Table Data</h4>
            {tables && tables.length === 0 ? (
              <p className="no-data">No table data found</p>
            ) : (
              <div className="tables-list">
                {tables && tables.map((table, index) => (
                  <div key={index} className="table-item">
                    <h5 className="table-header">Table {index + 1}</h5>
                    <div className="table-info">
                      <span className="table-stat">Rows: {table.totalRows}</span>
                      <span className="table-stat">Columns: {table.totalColumns}</span>
                      {table.hasCommodityColumn && (
                        <span className="commodity-indicator">✅ Has Commodity Column</span>
                      )}
                    </div>
                    <div className="table-headers">
                      <h6>Headers:</h6>
                      <div className="headers-list">
                        {table.headers.map((header, hIndex) => (
                          <span 
                            key={hIndex} 
                            className={`header-item ${header.isCommodityColumn ? 'commodity-header' : ''}`}
                          >
                            {header.text}
                            {header.isCommodityColumn && <span className="commodity-badge">📦</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="tab-content">
            <h4>🏷️ Product Names</h4>
            {products.length === 0 ? (
              <p className="no-data">No product names found</p>
            ) : (
              <div className="products-list">
                {products.map((product, index) => (
                  <div key={index} className="product-card">
                    <div className="product-name">{product.name}</div>
                    <div className="product-confidence">
                      Confidence: {(product.confidence * 100).toFixed(1)}%
                    </div>
                    <div className="product-context">
                      Context: {product.context}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quantities' && (
          <div className="tab-content">
            <h4>🔢 Quantities</h4>
            {quantities.length === 0 ? (
              <p className="no-data">No quantities found</p>
            ) : (
              <div className="quantities-list">
                {quantities.map((qty, index) => (
                  <div key={index} className="quantity-item">
                    <span className="quantity-value">{qty.value}</span>
                    <span className="quantity-context">{qty.context}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'weights' && (
          <div className="tab-content">
            <h4>⚖️ Weights</h4>
            {weights.length === 0 ? (
              <p className="no-data">No weights found</p>
            ) : (
              <div className="weights-list">
                {weights.map((weight, index) => (
                  <div key={index} className="weight-item">
                    <span className="weight-value">{weight.value} {weight.unit}</span>
                    <span className="weight-context">{weight.context}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'prices' && (
          <div className="tab-content">
            <h4>💰 Prices</h4>
            {prices.length === 0 ? (
              <p className="no-data">No prices found</p>
            ) : (
              <div className="prices-list">
                {prices.map((price, index) => (
                  <div key={index} className="price-item">
                    <span className="price-value">${price.value}</span>
                    <span className="price-context">{price.context}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
