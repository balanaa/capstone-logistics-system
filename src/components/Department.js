import React, { useState } from 'react';
import { departmentDocuments, documentStyles } from '../data';
import Document from './Document';
import UploadDocumentOverlay from './overlays/UploadDocumentOverlay';
import InvoiceUploadAndEditOverlay from './overlays/InvoiceUploadAndEditOverlay';
import PackingListUploadAndEditOverlay from './overlays/PackingListUploadAndEditOverlay';
import BolUploadAndEditOverlay from './overlays/BolUploadAndEditOverlay';
import './OverlayForm.css';

const Department = ({ name, proNo, proDocumentList, setProDocumentList, onRefresh = () => {} }) => {
    const documentTypes = departmentDocuments[name]; // Get document types for the selected department
    const proData = proDocumentList.find(pro => pro.proNo === proNo); // Find the selected PRO data
    
    const [uploadingType, setUploadingType] = useState(null);
    const [uploadOverlayOpen, setUploadOverlayOpen] = useState(false);

    return (
        <div className="department-documents" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {(documentTypes || []).map((type) => {
                const documentItem = (proData?.documents || []).find(doc => doc.type === type);
                const style = documentStyles.find(ds => ds.type === type) || {};

                if (!documentItem) {
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

            {uploadOverlayOpen && uploadingType === 'Bill of Lading' && (
                <BolUploadAndEditOverlay
                    title="Upload Bill of Lading"
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

            {uploadOverlayOpen && uploadingType !== 'Invoice' && uploadingType !== 'Packing List' && uploadingType !== 'Bill of Lading' && (
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
