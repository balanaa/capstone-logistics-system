import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ShipmentPieChart from "../../components/PieCharts/ShipmentPieChart";
import DepartmentMain from '../../components/departments/DepartmentMain'
import CreateShipmentOverlay from '../../components/overlays/CreateShipmentOverlay'
import { ProDocumentListContext } from '../../App'
import DocumentEditOverlay from '../../components/overlays/DocumentEditOverlay'
import { supabase } from '../../services/supabase/client'
import { upsertPro, insertDocument, insertDocumentFields, fetchShipmentTableData } from '../../services/supabase/documents'

const Shipment = () => {
    const navigate = useNavigate();
    const { proDocumentList } = useContext(ProDocumentListContext)
    
    // State for table data
    const [tableData, setTableData] = useState([])
    const [loading, setLoading] = useState(true)
    const [tableError, setTableError] = useState(null)

    // Fetch table data from database
    useEffect(() => {
        const loadTableData = async () => {
            try {
                setLoading(true)
                const data = await fetchShipmentTableData()
                setTableData(data)
                setTableError(null)
            } catch (err) {
                console.error('Error loading shipment data:', err)
                setTableError('Failed to load shipment data')
                // Fallback to context data if available
                if (proDocumentList && proDocumentList.length > 0) {
                    const fallbackData = proDocumentList.map(item => ({
                        id: item.proNo,
                        proNo: item.proNo,
                        blNo: item.documents?.find(d => d.type === 'Bill of Lading')?.data?.find(f => f.label === 'B/L No.')?.info || '-',
                        consignee: '-',
                        shippingLine: '-',
                        eta: item.documents?.find(d => d.type === 'Bill of Lading')?.data?.find(f => f.label === 'ETA')?.info || '-',
                        placeOfDelivery: item.documents?.find(d => d.type === 'Bill of Lading')?.data?.find(f => f.label === 'Port of Discharge')?.info || '-',
                        containerNo: item.documents?.find(d => d.type === 'Bill of Lading')?.data?.find(f => f.label === 'Container No.')?.info || '-',
                        documentsRecorded: item.documents?.length ? `${item.documents.length} documents` : '-',
                        createdOn: '2025-10-01',
                        status: 'Ongoing'
                    }))
                    setTableData(fallbackData)
                }
            } finally {
                setLoading(false)
            }
        }
        
        loadTableData()
    }, [proDocumentList])

    const columns = [
        { key: 'proNo', label: 'PRO No.' },
        { key: 'blNo', label: 'B/L No.' },
        { key: 'consignee', label: 'Consignee' },
        { key: 'shippingLine', label: 'Shipping Line' },
        { key: 'eta', label: 'ETA' },
        { key: 'placeOfDelivery', label: 'Place of Delivery' },
        { key: 'containerNo', label: 'Container No.' },
        { key: 'documentsRecorded', label: 'Documents Recorded' },
        { key: 'createdOn', label: 'Created On' },
        { key: 'status', label: 'Status' }
    ]

    const reminders = [
        { title: 'Detention', proNo: 'PRO-0001', deadline: new Date(Date.now() + 2*24*60*60*1000).toISOString() },
        { title: 'Storage', proNo: 'PRO-0002', deadline: new Date(Date.now() + 6*60*60*1000).toISOString() },
        { title: 'ETA Update', proNo: 'PRO-0003', deadline: new Date(Date.now() + 45*60*1000).toISOString() }
    ]

    const [overlayOpen, setOverlayOpen] = React.useState(false)
    const [pendingBOL, setPendingBOL] = React.useState(null)
    const [openStep2, setOpenStep2] = React.useState(false)
    const [uploading, setUploading] = React.useState(false)
    const [error, setError] = React.useState('')

    const handleAddDocument = () => {
        setOverlayOpen(true)
    }

    const handleConfirmOverlay = ({ proNumber, file, previewUrl, originalFileName }) => {
        console.log('Shipment handleConfirmOverlay called:', { proNumber, file, previewUrl, originalFileName })
        setPendingBOL({ proNumber, file, previewUrl, originalFileName })
        setOverlayOpen(false)
        setOpenStep2(true)
    }

    const handleSubmitStep2 = async (values, pairs) => {
        if (!pendingBOL?.file) { setOpenStep2(false); return }
        setUploading(true); setError('')
        try {
            // 1) Upload storage file
            const d = new Date();
            const HH = String(d.getHours()).padStart(2, '0');
            const MM = String(d.getMinutes()).padStart(2, '0');
            const SS = String(d.getSeconds()).padStart(2, '0');
            const timeTag = `${HH}${MM}${SS}`;
            const safePro = String(pendingBOL.proNumber).replace(/[^a-zA-Z0-9._-]/g, '_');
            const safeName = pendingBOL.originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `shipment/${timeTag}-${safePro}-bol-${safeName}`;
            const { error: upErr } = await supabase.storage
              .from('documents')
              .upload(path, pendingBOL.file, { upsert: false, contentType: pendingBOL.file.type });
            if (upErr) throw upErr

            // 2) Upsert pro
            await upsertPro(pendingBOL.proNumber)

            // 3) Insert document row
            const { data: sess } = await supabase.auth.getSession()
            const userId = sess?.session?.user?.id
            const documentId = await insertDocument({
                proNumber: pendingBOL.proNumber,
                department: 'shipment',
                documentType: 'bill_of_lading',
                filePath: path,
                uploadedBy: userId
            })

            // 4) Insert document_fields for BOL
            const fieldRows = []
            const pushText = (key, val) => {
                if (val === undefined || val === null || val === '') return
                fieldRows.push({ canonical_key: key, raw_value: String(val) })
            }
            const pushNumber = (key, val) => {
                if (val === undefined || val === null || String(val) === '') return
                const num = Number(val)
                if (!Number.isFinite(num)) return
                fieldRows.push({ canonical_key: key, value_number: num })
            }
            // map values
            pushText('bl_number', values.bl_number)
            pushText('shipper', values.shipper)
            pushText('consignee', values.consignee)
            pushText('shipping_line', values.shipping_line)
            pushText('vessel_name', values.vessel_name)
            pushText('voyage_no', values.voyage_no)
            pushText('port_of_loading', values.port_of_loading)
            pushText('port_of_discharge', values.port_of_discharge)
            // Auto-derive place_of_delivery from consignee (SUBIC/CLARK/MANILA)
            const derivePlaceOfDelivery = (text) => {
                if (!text) return ''
                const t = String(text).toUpperCase()
                if (t.includes('SUBIC')) return 'SUBIC'
                if (t.includes('CLARK')) return 'CLARK'
                return 'MANILA'
            }
            const derivedPod = derivePlaceOfDelivery(values.consignee)
            if (derivedPod) pushText('place_of_delivery', derivedPod)
            pushText('container_specs', values.container_specs)
            pushNumber('no_of_packages', values.no_of_packages)
            pushText('packaging_kind', values.packaging_kind)
            pushText('goods_classification', values.goods_classification)
            pushText('description_of_goods', values.description_of_goods)
            pushNumber('gross_weight', values.gross_weight)
            if (Array.isArray(pairs) && pairs.length) {
                try {
                    const json = JSON.stringify(pairs.map(p => ({ containerNo: p.left || '', sealNo: p.right || '' })))
                    fieldRows.push({ canonical_key: 'container_seal_pairs', raw_value: json })
                } catch (_e) {}
            }
            await insertDocumentFields(documentId, fieldRows)

            // 5) Navigate to profile
            const p = pendingBOL.proNumber
            setOpenStep2(false)
            setPendingBOL(null)
            navigate(`/shipment/pro-number/${p}`)
        } catch (e) {
            setError(e?.message || 'Save failed')
        } finally {
            setUploading(false)
        }
    }

    return (
        <>
            <DepartmentMain
                title="Shipment"
                PieChartComponent={ShipmentPieChart}
                reminders={reminders}
                columns={columns}
                rows={tableData}
                onAdd={handleAddDocument}
                routePrefix="/shipment"
                loading={loading}
            />
            <CreateShipmentOverlay
                open={overlayOpen}
                onClose={() => setOverlayOpen(false)}
                onConfirm={handleConfirmOverlay}
                existingProNos={(proDocumentList || []).map(p => p.proNo)}
            />
            {openStep2 && (
                <DocumentEditOverlay
                    title={'Bill of Lading'}
                    fileUrl={pendingBOL?.previewUrl}
                    fileName={pendingBOL?.originalFileName}
                    onClose={() => { setOpenStep2(false); setPendingBOL(null) }}
                    onSubmit={handleSubmitStep2}
                    fields={[
                        { key: 'bl_number', label: 'B/L No.', type: 'text' },
                        { key: 'shipper', label: 'Shipper', type: 'textarea' },
                        { key: 'consignee', label: 'Consignee', type: 'textarea' },
                        { key: 'shipping_line', label: 'Shipping Line', type: 'text' },
                        { key: 'vessel_name', label: 'Vessel Name', type: 'text' },
                        { key: 'voyage_no', label: 'Voyage No.', type: 'text' },
                        { key: 'port_of_loading', label: 'Port of Loading', type: 'text' },
                        { key: 'port_of_discharge', label: 'Port of Discharge', type: 'text' },
                        // Place of delivery removed (auto-derived later)
                        // Insert Container/Seal pairs after this key below via insertPairsAfterKey
                        { key: 'container_specs', label: 'Container Specs', type: 'text' },
                        { key: 'no_of_packages', label: 'No. of Packages', type: 'number' },
                        { key: 'packaging_kind', label: 'Packaging Kind', type: 'text' },
                        { key: 'goods_classification', label: 'Goods Classification', type: 'text' },
                        { key: 'description_of_goods', label: 'Description of Goods', type: 'textarea' },
                        { key: 'gross_weight', label: 'Gross Weight (KGS)', type: 'number' },
                    ]}
                    dynamicPairs={{ key: 'container_seal_pairs', labelLeft: 'Container No.', labelRight: 'Seal No.', entries: [{ left: '', right: '' }] }}
                    insertPairsAfterKey={'port_of_discharge'}
                    sampleValues={{
                        bl_number: 'OAKMNA02514',
                        shipper: 'ACME EXPORTS INC.\n123 Harbor Road\nOakland, CA 94607',
                        consignee: 'DEEGEE IMPORTS\nLot 5, Freeport Area\nSubic Bay, PH',
                        shipping_line: 'ONE',
                        vessel_name: 'YM UNICORN',
                        voyage_no: '059W',
                        port_of_loading: 'OAKLAND, CA',
                        port_of_discharge: 'MANILA, PH',
                        container_specs: "1x40' HC",
                        no_of_packages: 500,
                        packaging_kind: 'CARTONS',
                        goods_classification: 'GROCERY ITEMS',
                        description_of_goods: 'ASSORTED PACKAGED FOOD ITEMS',
                        gross_weight: 12345
                    }}
                    samplePairs={[{ left: 'YMLU1234567', right: 'SEAL987654' }]}
                />
            )}
            {uploading && <div style={{ position:'fixed', bottom:12, right:12, background:'#000', color:'#fff', padding:'8px 12px', borderRadius:8 }}>Uploading…</div>}
            {error && <div style={{ position:'fixed', bottom:12, left:12, background:'#b00020', color:'#fff', padding:'8px 12px', borderRadius:8 }}>{error}</div>}
        </>
    );
};

export default Shipment;


