import React, { useMemo } from 'react';
import './VerifierQueue.css';
import { documentStyles } from '../../data';
import TableList from './TableList';

/**
 * VerifierQueue - displays flagged documents requiring verification
 * 
 * Props:
 * - conflicts (Array of conflict objects)
 * - onReview (function) - callback when Review button clicked
 * - onDismiss (function) - callback when Dismiss button clicked
 * - loading (bool) - loading state
 */

export default function VerifierQueue({
  conflicts = [],
  onReview = () => {},
  onDismiss = () => {},
  loading = false,
}) {
  
  // Get unique conflict types for filter dropdown
  const conflictTypes = useMemo(() => {
    const types = new Set(conflicts.map(c => c.conflictType));
    return ['all', ...Array.from(types).sort()];
  }, [conflicts]);

  // Get document type background color from data.js
  const getDocumentColor = (docType) => {
    const docStyle = documentStyles.find(d => d.type === docType);
    return docStyle ? docStyle.bgColor : '#e5e7eb';
  };

  // Get conflict type badge class
  const getConflictBadgeClass = (type) => {
    const typeMap = {
      'Consignee Mismatch': 'conflict-consignee',
      'Quantity Mismatch': 'conflict-quantity',
      'Container Number Mismatch': 'conflict-container',
      'Amount Calculation Error': 'conflict-amount',
      'Product Description Mismatch': 'conflict-product',
      'Date Discrepancy': 'conflict-date',
      'Weight Discrepancy': 'conflict-weight',
      'Item Count Mismatch': 'conflict-item'
    };
    return `conflict-badge ${typeMap[type] || 'conflict-default'}`;
  };

  // Date formatter
  const formatDate = (raw) => {
    if (!raw) return '-';
    const d = new Date(raw);
    if (isNaN(d)) return String(raw);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  };

  // Define columns for the table
  const columns = [
    {
      key: 'proNo',
      label: 'PRO No',
      sortable: true,
      render: (value) => (
        <span className="pro-cell">{value}</span>
      )
    },
    {
      key: 'documentTypes',
      label: 'Document Types',
      render: (value, row) => (
        <div className="document-types">
          <span className="doc-type-badge" style={{ backgroundColor: getDocumentColor(row.documentType1) }}>
            {row.documentType1}
          </span>
          <span className="doc-vs">vs</span>
          <span className="doc-type-badge" style={{ backgroundColor: getDocumentColor(row.documentType2) }}>
            {row.documentType2}
          </span>
        </div>
      )
    },
    {
      key: 'conflictType',
      label: 'Conflict Type',
      render: (value) => (
        <span className={getConflictBadgeClass(value)}>
          {value}
        </span>
      )
    },
    {
      key: 'flaggedBy',
      label: 'Flagged By',
      sortable: true,
      render: (value, row) => row.flaggedByName || value
    },
    {
      key: 'flaggedDate',
      label: 'Date Flagged',
      sortable: true,
      render: (value) => formatDate(value)
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, row) => (
        <div className="action-buttons">
          <button 
            className="btn-review" 
            onClick={() => onReview(row)}
            title="Review conflict"
            aria-label={`Review conflict for ${row.proNo}`}
          >
            <i className="fi fi-rs-eye"></i>
            <span>Review</span>
          </button>
          <button 
            className="btn-dismiss" 
            onClick={() => onDismiss(row)}
            title="Dismiss as false positive"
            aria-label={`Dismiss conflict for ${row.proNo}`}
          >
            <i className="fi fi-rs-cross-circle"></i>
            <span>Dismiss</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="verifier-queue-root">
      <TableList
        title="Conflict Queue"
        columns={columns}
        data={conflicts}
        onAdd={() => {}} // No add functionality for conflicts
        showAddButton={false}
        routePrefix=""
        loading={loading}
        proKey="proNo"
        dateField="flaggedDate"
        searchKeys={['proNo', 'conflictType', 'flaggedByName', 'flaggedBy', 'documentType1', 'documentType2']}
        rowsPerPage={10}
        showTypeDropdown={true}
        customTypeOptions={conflictTypes}
      />
    </div>
  );
}