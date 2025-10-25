import React, { useState } from 'react';
import './Document.css'

import { getSignedDocumentUrl, fetchFieldsByDocumentId } from '../services/supabase/documents'
import DocumentEditOverlay from './overlays/DocumentEditOverlay'
import InvoiceEditOverlay from './overlays/InvoiceEditOverlay'
import BolEditOverlay from './overlays/BolEditOverlay'
import PackingListEditOverlay from './overlays/PackingListEditOverlay'
import DeliveryOrderEditOverlay from './overlays/DeliveryOrderEditOverlay'
import GeneralInfoEditOverlay from './overlays/GeneralInfoEditOverlay'
import RemarksEditOverlay from './overlays/RemarksEditOverlay'
import { supabase } from '../services/supabase/client'
import { insertDocumentFields, logDocumentAction } from '../services/supabase/documents'
import { formatNumber } from '../utils/numberUtils'
import { useAuth } from '../context/AuthContext'

const Document = ({ type, data, items, style, proNo, setProDocumentList, proDocumentList, filePath, documentId, documentType, fieldValues, onSaved = () => {} }) => {
    // Extract totals for invoice (if present in fieldValues)
    const totalQuantity = fieldValues?.total_quantity ?? null
    const totalAmount = fieldValues?.total_amount ?? null
    const [showOverlay, setShowOverlay] = useState(false);
    const [dbFieldValues, setDbFieldValues] = useState(fieldValues || {});
    
    // Get user roles for access control
    const { roles } = useAuth();
    
    // Determine if edit/delete should be disabled based on roles and document type
    const isReadOnly = React.useMemo(() => {
        // For Delivery Orders, only shipment/admin roles can edit/delete
        if (type === 'Delivery Order') {
            // Check if user has shipment or admin role
            const canEditDeliveryOrder = roles.includes('shipment') || roles.includes('admin');
            return !canEditDeliveryOrder;
        }
        return false;
    }, [type, roles]);
    
    // Fetch fieldValues and document metadata from database when component mounts
    React.useEffect(() => {
        const fetchDocumentData = async () => {
            if (!documentId) return;
            
            try {
                // Fetch fieldValues
                const fields = await fetchFieldsByDocumentId(documentId);
                console.log('[Document.js] Fetched fields from database:', fields)
                console.log('[Document.js] Looking for container_seal_pairs field...')
                const containerPairsField = fields.find(f => f.canonical_key === 'container_seal_pairs')
                console.log('[Document.js] Found container_seal_pairs field:', containerPairsField)
                const fieldValuesMap = {};
                
                    fields.forEach(field => {
                        // Use raw_value for text fields, value_number for numeric fields
                        if (field.value_number !== null && field.value_number !== undefined) {
                            fieldValuesMap[field.canonical_key] = field.value_number;
                        } else {
                            let value = field.raw_value || field.normalized_value;
                            
                            // Special handling for invoice_date - convert YYYY-MM-DD back to MM/DD/YY
                            if (field.canonical_key === 'invoice_date' && value && value.includes('-')) {
                                const dateParts = value.split('-')
                                if (dateParts.length === 3) {
                                    const year = dateParts[0]
                                    const month = dateParts[1]
                                    const day = dateParts[2]
                                    const shortYear = year.substring(2) // Get last 2 digits
                                    value = `${month}/${day}/${shortYear}`
                                }
                            }
                            
                            // Special handling for container_seal_pairs - parse JSON string
                            if (field.canonical_key === 'container_seal_pairs' && value) {
                                console.log('[Document.js] Found container_seal_pairs field:', field)
                                console.log('[Document.js] Raw value:', value)
                                try {
                                    const parsedPairs = JSON.parse(value)
                                    console.log('[Document.js] Parsed pairs:', parsedPairs)
                                    fieldValuesMap[field.canonical_key] = Array.isArray(parsedPairs) ? parsedPairs : []
                                    console.log('[Document.js] Final container_seal_pairs:', fieldValuesMap[field.canonical_key])
                                } catch (e) {
                                    console.error('[Document.js] Error parsing container_seal_pairs:', e)
                                    fieldValuesMap[field.canonical_key] = []
                                }
                            } else {
                                fieldValuesMap[field.canonical_key] = value;
                            }
                        }
                    });
                
                
                setDbFieldValues(fieldValuesMap);
                console.log('Field values from database:', fieldValuesMap)
                console.log('Invoice date from DB:', fieldValuesMap.invoice_date)
                console.log('Total quantity from DB:', fieldValuesMap.total_quantity)
                console.log('Total amount from DB:', fieldValuesMap.total_amount)
                
                // Fetch document metadata with user details
                const { data: docData, error: docError } = await supabase
                    .from('documents')
                    .select(`
                        updated_at, 
                        uploaded_at, 
                        uploaded_by, 
                        updated_by,
                        auth.users!documents_uploaded_by_fkey(
                            email,
                            raw_user_meta_data
                        )
                    `)
                    .eq('id', documentId)
                    .single();
                
                if (docError) {
                    console.error('Error fetching document metadata:', docError);
                } else {
                    console.log('Document metadata fetched:', docData)
                    console.log('Updated_at timestamp:', docData.updated_at)
                    console.log('Uploaded_at timestamp:', docData.uploaded_at)
                    
                    // Fix timestamps - treat as local time (no Z suffix needed)
                    const fixedDocData = {
                        ...docData,
                        updated_at: docData.updated_at, // Keep as local time
                        uploaded_at: docData.uploaded_at // Keep as local time
                    }
                    
                    
                    // Store document metadata in state for use in overlays
                    setDbFieldValues(prev => ({
                        ...prev,
                        __document_metadata: fixedDocData
                    }));
                }
            } catch (error) {
                console.error('Error fetching document data:', error);
            }
        };
        
        fetchDocumentData();
    }, [documentId]);
    const [downloading, setDownloading] = useState(false)
    const [downloadError, setDownloadError] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [previewUrl, setPreviewUrl] = useState('')
    const [previewName, setPreviewName] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [deleteError, setDeleteError] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    
    // Metadata for overlays
    const [uploadedByName, setUploadedByName] = useState('')
    const [updatedByName, setUpdatedByName] = useState('')
    
    // Pagination state for line items
    const [currentPage, setCurrentPage] = useState(1)
    const rowsPerPage = 10
    
    // Reset to first page when items change
    React.useEffect(() => {
        setCurrentPage(1)
    }, [items])
    
    // Pagination logic
    const totalPages = Math.max(1, Math.ceil((items?.length || 0) / rowsPerPage))
    const indexOfLast = currentPage * rowsPerPage
    const indexOfFirst = indexOfLast - rowsPerPage
    const currentItems = items?.slice(indexOfFirst, indexOfLast) || []
    
    // Pagination handlers
    const handlePrev = () => { if (currentPage > 1) setCurrentPage(p => p - 1) }
    const handleNext = () => { if (currentPage < totalPages) setCurrentPage(p => p + 1) }
    const handleGoto = (p) => { if (p >= 1 && p <= totalPages) setCurrentPage(p) }
    
    // Pagination window (show max 5 page buttons)
    const maxButtons = 5
    const paginationWindow = (() => {
        let start = Math.max(1, currentPage - 2)
        let end = Math.min(totalPages, start + maxButtons - 1)
        if (end - start + 1 < maxButtons) {
            start = Math.max(1, end - maxButtons + 1)
        }
        return Array.from({ length: end - start + 1 }, (_, i) => start + i)
    })()
    
    const updatedAt = fieldValues?.updated_at || null
    const uploadedAt = fieldValues?.uploaded_at || null

    // Fetch user names for display
    const fetchUserNames = async () => {
        try {
            const userIds = []
            if (fieldValues?.uploaded_by) userIds.push(fieldValues.uploaded_by)
            if (fieldValues?.updated_by) userIds.push(fieldValues.updated_by)
            
            if (userIds.length === 0) return
            
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .in('id', userIds)
            
            if (error) throw error
            
            if (data) {
                const uploadedUser = data.find(u => u.id === fieldValues?.uploaded_by)
                const updatedUser = data.find(u => u.id === fieldValues?.updated_by)
                
                setUploadedByName(uploadedUser?.full_name || uploadedUser?.email || '')
                setUpdatedByName(updatedUser?.full_name || updatedUser?.email || '')
            }
        } catch (err) {
            console.error('[Fetch User Names Error]', err)
        }
    }

    const renderLineItemsTable = () => {
        if (!items || items.length === 0) return null;

        if (type === 'Invoice') {
            return (
                <div className="line-items">
                    <div className="line-items-container">
                        <table className="line-items-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((row, idx) => (
                                    <tr key={idx}>
                                        <td data-label="Product">{row.product}</td>
                                        <td data-label="Quantity">{row.quantity}</td>
                                        <td data-label="Unit Price">{formatNumber(row.unitPrice)}</td>
                                        <td data-label="Amount">{formatNumber(row.amount)}</td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                {(totalQuantity !== null || totalAmount !== null) && (
                                    <tr style={{ borderTop: '2px solid #333', fontWeight: 700 }}>
                                        <td style={{ fontWeight: 700 }} data-label="Product">Totals</td>
                                        <td style={{ fontWeight: 700 }} data-label="Quantity">{totalQuantity ?? ''}</td>
                                        <td data-label="Unit Price"></td>
                                        <td style={{ fontWeight: 700 }} data-label="Amount">{formatNumber(totalAmount)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="line-items-pagination">
                            <div className="pagination-info">
                                Showing {indexOfFirst + 1}-{Math.min(indexOfLast, items.length)} of {items.length} items
                            </div>
                            <div className="pagination-controls">
                                <button 
                                    className="pagination-btn" 
                                    onClick={handlePrev} 
                                    disabled={currentPage === 1}
                                >
                                    ← Prev
                                </button>
                                {paginationWindow[0] > 1 && <span className="dots">…</span>}
                                {paginationWindow.map(p => (
                                    <button
                                        key={p}
                                        className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                                        onClick={() => handleGoto(p)}
                                        aria-current={p === currentPage ? 'page' : undefined}
                                    >
                                        {p}
                                    </button>
                                ))}
                                {paginationWindow[paginationWindow.length - 1] < totalPages && <span className="dots">…</span>}
                                <button 
                                    className="pagination-btn" 
                                    onClick={handleNext} 
                                    disabled={currentPage === totalPages}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'Packing List') {
            // Get totals from fieldValues
            const totalQuantityPL = fieldValues?.total_quantity ?? null
            const totalNetWeight = fieldValues?.total_net_weight ?? null
            const totalGrossWeight = fieldValues?.total_gross_weight ?? null
            
            return (
                <div className="line-items">
                    <div className="line-items-container">
                        <table className="line-items-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Net Weight (KGS)</th>
                                    <th>Gross Weight (KGS)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((row, idx) => (
                                    <tr key={idx}>
                                        <td data-label="Product">{row.product}</td>
                                        <td data-label="Quantity">{row.quantity}</td>
                                        <td data-label="Net Weight">{formatNumber(row.netWeight)}</td>
                                        <td data-label="Gross Weight">{formatNumber(row.grossWeight)}</td>
                                    </tr>
                                ))}
                                {/* Totals row */}
                                {(totalQuantityPL !== null || totalNetWeight !== null || totalGrossWeight !== null) && (
                                    <tr style={{ borderTop: '2px solid #333', fontWeight: 700 }}>
                                        <td style={{ fontWeight: 700 }} data-label="Product">Totals</td>
                                        <td style={{ fontWeight: 700 }} data-label="Quantity">{totalQuantityPL ?? ''}</td>
                                        <td style={{ fontWeight: 700 }} data-label="Net Weight">{formatNumber(totalNetWeight)}</td>
                                        <td style={{ fontWeight: 700 }} data-label="Gross Weight">{formatNumber(totalGrossWeight)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="line-items-pagination">
                            <div className="pagination-info">
                                Showing {indexOfFirst + 1}-{Math.min(indexOfLast, items.length)} of {items.length} items
                            </div>
                            <div className="pagination-controls">
                                <button 
                                    className="pagination-btn" 
                                    onClick={handlePrev} 
                                    disabled={currentPage === 1}
                                >
                                    ← Prev
                                </button>
                                {paginationWindow[0] > 1 && <span className="dots">…</span>}
                                {paginationWindow.map(p => (
                                    <button
                                        key={p}
                                        className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                                        onClick={() => handleGoto(p)}
                                        aria-current={p === currentPage ? 'page' : undefined}
                                    >
                                        {p}
                                    </button>
                                ))}
                                {paginationWindow[paginationWindow.length - 1] < totalPages && <span className="dots">…</span>}
                                <button 
                                    className="pagination-btn" 
                                    onClick={handleNext} 
                                    disabled={currentPage === totalPages}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'General Information' || type === 'General Info') {
            // Show only when both sources exist; totals are precomputed at fieldValues.__giTotals
            const totals = fieldValues?.__giTotals || null
            return (
                <div className="line-items">
                    <h3 className="document-name" style={{ marginTop: 0 }}>Product Table</h3>
                    <div className="line-items-container">
                        <table className="line-items-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Unit Price</th>
                                    <th>Amount</th>
                                    <th>Net Weight</th>
                                    <th>Gross Weight</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentItems.map((row, idx) => (
                                    <tr key={idx}>
                                        <td data-label="Product">{row.product ?? '--'}</td>
                                        <td data-label="Quantity">{row.quantity ?? ''}</td>
                                        <td data-label="Unit Price">{formatNumber(row.unitPrice)}</td>
                                        <td data-label="Amount">{formatNumber(row.amount)}</td>
                                        <td data-label="Net Weight">{formatNumber(row.netWeight)}</td>
                                        <td data-label="Gross Weight">{formatNumber(row.grossWeight)}</td>
                                    </tr>
                                ))}
                                {totals && (
                                    <tr style={{ borderTop: '2px solid #333', fontWeight: 700 }}>
                                        <td style={{ fontWeight: 700 }} data-label="Product">Totals</td>
                                        <td style={{ fontWeight: 700 }} data-label="Quantity">{totals.totalQuantity ?? ''}</td>
                                        <td data-label="Unit Price"></td>
                                        <td style={{ fontWeight: 700 }} data-label="Amount">{formatNumber(totals.totalAmount)}</td>
                                        <td style={{ fontWeight: 700 }} data-label="Net Weight">{formatNumber(totals.totalNet)}</td>
                                        <td style={{ fontWeight: 700 }} data-label="Gross Weight">{formatNumber(totals.totalGross)}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="line-items-pagination">
                            <div className="pagination-info">
                                Showing {indexOfFirst + 1}-{Math.min(indexOfLast, items.length)} of {items.length} items
                            </div>
                            <div className="pagination-controls">
                                <button 
                                    className="pagination-btn" 
                                    onClick={handlePrev} 
                                    disabled={currentPage === 1}
                                >
                                    ← Prev
                                </button>
                                {paginationWindow[0] > 1 && <span className="dots">…</span>}
                                {paginationWindow.map(p => (
                                    <button
                                        key={p}
                                        className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                                        onClick={() => handleGoto(p)}
                                        aria-current={p === currentPage ? 'page' : undefined}
                                    >
                                        {p}
                                    </button>
                                ))}
                                {paginationWindow[paginationWindow.length - 1] < totalPages && <span className="dots">…</span>}
                                <button 
                                    className="pagination-btn" 
                                    onClick={handleNext} 
                                    disabled={currentPage === totalPages}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (type === 'Remarks') {
            return (
                <div className="line-items">
                    <table className="line-items-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.date}</td>
                                    <td>{row.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="line-items-pagination">
                            <div className="pagination-info">
                                Showing {indexOfFirst + 1}-{Math.min(indexOfLast, items.length)} of {items.length} items
                            </div>
                            <div className="pagination-controls">
                                <button 
                                    className="pagination-btn" 
                                    onClick={handlePrev} 
                                    disabled={currentPage === 1}
                                >
                                    ← Prev
                                </button>
                                {paginationWindow[0] > 1 && <span className="dots">…</span>}
                                {paginationWindow.map(p => (
                                    <button
                                        key={p}
                                        className={`pagination-btn ${p === currentPage ? 'active' : ''}`}
                                        onClick={() => handleGoto(p)}
                                        aria-current={p === currentPage ? 'page' : undefined}
                                    >
                                        {p}
                                    </button>
                                ))}
                                {paginationWindow[paginationWindow.length - 1] < totalPages && <span className="dots">…</span>}
                                <button 
                                    className="pagination-btn" 
                                    onClick={handleNext} 
                                    disabled={currentPage === totalPages}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    // Ensure container/seal pairs render as data rows for Bill of Lading and Delivery Order
    let computedData = Array.isArray(data) ? data.slice() : []
    if (type === 'Bill of Lading' || type === 'Delivery Order') {
        const hasPairRows = computedData.some(r => r && r.label === 'Container No. / Seal No.')
        if (!hasPairRows && Array.isArray(fieldValues?.container_seal_pairs)) {
            if (type === 'Bill of Lading') {
                // BOL: each pair as separate row
                for (const p of fieldValues.container_seal_pairs) {
                    const c = (p?.containerNo || '').toString()
                    const s = (p?.sealNo || '').toString()
                    computedData.push({ label: 'Container No. / Seal No.', info: [c, s].filter(Boolean).join(' / ') })
                }
            } else if (type === 'Delivery Order') {
                // Delivery Order: all pairs in single row with newlines
                const pairsText = fieldValues.container_seal_pairs.map(p => {
                    const c = (p?.containerNo || '').toString()
                    const s = (p?.sealNo || '').toString()
                    return [c, s].filter(Boolean).join(' / ') || '--'
                }).join('\n')
                computedData.push({ label: 'Container No. / Seal No.', info: pairsText })
            }
        }
    }

    const hideButtons = style?.hideButtons
    const noShadow = style?.noShadow
    const isGeneralInfo = type === 'General Information' || type === 'General Info'
    const [etaValue, setEtaValue] = useState(() => {
        if (!isGeneralInfo) return ''
        const etaFromFields = fieldValues?.eta
        console.log('Initializing ETA value:', { etaFromFields, fieldValues, data })
        if (etaFromFields) return etaFromFields
        if (Array.isArray(data)) {
            const etaRow = data.find(d => d.label === 'ETA')
            if (etaRow && etaRow.info && etaRow.info !== '--') return etaRow.info
        }
        return ''
    })
    const [savingEta, setSavingEta] = useState(false)

    const saveEta = async (newEta) => {
        if (!isGeneralInfo) return
        // store ETA only on B/L doc via Department.js wiring: we used bol.documentId when rendering this window
        if (!documentId) {
            console.warn('No documentId available for ETA save')
            return
        }
        // accept MM/DD/YY or MM/DD/YYYY as typed; no transform for now
        try {
            setSavingEta(true)
            console.log('Saving ETA:', newEta, 'for documentId:', documentId)
            
            // Delete existing ETA then insert a new value (unique per doc_id+key)
            const { error: delErr } = await supabase
                .from('document_fields')
                .delete()
                .eq('document_id', documentId)
                .eq('canonical_key', 'eta')
            if (delErr) {
                console.error('Error deleting existing ETA:', delErr)
                throw delErr
            }

            await insertDocumentFields(documentId, [
                { canonical_key: 'eta', raw_value: String(newEta || '') }
            ])
            console.log('ETA saved successfully')

            // Update local cache
            setProDocumentList(prev => prev.map(pro => {
                if (pro.proNo !== proNo) return pro
                return {
                    ...pro,
                    documents: pro.documents.map(doc => {
                        if (doc.documentId !== documentId) return doc
                        return {
                            ...doc,
                            fieldValues: { ...doc.fieldValues, eta: newEta, updated_at: new Date().toISOString() }
                        }
                    })
                }
            }))
            
            // Call onSaved callback to refresh data
            if (typeof onSaved === 'function') {
                onSaved()
            }
        } catch (e) {
            console.error('Error saving ETA:', e)
        } finally {
            setSavingEta(false)
        }
    }
    const containerStyle = {
        backgroundColor: style.bgColor,
        boxShadow: noShadow ? 'none' : undefined
    }

    return (
        <div className="document-container" style={containerStyle}>
            <h3 className="document-name">{type}</h3>
            <div className="grid" style={{ columnCount: style.columns, columnWidth: style.columnWidth }}>
                {computedData.map((field, index) => {
                    if (isGeneralInfo && field.label === 'ETA') {
                        // Get ETA from BOL data instead of showing input field
                        const bolEta = (() => {
                            const bolDoc = proDocumentList.find(pro => pro.proNo === proNo)?.documents?.find(doc => doc.type === 'Bill of Lading')
                            return bolDoc?.fieldValues?.eta || '--'
                        })()
                        
                        return (
                            <div key={index} className="info-block" style={{ display: 'flex', flexDirection: 'column' }}>
                                <div className="label">ETA:</div>
                                <div className="info">{bolEta}</div>
                            </div>
                        )
                    }
                    return (
                        <div key={index} className="info-block" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="label">{field.label}:</div>
                            <div className="info">{field.info ?? '--'}</div>
                        </div>
                    )
                })}
            </div>

            {renderLineItemsTable()}

            {!hideButtons && (
            <div className="button-row">
                {filePath && (
                    <button className="download-button" onClick={async () => {
                        setDownloadError('')
                        setDownloading(true)
                        try {
                            const url = await getSignedDocumentUrl(filePath, 600)
                            
                            // Method 1: Try direct download with blob
                            try {
                                const response = await fetch(url)
                                const blob = await response.blob()
                                const blobUrl = URL.createObjectURL(blob)
                                
                                const link = document.createElement('a')
                                link.href = blobUrl
                                link.setAttribute('download', filePath.split('/').pop() || 'document')
                                link.style.display = 'none'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                
                                // Clean up blob URL
                                URL.revokeObjectURL(blobUrl)
                            } catch (fetchError) {
                                // Method 2: Fallback to direct link (opens in new tab)
                                const link = document.createElement('a')
                                link.href = url
                                link.setAttribute('target', '_blank')
                                link.style.display = 'none'
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                            }
                        } catch (e) {
                            setDownloadError(e?.message || 'Download failed')
                        } finally {
                            setDownloading(false)
                        }
                    }}>
                        <i className="fi fi-rs-download" style={{ marginRight: '8px' }}></i>
                        <span>{downloading ? 'Downloading…' : 'Download File'}</span>
                    </button>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        className="edit-button" 
                        disabled={isReadOnly}
                        onClick={async () => {
                            if (isReadOnly) return;
                            setShowOverlay(true)
                            await fetchUserNames()
                            if (filePath) {
                              try {
                                const url = await getSignedDocumentUrl(filePath, 600)
                                setPreviewUrl(url || '')
                                setPreviewName(filePath.split('/').pop() || '')
                              } catch (_e) {
                                setPreviewUrl('')
                                setPreviewName('')
                              }
                            } else {
                              setPreviewUrl('')
                              setPreviewName('')
                            }
                        }}
                        style={isReadOnly ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                        <i className="fi fi-rs-pencil" style={{ marginRight: '8px' }}></i>
                        <span>Edit {type}</span>
                    </button>
                    <button 
                        className="delete-button" 
                        disabled={isReadOnly}
                        onClick={() => {
                            if (isReadOnly) return;
                            setShowDeleteConfirm(true);
                        }}
                        style={isReadOnly ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                    >
                        <i className="fi fi-rs-trash" style={{ marginRight: '8px' }}></i>
                        <span>Delete {type}</span>
                    </button>
                </div>
            </div>
            )}

            {downloadError && <div style={{ color: 'crimson', marginTop: 8 }}>{downloadError}</div>}
            {deleteError && <div style={{ color: 'crimson', marginTop: 8 }}>{deleteError}</div>}

            {showOverlay && type === 'Invoice' && (
                <InvoiceEditOverlay
                    title={type}
                    fileUrl={previewUrl || null}
                    fileName={previewName || null}
                    initialValues={{
                        invoice_no: dbFieldValues?.invoice_no || fieldValues?.invoice_no || data.find(d => d.label === 'Invoice No.')?.info || '',
                        invoice_date: dbFieldValues?.invoice_date || fieldValues?.invoice_date || data.find(d => d.label === 'Invoice Date')?.info || '',
                        incoterms: dbFieldValues?.incoterms || fieldValues?.incoterms || data.find(d => d.label === 'Incoterms')?.info || '',
                        invoice_currency: dbFieldValues?.invoice_currency || fieldValues?.invoice_currency || data.find(d => d.label === 'Currency')?.info || 'USD',
                        total_quantity: dbFieldValues?.total_quantity || fieldValues?.total_quantity || data.find(d => d.label === 'Total Quantity')?.info || '',
                        total_amount: dbFieldValues?.total_amount || fieldValues?.total_amount || data.find(d => d.label === 'Total Amount')?.info || '',
                        uploaded_at: uploadedAt
                    }}
                    initialItems={items || []}
                    updatedAt={dbFieldValues?.__document_metadata?.updated_at || updatedAt}
                    updatedBy={dbFieldValues?.__document_metadata?.auth?.users?.raw_user_meta_data?.full_name || dbFieldValues?.__document_metadata?.auth?.users?.email || updatedByName}
                    uploadedBy={dbFieldValues?.__document_metadata?.auth?.users?.raw_user_meta_data?.full_name || dbFieldValues?.__document_metadata?.auth?.users?.email || uploadedByName}
                    documentId={documentId}
                    proNumber={proNo}
                    onClose={() => setShowOverlay(false)}
                    onSubmit={async (values) => {
                        setSaveError(''); setSaving(true)
                        try {
                            // Get current user
                            const { data: sess } = await supabase.auth.getSession()
                            const userId = sess?.session?.user?.id
                            
                            // Update documents table with updated_by and updated_at
                            if (documentId && userId) {
                                const { error: docErr } = await supabase
                                    .from('documents')
                                    .update({
                                        updated_by: userId,
                                        updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                                
                                // Log the update action to actions_log
                                await logDocumentAction({
                                    userId: userId,
                                    action: "document_data_updated",
                                    documentId: documentId,
                                    proNumber: proNo,
                                    department: "shipment",
                                    documentType: documentType,
                                });
                            }
                            
                            // Update document_fields with totals
                            // Delete existing keys first to avoid unique constraint
                            {
                                const keys = ['invoice_no','invoice_date','incoterms','invoice_currency','total_quantity','total_amount']
                                const { error: delFieldsErr } = await supabase
                                    .from('document_fields')
                                    .delete()
                                    .eq('document_id', documentId)
                                    .in('canonical_key', keys)
                                if (delFieldsErr) throw delFieldsErr
                            }
                            
                            const fieldRows = []
                            const pushText = (key, val) => { 
                                if (val !== undefined && val !== null && String(val) !== '') {
                                    // Special handling for invoice_date - convert MM/DD/YY to proper date format
                                    if (key === 'invoice_date' && val.includes('/')) {
                                        const dateParts = val.split('/')
                                        if (dateParts.length === 3) {
                                            const month = dateParts[0].padStart(2, '0')
                                            const day = dateParts[1].padStart(2, '0')
                                            const year = dateParts[2].padStart(2, '0')
                                            const fullYear = parseInt(year) < 50 ? `20${year}` : `19${year}`
                                            const formattedDate = `${fullYear}-${month}-${day}`
                                            fieldRows.push({ canonical_key: key, raw_value: formattedDate })
                                            return
                                        }
                                    }
                                    fieldRows.push({ canonical_key: key, raw_value: String(val) })
                                }
                            }
                            const pushNumber = (key, val) => { 
                                // Clean the value by removing commas and converting to number
                                const cleanedVal = String(val).replace(/,/g, '')
                                const n = Number(cleanedVal); 
                                if (Number.isFinite(n)) fieldRows.push({ canonical_key: key, value_number: n }) 
                            }

                            console.log('Saving invoice values:', values)
                            console.log('Invoice date value:', values.invoice_date, 'Type:', typeof values.invoice_date)
                            console.log('Total quantity value:', values.total_quantity, 'Type:', typeof values.total_quantity)
                            console.log('Total amount value:', values.total_amount, 'Type:', typeof values.total_amount)
                            
                            pushText('invoice_no', values.invoice_no)
                            pushText('invoice_date', values.invoice_date)
                            pushText('incoterms', values.incoterms)
                            pushText('invoice_currency', values.invoice_currency)
                            pushNumber('total_quantity', values.total_quantity)
                            pushNumber('total_amount', values.total_amount)
                            
                            console.log('Field rows to insert:', fieldRows)

                            if (fieldRows.length) {
                                await insertDocumentFields(documentId, fieldRows)
                            }

                            // Update document_items (line items)
                            if (values.items && values.items.length) {
                                // Delete existing items
                                const { error: deleteErr } = await supabase
                                    .from('document_items')
                                    .delete()
                                    .eq('document_id', documentId)
                                if (deleteErr) throw deleteErr

                                // Insert new items
                                const itemRows = values.items
                                    .filter(item => item.product || item.quantity || item.unitPrice || item.amount)
                                    .map((item, idx) => ({
                                        document_id: documentId,
                                        line_no: idx + 1,
                                        product: item.product || null,
                                        quantity: item.quantity ? Number(item.quantity) : null,
                                        unit_price: item.unitPrice ? Number(item.unitPrice) : null,
                                        amount: item.amount ? Number(item.amount) : null
                                    }))

                                if (itemRows.length) {
                                    const { error: itemsErr } = await supabase
                                        .from('document_items')
                                        .insert(itemRows)
                                    if (itemsErr) throw itemsErr
                                }
                            }

                            // Update local state
                            const updatedList = proDocumentList.map(pro => {
                                if (pro.proNo !== proNo) return pro;
                                return {
                                    ...pro,
                                    documents: pro.documents.map(doc => {
                                        if (doc.type !== type) return doc;
                                        return {
                                            ...doc,
                                            data: [
                                                { label: 'Invoice No.', info: values.invoice_no },
                                                { label: 'Invoice Date', info: values.invoice_date },
                                                { label: 'Incoterms', info: values.incoterms },
                                                { label: 'Currency', info: values.invoice_currency },
                                                { label: 'Total Quantity', info: values.total_quantity },
                                                { label: 'Total Amount', info: values.total_amount }
                                            ],
                                            items: values.items,
                                            fieldValues: {
                                                ...doc.fieldValues,
                                                invoice_no: values.invoice_no,
                                                invoice_date: values.invoice_date,
                                                incoterms: values.incoterms,
                                                invoice_currency: values.invoice_currency,
                                                total_quantity: values.total_quantity,
                                                total_amount: values.total_amount,
                                                updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })(),
                                                updated_by: userId
                                            }
                                        };
                                    })
                                };
                            });
                            setProDocumentList(updatedList);
                            setShowOverlay(false)
                            onSaved()
                        } catch (e) {
                            setSaveError(e?.message || 'Save failed')
                        } finally {
                            setSaving(false)
                        }
                    }}
                />
            )}

            {showOverlay && type === 'Bill of Lading' && (
                <BolEditOverlay
                    title={type}
                    fileUrl={previewUrl || null}
                    fileName={previewName || null}
                    initialValues={dbFieldValues || {}}
                    updatedAt={updatedAt}
                    updatedBy={updatedByName}
                    uploadedBy={uploadedByName}
                    documentId={documentId}
                    proNumber={proNo}
                    onClose={() => setShowOverlay(false)}
                    onSubmit={async (values, pairs) => {
                        setSaveError(''); setSaving(true)
                        try {
                            // Get current user
                            const { data: sess } = await supabase.auth.getSession()
                            const userId = sess?.session?.user?.id
                            
                            // Update documents table with updated_by and updated_at
                            if (documentId && userId) {
                                const { error: docErr } = await supabase
                                    .from('documents')
                                    .update({
                                        updated_by: userId,
                                        updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                            }
                            
                            // Build upserts by deleting and reinserting current fields
                            const del = await supabase
                              .from('document_fields')
                              .delete()
                              .eq('document_id', documentId)
                            if (del.error) throw del.error

                            const rows = []
                            const pushText = (key, val) => { if (val !== undefined && val !== null && String(val) !== '') rows.push({ canonical_key: key, raw_value: String(val) }) }
                            const pushNumber = (key, val) => { 
                                const cleaned = val.toString().replace(/,/g, '')
                                const n = Number(cleaned)
                                if (Number.isFinite(n)) rows.push({ canonical_key: key, value_number: n }) 
                            }
                            pushText('bl_number', values.bl_number)
                            pushText('shipper', values.shipper)
                            pushText('consignee', values.consignee)
                            pushText('shipping_line', values.shipping_line)
                            pushText('vessel_name', values.vessel_name)
                            pushText('voyage_no', values.voyage_no)
                            pushText('eta', values.eta)
                            pushText('port_of_loading', values.port_of_loading)
                            pushText('port_of_discharge', values.port_of_discharge)
                            pushText('place_of_delivery', values.place_of_delivery)
                            
                            pushText('container_specs', values.container_specs)
                            pushNumber('no_of_packages', values.no_of_packages)
                            pushText('packaging_kind', values.packaging_kind)
                            pushText('goods_classification', values.goods_classification)
                            pushText('description_of_goods', values.description_of_goods)
                            pushNumber('gross_weight', values.gross_weight)
                            
                            // Container/Seal pairs as JSON
                            if (Array.isArray(pairs)) {
                                const cleaned = pairs.map(p => ({ containerNo: (p.containerNo || '').toString(), sealNo: (p.sealNo || '').toString() }))
                                const nonEmpty = cleaned.filter(p => p.containerNo.trim() || p.sealNo.trim())
                                if (nonEmpty.length) {
                                    rows.push({ canonical_key: 'container_seal_pairs', raw_value: JSON.stringify(nonEmpty) })
                                }
                            }
                            
                            // Insert document fields
                            if (rows.length) {
                                await insertDocumentFields(documentId, rows)
                            }
                            
                            // Update local state with new container/seal pairs
                            const updatedFieldValues = { ...fieldValues }
                            if (Array.isArray(pairs)) {
                                const cleaned = pairs.map(p => ({ 
                                    containerNo: (p.containerNo || '').toString(), 
                                    sealNo: (p.sealNo || '').toString() 
                                }))
                                const nonEmpty = cleaned.filter(p => p.containerNo.trim() || p.sealNo.trim())
                                updatedFieldValues.container_seal_pairs = nonEmpty
                            }
                            setDbFieldValues(updatedFieldValues)
                            
                            // Log the update action to actions_log
                            await logDocumentAction({
                                userId: userId,
                                action: "document_data_updated",
                                documentId: documentId,
                                proNumber: proNo,
                                department: "shipment",
                                documentType: "bill_of_lading",
                            });
                            
                            setShowOverlay(false)
                            onSaved()
                        } catch (e) {
                            setSaveError(e?.message || 'Save failed')
                        } finally {
                            setSaving(false)
                        }
                    }}
                />
            )}

            {showOverlay && type === 'General Information' && (
                <GeneralInfoEditOverlay
                    title={type}
                    initialValues={{
                        port_of_loading: fieldValues?.port_of_loading || data.find(d => d.label === 'Port Of Loading')?.info || '',
                        port_of_discharge: fieldValues?.port_of_discharge || data.find(d => d.label === 'Port Of Discharge')?.info || '',
                        eta: fieldValues?.eta || data.find(d => d.label === 'ETA')?.info || '',
                        supplier_shipper: fieldValues?.supplier_shipper || data.find(d => d.label === 'Supplier/Shipper')?.info || '',
                        container_no: fieldValues?.container_no || data.find(d => d.label === 'Container No.')?.info || '',
                        container_size_type: fieldValues?.container_size_type || data.find(d => d.label === 'Size and Type of Container')?.info || '',
                        vessel_status: fieldValues?.vessel_status || data.find(d => d.label === 'Vessel Status')?.info || '',
                        bl_number: fieldValues?.bl_number || data.find(d => d.label === 'B/L No.')?.info || '',
                        shipping_lines: fieldValues?.shipping_lines || data.find(d => d.label === 'Shipping Lines')?.info || '',
                        consignee: fieldValues?.consignee || data.find(d => d.label === 'Consignee')?.info || '',
                        uploaded_at: uploadedAt
                    }}
                    initialItems={items || []}
                    updatedAt={updatedAt}
                    updatedBy={updatedByName}
                    uploadedBy={uploadedByName}
                    onClose={() => setShowOverlay(false)}
                    onSubmit={async (values) => {
                        setSaveError(''); setSaving(true)
                        try {
                            // Get current user
                            const { data: sess } = await supabase.auth.getSession()
                            const userId = sess?.session?.user?.id
                            
                            // Update documents table with updated_by and updated_at
                            if (documentId && userId) {
                                const { error: docErr } = await supabase
                                    .from('documents')
                                    .update({
                                        updated_by: userId,
                                        updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                            }

                            // Update document_fields with general info
                            // Delete existing keys first to avoid unique constraint
                            {
                                const keys = ['port_of_loading','port_of_discharge','eta','supplier_shipper','container_no','container_size_type','vessel_status','bl_number','shipping_lines','consignee']
                                const { error: delFieldsErr } = await supabase
                                    .from('document_fields')
                                    .delete()
                                    .eq('document_id', documentId)
                                    .in('canonical_key', keys)
                                if (delFieldsErr) throw delFieldsErr
                            }
                            
                            {
                                const fieldRows = []
                                const pushText = (key, val) => { if (val !== undefined && val !== null && String(val) !== '') fieldRows.push({ canonical_key: key, raw_value: String(val) }) }

                                pushText('port_of_loading', values.port_of_loading)
                                pushText('port_of_discharge', values.port_of_discharge)
                                pushText('eta', values.eta)
                                pushText('supplier_shipper', values.supplier_shipper)
                                pushText('container_no', values.container_no)
                                pushText('container_size_type', values.container_size_type)
                                pushText('vessel_status', values.vessel_status)
                                pushText('bl_number', values.bl_number)
                                pushText('shipping_lines', values.shipping_lines)
                                pushText('consignee', values.consignee)

                                if (fieldRows.length) {
                                    await insertDocumentFields(documentId, fieldRows)
                                }
                            }

                            // Update document_items (combined product items)
                            if (values.items && values.items.length) {
                                // Delete existing items
                                const { error: deleteErr } = await supabase
                                    .from('document_items')
                                    .delete()
                                    .eq('document_id', documentId)
                                if (deleteErr) throw deleteErr

                                // Insert new items
                                const itemRows = values.items
                                    .filter(item => item.product || item.pcsBox || item.quantityPieces || item.quantityCarton || item.unitPrice || item.totalAmount || item.netWeight || item.grossWeight || item.measurement)
                                    .map((item, idx) => ({
                                        document_id: documentId,
                                        line_no: idx + 1,
                                        product: item.product || null,
                                        pcs_box: item.pcsBox ? Number(item.pcsBox) : null,
                                        quantity_pieces: item.quantityPieces ? Number(item.quantityPieces) : null,
                                        quantity_carton: item.quantityCarton ? Number(item.quantityCarton) : null,
                                        unit_price: item.unitPrice ? Number(item.unitPrice) : null,
                                        total_amount: item.totalAmount ? Number(item.totalAmount) : null,
                                        net_weight: item.netWeight ? Number(item.netWeight) : null,
                                        gross_weight: item.grossWeight ? Number(item.grossWeight) : null,
                                        measurement: item.measurement || null
                                    }))

                                if (itemRows.length) {
                                    const { error: itemsErr } = await supabase
                                        .from('document_items')
                                        .insert(itemRows)
                                    if (itemsErr) throw itemsErr
                                }
                            }

                            // Update local state
                            setProDocumentList(prev => prev.map(pro => {
                                if (pro.proNo !== proNo) return pro
                                return {
                                    ...pro,
                                    documents: pro.documents.map(doc => {
                                        if (doc.documentId !== documentId) return doc
                                        return {
                                            ...doc,
                                            data: [
                                                { label: 'Port Of Loading', info: values.port_of_loading },
                                                { label: 'Port Of Discharge', info: values.port_of_discharge },
                                                { label: 'ETA', info: values.eta },
                                                { label: 'Supplier/Shipper', info: values.supplier_shipper },
                                                { label: 'Container No.', info: values.container_no },
                                                { label: 'Size and Type of Container', info: values.container_size_type },
                                                { label: 'Vessel Status', info: values.vessel_status },
                                                { label: 'B/L No.', info: values.bl_number },
                                                { label: 'Shipping Lines', info: values.shipping_lines },
                                                { label: 'Consignee', info: values.consignee }
                                            ],
                                            fieldValues: {
                                                ...doc.fieldValues,
                                                port_of_loading: values.port_of_loading,
                                                port_of_discharge: values.port_of_discharge,
                                                eta: values.eta,
                                                supplier_shipper: values.supplier_shipper,
                                                container_no: values.container_no,
                                                container_size_type: values.container_size_type,
                                                vessel_status: values.vessel_status,
                                                bl_number: values.bl_number,
                                                shipping_lines: values.shipping_lines,
                                                consignee: values.consignee,
                                                updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })(),
                                                updated_by: userId
                                            },
                                            items: values.items || []
                                        }
                                    })
                                }
                            }))

                            setShowOverlay(false)
                            onSaved()
                        } catch (err) {
                            console.error('[General Information Save Error]', err)
                            setSaveError(err?.message || 'Save failed')
                        } finally {
                            setSaving(false)
                        }
                    }}
                />
            )}

            {showOverlay && type === 'Remarks' && (
                <RemarksEditOverlay
                    title={type}
                    initialValues={{
                        uploaded_at: uploadedAt
                    }}
                    initialRemarks={items || []}
                    updatedAt={updatedAt}
                    updatedBy={updatedByName}
                    uploadedBy={uploadedByName}
                    onClose={() => setShowOverlay(false)}
                    onSubmit={async (values) => {
                        setSaveError(''); setSaving(true)
                        try {
                            // Get current user
                            const { data: sess } = await supabase.auth.getSession()
                            const userId = sess?.session?.user?.id
                            
                            // Update documents table with updated_by and updated_at
                            if (documentId && userId) {
                                const { error: docErr } = await supabase
                                    .from('documents')
                                    .update({
                                        updated_by: userId,
                                        updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                            }

                            // Update document_items (remarks entries)
                            if (values.remarks && values.remarks.length) {
                                // Delete existing items
                                const { error: deleteErr } = await supabase
                                    .from('document_items')
                                    .delete()
                                    .eq('document_id', documentId)
                                if (deleteErr) throw deleteErr

                                // Insert new remarks
                                const remarkRows = values.remarks
                                    .filter(remark => remark.date || remark.notes)
                                    .map((remark, idx) => ({
                                        document_id: documentId,
                                        line_no: idx + 1,
                                        remark_date: remark.date || null,
                                        remark_notes: remark.notes || null
                                    }))

                                if (remarkRows.length) {
                                    const { error: itemsErr } = await supabase
                                        .from('document_items')
                                        .insert(remarkRows)
                                    if (itemsErr) throw itemsErr
                                }
                            }

                            // Update local state
                            setProDocumentList(prev => prev.map(pro => {
                                if (pro.proNo !== proNo) return pro
                                return {
                                    ...pro,
                                    documents: pro.documents.map(doc => {
                                        if (doc.documentId !== documentId) return doc
                                        return {
                                            ...doc,
                                            fieldValues: {
                                                ...doc.fieldValues,
                                                updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })(),
                                                updated_by: userId
                                            },
                                            items: values.remarks || []
                                        }
                                    })
                                }
                            }))

                            setShowOverlay(false)
                            onSaved()
                        } catch (err) {
                            console.error('[Remarks Save Error]', err)
                            setSaveError(err?.message || 'Save failed')
                        } finally {
                            setSaving(false)
                        }
                    }}
                />
            )}

            {showOverlay && type === 'Packing List' && (
                <PackingListEditOverlay
                    title={type}
                    fileUrl={previewUrl || null}
                    fileName={previewName || null}
                    initialValues={{
                        total_quantity: fieldValues?.total_quantity || '',
                        total_net_weight: fieldValues?.total_net_weight || '',
                        total_gross_weight: fieldValues?.total_gross_weight || '',
                        uploaded_at: uploadedAt
                    }}
                    initialItems={items || []}
                    updatedAt={updatedAt}
                    updatedBy={updatedByName}
                    uploadedBy={uploadedByName}
                    onClose={() => setShowOverlay(false)}
                    onSubmit={async (values) => {
                        setSaveError(''); setSaving(true)
                        try {
                            // Get current user
                            const { data: sess } = await supabase.auth.getSession()
                            const userId = sess?.session?.user?.id
                            
                            // Update documents table with updated_by and updated_at
                            if (documentId && userId) {
                                const { error: docErr } = await supabase
                                    .from('documents')
                                    .update({
                                        updated_by: userId,
                                        updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                                
                                // Log the update action to actions_log
                                await logDocumentAction({
                                    userId: userId,
                                    action: "document_data_updated",
                                    documentId: documentId,
                                    proNumber: proNo,
                                    department: "shipment",
                                    documentType: documentType,
                                });
                            }

                            // Update document_fields with totals
                            // Delete existing keys first to avoid unique constraint
                            {
                                const keys = ['total_quantity','total_net_weight','total_gross_weight']
                                const { error: delFieldsErr } = await supabase
                                    .from('document_fields')
                                    .delete()
                                    .eq('document_id', documentId)
                                    .in('canonical_key', keys)
                                if (delFieldsErr) throw delFieldsErr
                            }
                            
                            {
                                const fieldRows = []
                                const pushNumber = (key, val) => { 
                                    const cleaned = val.toString().replace(/,/g, '')
                                    const n = Number(cleaned)
                                    console.log(`[PackingList Edit] ${key}:`, {
                                        original: val,
                                        cleaned: cleaned,
                                        number: n,
                                        isFinite: Number.isFinite(n)
                                    })
                                    if (Number.isFinite(n)) fieldRows.push({ canonical_key: key, value_number: n }) 
                                }

                                console.log('[PackingList Edit] Processing totals:', {
                                    total_quantity: values.total_quantity,
                                    total_net_weight: values.total_net_weight,
                                    total_gross_weight: values.total_gross_weight
                                })

                                pushNumber('total_quantity', values.total_quantity)
                                pushNumber('total_net_weight', values.total_net_weight)
                                pushNumber('total_gross_weight', values.total_gross_weight)

                                if (fieldRows.length) {
                                    await insertDocumentFields(documentId, fieldRows)
                                }
                            }

                            // Update document_items (line items)
                            if (values.items && values.items.length) {
                                // Delete existing items
                                const { error: deleteErr } = await supabase
                                    .from('document_items')
                                    .delete()
                                    .eq('document_id', documentId)
                                if (deleteErr) throw deleteErr

                                // Insert new items
                                console.log('[PackingList Edit] Processing line items:', values.items)
                                
                                const itemRows = values.items
                                    .filter(item => item.product || item.quantity || item.netWeight || item.grossWeight)
                                    .map((item, idx) => {
                                        const processedItem = {
                                            document_id: documentId,
                                            line_no: idx + 1,
                                            product: item.product || null,
                                            quantity: item.quantity ? Number(item.quantity.toString().replace(/,/g, '')) : null,
                                            net_weight: item.netWeight ? Number(item.netWeight.toString().replace(/,/g, '')) : null,
                                            gross_weight: item.grossWeight ? Number(item.grossWeight.toString().replace(/,/g, '')) : null
                                        }
                                        
                                        console.log(`[PackingList Edit] Line ${idx + 1}:`, {
                                            original: {
                                                product: item.product,
                                                quantity: item.quantity,
                                                netWeight: item.netWeight,
                                                grossWeight: item.grossWeight
                                            },
                                            processed: {
                                                product: processedItem.product,
                                                quantity: processedItem.quantity,
                                                net_weight: processedItem.net_weight,
                                                gross_weight: processedItem.gross_weight
                                            }
                                        })
                                        
                                        return processedItem
                                    })

                                if (itemRows.length) {
                                    console.log('[PackingList Edit] Final data being sent to Supabase:', {
                                        document_items: itemRows
                                    })
                                    
                                    const { error: itemsErr } = await supabase
                                        .from('document_items')
                                        .insert(itemRows)
                                    if (itemsErr) throw itemsErr
                                }
                            }

                            // Update local state
                            setProDocumentList(prev => prev.map(pro => {
                                if (pro.proNo !== proNo) return pro
                                return {
                                    ...pro,
                                    documents: pro.documents.map(doc => {
                                        if (doc.documentId !== documentId) return doc
                                        return {
                                            ...doc,
                                            data: [
                                                { label: 'Total Quantity', info: values.total_quantity },
                                                { label: 'Total Net Weight', info: values.total_net_weight },
                                                { label: 'Total Gross Weight', info: values.total_gross_weight }
                                            ],
                                            fieldValues: {
                                                ...doc.fieldValues,
                                                total_quantity: values.total_quantity,
                                                total_net_weight: values.total_net_weight,
                                                total_gross_weight: values.total_gross_weight,
                                                updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })(),
                                                updated_by: userId
                                            },
                                            items: values.items || []
                                        }
                                    })
                                }
                            }))

                            setShowOverlay(false)
                            onSaved()
                        } catch (err) {
                            console.error('[Packing List Save Error]', err)
                            setSaveError(err?.message || 'Save failed')
                        } finally {
                            setSaving(false)
                        }
                    }}
                />
            )}

            {showOverlay && type === 'Delivery Order' && (
                <DeliveryOrderEditOverlay
                    title={type}
                    fileUrl={previewUrl || null}
                    fileName={previewName || null}
                    initialValues={(() => {
                        console.log('[Document.js] Passing fieldValues to DeliveryOrderEditOverlay:', fieldValues)
                        console.log('[Document.js] fieldValues.container_seal_pairs:', fieldValues?.container_seal_pairs)
                        console.log('[Document.js] Using dbFieldValues instead:', dbFieldValues)
                        console.log('[Document.js] dbFieldValues.container_seal_pairs:', dbFieldValues?.container_seal_pairs)
                        return dbFieldValues || {}
                    })()}
                    updatedAt={updatedAt}
                    updatedBy={updatedByName}
                    uploadedBy={uploadedByName}
                    documentId={documentId}
                    proNumber={proNo}
                    onClose={() => setShowOverlay(false)}
                    onSubmit={async (values, pairs) => {
                        setSaveError(''); setSaving(true)
                        try {
                            // Get current user
                            const { data: sess } = await supabase.auth.getSession()
                            const userId = sess?.session?.user?.id

                            if (!userId) {
                                throw new Error('User not authenticated')
                            }

                            // Update document_fields with delivery order fields
                            // Delete existing keys first to avoid unique constraint
                            {
                                const keys = ['pickup_location', 'empty_return_location', 'registry_number', 'detention_free_time_end', 'container_seal_pairs']
                                const { error: delFieldsErr } = await supabase
                                    .from('document_fields')
                                    .delete()
                                    .eq('document_id', documentId)
                                    .in('canonical_key', keys)
                                if (delFieldsErr) throw delFieldsErr
                            }
                            
                            const fieldRows = []
                            const pushText = (key, val) => {
                                if (val !== undefined && val !== null && String(val).trim() !== '') {
                                    fieldRows.push({ canonical_key: key, raw_value: String(val) })
                                }
                            }
                            
                            pushText('pickup_location', values.pickup_location)
                            pushText('empty_return_location', values.empty_return_location)
                            pushText('registry_number', values.registry_number)
                            pushText('detention_free_time_end', values.detention_free_time_end)
                            
                            // Container/Seal pairs as JSON
                            if (pairs && pairs.length > 0) {
                                const validPairs = pairs.filter(p => p.containerNo.trim() || p.sealNo.trim())
                                if (validPairs.length > 0) {
                                    fieldRows.push({ 
                                        canonical_key: 'container_seal_pairs', 
                                        raw_value: JSON.stringify(validPairs) 
                                    })
                                }
                            }

                            // Update document fields
                            if (fieldRows.length) {
                                await insertDocumentFields(documentId, fieldRows)
                            }

                            // Update document timestamp
                            await supabase
                                .from('documents')
                                .update({ 
                                    updated_at: new Date().toISOString(),
                                    updated_by: userId
                                })
                                .eq('id', documentId)
                                
                            // Log the update action to actions_log
                            await logDocumentAction({
                                userId: userId,
                                action: "document_data_updated",
                                documentId: documentId,
                                proNumber: proNo,
                                department: "shipment",
                                documentType: documentType,
                            });

                            // Update local state
                            const updatedFieldValues = { ...fieldValues }
                            fieldRows.forEach(field => {
                                if (field.canonical_key === 'container_seal_pairs') {
                                    // Parse JSON for container_seal_pairs
                                    try {
                                        updatedFieldValues[field.canonical_key] = JSON.parse(field.raw_value)
                                    } catch (e) {
                                        updatedFieldValues[field.canonical_key] = []
                                    }
                                } else {
                                    updatedFieldValues[field.canonical_key] = field.raw_value
                                }
                            })
                            
                            const updatedProList = proDocumentList.map(pro => {
                                if (pro.proNo === proNo) {
                                    return {
                                        ...pro,
                                        documents: pro.documents.map(doc => {
                                            if (doc.documentType === 'delivery_order') {
                                                return {
                                                    ...doc,
                                                    fieldValues: updatedFieldValues
                                                }
                                            }
                                            return doc
                                        })
                                    }
                                }
                                return pro
                            })
                            setProDocumentList(updatedProList)

                            setShowOverlay(false)
                            onSaved()
                        } catch (err) {
                            console.error('[Delivery Order Save Error]', err)
                            setSaveError(err?.message || 'Save failed')
                        } finally {
                            setSaving(false)
                        }
                    }}
                />
            )}

            {showOverlay && type !== 'Invoice' && type !== 'Bill of Lading' && type !== 'Packing List' && type !== 'Delivery Order' && type !== 'General Information' && type !== 'Remarks' && (
                <DocumentEditOverlay
                    title={type}
                    fileUrl={previewUrl || null}
                    fileName={previewName || null}
                    updatedAt={updatedAt}
                    updatedBy={updatedByName}
                    uploadedBy={uploadedByName}
                    onClose={() => setShowOverlay(false)}
                    onSubmit={async (values, pairs) => {
                        setSaveError(''); setSaving(true)
                        try {
                            // Get current user
                            const { data: sess } = await supabase.auth.getSession()
                            const userId = sess?.session?.user?.id
                            
                            // Update documents table with updated_by and updated_at
                            if (documentId && userId) {
                                const { error: docErr } = await supabase
                                    .from('documents')
                                    .update({
                                        updated_by: userId,
                                        updated_at: (() => {
                                            // Use current local time directly (no UTC conversion)
                                            const now = new Date()
                                            // Create proper local time string (YYYY-MM-DDTHH:mm:ss.sss)
                                            const year = now.getFullYear()
                                            const month = String(now.getMonth() + 1).padStart(2, '0')
                                            const day = String(now.getDate()).padStart(2, '0')
                                            const hours = String(now.getHours()).padStart(2, '0')
                                            const minutes = String(now.getMinutes()).padStart(2, '0')
                                            const seconds = String(now.getSeconds()).padStart(2, '0')
                                            const milliseconds = String(now.getMilliseconds()).padStart(3, '0')
                                            const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`
                                            return localTimeString
                                        })()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                            }
                            
                            // Build upserts by deleting and reinserting current fields for simplicity (admin policy allows it)
                            // In future, switch to precise updates.
                            const del = await supabase
                              .from('document_fields')
                              .delete()
                              .eq('document_id', documentId)
                            if (del.error) throw del.error

                            const rows = []
                            const pushText = (key, val) => { if (val !== undefined && val !== null && String(val) !== '') rows.push({ canonical_key: key, raw_value: String(val) }) }
                            const pushNumber = (key, val) => { 
                                const cleaned = val.toString().replace(/,/g, '')
                                const n = Number(cleaned)
                                if (Number.isFinite(n)) rows.push({ canonical_key: key, value_number: n }) 
                            }
                            pushText('bl_number', values.bl_number)
                            pushText('shipper', values.shipper)
                            pushText('consignee', values.consignee)
                            pushText('shipping_line', values.shipping_line)
                            pushText('vessel_name', values.vessel_name)
                            pushText('voyage_no', values.voyage_no)
                            pushText('eta', values.eta)
                            pushText('port_of_loading', values.port_of_loading)
                            pushText('port_of_discharge', values.port_of_discharge)
                            // Auto-derive place_of_delivery from consignee if empty
                            const derivePlaceOfDelivery = (text) => {
                              if (!text) return ''
                              const t = String(text).toUpperCase()
                              if (t.includes('SUBIC')) return 'SUBIC'
                              if (t.includes('CLARK')) return 'CLARK'
                              return 'MANILA'
                            }
                            const podValue = values.place_of_delivery || derivePlaceOfDelivery(values.consignee)
                            pushText('place_of_delivery', podValue)
                            if (Array.isArray(pairs)) {
                              const cleaned = pairs.map(p => ({ containerNo: (p.left || '').toString(), sealNo: (p.right || '').toString() }))
                              const nonEmpty = cleaned.filter(p => p.containerNo || p.sealNo)
                              const json = JSON.stringify(nonEmpty)
                              rows.push({ canonical_key: 'container_seal_pairs', raw_value: json })
                            }
                            pushText('container_specs', values.container_specs)
                            pushNumber('no_of_packages', values.no_of_packages)
                            pushText('packaging_kind', values.packaging_kind)
                            pushText('goods_classification', values.goods_classification)
                            pushText('description_of_goods', values.description_of_goods)
                            pushNumber('gross_weight', values.gross_weight)
                            await insertDocumentFields(documentId, rows)
                            setShowOverlay(false)
                            onSaved()
                        } catch (e) {
                            setSaveError(e?.message || 'Save failed')
                        } finally {
                            setSaving(false)
                        }
                    }}
                    fields={[
                        { key: 'bl_number', label: 'B/L No.', type: 'text' },
                        { key: 'shipper', label: 'Shipper', type: 'textarea' },
                        { key: 'consignee', label: 'Consignee', type: 'textarea' },
                        { key: 'shipping_line', label: 'Shipping Line', type: 'text' },
                        { key: 'vessel_name', label: 'Vessel Name', type: 'text' },
                        { key: 'voyage_no', label: 'Voyage No.', type: 'text' },
                        { key: 'port_of_loading', label: 'Port of Loading', type: 'text' },
                        { key: 'port_of_discharge', label: 'Port of Discharge', type: 'text' },
                        { key: 'place_of_delivery', label: 'Place of Delivery', type: 'text' },
                        { key: 'container_specs', label: 'Container Specs', type: 'text' },
                        { key: 'no_of_packages', label: 'No. of Packages', type: 'number' },
                        { key: 'packaging_kind', label: 'Packaging Kind', type: 'text' },
                        { key: 'goods_classification', label: 'Goods Classification', type: 'text' },
                        { key: 'description_of_goods', label: 'Description of Goods', type: 'textarea' },
                        { key: 'gross_weight', label: 'Gross Weight (KGS)', type: 'number' },
                    ]}
                    dynamicPairs={{ key: 'container_seal_pairs', labelLeft: 'Container No.', labelRight: 'Seal No.', entries: Array.isArray(fieldValues?.container_seal_pairs) && fieldValues.container_seal_pairs.length ? fieldValues.container_seal_pairs.map(p => ({ left: p.containerNo || '', right: p.sealNo || '' })) : [{ left: '', right: '' }] }}
                    insertPairsAfterKey={'place_of_delivery'}
                    initialValues={fieldValues || {}}
                    derivePlaceFromConsignee
                />
            )}

            {saveError && <div style={{ color: 'crimson', marginTop: 8 }}>{saveError}</div>}
            {saving && <div style={{ color: '#666', marginTop: 8 }}>Saving…</div>}

            {/* Delete Confirmation Mini-Overlay */}
            {showDeleteConfirm && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowDeleteConfirm(false)}>
                    <div style={{
                        background: '#fff',
                        padding: '24px',
                        borderRadius: '8px',
                        maxWidth: '400px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, marginBottom: '16px', color: '#991b1b' }}>
                            Delete {type}?
                        </h3>
                        <p style={{ marginBottom: '24px', color: '#666' }}>
                            This will permanently delete the document file and all associated data. This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button 
                                className="edit-button"
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                style={{ background: '#f3f4f6', color: '#374151' }}
                            >
                                Cancel
                            </button>
                            <button 
                                className="delete-button"
                                onClick={async () => {
                                    setDeleting(true)
                                    setDeleteError('')
                                    try {
                                        // 1. Delete file from storage
                                        if (filePath) {
                                            const { error: storageErr } = await supabase.storage
                                                .from('documents')
                                                .remove([filePath])
                                            if (storageErr) throw storageErr
                                        }

                                        // 2. Delete document from database (cascades to fields and items)
                                        if (documentId) {
                                            const { error: dbErr } = await supabase
                                                .from('documents')
                                                .delete()
                                                .eq('id', documentId)
                                            if (dbErr) throw dbErr
                                            
                                            // Log the deletion action
                                            const { data: sess } = await supabase.auth.getSession()
                                            const userId = sess?.session?.user?.id
                                            if (userId && documentId) {
                                                await logDocumentAction({
                                                    userId: userId,
                                                    action: "document_deleted",
                                                    documentId: documentId,
                                                    proNumber: proNo,
                                                    department: "shipment",
                                                    documentType: documentType,
                                                });
                                            }
                                        }

                                        // 3. Update local state (remove from proDocumentList)
                                        const updatedList = proDocumentList.map(pro => {
                                            if (pro.proNo !== proNo) return pro
                                            return {
                                                ...pro,
                                                documents: pro.documents.filter(doc => doc.type !== type)
                                            }
                                        })
                                        setProDocumentList(updatedList)
                                        
                                        setShowDeleteConfirm(false)
                                        onSaved() // Trigger refresh
                                    } catch (e) {
                                        console.error('[Delete Error]', e)
                                        setDeleteError(e?.message || 'Delete failed')
                                        setShowDeleteConfirm(false)
                                    } finally {
                                        setDeleting(false)
                                    }
                                }}
                                disabled={deleting}
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Document;
