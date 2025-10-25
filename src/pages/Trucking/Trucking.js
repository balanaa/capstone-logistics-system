import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TruckingPieChart from "../../components/PieCharts/TruckingPieChart";
import ContainerStatusPieChart from "../../components/PieCharts/ContainerStatusPieChart";
import DepartmentMain from '../../components/departments/DepartmentMain';
import { ProDocumentListContext } from '../../App';
import { getTruckingTableData, getConsigneeNameForPro } from '../../services/supabase/truckingStatus';

// Component for the 2 charts in dept-top (RemindersPanel is the 3rd sibling)
function TruckingTopCharts() {
    return (
        <>
            <ContainerStatusPieChart />
            <TruckingPieChart />
        </>
    );
}


const Trucking = () => {
    const navigate = useNavigate();
    const { proDocumentList } = useContext(ProDocumentListContext);
    
    // Table data state
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tableError, setTableError] = useState(null);

    // Mock reminders data for Trucking - Storage and Detention warnings
    const truckingReminders = [
        {
            title: 'Storage Warning',
            proNo: '2025001',
            deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day from now
        },
        {
            title: 'Detention Warning',
            proNo: '2025002',
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
        },
        {
            title: 'Storage Warning',
            proNo: '2025003',
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
        },
        {
            title: 'Detention Warning',
            proNo: '2025004',
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
        }
    ];

    // Load trucking table data
    useEffect(() => {
        const loadTableData = async () => {
            try {
                setLoading(true);
                const data = await getTruckingTableData();
                
                // Enhance data with consignee names
                const enhancedData = await Promise.all(
                    data.map(async (row) => {
                        console.log(`[Trucking] Processing row for PRO ${row.proNo}:`, row);
                        const consigneeName = await getConsigneeNameForPro(row.proNo);
                        console.log(`[Trucking] Enhanced consigneeName for PRO ${row.proNo}:`, consigneeName);
                        return { ...row, consigneeName };
                    })
                );
                
                console.log('[Trucking] Final enhanced data:', enhancedData);
                setTableData(enhancedData);
                setTableError(null);
            } catch (err) {
                console.error('Error loading trucking data:', err);
                setTableError('Failed to load trucking data');
                setTableData([]);
            } finally {
                setLoading(false);
            }
        };
        
        loadTableData();
    }, [proDocumentList]);


    const handleAddRecord = () => {
        // For now, just show a message - this could navigate to a form
        alert('Add new trucking record functionality will be implemented');
    };

    const handleRowClick = (row) => {
        navigate(`/trucking/pro-number/${row.proNo}`);
    };

    // Define columns for the trucking table
    const columns = [
        { key: 'proNo', label: 'PRO No' },
        { key: 'consigneeName', label: 'Consignee' },
        { key: 'portOfDischarge', label: 'Port of Discharge' },
        { key: 'placeOfDelivery', label: 'Place of Delivery' },
        { key: 'shippingLine', label: 'Shipping Line' },
        { key: 'containerNoSealNo', label: 'Container No Seal No' },
        { key: 'emptyReturnLocation', label: 'Empty Return Location' },
        { key: 'detentionStart', label: 'Detention Start' },
        { key: 'createdOn', label: 'Created On' },
        { key: 'status', label: 'Status' }
    ];

    return (
        <DepartmentMain
            title="Trucking"
            PieChartComponent={TruckingTopCharts} // Custom component with 3 charts
            reminders={truckingReminders}
            columns={columns}
            rows={tableData}
            onAdd={handleAddRecord}
            showAddButton={false}
            routePrefix="/trucking"
            loading={loading}
            proKey="proNo"
            dateField="createdOn"
            searchKeys={['proNo', 'consigneeName', 'portOfDischarge', 'placeOfDelivery']}
            rowsPerPage={10}
            onOpenProfile={handleRowClick}
            isTruckingThreeCharts={true}
        />
    );
};

export default Trucking;


