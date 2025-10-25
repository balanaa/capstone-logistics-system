import React, { useState } from 'react';
import { departmentDocuments, documentStyles } from '../data';
import Document from './Document';
import UploadDocumentOverlay from './overlays/UploadDocumentOverlay';
import InvoiceUploadAndEditOverlay from './overlays/InvoiceUploadAndEditOverlay';
import PackingListUploadAndEditOverlay from './overlays/PackingListUploadAndEditOverlay';
import BolUploadAndEditOverlay from './overlays/BolUploadAndEditOverlay';
import DeliveryOrderUploadAndEditOverlay from './overlays/DeliveryOrderUploadAndEditOverlay';
import { supabase } from '../services/supabase/client';
import { upsertPro, insertDocument } from '../services/supabase/documents';
import './OverlayForm.css';
import RemarksWindow from './RemarksWindow';

const Department = ({ name, proNo, proDocumentList, setProDocumentList, onRefresh = () => {} }) => {
    const documentTypes = departmentDocuments[name]; // Get document types for the selected department
    const proData = proDocumentList.find(pro => pro.proNo === proNo); // Find the selected PRO data
    
    const [uploadingType, setUploadingType] = useState(null);
    const [uploadOverlayOpen, setUploadOverlayOpen] = useState(false);

    // Derive and render special General Info window (always top, no ghost)
    const renderGeneralInfo = () => {
        if (!proData) return null
        const bol = (proData.documents || []).find(doc => doc.type === 'Bill of Lading')
        if (!bol) return null // only show after first upload which is B/L

        // Map consignee into one of limited values
        const normalizeConsigneeName = (text) => {
            if (!text) return ''
            const t = String(text).toUpperCase()
            if (t.includes('PUREGOLD')) return 'PUREGOLD'
            if (t.includes('ROBINSON')) return 'ROBINSONS'
            if (t.includes('MOTOSCO') || t.includes('MONTOSCO')) return 'MONTOSCO'
            return ''
        }

        // Helper to read B/L field value by label first, then fieldValues canonical
        const readBol = (labelKey, canonicalKey) => {
            const fromData = bol.data?.find(f => f.label === labelKey)?.info
            if (fromData) return fromData
            return bol.fieldValues?.[canonicalKey]
        }

        // Container numbers joined with comma
        let containerJoined = ''
        if (Array.isArray(bol.fieldValues?.container_seal_pairs)) {
            containerJoined = bol.fieldValues.container_seal_pairs
                .map(p => (p?.containerNo || '').toString())
                .filter(Boolean)
                .join(', ')
        }

        // Join without a visible separator unless both present, then single space
        const containerAndGoods = (() => {
            const a = bol.fieldValues?.container_specs || ''
            const b = bol.fieldValues?.goods_classification || ''
            if (a && b) return `${a} ${b}`
            return a || b || ''
        })()

        const numKindOfPackage = (() => {
            const a = bol.fieldValues?.no_of_packages || ''
            const b = bol.fieldValues?.packaging_kind || ''
            if (a && b) return `${a} ${b}`
            return a || b || ''
        })()

        const orDash = (val) => {
            const s = (val ?? '').toString().trim()
            return s ? s : '--'
        }

        // Get Delivery Order data for Registry Number
        const deliveryOrder = (proData.documents || []).find(doc => doc.type === 'Delivery Order')
        const registryNumber = deliveryOrder?.fieldValues?.registry_number || ''

        // Compose data rows for the grid
        const giData = [
            { label: 'B/L No.', info: orDash(readBol('B/L No.', 'bl_number')) },
            { label: 'Registry No.', info: orDash(registryNumber) },
            { label: 'Consignee', info: orDash(normalizeConsigneeName(readBol('Consignee', 'consignee'))) },
            { label: 'Port of Delivery', info: orDash(readBol('Place of Delivery', 'place_of_delivery')) },
            { label: 'Shipping Lines', info: orDash(readBol('Shipping Line', 'shipping_line')) },
            { label: 'ETA', info: orDash(bol.fieldValues?.eta) },
            { label: 'Container No.', info: orDash(containerJoined) },
            { label: 'Container & Goods Info', info: orDash(containerAndGoods) },
            { label: 'Number and Kind of Package', info: orDash(numKindOfPackage) }
        ]

        // Build combined product rows only when both invoice and packing list exist
        const invoice = (proData.documents || []).find(doc => doc.type === 'Invoice')
        const packing = (proData.documents || []).find(doc => doc.type === 'Packing List')
        let combinedItems = []
        if (invoice && packing) {
            const byName = {}
            ;(packing.items || []).forEach(it => {
                if (!it?.product) return
                const k = String(it.product).trim().toUpperCase()
                byName[k] = byName[k] || { product: it.product }
                byName[k].netWeight = it.netWeight ?? byName[k].netWeight
                byName[k].grossWeight = it.grossWeight ?? byName[k].grossWeight
                byName[k].quantity = it.quantity ?? byName[k].quantity
            })
            ;(invoice.items || []).forEach(it => {
                if (!it?.product) return
                const k = String(it.product).trim().toUpperCase()
                byName[k] = byName[k] || { product: it.product }
                byName[k].quantity = byName[k].quantity ?? it.quantity
                byName[k].unitPrice = it.unitPrice
                byName[k].amount = it.amount
            })
            combinedItems = Object.values(byName)
        }

        // Derive totals
        const totals = combinedItems.length ? {
            totalQuantity: combinedItems.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
            totalAmount: combinedItems.reduce((s, r) => s + (Number(r.amount) || 0), 0),
            totalNet: combinedItems.reduce((s, r) => s + (Number(r.netWeight) || 0), 0),
            totalGross: combinedItems.reduce((s, r) => s + (Number(r.grossWeight) || 0), 0),
        } : null

        const style = { bgColor: 'transparent', columns: 3, columnWidth: '300px', noShadow: true, hideButtons: true }

        return (
            <Document
                key="General Info"
                type="General Info"
                data={giData}
                items={combinedItems}
                style={style}
                proNo={proNo}
                setProDocumentList={setProDocumentList}
                proDocumentList={proDocumentList}
                filePath={null}
                documentId={bol.documentId} // use B/L as backing doc for inline ETA save
                documentType={bol.documentType}
                fieldValues={{ ...bol.fieldValues, __giTotals: totals }}
                onSaved={onRefresh}
            />
        )
    }

    return (
        <div className="department-documents" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {renderGeneralInfo()}
            {/* Inline Remarks window between General Info and B/L */}
            {(() => {
                const hasBL = (proData?.documents || []).some(doc => doc.type === 'Bill of Lading')
                if (!hasBL) return null
                return (
                    <RemarksWindow title="Remarks" bgColor="#D8F4FF" proNo={proNo} onSaved={onRefresh} />
                )
            })()}
            {(documentTypes || []).map((type) => {
                const documentItem = (proData?.documents || []).find(doc => doc.type === type);
                const style = documentStyles.find(ds => ds.type === type) || {};

                if (!documentItem) {
                    if (type === 'General Info') return null; // no ghost for General Info
                    // Ghost window - convert hex to rgba for transparency
                    const hexToRgba = (hex, alpha) => {
                        const r = parseInt(hex.slice(1, 3), 16);
                        const g = parseInt(hex.slice(3, 5), 16);
                        const b = parseInt(hex.slice(5, 7), 16);
                        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
                    };
                    const ghostBg = style?.bgColor ? hexToRgba(style.bgColor, 0.5) : 'transparent';
                    
                    return (
                        <div
                            key={type}
                            className="document-container"
                            style={{
                                backgroundColor: ghostBg,
                                border: '2px dashed #ccc',
                                cursor: 'pointer',
                                minHeight: '120px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0.6,
                                transition: 'opacity 0.2s'
                            }}
                            onClick={() => {
                                setUploadingType(type)
                                setUploadOverlayOpen(true)
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = 1 }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.6 }}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setUploadingType(type); setUploadOverlayOpen(true) } }}
                        >
                            <div style={{ textAlign: 'center', color: '#666' }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{type}</div>
                                <div style={{ marginTop: 8 }}>Click to upload</div>
                            </div>
                        </div>
                    )
                }

                return <Document
                        key={type}
                        type={type}
                        data={documentItem.data}
                        items={documentItem.items}
                        style={style}
                        proNo={proNo}
                        setProDocumentList={setProDocumentList}
                        proDocumentList={proDocumentList}
                        filePath={documentItem.filePath}
                        documentId={documentItem.documentId}
                        documentType={documentItem.documentType}
                        fieldValues={documentItem.fieldValues}
                        onSaved={onRefresh}
                    />
            })}

            {/* Debug logging */}
            {(() => {
                // console.log('Department render - uploadOverlayOpen:', uploadOverlayOpen, 'uploadingType:', uploadingType)
                return null
            })()}
            
            {uploadOverlayOpen && uploadingType === 'Invoice' && (
                <InvoiceUploadAndEditOverlay
                    title="Upload Commercial Invoice"
                    proNumber={proNo}
                    onClose={() => { 
                        setUploadOverlayOpen(false); 
                        setUploadingType(null);
                    }}
                    onSuccess={() => {
                        setUploadOverlayOpen(false)
                        setUploadingType(null)
                        onRefresh()
                    }}
                />
            )}

            {uploadOverlayOpen && uploadingType === 'Packing List' && (
                <PackingListUploadAndEditOverlay
                    title="Upload Packing List"
                    proNumber={proNo}
                    onClose={() => { 
                        setUploadOverlayOpen(false); 
                        setUploadingType(null);
                    }}
                    onSuccess={() => {
                        setUploadOverlayOpen(false)
                        setUploadingType(null)
                        onRefresh()
                    }}
                />
            )}

            {/* Test overlay - always render to see if there's a component issue */}
            {false && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
                    <div style={{ backgroundColor: 'white', padding: '20px', margin: '50px' }}>
                        <h2>Test Overlay</h2>
                        <p>This is a test overlay to check if overlays work at all.</p>
                        <button onClick={() => console.log('Test overlay button clicked')}>Test Button</button>
                    </div>
                </div>
            )}
            
            {uploadOverlayOpen && uploadingType === 'Bill of Lading' && (
                <BolUploadAndEditOverlay
                    proNumber={proNo}
                    onClose={() => { 
                        setUploadOverlayOpen(false); 
                        setUploadingType(null);
                    }}
                    onSubmit={async (file, formData) => {
                        console.log('BOL Upload submitted:', { file, formData })
                        
                        try {
                            // 1) Upload file to storage
                            const d = new Date()
                            const HH = String(d.getHours()).padStart(2, '0')
                            const MM = String(d.getMinutes()).padStart(2, '0')
                            const SS = String(d.getSeconds()).padStart(2, '0')
                            const timeTag = `${HH}${MM}${SS}`
                            const safePro = String(proNo).replace(/[^a-zA-Z0-9._-]/g, '_')
                            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
                            const path = `shipment/${timeTag}-${safePro}-BOL-${safeName}`
                            
                            const { error: upErr } = await supabase.storage
                                .from('documents')
                                .upload(path, file, { upsert: false, contentType: file.type })
                            if (upErr) throw upErr

                            // 2) Upsert PRO
                            await upsertPro(proNo)

                            // 3) Insert document row
                            const { data: sess } = await supabase.auth.getSession()
                            const userId = sess?.session?.user?.id
                            const documentId = await insertDocument({
                                proNumber: proNo,
                                department: 'shipment',
                                documentType: 'bill_of_lading',
                                filePath: path,
                                uploadedBy: userId,
                                actionType: 'document_data_uploaded' // Upload to existing PRO
                            })
                            
                            // 4) Update document with BOL number
                            await supabase
                                .from('documents')
                                .update({ doc_no: formData.blNumber })
                                .eq('id', documentId)

                            // 5) Insert document_fields
                            const fieldRows = []
                            const pushText = (key, val) => {
                                if (val === undefined || val === null || val === '') return
                                fieldRows.push({ canonical_key: key, raw_value: String(val) })
                            }
                            const pushNumber = (key, val) => {
                                const cleaned = val.toString().replace(/,/g, '')
                                const n = Number(cleaned)
                                if (isNaN(n)) return
                                fieldRows.push({ canonical_key: key, raw_value: String(n) })
                            }

                            // Map form data to database fields
                            pushText('shipper', formData.shipper)
                            pushText('bl_number', formData.blNumber)
                            pushText('consignee', formData.consignee)
                            pushText('shipping_line', formData.shippingLine)
                            pushText('vessel_name', formData.vesselName)
                            pushText('voyage_no', formData.voyageNo)
                            pushText('port_of_loading', formData.portOfLoading)
                            pushText('port_of_discharge', formData.portOfDischarge)
                            pushText('place_of_delivery', formData.placeOfDelivery)
                            pushText('container_specs', formData.containerSpecs)
                            pushNumber('no_of_packages', formData.noOfPackages)
                            pushText('packaging_kind', formData.packagingKind)
                            pushText('goods_classification', formData.goodsClassification)
                            pushText('description_of_goods', formData.descriptionOfGoods)
                            pushNumber('gross_weight', formData.grossWeight)

                            // Insert all field rows
                            if (fieldRows.length > 0) {
                                await supabase
                                    .from('document_fields')
                                    .insert(fieldRows.map(row => ({
                                        document_id: documentId,
                                        ...row
                                    })))
                            }

                            // 6) Insert container/seal pairs as JSON in document_fields
                            if (formData.pairs && formData.pairs.length > 0) {
                                const cleaned = formData.pairs.map(p => ({ 
                                    containerNo: (p.containerNo || '').toString(), 
                                    sealNo: (p.sealNo || '').toString() 
                                }))
                                const nonEmpty = cleaned.filter(p => p.containerNo.trim() || p.sealNo.trim())
                                if (nonEmpty.length) {
                                    fieldRows.push({ canonical_key: 'container_seal_pairs', raw_value: JSON.stringify(nonEmpty) })
                                }
                            }

                            console.log('BOL upload successful!')
                            setUploadOverlayOpen(false)
                            setUploadingType(null)
                            onRefresh()
                            
                        } catch (error) {
                            console.error('BOL upload failed:', error)
                            alert(`Upload failed: ${error.message}`)
                        }
                    }}
                />
            )}

            {uploadOverlayOpen && uploadingType === 'Delivery Order' && (
                <DeliveryOrderUploadAndEditOverlay
                    title="Delivery Order"
                    proNumber={proNo}
                    department={name}
                    onClose={() => { 
                        setUploadOverlayOpen(false); 
                        setUploadingType(null);
                    }}
                    onSuccess={() => {
                        setUploadOverlayOpen(false)
                        setUploadingType(null)
                        onRefresh()
                    }}
                />
            )}

            {uploadOverlayOpen && uploadingType !== 'Invoice' && uploadingType !== 'Packing List' && uploadingType !== 'Bill of Lading' && uploadingType !== 'Delivery Order' && (
                <UploadDocumentOverlay
                    open={uploadOverlayOpen}
                    onClose={() => { 
                        setUploadOverlayOpen(false); 
                        setUploadingType(null);
                    }}
                    onConfirm={({ file, previewUrl, originalFileName }) => {
                        console.log('[Ghost Upload] Type:', uploadingType, 'File:', originalFileName)
                        // TODO: wire upload and persist flow for other document types
                        setUploadOverlayOpen(false)
                        setUploadingType(null)
                    }}
                    documentType={uploadingType}
                />
            )}
            {!documentTypes || !proData ? (
                <div>No data found for {name} / {proNo}</div>
            ) : null}
        </div>
    );
};

export default Department;
