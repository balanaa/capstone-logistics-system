import React, { useState } from 'react';
import './Document.css'

import { getSignedDocumentUrl } from '../services/supabase/documents'
import DocumentEditOverlay from './overlays/DocumentEditOverlay'
import InvoiceEditOverlay from './overlays/InvoiceEditOverlay'
import BolEditOverlay from './overlays/BolEditOverlay'
import PackingListEditOverlay from './overlays/PackingListEditOverlay'
import GeneralInfoEditOverlay from './overlays/GeneralInfoEditOverlay'
import RemarksEditOverlay from './overlays/RemarksEditOverlay'
import { supabase } from '../services/supabase/client'
import { insertDocumentFields } from '../services/supabase/documents'
import { formatNumber } from '../utils/numberUtils'

const Document = ({ type, data, items, style, proNo, setProDocumentList, proDocumentList, filePath, documentId, documentType, fieldValues, onSaved = () => {} }) => {
    // Extract totals for invoice (if present in fieldValues)
    const totalQuantity = fieldValues?.total_quantity ?? null
    const totalAmount = fieldValues?.total_amount ?? null
    const [showOverlay, setShowOverlay] = useState(false);
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
                            {items.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.product}</td>
                                    <td>{row.quantity}</td>
                                    <td>{formatNumber(row.unitPrice)}</td>
                                    <td>{formatNumber(row.amount)}</td>
                                </tr>
                            ))}
                            {/* Totals row */}
                            {(totalQuantity !== null || totalAmount !== null) && (
                                <tr style={{ borderTop: '2px solid #333', fontWeight: 700 }}>
                                    <td style={{ fontWeight: 700 }}>Totals</td>
                                    <td style={{ fontWeight: 700 }}>{totalQuantity ?? ''}</td>
                                    <td></td>
                                    <td style={{ fontWeight: 700 }}>{formatNumber(totalAmount)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
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
                            {items.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.product}</td>
                                    <td>{row.quantity}</td>
                                    <td>{formatNumber(row.netWeight)}</td>
                                    <td>{formatNumber(row.grossWeight)}</td>
                                </tr>
                            ))}
                            {/* Totals row */}
                            {(totalQuantityPL !== null || totalNetWeight !== null || totalGrossWeight !== null) && (
                                <tr style={{ borderTop: '2px solid #333', fontWeight: 700 }}>
                                    <td style={{ fontWeight: 700 }}>Totals</td>
                                    <td style={{ fontWeight: 700 }}>{totalQuantityPL ?? ''}</td>
                                    <td style={{ fontWeight: 700 }}>{formatNumber(totalNetWeight)}</td>
                                    <td style={{ fontWeight: 700 }}>{formatNumber(totalGrossWeight)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            );
        }

        if (type === 'General Information') {
            return (
                <div className="line-items">
                    <table className="line-items-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th>Pcs/Box</th>
                                <th>Quantity Pieces</th>
                                <th>Quantity Carton</th>
                                <th>Unit Price</th>
                                <th>Total Amount</th>
                                <th>Net Weight</th>
                                <th>Gross Weight</th>
                                <th>Measurement</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.product}</td>
                                    <td>{row.pcsBox}</td>
                                    <td>{row.quantityPieces}</td>
                                    <td>{row.quantityCarton}</td>
                                    <td>{formatNumber(row.unitPrice)}</td>
                                    <td>{formatNumber(row.totalAmount)}</td>
                                    <td>{formatNumber(row.netWeight)}</td>
                                    <td>{formatNumber(row.grossWeight)}</td>
                                    <td>{row.measurement}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                            {items.map((row, idx) => (
                                <tr key={idx}>
                                    <td>{row.date}</td>
                                    <td>{row.notes}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        }

        return null;
    };

    // Ensure container/seal pairs render as data rows if not already present
    let computedData = Array.isArray(data) ? data.slice() : []
    const hasPairRows = computedData.some(r => r && r.label === 'Container No. / Seal No.')
    if (!hasPairRows && Array.isArray(fieldValues?.container_seal_pairs)) {
        for (const p of fieldValues.container_seal_pairs) {
            const c = (p?.containerNo || '').toString()
            const s = (p?.sealNo || '').toString()
            computedData.push({ label: 'Container No. / Seal No.', info: [c, s].filter(Boolean).join(' / ') })
        }
    }

    return (
        <div className="document-container" style={{ backgroundColor: style.bgColor }}>
            <h3 className="document-name">{type}</h3>
            <div className="grid" style={{ columnCount: style.columns, columnWidth: style.columnWidth }}>
                {computedData.map((field, index) => (
                    <div key={index} className="info-block">
                        <div className="label">{field.label}:</div>
                        <div className="info">{field.info ?? '--'}</div>
                    </div>
                ))}
            </div>

            {renderLineItemsTable()}

            <div className="button-row">
                {filePath && (
                    <button className="edit-button" onClick={async () => {
                        setDownloadError('')
                        setDownloading(true)
                        try {
                            const url = await getSignedDocumentUrl(filePath, 600)
                            // Force download without navigating away
                            const link = document.createElement('a')
                            link.href = url
                            link.setAttribute('download', filePath.split('/').pop() || 'document')
                            link.setAttribute('target', '_blank')
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                        } catch (e) {
                            setDownloadError(e?.message || 'Download failed')
                        } finally {
                            setDownloading(false)
                        }
                    }}>
                        <i className="fi fi-rs-download" style={{ marginRight: '8px' }}></i>
                        {downloading ? 'Downloading…' : 'Download File'}
                    </button>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="edit-button" onClick={async () => {
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
                    }}>
                        <i className="fi fi-rs-pencil" style={{ marginRight: '8px' }}></i>
                        Edit {type}
                    </button>
                    <button className="delete-button" onClick={() => setShowDeleteConfirm(true)}>
                        <i className="fi fi-rs-trash" style={{ marginRight: '8px' }}></i>
                        Delete {type}
                    </button>
                </div>
            </div>

            {downloadError && <div style={{ color: 'crimson', marginTop: 8 }}>{downloadError}</div>}
            {deleteError && <div style={{ color: 'crimson', marginTop: 8 }}>{deleteError}</div>}

            {showOverlay && type === 'Invoice' && (
                <InvoiceEditOverlay
                    title={type}
                    fileUrl={previewUrl || null}
                    fileName={previewName || null}
                    initialValues={{
                        invoice_no: fieldValues?.invoice_no || data.find(d => d.label === 'Invoice No.')?.info || '',
                        invoice_date: fieldValues?.invoice_date || data.find(d => d.label === 'Invoice Date')?.info || '',
                        incoterms: fieldValues?.incoterms || data.find(d => d.label === 'Incoterms')?.info || '',
                        invoice_currency: fieldValues?.invoice_currency || data.find(d => d.label === 'Currency')?.info || 'USD',
                        total_quantity: fieldValues?.total_quantity || data.find(d => d.label === 'Total Quantity')?.info || '',
                        total_amount: fieldValues?.total_amount || data.find(d => d.label === 'Total Amount')?.info || '',
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
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                            }
                            
                            // Update document_fields with totals
                            const fieldRows = []
                            const pushText = (key, val) => { if (val !== undefined && val !== null && String(val) !== '') fieldRows.push({ canonical_key: key, raw_value: String(val) }) }
                            const pushNumber = (key, val) => { const n = Number(val); if (Number.isFinite(n)) fieldRows.push({ canonical_key: key, value_number: n }) }
                            
                            pushText('invoice_no', values.invoice_no)
                            pushText('invoice_date', values.invoice_date)
                            pushText('incoterms', values.incoterms)
                            pushText('invoice_currency', values.invoice_currency)
                            pushNumber('total_quantity', values.total_quantity)
                            pushNumber('total_amount', values.total_amount)
                            
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
                                                updated_at: new Date().toISOString(),
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
                    initialValues={fieldValues || {}}
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
                                        updated_at: new Date().toISOString()
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
                            const pushNumber = (key, val) => { const n = Number(val); if (Number.isFinite(n)) rows.push({ canonical_key: key, value_number: n }) }
                            pushText('bl_number', values.bl_number)
                            pushText('shipper', values.shipper)
                            pushText('consignee', values.consignee)
                            pushText('shipping_line', values.shipping_line)
                            pushText('vessel_name', values.vessel_name)
                            pushText('voyage_no', values.voyage_no)
                            pushText('port_of_loading', values.port_of_loading)
                            pushText('port_of_discharge', values.port_of_discharge)
                            pushText('place_of_delivery', values.place_of_delivery)
                            
                            // Container/Seal pairs as JSON
                            if (Array.isArray(pairs)) {
                              const cleaned = pairs.map(p => ({ containerNo: (p.containerNo || '').toString(), sealNo: (p.sealNo || '').toString() }))
                              const nonEmpty = cleaned.filter(p => p.containerNo || p.sealNo)
                              if (nonEmpty.length) {
                                rows.push({ canonical_key: 'container_seal_pairs', raw_value: JSON.stringify(nonEmpty) })
                              }
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
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                            }

                            // Update document_fields with general info
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
                                                updated_at: new Date().toISOString(),
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
                                        updated_at: new Date().toISOString()
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
                                                updated_at: new Date().toISOString(),
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
                                        updated_at: new Date().toISOString()
                                    })
                                    .eq('id', documentId)
                                if (docErr) throw docErr
                            }

                            // Update document_fields with totals
                            const fieldRows = []
                            const pushNumber = (key, val) => { const n = Number(val); if (Number.isFinite(n)) fieldRows.push({ canonical_key: key, value_number: n }) }
                            
                            pushNumber('total_quantity', values.total_quantity)
                            pushNumber('total_net_weight', values.total_net_weight)
                            pushNumber('total_gross_weight', values.total_gross_weight)
                            
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
                                    .filter(item => item.product || item.quantity || item.netWeight || item.grossWeight)
                                    .map((item, idx) => ({
                                        document_id: documentId,
                                        line_no: idx + 1,
                                        product: item.product || null,
                                        quantity: item.quantity ? Number(item.quantity) : null,
                                        net_weight: item.netWeight ? Number(item.netWeight) : null,
                                        gross_weight: item.grossWeight ? Number(item.grossWeight) : null
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
                                                { label: 'Total Quantity', info: values.total_quantity },
                                                { label: 'Total Net Weight', info: values.total_net_weight },
                                                { label: 'Total Gross Weight', info: values.total_gross_weight }
                                            ],
                                            fieldValues: {
                                                ...doc.fieldValues,
                                                total_quantity: values.total_quantity,
                                                total_net_weight: values.total_net_weight,
                                                total_gross_weight: values.total_gross_weight,
                                                updated_at: new Date().toISOString(),
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

            {showOverlay && type !== 'Invoice' && type !== 'Bill of Lading' && type !== 'Packing List' && type !== 'General Information' && type !== 'Remarks' && (
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
                                        updated_at: new Date().toISOString()
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
                            const pushNumber = (key, val) => { const n = Number(val); if (Number.isFinite(n)) rows.push({ canonical_key: key, value_number: n }) }
                            pushText('bl_number', values.bl_number)
                            pushText('shipper', values.shipper)
                            pushText('consignee', values.consignee)
                            pushText('shipping_line', values.shipping_line)
                            pushText('vessel_name', values.vessel_name)
                            pushText('voyage_no', values.voyage_no)
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
