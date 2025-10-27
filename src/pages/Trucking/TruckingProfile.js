import { useParams, useNavigate } from 'react-router-dom';
import { useContext, useEffect, useMemo, useState } from 'react';
import Department from '../../components/Department';
import { TruckingProfileHeader } from '../../components/ProfileHeader';
import { ProDocumentListContext } from '../../App';
import { fetchTruckingDocumentsByPro, fetchBolDataForTrucking, fetchFieldsByDocumentId } from '../../services/supabase/documents'
import { supabase } from '../../services/supabase/client'
import ContainerBlock from '../../components/ContainerBlock'
import Document from '../../components/Document'
import { getContainerOperations, generateContainerOperationsFromBol, createContainerOperation } from '../../services/supabase/containerOperations'
import CompletionConfirmOverlay from '../../components/overlays/CompletionConfirmOverlay'
import AddContainerOverlay from '../../components/overlays/AddContainerOverlay'
import { checkAllContainersReturned } from '../../utils/documentCompletionUtils'
import { updateTruckingCompletionStatus } from '../../services/supabase/truckingStatus'

export default function TruckingProfile() {
    const { proNo } = useParams();
    const navigate = useNavigate();
    const { proDocumentList, setProDocumentList } = useContext(ProDocumentListContext);
    const [dbPro, setDbPro] = useState(null)
    const [bolData, setBolData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [reloadTick, setReloadTick] = useState(0)
    const [containerOperations, setContainerOperations] = useState([])
    const [containerLoading, setContainerLoading] = useState(false)
    const [showCompletionPrompt, setShowCompletionPrompt] = useState(false)
    const [containerRefreshTrigger, setContainerRefreshTrigger] = useState(0)
    const [driverNamesList, setDriverNamesList] = useState('')
    const [driverNamesArray, setDriverNamesArray] = useState([])
    const [truckPlateNumbersList, setTruckPlateNumbersList] = useState('')
    const [truckPlateNumbersArray, setTruckPlateNumbersArray] = useState([])
    const [showAddContainerOverlay, setShowAddContainerOverlay] = useState(false)
    const [highlightedContainerIds, setHighlightedContainerIds] = useState([])

    // Debug completion prompt state changes
    useEffect(() => {
        // console.log('🎭 [TruckingProfile] Completion prompt state changed:', showCompletionPrompt)
    }, [showCompletionPrompt])

    // Parse driver names when the list changes
    useEffect(() => {
        const names = driverNamesList
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0)
        setDriverNamesArray(names)
    }, [driverNamesList])

    // Parse truck plate numbers when the list changes
    useEffect(() => {
        const plates = truckPlateNumbersList
            .split('\n')
            .map(plate => plate.trim())
            .filter(plate => plate.length > 0)
        setTruckPlateNumbersArray(plates)
    }, [truckPlateNumbersList])

    const handleBack = () => {
        navigate('/trucking');
    };

    // Handle trucking completion confirmation
    const handleTruckingCompletion = async (confirmed) => {
        // console.log('🎯 [TruckingProfile] Completion confirmation:', confirmed)
        setShowCompletionPrompt(false)
        
        if (confirmed) {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                // console.log('💾 [TruckingProfile] Updating trucking status to completed for user:', user?.id)
                await updateTruckingCompletionStatus(proNo, 'completed', user.id)
                // console.log('✅ [TruckingProfile] Status updated, navigating to /trucking')
                navigate('/trucking')
            } catch (error) {
                console.error('❌ [TruckingProfile] Error updating trucking status:', error)
                alert('Failed to update status. Please try again.')
            }
        } else {
            // console.log('❌ [TruckingProfile] User declined completion')
        }
    }

    useEffect(() => {
        let mounted = true
        ;(async () => {
            setLoading(true)
            try {
                // Fetch both delivery orders and BOL data
                const [docs, bolDocs] = await Promise.all([
                    fetchTruckingDocumentsByPro(proNo),
                    fetchBolDataForTrucking(proNo)
                ])
                if (!mounted) return
                
                // Process BOL data
                if (Array.isArray(bolDocs) && bolDocs.length > 0) {
                    const bol = bolDocs[0] // Take the first BOL
                    const fields = await fetchFieldsByDocumentId(bol.id)
                    const byKey = Object.create(null)
                    fields.forEach(f => { byKey[f.canonical_key] = f })
                    
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
                    }
                    
                    setBolData({
                        documentId: bol.id,
                        documentType: bol.document_type,
                        fieldValues: bolFieldValues
                    })
                } else {
                    setBolData(null)
                }
                
                if (!Array.isArray(docs) || docs.length === 0) {
                    setDbPro(null)
                    return
                }
                // Map first-class types we support to human labels for window rendering
                const typeToLabel = {
                    delivery_order: 'Delivery Order'
                }
                // Prefer the document per type that has the most fields; tie-break by latest uploaded_at
                const bestByType = Object.create(null)
                // Debug: how many delivery order documents for this PRO (from shipment department)
                for (const d of docs) {
                    const fields = await fetchFieldsByDocumentId(d.id)
                    if (!mounted) return
                    const fieldCount = Array.isArray(fields) ? fields.length : 0
                    const key = d.document_type
                    const existing = bestByType[key]
                    if (!existing || fieldCount > existing.__fieldCount || 
                        (fieldCount === existing.__fieldCount && d.uploaded_at > existing.__uploadedAt)) {
                        // Map fields to labelRows for display
                        const byKey = Object.create(null)
                        fields.forEach(f => { byKey[f.canonical_key] = f })
                        const labelRows = []
                        let fieldValues = {}
                        const push = (label, canonicalKey, type = 'text') => {
                            const val = byKey[canonicalKey]
                            if (val) {
                                if (type === 'number') {
                                    labelRows.push({ label, info: val.value_number ?? val.raw_value ?? '--' })
                                } else if (type === 'date') {
                                    const dateVal = val.value_date || val.raw_value
                                    labelRows.push({ label, info: dateVal ? new Date(dateVal).toLocaleDateString() : '--' })
                                } else {
                                    labelRows.push({ label, info: val.raw_value || '--' })
                                }
                            } else {
                                labelRows.push({ label, info: '--' })
                            }
                        }
                        
                        if (d.document_type === 'delivery_order') {
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
                        
                        // Add metadata to fieldValues for overlay display
                        fieldValues.uploaded_by = d.uploaded_by
                        fieldValues.uploaded_at = d.uploaded_at
                        fieldValues.updated_by = d.updated_by
                        fieldValues.updated_at = d.updated_at
                        
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
                        }
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

    // Load container operations
    useEffect(() => {
        let mounted = true
        ;(async () => {
            setContainerLoading(true)
            try {
                // First try to get existing operations
                let operations = await getContainerOperations(proNo)
                
                // If no operations exist, try to generate from BOL
                if (operations.length === 0) {
                    operations = await generateContainerOperationsFromBol(proNo)
                }
                
                if (!mounted) return
                setContainerOperations(operations)
            } catch (error) {
                console.error('Error loading container operations:', error)
                if (!mounted) return
                setContainerOperations([])
            } finally {
                setContainerLoading(false)
            }
        })()
        return () => { mounted = false }
    }, [proNo, reloadTick])

    // Check for container completion after operations change
    useEffect(() => {
        // console.log('🔍 [TruckingProfile] Container completion check triggered:', {
        //     containerOperations: containerOperations?.length,
        //     proNo
        // })
        
        if (!containerOperations || containerOperations.length === 0) {
            // console.log('❌ [TruckingProfile] No container operations, skipping check')
            return
        }
        
        const checkCompletion = async () => {
            // Check if all containers returned
            const allReturned = checkAllContainersReturned(containerOperations)
            
            // console.log('📋 [TruckingProfile] Container status check:', {
            //     containerCount: containerOperations.length,
            //     containerStatuses: containerOperations.map(op => ({ id: op.id, status: op.status })),
            //     allReturned
            // })
            
            if (!allReturned) {
                // console.log('❌ [TruckingProfile] Not all containers returned yet')
                return
            }
            
            // Fetch current trucking status to avoid repeat prompts
            // console.log('🔍 [TruckingProfile] Checking current trucking status in database...')
            const { data } = await supabase
                .from('pro')
                .select('trucking_status')
                .eq('pro_number', proNo)
                .single()
            
            // console.log('📊 [TruckingProfile] Current trucking status:', data?.trucking_status)
            
            if (data?.trucking_status !== 'completed') {
                // console.log('✅ [TruckingProfile] Showing completion prompt!')
                setShowCompletionPrompt(true)
            } else {
                // console.log('⏭️ [TruckingProfile] Status already completed, no prompt')
            }
        }
        
        checkCompletion()
    }, [containerOperations, proNo])

    const effectiveList = useMemo(() => {
        if (dbPro) return [dbPro]
        return proDocumentList
    }, [dbPro, proDocumentList])

    // Render General Information window for trucking
    const renderGeneralInfo = () => {
        if (!bolData) return null

        // Helper to read BOL field value
        const readBol = (key) => {
            return bolData.fieldValues?.[key] || ''
        }

        // Container numbers joined with comma
        let containerJoined = ''
        if (bolData.fieldValues?.container_seal_pairs) {
            try {
                const pairs = JSON.parse(bolData.fieldValues.container_seal_pairs)
                if (Array.isArray(pairs)) {
                    containerJoined = pairs
                        .map(p => (p?.containerNo || '').toString())
                        .filter(Boolean)
                        .join(', ')
                }
            } catch (e) {
                // If not JSON, treat as single value
                containerJoined = bolData.fieldValues.container_seal_pairs
            }
        }

        // Join container specs and goods classification
        const containerAndGoods = (() => {
            const a = bolData.fieldValues?.container_specs || ''
            const b = bolData.fieldValues?.goods_classification || ''
            if (a && b) return `${a} ${b}`
            return a || b || ''
        })()

        // Get delivery order data for additional fields
        const effectiveProData = effectiveList.find(pro => pro.proNo === proNo)
        const doData = effectiveProData?.documents?.find(doc => doc.type === 'Delivery Order')
        const emptyReturnLocation = doData?.fieldValues?.empty_return_location || ''
        const detentionStart = doData?.fieldValues?.detention_free_time_end || ''
        const registryNumber = doData?.fieldValues?.registry_number || ''

        const orDash = (val) => {
            const s = (val ?? '').toString().trim()
            return s ? s : '--'
        }

        // Compose data rows for the grid
        const giData = [
            { label: 'B/L No.', info: orDash(readBol('bl_number')) },
            { label: 'Registry No.', info: orDash(registryNumber) },
            { label: 'Consignee', info: orDash(readBol('consignee')) },
            { label: 'Port of Discharge', info: orDash(readBol('port_of_discharge')) },
            { label: 'Place of Delivery', info: orDash(readBol('place_of_delivery')) },
            { label: 'Shipping Line', info: orDash(readBol('shipping_line')) },
            { label: 'Container & Goods Info', info: orDash(containerAndGoods) },
            { label: 'Container No', info: orDash(containerJoined) },
            { label: 'Empty Return Location', info: orDash(emptyReturnLocation) },
            { label: 'Detention Start', info: orDash(detentionStart) }
        ]

        const style = { bgColor: 'transparent', columns: 3, columnWidth: '300px', noShadow: true, hideButtons: true }

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
                documentId={doData?.documentId || bolData.documentId}
                documentType={doData?.documentType || bolData.documentType}
                fieldValues={{ ...bolData.fieldValues, ...doData?.fieldValues }}
                onSaved={() => setReloadTick(t => t + 1)}
            />
        )
    }

    // Handle container operations changes
    const handleContainerOperationsChange = async (operations, action) => {
        if (action === 'add') {
            // Show overlay for adding container
            setShowAddContainerOverlay(true)
        } else {
            // Update operations list
            setContainerOperations(operations)
            // Trigger refresh for status dropdown when operations are updated
            setContainerRefreshTrigger(prev => prev + 1)
        }
    }

    // Handle add container confirmation from overlay
    const handleAddContainerConfirm = async (containerData) => {
        try {
            const newOperation = await createContainerOperation(proNo, containerData)
            setContainerOperations(prev => [...prev, newOperation])
            // Trigger refresh for status dropdown
            setContainerRefreshTrigger(prev => prev + 1)
            setShowAddContainerOverlay(false)
        } catch (error) {
            console.error('Error creating container operation:', error)
            alert('Error creating container operation. Please try again.')
        }
    }

    return (
        <div>
            <TruckingProfileHeader 
                proNo={proNo} 
                onBack={handleBack} 
                containerRefreshTrigger={containerRefreshTrigger}
                onHighlightContainers={setHighlightedContainerIds}
            />
            <div style={{ overflowY: 'auto', paddingRight: 8 }}>
                {/* General Information Window */}
                {renderGeneralInfo()}
                
                <Department 
                    name="trucking"
                    proNo={proNo}
                    proDocumentList={effectiveList}
                    setProDocumentList={setProDocumentList}
                    onRefresh={() => setReloadTick(t => t + 1)}
                />
                {loading && <div style={{ padding: 8, color: '#666' }}>Loading…</div>}
                
                {/* Container Operations Section */}
                <div style={{ marginTop: '20px' }}>
                    <ContainerBlock 
                        operations={containerOperations}
                        onOperationsChange={handleContainerOperationsChange}
                        isReadOnly={false}
                        driverNames={driverNamesArray}
                        truckPlateNumbers={truckPlateNumbersArray}
                        highlightedContainerIds={highlightedContainerIds}
                    />
                    {containerLoading && (
                        <div style={{ padding: 8, color: '#666', textAlign: 'center' }}>
                            Loading container operations...
                        </div>
                    )}
                </div>

                {/* Driver Names & Truck Plates Management Section (Temporary) */}
                <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
                    <h3 style={{ marginBottom: '10px' }}>Autocomplete Lists</h3>
                    <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
                        Enter driver names and truck plate numbers (one per line) to enable autocomplete suggestions in container operations.
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '15px' }}>
                        <div>
                            <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Driver Names</h4>
                            <textarea
                                value={driverNamesList}
                                onChange={(e) => setDriverNamesList(e.target.value)}
                                placeholder="Enter driver names, one per line&#10;e.g.,&#10;John Doe&#10;Jane Smith&#10;Bob Johnson"
                                style={{
                                    width: '100%',
                                    minHeight: '150px',
                                    padding: '10px',
                                    fontSize: '14px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                        
                        <div>
                            <h4 style={{ fontSize: '16px', marginBottom: '8px' }}>Truck Plate Numbers</h4>
                            <textarea
                                value={truckPlateNumbersList}
                                onChange={(e) => setTruckPlateNumbersList(e.target.value)}
                                placeholder="Enter plate numbers, one per line&#10;e.g.,&#10;ABC-1234&#10;XYZ-5678&#10;DEF-9012"
                                style={{
                                    width: '100%',
                                    minHeight: '150px',
                                    padding: '10px',
                                    fontSize: '14px',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>
                    
                    <p style={{ fontSize: '12px', color: '#999' }}>
                        Note: These lists are temporary and do not persist between sessions.
                    </p>
                </div>
            </div>
            
            <CompletionConfirmOverlay
                isOpen={showCompletionPrompt}
                heading="Trucking Complete"
                bodyText={`All containers have been returned to the yard.\nWould you like to mark PRO number: ${proNo} as Complete?\nThis will move it to the Finance department.`}
                onConfirm={() => handleTruckingCompletion(true)}
                onCancel={() => handleTruckingCompletion(false)}
            />
            
            <AddContainerOverlay
                isOpen={showAddContainerOverlay}
                onConfirm={handleAddContainerConfirm}
                onCancel={() => setShowAddContainerOverlay(false)}
            />
        </div>
    );
}


