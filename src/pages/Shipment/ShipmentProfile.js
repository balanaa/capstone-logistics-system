import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useMemo, useState } from 'react';
import Department from '../../components/Department';
import { ShipmentProfileHeader } from '../../components/ProfileHeader';
import { ProDocumentListContext } from '../../App';
import { fetchShipmentDocumentsByPro, fetchFieldsByDocumentId } from '../../services/supabase/documents'
import { supabase } from '../../services/supabase/client'
import { formatDateDisplay } from '../../utils/dateUtils'
import CompletionConfirmOverlay from '../../components/overlays/CompletionConfirmOverlay'
import { checkAllShipmentDocumentsComplete } from '../../utils/documentCompletionUtils'
import { updateShipmentStatus } from '../../services/supabase/shipmentStatus'

export default function ShipmentProfile() {
    const { proNo } = useParams();
    const navigate = useNavigate();
    const { proDocumentList, setProDocumentList } = useContext(ProDocumentListContext);
    const [dbPro, setDbPro] = useState(null)
    const [loading, setLoading] = useState(false)
    const [reloadTick, setReloadTick] = useState(0)
    const [showCompletionPrompt, setShowCompletionPrompt] = useState(false)
    const [hasCheckedCompletion, setHasCheckedCompletion] = useState(false)

    // Debug completion prompt state changes
    useEffect(() => {
        // console.log('🎭 [ShipmentProfile] Completion prompt state changed:', showCompletionPrompt)
    }, [showCompletionPrompt])

    const handleBack = () => {
        navigate('/shipment');
    };

    // Handle shipment completion confirmation
    const handleShipmentCompletion = async (confirmed) => {
        // console.log('🎯 [ShipmentProfile] Completion confirmation:', confirmed)
        setShowCompletionPrompt(false)
        
        if (confirmed) {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                // console.log('💾 [ShipmentProfile] Updating status to completed for user:', user?.id)
                await updateShipmentStatus(proNo, 'completed', user.id)
                // console.log('✅ [ShipmentProfile] Status updated, navigating to /shipment')
                navigate('/shipment')
            } catch (error) {
                console.error('❌ [ShipmentProfile] Error updating shipment status:', error)
                alert('Failed to update status. Please try again.')
            }
        } else {
            // console.log('❌ [ShipmentProfile] User declined completion')
        }
    }

    useEffect(() => {
        let mounted = true
        ;(async () => {
            setLoading(true)
            try {
                const docs = await fetchShipmentDocumentsByPro(proNo)
                if (!mounted) return
                if (!Array.isArray(docs) || docs.length === 0) {
                    setDbPro(null)
                    return
                }
                // Map first-class types we support to human labels for window rendering
                const typeToLabel = {
                    bill_of_lading: 'Bill of Lading',
                    invoice: 'Invoice',
                    packing_list: 'Packing List',
                    delivery_order: 'Delivery Order'
                }
                // Prefer the document per type that has the most fields; tie-break by latest uploaded_at
                const bestByType = Object.create(null)
                // Debug: how many documents for this PRO
                // eslint-disable-next-line no-console
                // console.log(`[Profile] PRO ${proNo}: fetched ${docs.length} documents`)
                for (const d of docs) {
                    const fields = await fetchFieldsByDocumentId(d.id)
                    const fieldCount = Array.isArray(fields) ? fields.length : 0
                    
                    // Fetch line items for invoice/packing_list
                    let lineItems = []
                    if (d.document_type === 'invoice' || d.document_type === 'packing_list') {
                        const { data: items } = await supabase
                            .from('document_items')
                            .select('*')
                            .eq('document_id', d.id)
                            .order('line_no', { ascending: true })
                        lineItems = items || []
                    }
                    
                    // eslint-disable-next-line no-console
                    // console.log(`[Profile] Document ${d.id} (${d.document_type}): fetched ${fieldCount} fields, ${lineItems.length} items`)
                    const current = bestByType[d.document_type]
                    const curCount = current?.__fieldCount || -1
                    const curUploaded = current?.__uploadedAt || ''
                    const isBetter = fieldCount > curCount || (fieldCount === curCount && String(d.uploaded_at || '') > String(curUploaded))
                    if (!isBetter) continue

                    const byKey = Object.create(null)
                    for (const f of (fields || [])) byKey[f.canonical_key] = f
                    // Debug: show container_seal_pairs raw value if present
                    if (byKey['container_seal_pairs']) {
                      // eslint-disable-next-line no-console
                      // console.log('[Profile] pairs raw:', byKey['container_seal_pairs'].raw_value)
                    }
                    const labelRows = []
                    const push = (label, key, type = 'text') => {
                        const v = byKey[key]
                        let info = ''
                        if (!v) info = ''
                        else if (type === 'number') info = v.value_number ?? ''
                        else if (type === 'date') {
                            const rawDate = v.value_date ?? v.raw_value ?? ''
                            info = rawDate ? formatDateDisplay(rawDate) : ''
                        }
                        else info = v.raw_value ?? v.normalized_value ?? ''
                        labelRows.push({ label, info })
                    }
                    let fieldValues = {}
                    if (d.document_type === 'bill_of_lading') {
                        push('B/L No.', 'bl_number')
                        push('Shipper', 'shipper')
                        push('Consignee', 'consignee')
                        push('Shipping Line', 'shipping_line')
                        push('Vessel Name', 'vessel_name')
                        push('Voyage No.', 'voyage_no')
                        push('ETA', 'eta')
                        push('Port of Loading', 'port_of_loading')
                        push('Port of Discharge', 'port_of_discharge')
                        // Place of Delivery (derived but persisted/editable) should be above pairs
                        push('Place of Delivery', 'place_of_delivery')
                        // Container/Seal Pairs next
                        const pairsRaw = byKey['container_seal_pairs']?.raw_value
                        if (pairsRaw !== undefined && pairsRaw !== null) {
                          let arr = []
                          if (typeof pairsRaw === 'string') {
                            try { arr = JSON.parse(pairsRaw) } catch (_e) {
                              // If not JSON, show the string directly as one row
                              if (pairsRaw.trim()) labelRows.push({ label: 'Container No. / Seal No.', info: pairsRaw.trim() })
                              arr = []
                            }
                          } else if (Array.isArray(pairsRaw)) {
                            arr = pairsRaw
                          } else if (typeof pairsRaw === 'object') {
                            // Could be JSONB object already parsed as array-like
                            if (Array.isArray(pairsRaw.value)) arr = pairsRaw.value
                          }
                          if (Array.isArray(arr)) {
                            if (arr.length === 0) {
                              fieldValues.container_seal_pairs = [{ containerNo: '', sealNo: '' }]
                              labelRows.push({ label: 'Container No. / Seal No.', info: '--' })
                            } else {
                              fieldValues.container_seal_pairs = arr
                              arr.forEach((p) => {
                                const c = (p?.containerNo || '').toString().trim()
                                const s = (p?.sealNo || '').toString().trim()
                                const info = [c, s].filter(Boolean).join(' / ') || '--'
                                labelRows.push({ label: 'Container No. / Seal No.', info })
                              })
                            }
                          }
                        }
                        push('Container Specs', 'container_specs')
                        push('No. of Packages', 'no_of_packages', 'number')
                        push('Packaging Kind', 'packaging_kind')
                        push('Goods Classification', 'goods_classification')
                        push('Description of Goods', 'description_of_goods')
                        push('Gross Weight', 'gross_weight', 'number')
                        // Populate fieldValues map for editing overlay (merge with container_seal_pairs if set)
                        fieldValues = {
                          ...fieldValues,
                          bl_number: byKey['bl_number']?.raw_value || '',
                          shipper: byKey['shipper']?.raw_value || '',
                          consignee: byKey['consignee']?.raw_value || '',
                          shipping_line: byKey['shipping_line']?.raw_value || '',
                          vessel_name: byKey['vessel_name']?.raw_value || '',
                          voyage_no: byKey['voyage_no']?.raw_value || '',
                          eta: byKey['eta']?.raw_value || '',
                          port_of_loading: byKey['port_of_loading']?.raw_value || '',
                          port_of_discharge: byKey['port_of_discharge']?.raw_value || '',
                          place_of_delivery: byKey['place_of_delivery']?.raw_value || '',
                          container_specs: byKey['container_specs']?.raw_value || '',
                          no_of_packages: byKey['no_of_packages']?.value_number ?? '',
                          packaging_kind: byKey['packaging_kind']?.raw_value || '',
                          goods_classification: byKey['goods_classification']?.raw_value || '',
                          description_of_goods: byKey['description_of_goods']?.raw_value || '',
                          gross_weight: byKey['gross_weight']?.value_number ?? ''
                        }
                    } else if (d.document_type === 'invoice') {
                        push('Invoice No.', 'invoice_no')
                        push('Invoice Date', 'invoice_date', 'date')
                        push('Incoterms', 'incoterms')
                        push('Currency', 'invoice_currency')
                        // Don't push totals here - they'll be shown in table
                        
                        fieldValues = {
                          invoice_no: byKey['invoice_no']?.raw_value || '',
                          invoice_date: byKey['invoice_date']?.value_date || '',
                          incoterms: byKey['incoterms']?.raw_value || '',
                          invoice_currency: byKey['invoice_currency']?.raw_value || 'USD',
                          total_quantity: byKey['total_quantity']?.value_number ?? '',
                          total_amount: byKey['total_amount']?.value_number ?? ''
                        }
                    } else if (d.document_type === 'packing_list') {
                        // No header fields for packing list - just totals
                        fieldValues = {
                          total_quantity: byKey['total_quantity']?.value_number ?? '',
                          total_net_weight: byKey['total_net_weight']?.value_number ?? '',
                          total_gross_weight: byKey['total_gross_weight']?.value_number ?? ''
                        }
                    } else if (d.document_type === 'delivery_order') {
                        // Delivery Order fields
                        push('Pickup Location', 'pickup_location')
                        push('Empty Return Location', 'empty_return_location')
                        push('Registry Number', 'registry_number')
                        push('Detention Free Time End', 'detention_free_time_end')
                        
                        // Container/Seal Pairs for Delivery Order (separate but connected styling)
                        const pairsRaw = byKey['container_seal_pairs']?.raw_value
                        if (pairsRaw !== undefined && pairsRaw !== null) {
                          let arr = []
                          if (typeof pairsRaw === 'string') {
                            try { arr = JSON.parse(pairsRaw) } catch (_e) {
                              if (pairsRaw.trim()) labelRows.push({ label: 'Container No. / Seal No.', info: pairsRaw.trim() })
                              arr = []
                            }
                          } else if (Array.isArray(pairsRaw)) {
                            arr = pairsRaw
                          } else if (typeof pairsRaw === 'object') {
                            if (Array.isArray(pairsRaw.value)) arr = pairsRaw.value
                          }
                          if (Array.isArray(arr)) {
                            if (arr.length === 0) {
                              fieldValues.container_seal_pairs = [{ containerNo: '', sealNo: '' }]
                              labelRows.push({ label: 'Container No. / Seal No.', info: '--' })
                            } else {
                              fieldValues.container_seal_pairs = arr
                              const pairsText = arr.map(p => {
                                const c = (p?.containerNo || '').toString().trim()
                                const s = (p?.sealNo || '').toString().trim()
                                return [c, s].filter(Boolean).join(' / ') || '--'
                              }).join('\n')
                              labelRows.push({ label: 'Container No. / Seal No.', info: pairsText })
                            }
                          }
                        }
                        
                        fieldValues = {
                          pickup_location: byKey['pickup_location']?.raw_value || '',
                          empty_return_location: byKey['empty_return_location']?.raw_value || '',
                          registry_number: byKey['registry_number']?.raw_value || '',
                          detention_free_time_end: byKey['detention_free_time_end']?.raw_value || ''
                        }
                    }
                    
                    // Convert line items to display format
                    let displayItems = []
                    if (d.document_type === 'invoice') {
                        displayItems = lineItems.map(item => ({
                            product: item.product || '',
                            quantity: item.quantity ?? '',
                            unitPrice: item.unit_price ?? '',
                            amount: item.amount ?? ''
                        }))
                    } else if (d.document_type === 'packing_list') {
                        displayItems = lineItems.map(item => ({
                            product: item.product || '',
                            quantity: item.quantity ?? '',
                            netWeight: item.net_weight ?? '',
                            grossWeight: item.gross_weight ?? ''
                        }))
                    }
                    
                    // Debug: count of pair rows in labelRows
                    // eslint-disable-next-line no-console
                    // console.log('[Profile] pair rows count:', labelRows.filter(r => r.label === 'Container No. / Seal No.').length)
                    // Add metadata to fieldValues for overlay display
                    fieldValues.uploaded_by = d.uploaded_by
                    fieldValues.uploaded_at = d.uploaded_at
                    fieldValues.updated_by = d.updated_by
                    fieldValues.updated_at = d.updated_at
                    
                    bestByType[d.document_type] = {
                        type: typeToLabel[d.document_type] || d.document_type,
                        data: labelRows,
                        items: displayItems,
                        filePath: d.file_path,
                        documentId: d.id,
                        documentType: d.document_type,
                        fieldValues,
                        __fieldCount: fieldCount,
                        __uploadedAt: d.uploaded_at
                    }
                }
                const documents = Object.values(bestByType).map(v => {
                    const { __fieldCount, __uploadedAt, ...rest } = v
                    return rest
                })
                setDbPro({ proNo, documents })
            } catch (_e) {
                setDbPro(null)
            } finally {
                setLoading(false)
            }
        })()
        return () => { mounted = false }
    }, [proNo, reloadTick])

    // Check for completion after data loads
    useEffect(() => {
        if (!dbPro?.documents) {
            return
        }
        
        // Reset completion check flag when reloadTick changes (new data loaded)
        if (reloadTick > 0) {
            setHasCheckedCompletion(false)
        }
        
        // Only check once per page load to avoid showing prompt multiple times
        if (hasCheckedCompletion) {
            return
        }
        
        // Check if all 4 documents exist (with fields)
        const isComplete = checkAllShipmentDocumentsComplete(dbPro.documents)
        // console.log('📋 [ShipmentProfile] Document completion check:', {
        //     documentCount: dbPro.documents.length,
        //     documentTypes: dbPro.documents.map(d => d.type),
        //     isComplete
        // })
        
        if (isComplete) {
            // Fetch current status from pro table to avoid repeat prompts
            const checkStatus = async () => {
                // console.log('🔍 [ShipmentProfile] Checking current status in database...')
                const { data } = await supabase
                    .from('pro')
                    .select('status')
                    .eq('pro_number', proNo)
                    .single()
                
                // console.log('📊 [ShipmentProfile] Current status:', data?.status)
                
                if (data?.status !== 'completed') {
                    // console.log('✅ [ShipmentProfile] Showing completion prompt!')
                    setShowCompletionPrompt(true)
                } else {
                    // console.log('⏭️ [ShipmentProfile] Status already completed, no prompt')
                }
                setHasCheckedCompletion(true)
            }
            checkStatus()
        } else {
            // console.log('❌ [ShipmentProfile] Not complete yet, documents missing')
            setHasCheckedCompletion(true)
        }
    }, [dbPro, proNo, reloadTick])

    const effectiveList = useMemo(() => {
        if (dbPro) return [dbPro]
        return proDocumentList
    }, [dbPro, proDocumentList])


    return (
        <div>
            <ShipmentProfileHeader 
                proNo={proNo} 
                onBack={handleBack} 
                documents={dbPro?.documents || []}
                onStatusChange={() => setReloadTick(t => t + 1)}
            />
            <div style={{ overflowY: 'auto', paddingRight: 8 }}>
                <Department 
                    name="shipment"
                    proNo={proNo}
                    proDocumentList={effectiveList}
                    setProDocumentList={setProDocumentList}
                    onRefresh={() => setReloadTick(t => t + 1)}
                />
                {loading && <div style={{ padding: 8, color: '#666' }}>Loading…</div>}
            </div>
            
                <CompletionConfirmOverlay
                    isOpen={showCompletionPrompt}
                    heading="Shipment Complete"
                    bodyText={`All required documents have been uploaded and filled.\nWould you like to mark PRO number: ${proNo} as Complete?\nThis will move it to the Trucking department.`}
                    onConfirm={() => handleShipmentCompletion(true)}
                    onCancel={() => handleShipmentCompletion(false)}
                />
        </div>
    );
}


