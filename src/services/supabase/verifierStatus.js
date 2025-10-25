/**
 * Verifier Status Service
 * Mock implementation for verifier status tracking
 * 
 * Future: Replace with real Supabase queries to document_conflicts table
 */

/**
 * Get verifier status counts for pie chart
 * @returns {Promise<{pending: number, resolved: number}>}
 */
export async function getVerifierStatusCounts() {
  // Mock implementation - simulates API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Mock data - replace with real query:
  // SELECT 
  //   COUNT(*) FILTER (WHERE status IN ('open', 'pending')) as pending,
  //   COUNT(*) FILTER (WHERE status IN ('resolved_kept', 'resolved_updated')) as resolved
  // FROM document_conflicts
  // WHERE department = 'shipment'
  
  return {
    pending: 8,    // Open + under review conflicts
    resolved: 42   // Closed/resolved conflicts
  };
}

/**
 * Mock conflict data for the verifier queue
 * Future: Replace with real Supabase query
 */
export const mockConflicts = [
  {
    id: 'conflict-001',
    proNo: '2025001',
    documentType1: 'Bill of Lading',
    documentType2: 'Invoice',
    conflictType: 'Consignee Mismatch',
    conflictDetails: 'Consignee address differs between B/L and Invoice',
    flaggedBy: 'user',
    flaggedByName: 'Maria Santos',
    flaggedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    status: 'pending',
    document1: {
      id: 'doc-001',
      type: 'Bill of Lading',
      fileName: 'BOL-2025001.pdf',
      fields: {
        consignee: 'PUREGOLD PRICE CLUB INC',
        consigneeAddress: '123 Main St, Makati City',
        blNo: 'BL2025001',
        containerNo: 'ABCD1234567',
        quantity: '100'
      }
    },
    document2: {
      id: 'doc-002',
      type: 'Invoice',
      fileName: 'INV-2025001.pdf',
      fields: {
        consignee: 'PUREGOLD PRICE CLUB INC.',
        consigneeAddress: '456 Other St, Manila',
        invoiceNo: 'INV2025001',
        containerNo: 'ABCD1234567',
        quantity: '100'
      }
    },
    conflictingFields: ['consigneeAddress']
  },
  {
    id: 'conflict-002',
    proNo: '2025003',
    documentType1: 'Invoice',
    documentType2: 'Packing List',
    conflictType: 'Quantity Mismatch',
    conflictDetails: 'Total quantity differs between Invoice and Packing List',
    flaggedBy: 'user',
    flaggedByName: 'Juan Dela Cruz',
    flaggedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    status: 'pending',
    document1: {
      id: 'doc-003',
      type: 'Invoice',
      fileName: 'INV-2025003.pdf',
      fields: {
        consignee: 'ROBINSONS SUPERMARKET CORP',
        invoiceNo: 'INV2025003',
        quantity: '250',
        totalAmount: '125000.00'
      }
    },
    document2: {
      id: 'doc-004',
      type: 'Packing List',
      fileName: 'PCK-2025003.pdf',
      fields: {
        consignee: 'ROBINSONS SUPERMARKET CORP',
        packingListNo: 'PCK2025003',
        quantity: '240',
        totalWeight: '5000 kg'
      }
    },
    conflictingFields: ['quantity']
  },
  {
    id: 'conflict-003',
    proNo: '2025005',
    documentType1: 'Bill of Lading',
    documentType2: 'Delivery Order',
    conflictType: 'Container Number Mismatch',
    conflictDetails: 'Container number does not match between B/L and D/O',
    flaggedBy: 'user',
    flaggedByName: 'Maria Santos',
    flaggedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    status: 'pending',
    document1: {
      id: 'doc-005',
      type: 'Bill of Lading',
      fileName: 'BOL-2025005.pdf',
      fields: {
        consignee: 'MONTOSCO TRADING',
        blNo: 'BL2025005',
        containerNo: 'MSCU1234567',
        sealNo: 'SEAL123'
      }
    },
    document2: {
      id: 'doc-006',
      type: 'Delivery Order',
      fileName: 'DO-2025005.pdf',
      fields: {
        consignee: 'MONTOSCO TRADING',
        doNo: 'DO2025005',
        containerNo: 'MSCU1234568',
        sealNo: 'SEAL123'
      }
    },
    conflictingFields: ['containerNo']
  },
  {
    id: 'conflict-004',
    proNo: '2025007',
    documentType1: 'Invoice',
    documentType2: 'Packing List',
    conflictType: 'Amount Calculation Error',
    conflictDetails: 'Total amount calculation mismatch (quantity × unit price)',
    flaggedBy: 'user',
    flaggedByName: 'Juan Dela Cruz',
    flaggedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'pending',
    document1: {
      id: 'doc-007',
      type: 'Invoice',
      fileName: 'INV-2025007.pdf',
      fields: {
        consignee: 'SM RETAIL INC',
        invoiceNo: 'INV2025007',
        quantity: '500',
        unitPrice: '125.00',
        totalAmount: '62500.00'
      }
    },
    document2: {
      id: 'doc-008',
      type: 'Packing List',
      fileName: 'PCK-2025007.xlsx',
      fields: {
        consignee: 'SM RETAIL INC',
        packingListNo: 'PCK2025007',
        quantity: '500',
        unitPrice: '125.00',
        calculatedTotal: '62000.00'
      }
    },
    conflictingFields: ['totalAmount', 'calculatedTotal']
  },
  {
    id: 'conflict-005',
    proNo: '2025009',
    documentType1: 'Bill of Lading',
    documentType2: 'Invoice',
    conflictType: 'Product Description Mismatch',
    conflictDetails: 'Product description differs significantly between documents',
    flaggedBy: 'user',
    flaggedByName: 'Maria Santos',
    flaggedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'pending',
    document1: {
      id: 'doc-009',
      type: 'Bill of Lading',
      fileName: 'BOL-2025009.pdf',
      fields: {
        consignee: 'WILCON DEPOT INC',
        blNo: 'BL2025009',
        productDescription: 'CONSTRUCTION MATERIALS - CEMENT',
        quantity: '1000'
      }
    },
    document2: {
      id: 'doc-010',
      type: 'Invoice',
      fileName: 'INV-2025009.pdf',
      fields: {
        consignee: 'WILCON DEPOT INC',
        invoiceNo: 'INV2025009',
        productDescription: 'BUILDING SUPPLIES - TILES',
        quantity: '1000'
      }
    },
    conflictingFields: ['productDescription']
  },
  {
    id: 'conflict-006',
    proNo: '2025011',
    documentType1: 'Invoice',
    documentType2: 'Delivery Order',
    conflictType: 'Date Discrepancy',
    conflictDetails: 'Delivery date conflicts with invoice date',
    flaggedBy: 'user',
    flaggedByName: 'Juan Dela Cruz',
    flaggedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    status: 'pending',
    document1: {
      id: 'doc-011',
      type: 'Invoice',
      fileName: 'INV-2025011.pdf',
      fields: {
        consignee: 'LANDMARK DEPARTMENT STORE',
        invoiceNo: 'INV2025011',
        invoiceDate: '2025-01-15',
        deliveryDate: '2025-01-20'
      }
    },
    document2: {
      id: 'doc-012',
      type: 'Delivery Order',
      fileName: 'DO-2025011.pdf',
      fields: {
        consignee: 'LANDMARK DEPARTMENT STORE',
        doNo: 'DO2025011',
        issueDate: '2025-01-15',
        deliveryDate: '2025-01-25'
      }
    },
    conflictingFields: ['deliveryDate']
  },
  {
    id: 'conflict-007',
    proNo: '2025013',
    documentType1: 'Bill of Lading',
    documentType2: 'Packing List',
    conflictType: 'Weight Discrepancy',
    conflictDetails: 'Gross weight differs significantly between B/L and Packing List',
    flaggedBy: 'user',
    flaggedByName: 'Maria Santos',
    flaggedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    status: 'pending',
    document1: {
      id: 'doc-013',
      type: 'Bill of Lading',
      fileName: 'BOL-2025013.pdf',
      fields: {
        consignee: 'METRO GAISANO',
        blNo: 'BL2025013',
        grossWeight: '12500 kg',
        containerNo: 'TEMU9876543'
      }
    },
    document2: {
      id: 'doc-014',
      type: 'Packing List',
      fileName: 'PCK-2025013.pdf',
      fields: {
        consignee: 'METRO GAISANO',
        packingListNo: 'PCK2025013',
        grossWeight: '12000 kg',
        containerNo: 'TEMU9876543'
      }
    },
    conflictingFields: ['grossWeight']
  },
  {
    id: 'conflict-008',
    proNo: '2025015',
    documentType1: 'Invoice',
    documentType2: 'Packing List',
    conflictType: 'Item Count Mismatch',
    conflictDetails: 'Number of line items differs between Invoice and Packing List',
    flaggedBy: 'user',
    flaggedByName: 'Juan Dela Cruz',
    flaggedDate: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    status: 'pending',
    document1: {
      id: 'doc-015',
      type: 'Invoice',
      fileName: 'INV-2025015.pdf',
      fields: {
        consignee: 'RUSTAN SUPERMARKET',
        invoiceNo: 'INV2025015',
        itemCount: '15',
        totalAmount: '345000.00'
      }
    },
    document2: {
      id: 'doc-016',
      type: 'Packing List',
      fileName: 'PCK-2025015.xlsx',
      fields: {
        consignee: 'RUSTAN SUPERMARKET',
        packingListNo: 'PCK2025015',
        itemCount: '14',
        totalQuantity: '2500'
      }
    },
    conflictingFields: ['itemCount']
  }
];

