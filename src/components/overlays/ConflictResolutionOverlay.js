import React, { useState } from 'react';
import './ConflictResolutionOverlay.css';
import { resolveConflict } from '../../services/supabase/verifierStatus';

// Import example PDFs as local assets
const BOL_SAMPLE = '/docs/assets/exampledocs/bol.pdf';
const INVOICE_SAMPLE = '/docs/assets/exampledocs/inv.pdf';
const PACKING_LIST_SAMPLE = '/docs/assets/exampledocs/pl.pdf';

/**
 * ConflictResolutionOverlay - Side-by-side document comparison for conflict resolution
 * 
 * Props:
 * - conflict: Object containing full conflict details + both documents
 * - onClose: function - callback when overlay closes
 * - onResolved: function - callback when conflict is successfully resolved
 */
export default function ConflictResolutionOverlay({ conflict, onClose, onResolved }) {
  const [resolving, setResolving] = useState(false);
  const [resolution, setResolution] = useState(null); // 'left', 'right', 'upload_new'

  if (!conflict) return null;

  const { document1, document2, conflictingFields = [] } = conflict;

  // Check if a field is conflicting
  const isConflicting = (fieldKey) => {
    return conflictingFields.includes(fieldKey);
  };

  // Handle resolution actions
  const handleKeepLeft = async () => {
    if (window.confirm(`Keep data from ${document1.type}?\n\nThis will mark the left document's data as correct.`)) {
      await handleResolve('keep_left');
    }
  };

  const handleKeepRight = async () => {
    if (window.confirm(`Keep data from ${document2.type}?\n\nThis will mark the right document's data as correct.`)) {
      await handleResolve('keep_right');
    }
  };

  const handleUploadNew = () => {
    alert(
      'Upload New File:\n\n' +
      'This feature allows you to replace one of the documents with a corrected version.\n\n' +
      'Steps:\n' +
      '1. Choose which document to replace (left or right)\n' +
      '2. Upload the corrected file\n' +
      '3. System will re-extract data and check for conflicts\n\n' +
      'Note: This is a mock implementation. Backend integration required.'
    );
    
    // Mock implementation - in real app, this would open a file upload dialog
    const choice = window.confirm(
      'Replace LEFT document?\n\n' +
      'Click OK to replace left document\n' +
      'Click Cancel to replace right document'
    );
    
    if (choice) {
      console.log('Would upload new file to replace document1:', document1.fileName);
    } else {
      console.log('Would upload new file to replace document2:', document2.fileName);
    }
    
    // For now, just close the overlay
    // In real implementation, this would open file picker and upload flow
  };

  const handleResolve = async (resolutionType) => {
    setResolving(true);
    setResolution(resolutionType);
    
    try {
      const result = await resolveConflict(conflict.id, resolutionType, {
        resolvedBy: 'current_user', // Replace with actual user ID
        resolvedAt: new Date().toISOString(),
        note: `Resolved via verifier: ${resolutionType}`
      });

      if (result.success) {
        alert(`Conflict resolved successfully!\n\n${result.message}`);
        onResolved();
      } else {
        alert('Failed to resolve conflict. Please try again.');
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
      alert('An error occurred while resolving the conflict.');
    } finally {
      setResolving(false);
      setResolution(null);
    }
  };

  // Get the appropriate example PDF based on document type
  const getExamplePDF = (docType) => {
    const type = docType?.toLowerCase() || '';
    if (type.includes('bill of lading') || type.includes('bol')) {
      return BOL_SAMPLE;
    }
    if (type.includes('invoice')) {
      return INVOICE_SAMPLE;
    }
    if (type.includes('packing list')) {
      return PACKING_LIST_SAMPLE;
    }
    return null;
  };

  // Render document preview using example PDFs
  const renderDocumentPreview = (doc, side) => {
    // Use example PDFs for preview
    const pdfUrl = getExamplePDF(doc.type);
    
    return (
      <div className="doc-preview">
        <div className="doc-preview-header">
          <i className="fi fi-rs-document"></i>
          <span>{doc.fileName}</span>
        </div>
        <div className="doc-preview-body">
          {pdfUrl ? (
            <div className="file-preview-container">
              <iframe 
                title={`${doc.type} Preview`}
                src={pdfUrl}
                className="file-preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  minHeight: '500px'
                }}
              />
            </div>
          ) : (
            <div className="doc-preview-placeholder">
              <i className="fi fi-rs-file-pdf" style={{ fontSize: '4rem', color: '#cbd5e1' }}></i>
              <p>File Preview: {doc.fileName}</p>
              <p className="preview-note">No example PDF available for this document type</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render BOL form fields
  const renderBOLFields = (doc) => {
    const fields = doc.fields || {};
    return (
      <div className="doc-fields">
        <h4 className="fields-title">Bill of Lading Information</h4>
        
        <div className="form-section">
          <div className="form-row">
            <div className={`form-field ${isConflicting('blNo') ? 'field-conflict' : ''}`}>
              <label>B/L No.</label>
              <div className="field-value-display">{fields.blNo || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('shippingLine') ? 'field-conflict' : ''}`}>
              <label>Shipping Line</label>
              <div className="field-value-display">{fields.shippingLine || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('shipper') ? 'field-conflict' : ''}`}>
              <label>Shipper</label>
              <div className="field-value-display">{fields.shipper || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('consignee') ? 'field-conflict' : ''}`}>
              <label>Consignee</label>
              <div className="field-value-display">{fields.consignee || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('vesselName') ? 'field-conflict' : ''}`}>
              <label>Vessel Name</label>
              <div className="field-value-display">{fields.vesselName || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('voyageNo') ? 'field-conflict' : ''}`}>
              <label>Voyage No.</label>
              <div className="field-value-display">{fields.voyageNo || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('portOfLoading') ? 'field-conflict' : ''}`}>
              <label>Port of Loading</label>
              <div className="field-value-display">{fields.portOfLoading || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('portOfDischarge') ? 'field-conflict' : ''}`}>
              <label>Port of Discharge</label>
              <div className="field-value-display">{fields.portOfDischarge || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('containerNo') ? 'field-conflict' : ''}`}>
              <label>Container No.</label>
              <div className="field-value-display">{fields.containerNo || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('sealNo') ? 'field-conflict' : ''}`}>
              <label>Seal No.</label>
              <div className="field-value-display">{fields.sealNo || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('quantity') ? 'field-conflict' : ''}`}>
              <label>No. of Packages</label>
              <div className="field-value-display">{fields.quantity || fields.noOfPackages || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('grossWeight') ? 'field-conflict' : ''}`}>
              <label>Gross Weight</label>
              <div className="field-value-display">{fields.grossWeight || '-'}</div>
            </div>
          </div>
          
          <div className="form-row full-width">
            <div className={`form-field ${isConflicting('descriptionOfGoods') ? 'field-conflict' : ''}`}>
              <label>Description of Goods</label>
              <div className="field-value-display">{fields.descriptionOfGoods || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Invoice form fields
  const renderInvoiceFields = (doc) => {
    const fields = doc.fields || {};
    return (
      <div className="doc-fields">
        <h4 className="fields-title">Invoice Information</h4>
        
        <div className="form-section">
          <div className="form-row">
            <div className={`form-field ${isConflicting('invoiceNo') ? 'field-conflict' : ''}`}>
              <label>Invoice No.</label>
              <div className="field-value-display">{fields.invoiceNo || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('invoiceDate') ? 'field-conflict' : ''}`}>
              <label>Invoice Date</label>
              <div className="field-value-display">{fields.invoiceDate || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('consignee') ? 'field-conflict' : ''}`}>
              <label>Consignee</label>
              <div className="field-value-display">{fields.consignee || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('consigneeAddress') ? 'field-conflict' : ''}`}>
              <label>Consignee Address</label>
              <div className="field-value-display">{fields.consigneeAddress || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('containerNo') ? 'field-conflict' : ''}`}>
              <label>Container No.</label>
              <div className="field-value-display">{fields.containerNo || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('quantity') ? 'field-conflict' : ''}`}>
              <label>Total Quantity</label>
              <div className="field-value-display">{fields.quantity || fields.totalQuantity || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('unitPrice') ? 'field-conflict' : ''}`}>
              <label>Unit Price</label>
              <div className="field-value-display">{fields.unitPrice || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('totalAmount') ? 'field-conflict' : ''}`}>
              <label>Total Amount</label>
              <div className="field-value-display">{fields.totalAmount || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Packing List form fields
  const renderPackingListFields = (doc) => {
    const fields = doc.fields || {};
    return (
      <div className="doc-fields">
        <h4 className="fields-title">Packing List Information</h4>
        
        <div className="form-section">
          <div className="form-row">
            <div className={`form-field ${isConflicting('packingListNo') ? 'field-conflict' : ''}`}>
              <label>Packing List No.</label>
              <div className="field-value-display">{fields.packingListNo || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('packingDate') ? 'field-conflict' : ''}`}>
              <label>Packing Date</label>
              <div className="field-value-display">{fields.packingDate || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('consignee') ? 'field-conflict' : ''}`}>
              <label>Consignee</label>
              <div className="field-value-display">{fields.consignee || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('containerNo') ? 'field-conflict' : ''}`}>
              <label>Container No.</label>
              <div className="field-value-display">{fields.containerNo || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('quantity') ? 'field-conflict' : ''}`}>
              <label>Total Quantity</label>
              <div className="field-value-display">{fields.quantity || fields.totalQuantity || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('totalWeight') ? 'field-conflict' : ''}`}>
              <label>Total Weight</label>
              <div className="field-value-display">{fields.totalWeight || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('grossWeight') ? 'field-conflict' : ''}`}>
              <label>Gross Weight</label>
              <div className="field-value-display">{fields.grossWeight || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('netWeight') ? 'field-conflict' : ''}`}>
              <label>Net Weight</label>
              <div className="field-value-display">{fields.netWeight || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Delivery Order form fields
  const renderDeliveryOrderFields = (doc) => {
    const fields = doc.fields || {};
    return (
      <div className="doc-fields">
        <h4 className="fields-title">Delivery Order Information</h4>
        
        <div className="form-section">
          <div className="form-row">
            <div className={`form-field ${isConflicting('doNo') ? 'field-conflict' : ''}`}>
              <label>D/O No.</label>
              <div className="field-value-display">{fields.doNo || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('issueDate') ? 'field-conflict' : ''}`}>
              <label>Issue Date</label>
              <div className="field-value-display">{fields.issueDate || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('consignee') ? 'field-conflict' : ''}`}>
              <label>Consignee</label>
              <div className="field-value-display">{fields.consignee || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('containerNo') ? 'field-conflict' : ''}`}>
              <label>Container No.</label>
              <div className="field-value-display">{fields.containerNo || '-'}</div>
            </div>
          </div>
          
          <div className="form-row">
            <div className={`form-field ${isConflicting('sealNo') ? 'field-conflict' : ''}`}>
              <label>Seal No.</label>
              <div className="field-value-display">{fields.sealNo || '-'}</div>
            </div>
            <div className={`form-field ${isConflicting('deliveryDate') ? 'field-conflict' : ''}`}>
              <label>Delivery Date</label>
              <div className="field-value-display">{fields.deliveryDate || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Main render function for document fields - dispatches to appropriate renderer
  const renderDocumentFields = (doc, side) => {
    const docType = doc.type?.toLowerCase() || '';
    
    if (docType.includes('bill of lading') || docType.includes('bol')) {
      return renderBOLFields(doc);
    }
    if (docType.includes('invoice')) {
      return renderInvoiceFields(doc);
    }
    if (docType.includes('packing list')) {
      return renderPackingListFields(doc);
    }
    if (docType.includes('delivery order')) {
      return renderDeliveryOrderFields(doc);
    }
    
    // Fallback for unknown document types
    const fields = doc.fields || {};
    const fieldKeys = Object.keys(fields);
    return (
      <div className="doc-fields">
        <h4 className="fields-title">{doc.type} Data</h4>
        <div className="fields-list">
          {fieldKeys.map(key => {
            const isConflict = isConflicting(key);
            return (
              <div 
                key={key} 
                className={`field-row ${isConflict ? 'field-conflict' : ''}`}
              >
                <div className="field-label">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  {isConflict && <span className="conflict-indicator">⚠️</span>}
                </div>
                <div className="field-value">{fields[key] || '-'}</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="conflict-overlay-backdrop" onClick={onClose}>
      <div className="conflict-overlay-modal" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="conflict-header">
          <div className="conflict-header-left">
            <h2>Conflict Resolution</h2>
            <div className="conflict-subtitle">
              PRO No: <strong>{conflict.proNo}</strong> • 
              {conflict.conflictType}
            </div>
          </div>
          <button className="conflict-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Conflict Details Banner */}
        <div className="conflict-details-banner">
          <div className="banner-icon">⚠️</div>
          <div className="banner-content">
            <div className="banner-title">Conflict Detected</div>
            <div className="banner-description">{conflict.conflictDetails}</div>
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="conflict-body">
          
          {/* Left Document */}
          <div className="doc-column doc-left">
            <div className="doc-column-header">
              <h3>{document1.type}</h3>
            </div>
            <div className="doc-column-content">
              {renderDocumentPreview(document1, 'left')}
              {renderDocumentFields(document1, 'left')}
            </div>
          </div>

          {/* Divider */}
          <div className="doc-divider">
            <div className="divider-line"></div>
            <div className="divider-label">VS</div>
            <div className="divider-line"></div>
          </div>

          {/* Right Document */}
          <div className="doc-column doc-right">
            <div className="doc-column-header">
              <h3>{document2.type}</h3>
            </div>
            <div className="doc-column-content">
              {renderDocumentPreview(document2, 'right')}
              {renderDocumentFields(document2, 'right')}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="conflict-footer">
          <div className="footer-info">
            <span>Flagged by: <strong>{conflict.flaggedByName}</strong></span>
            <span>Date: <strong>{new Date(conflict.flaggedDate).toLocaleDateString()}</strong></span>
          </div>
          <div className="footer-actions">
            <button 
              className="btn-action btn-keep-left"
              onClick={handleKeepLeft}
              disabled={resolving}
            >
              {resolving && resolution === 'keep_left' ? 'Processing...' : `Keep ${document1.type}`}
            </button>
            <button 
              className="btn-action btn-keep-right"
              onClick={handleKeepRight}
              disabled={resolving}
            >
              {resolving && resolution === 'keep_right' ? 'Processing...' : `Keep ${document2.type}`}
            </button>
            <button 
              className="btn-action btn-upload-new"
              onClick={handleUploadNew}
              disabled={resolving}
            >
              Upload Corrected File
            </button>
            <button 
              className="btn-action btn-close"
              onClick={onClose}
              disabled={resolving}
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

