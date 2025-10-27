import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useMemo, useState } from 'react';
import Department from '../../components/Department';
import Document from '../../components/Document';
import { FinanceProfileHeader } from '../../components/ProfileHeader';
import { ProDocumentListContext } from '../../App';
import { getFinanceTableData } from '../../services/supabase/finance';
import { fetchTruckingDocumentsByPro, fetchBolDataForTrucking, fetchFieldsByDocumentId } from '../../services/supabase/documents';
import { getReceiptsByPro, exportReceiptToWord, deleteReceipt } from '../../services/supabase/financeReceipts';
import StatementOfAccountsOverlay from '../../components/overlays/StatementOfAccountsOverlay';
import ServiceInvoiceOverlay from '../../components/overlays/ServiceInvoiceOverlay';
import ReceiptBlock from '../../components/receipts/ReceiptBlock';
import '../../components/receipts/ReceiptBlock.css';

export default function FinanceProfile() {
    const { proNo } = useParams();
    const navigate = useNavigate();
    const { proDocumentList, setProDocumentList } = useContext(ProDocumentListContext);
    const [generalInfoData, setGeneralInfoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dbPro, setDbPro] = useState(null);
    const [bolData, setBolData] = useState(null);
    const [reloadTick, setReloadTick] = useState(0);
    const [showSOAOverlay, setShowSOAOverlay] = useState(false);
    const [showInvoiceOverlay, setShowInvoiceOverlay] = useState(false);
    const [receipts, setReceipts] = useState([]);
    const [loadingReceipts, setLoadingReceipts] = useState(true);
    const [editingReceipt, setEditingReceipt] = useState(null);
    const [highlightNoReceipts, setHighlightNoReceipts] = useState(false);

    const handleBack = () => {
        navigate('/finance');
    };

    const handleStatusChange = (newStatus) => {
        console.log(`Finance status changed to: ${newStatus}`);
        // TODO: Implement status update logic when finance status table is created
    };

    const handleSearch = (searchValue) => {
        setSearchTerm(searchValue);
        console.log(`Searching for: ${searchValue}`);
        // TODO: Implement search functionality for finance documents
    };

    const handleHighlightNoReceipts = (shouldHighlight) => {
        setHighlightNoReceipts(shouldHighlight);
    };

    // Fetch receipts for the current PRO
    const fetchReceipts = async () => {
        if (!proNo) return;
        
        setLoadingReceipts(true);
        try {
            const data = await getReceiptsByPro(proNo);
            setReceipts(data);
        } catch (error) {
            console.error('Error fetching receipts:', error);
        } finally {
            setLoadingReceipts(false);
        }
    };

    // Handle edit receipt
    const handleEditReceipt = (receipt) => {
        setEditingReceipt(receipt);
        if (receipt.receipt_type === 'statement_of_accounts') {
            setShowSOAOverlay(true);
        } else if (receipt.receipt_type === 'service_invoice') {
            setShowInvoiceOverlay(true);
        }
    };

    // Handle export receipt
    const handleExportReceipt = async (receipt) => {
      try {
        await exportReceiptToWord(
          receipt.id,
          receipt.receipt_data,
          receipt.pro_number,
          receipt.receipt_type
        );
      } catch (error) {
        console.error('Error exporting receipt:', error);
        alert('Error exporting receipt. Please try again.');
      }
    };

    // Handle delete receipt
    const handleDeleteReceipt = async (receipt) => {
        if (window.confirm(`Are you sure you want to delete this ${receipt.receipt_type === 'statement_of_accounts' ? 'Statement of Account' : 'Service Invoice'}?`)) {
        try {
          console.log('🗑️ Deleting receipt:', receipt.id);
          const result = await deleteReceipt(receipt.id);
          console.log('🗑️ Delete result:', result);
          
          // Force refresh the receipts list
          await fetchReceipts();
          console.log('🗑️ Receipts refreshed after delete');
          
          alert('Receipt deleted successfully!');
        } catch (error) {
          console.error('Error deleting receipt:', error);
          alert('Error deleting receipt. Please try again.');
        }
      }
    };

    // Fetch Delivery Order and BOL data for Finance profile
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                // Fetch both delivery orders and BOL data
                const [docs, bolDocs] = await Promise.all([
                    fetchTruckingDocumentsByPro(proNo),
                    fetchBolDataForTrucking(proNo)
                ]);
                if (!mounted) return;
                
                // Process BOL data
                if (Array.isArray(bolDocs) && bolDocs.length > 0) {
                    const bol = bolDocs[0]; // Take the first BOL
                    const fields = await fetchFieldsByDocumentId(bol.id);
                    const byKey = Object.create(null);
                    fields.forEach(f => { byKey[f.canonical_key] = f });
                    
                    const bolFieldValues = {
                        bl_number: byKey['bl_number']?.raw_value || '',
                        consignee: byKey['consignee']?.raw_value || '',
                        port_of_discharge: byKey['port_of_discharge']?.raw_value || '',
                        place_of_delivery: byKey['place_of_delivery']?.raw_value || '',
                        shipping_line: byKey['shipping_line']?.raw_value || '',
                        container_specs: byKey['container_specs']?.raw_value || '',
                        goods_classification: byKey['goods_classification']?.raw_value || '',
                        container_seal_pairs: byKey['container_seal_pairs']?.raw_value || '',
                        uploaded_by: bol.uploaded_by,
                        uploaded_at: bol.uploaded_at,
                        updated_by: bol.updated_by,
                        updated_at: bol.updated_at
                    };
                    
                    setBolData({
                        documentId: bol.id,
                        documentType: bol.document_type,
                        fieldValues: bolFieldValues
                    });
                } else {
                    setBolData(null);
                }
                
                if (!Array.isArray(docs) || docs.length === 0) {
                    setDbPro(null);
                    return;
                }
                
                // Map first-class types we support to human labels for window rendering
                const typeToLabel = {
                    delivery_order: 'Delivery Order'
                };
                
                // Prefer the document per type that has the most fields; tie-break by latest uploaded_at
                const bestByType = Object.create(null);
                
                for (const d of docs) {
                    const fields = await fetchFieldsByDocumentId(d.id);
                    if (!mounted) return;
                    const fieldCount = Array.isArray(fields) ? fields.length : 0;
                    const key = d.document_type;
                    const existing = bestByType[key];
                    if (!existing || fieldCount > existing.__fieldCount || 
                        (fieldCount === existing.__fieldCount && d.uploaded_at > existing.__uploadedAt)) {
                        // Map fields to labelRows for display
                        const byKey = Object.create(null);
                        fields.forEach(f => { byKey[f.canonical_key] = f });
                        const labelRows = [];
                        let fieldValues = {};
                        const push = (label, canonicalKey, type = 'text') => {
                            const val = byKey[canonicalKey];
                            if (val) {
                                if (type === 'number') {
                                    labelRows.push({ label, info: val.value_number ?? val.raw_value ?? '--' });
                                } else if (type === 'date') {
                                    const dateVal = val.value_date || val.raw_value;
                                    labelRows.push({ label, info: dateVal ? new Date(dateVal).toLocaleDateString() : '--' });
                                } else {
                                    labelRows.push({ label, info: val.raw_value || '--' });
                                }
                            } else {
                                labelRows.push({ label, info: '--' });
                            }
                        };
                        
                        if (d.document_type === 'delivery_order') {
                            // Delivery Order fields
                            push('Pickup Location', 'pickup_location');
                            push('Empty Return Location', 'empty_return_location');
                            push('Registry Number', 'registry_number');
                            push('Detention Free Time End', 'detention_free_time_end');
                            
                            // Container/Seal Pairs for Delivery Order (separate but connected styling)
                            const pairsRaw = byKey['container_seal_pairs']?.raw_value;
                            if (pairsRaw !== undefined && pairsRaw !== null) {
                                let arr = [];
                                if (typeof pairsRaw === 'string') {
                                    try { 
                                        arr = JSON.parse(pairsRaw); 
                                    } catch (_e) {
                                        if (pairsRaw.trim()) labelRows.push({ label: 'Container No. / Seal No.', info: pairsRaw.trim() });
                                        arr = [];
                                    }
                                } else if (Array.isArray(pairsRaw)) {
                                    arr = pairsRaw;
                                } else if (typeof pairsRaw === 'object') {
                                    if (Array.isArray(pairsRaw.value)) arr = pairsRaw.value;
                                }
                                if (Array.isArray(arr)) {
                                    if (arr.length === 0) {
                                        fieldValues.container_seal_pairs = [{ containerNo: '', sealNo: '' }];
                                        labelRows.push({ label: 'Container No. / Seal No.', info: '--' });
                                    } else {
                                        fieldValues.container_seal_pairs = arr;
                                        const pairsText = arr.map(p => {
                                            const c = (p?.containerNo || '').toString().trim();
                                            const s = (p?.sealNo || '').toString().trim();
                                            return [c, s].filter(Boolean).join(' / ') || '--';
                                        }).join('\n');
                                        labelRows.push({ label: 'Container No. / Seal No.', info: pairsText });
                                    }
                                }
                            }
                            
                            fieldValues = {
                                pickup_location: byKey['pickup_location']?.raw_value || '',
                                empty_return_location: byKey['empty_return_location']?.raw_value || '',
                                registry_number: byKey['registry_number']?.raw_value || '',
                                detention_free_time_end: byKey['detention_free_time_end']?.raw_value || ''
                            };
                        }
                        
                        // Add metadata to fieldValues for overlay display
                        fieldValues.uploaded_by = d.uploaded_by;
                        fieldValues.uploaded_at = d.uploaded_at;
                        fieldValues.updated_by = d.updated_by;
                        fieldValues.updated_at = d.updated_at;
                        
                        bestByType[d.document_type] = {
                            type: typeToLabel[d.document_type] || d.document_type,
                            data: labelRows,
                            items: [],
                            filePath: d.file_path,
                            documentId: d.id,
                            documentType: d.document_type,
                            fieldValues,
                            __fieldCount: fieldCount,
                            __uploadedAt: d.uploaded_at
                        };
                    }
                }
                
                const documents = Object.values(bestByType).map(v => {
                    const { __fieldCount, __uploadedAt, ...rest } = v;
                    return rest;
                });
                setDbPro({ proNo, documents });
            } catch (_e) {
                setDbPro(null);
            } finally {
                setLoading(false);
            }
        })();
        return () => { mounted = false };
    }, [proNo, reloadTick]);

    // Fetch receipts when PRO number changes
    useEffect(() => {
        if (proNo) {
            fetchReceipts();
        }
    }, [proNo]);

    // Fetch general information data for this PRO
    useEffect(() => {
        const fetchGeneralInfo = async () => {
            try {
                const data = await getFinanceTableData();
                const proData = data.find(item => item.proNo === proNo);
                setGeneralInfoData(proData || null);
            } catch (err) {
                console.error('Error fetching general info:', err);
                setGeneralInfoData(null);
            }
        };

        fetchGeneralInfo();
    }, [proNo]);

    const effectiveList = useMemo(() => {
        if (dbPro) return [dbPro];
        return proDocumentList;
    }, [dbPro, proDocumentList]);

    // Render Delivery Order window for Finance
    const renderDeliveryOrder = () => {
        const effectiveProData = effectiveList.find(pro => pro.proNo === proNo);
        const doData = effectiveProData?.documents?.find(doc => doc.type === 'Delivery Order');
        
        if (!doData) return null;

        const style = { bgColor: '#FFF6C0', columns: 3, columnWidth: '300px', hideButtons: false };

        return (
            <Document
                key="Delivery Order"
                type="Delivery Order"
                data={doData.data}
                items={doData.items}
                style={style}
                proNo={proNo}
                setProDocumentList={setProDocumentList}
                proDocumentList={proDocumentList}
                filePath={doData.filePath}
                documentId={doData.documentId}
                documentType={doData.documentType}
                fieldValues={doData.fieldValues}
                onSaved={() => setReloadTick(t => t + 1)}
            />
        );
    };

    // Render General Information window
    const renderGeneralInfo = () => {
        if (loading) {
            return (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                    Loading general information...
                </div>
            );
        }

        if (!generalInfoData) {
            return (
                <div style={{ padding: '20px', textAlign: 'center', color: '#d32f2f' }}>
                    No data found for PRO {proNo}
                </div>
            );
        }

        // Calculate container quantity from container_seal_pairs
        const calculateContainerQuantity = (containerNoSealNo) => {
            if (!containerNoSealNo || containerNoSealNo === '-') return '0 Containers';
            
            // Split by comma to get individual pairs
            const pairs = containerNoSealNo.split(',').map(pair => pair.trim()).filter(Boolean);
            return `${pairs.length} Containers`;
        };

        const orDash = (val) => {
            const s = (val ?? '').toString().trim();
            return s ? s : '--';
        };

        const giData = [
            { label: 'B/L No', info: orDash(generalInfoData.blNo) },
            { label: 'Registry No', info: orDash(generalInfoData.registryNo) },
            { label: 'Consignee', info: orDash(generalInfoData.consignee) },
            { label: 'Container Specs', info: orDash(generalInfoData.containerSpecs) },
            { label: 'Number and Kind of Package', info: orDash(generalInfoData.numberAndKindOfPackage) },
            { label: 'Vessel', info: orDash(generalInfoData.vessel) },
            { label: 'Container Quantity', info: calculateContainerQuantity(generalInfoData.containerNoSealNo) },
            { label: 'Container No and Seal No', info: orDash(generalInfoData.containerNoSealNo) }
        ];

        const style = { bgColor: 'transparent', columns: 3, columnWidth: '300px', noShadow: true, hideButtons: true };

        return (
            <Document
                key="General Info"
                type="General Info"
                data={giData}
                items={[]}
                style={style}
                proNo={proNo}
                setProDocumentList={setProDocumentList}
                proDocumentList={proDocumentList}
                filePath={null}
                documentId={null}
                documentType={null}
                fieldValues={{}}
                onSaved={() => {}}
            />
        );
    };

    return (
        <div>
            <FinanceProfileHeader 
                proNo={proNo} 
                onBack={handleBack}
                onStatusChange={handleStatusChange}
                onSearch={handleSearch}
                onHighlightNoReceipts={handleHighlightNoReceipts}
            />
            <div style={{ overflowY: 'auto', paddingRight: 8 }}>
                {/* Delivery Order Document Window */}
                <div className="document-container">
                    {/* Delivery Order */}
                    {renderDeliveryOrder()}
                    
                    {/* General Information Window */}
                    {renderGeneralInfo()}
                    
                    {/* Generate Receipts Section */}
                    <div className="receipt-blocks-section">
                        <h3>Generate Receipts</h3>
                        <div className="receipt-blocks-container">
                            <button 
                                className="generate-receipt-card"
                                onClick={() => setShowSOAOverlay(true)}
                            >
                                <i className="fi fi-rs-file-invoice"></i>
                                <span>Statement of Account</span>
                            </button>
                            
                            <button 
                                className="generate-receipt-card"
                                onClick={() => setShowInvoiceOverlay(true)}
                            >
                                <i className="fi fi-rs-receipt"></i>
                                <span>Service Invoice</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Receipt Blocks Section */}
                    <div className="receipt-blocks-section">
                        <h3>Saved Receipts</h3>
                        {loadingReceipts ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: '#666' }}>
                                Loading receipts...
                            </div>
                        ) : receipts.length === 0 ? (
                            <div 
                                className={highlightNoReceipts ? 'no-receipts-message-highlight' : ''}
                                style={{ padding: '1rem', textAlign: 'center', color: '#666' }}
                            >
                                <span>No receipts found for this PRO</span>
                            </div>
                        ) : (
                            <div className="receipt-blocks-container">
                                {receipts.map(receipt => (
                                    <ReceiptBlock
                                        key={receipt.id}
                                        receipt={receipt}
                                        onEdit={() => handleEditReceipt(receipt)}
                                        onExport={() => handleExportReceipt(receipt)}
                                        onDelete={() => handleDeleteReceipt(receipt)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Receipt Overlays */}
            {showSOAOverlay && (
                <StatementOfAccountsOverlay
                    proNumber={proNo}
                    existingReceipt={editingReceipt}
                    onClose={() => {
                        setShowSOAOverlay(false);
                        setEditingReceipt(null);
                        fetchReceipts(); // Refresh receipts after edit
                    }}
                />
            )}
            
            {showInvoiceOverlay && (
                <ServiceInvoiceOverlay
                    proNumber={proNo}
                    existingReceipt={editingReceipt}
                    onClose={() => {
                        setShowInvoiceOverlay(false);
                        setEditingReceipt(null);
                        fetchReceipts(); // Refresh receipts after edit
                    }}
                />
            )}
        </div>
    );
}