/**
 * Get all conflicts for the verifier queue
 * @param {Object} filters - Optional filters (search, dateRange, conflictType)
 * @returns {Promise<Array>}
 */
export async function getVerifierConflicts(filters = {}) {
  // Mock implementation - simulates API delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  let results = [...mockConflicts];
  
  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    results = results.filter(c => 
      c.proNo.toLowerCase().includes(searchLower) ||
      c.conflictType.toLowerCase().includes(searchLower) ||
      c.documentType1.toLowerCase().includes(searchLower) ||
      c.documentType2.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply date range filter
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    results = results.filter(c => new Date(c.flaggedDate) >= start);
  }
  
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    results = results.filter(c => new Date(c.flaggedDate) <= end);
  }
  
  // Apply conflict type filter
  if (filters.conflictType && filters.conflictType !== 'all') {
    results = results.filter(c => c.conflictType === filters.conflictType);
  }
  
  return results;
}

/**
 * Get a single conflict by ID with full details
 * @param {string} conflictId
 * @returns {Promise<Object|null>}
 */
export async function getConflictById(conflictId) {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockConflicts.find(c => c.id === conflictId) || null;
}

/**
 * Resolve a conflict
 * @param {string} conflictId
 * @param {string} resolution - 'keep_left', 'keep_right', 'upload_new'
 * @param {Object} metadata - Additional resolution metadata
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function resolveConflict(conflictId, resolution, metadata = {}) {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock resolution - future: update database
  console.log(`[Verifier] Resolving conflict ${conflictId}:`, { resolution, metadata });
  
  return {
    success: true,
    message: `Conflict resolved successfully with action: ${resolution}`
  };
}

/**
 * Dismiss a conflict (mark as false positive)
 * @param {string} conflictId
 * @param {string} reason - Reason for dismissal
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function dismissConflict(conflictId, reason = '') {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  // Mock dismissal - future: update database
  console.log(`[Verifier] Dismissing conflict ${conflictId}:`, reason);
  
  return {
    success: true,
    message: 'Conflict dismissed successfully'
  };
}