import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FinancePieChart from "../../components/PieCharts/FinancePieChart";
import DepartmentMain from '../../components/departments/DepartmentMain';
import { ProfileContext } from '../../App';
import { getFinanceTableData } from '../../services/supabase/finance';

const Finance = () => {
    const navigate = useNavigate();
    const { setProfile } = useContext(ProfileContext);
    const [financeData, setFinanceData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Mock reminders data for Finance
    const financeReminders = [
        {
            title: 'Follow up payment',
            proNo: '2025001',
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
        },
        {
            title: 'Send invoice',
            proNo: '2025002', 
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days from now
        },
        {
            title: 'Review payments',
            proNo: '2025003',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        }
    ];

    // Fetch completed trucking PROs for finance
    useEffect(() => {
        const fetchFinanceData = async () => {
            try {
                setLoading(true);
                const data = await getFinanceTableData();
                setFinanceData(data.filter(item => item !== null)); // Remove null items
            } catch (err) {
                console.error('Error fetching finance data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFinanceData();
    }, []);

    // Define table columns for TableList component
    const columns = [
        { key: 'proNo', label: 'PRO No' },
        { key: 'blNo', label: 'B/L No' },
        { key: 'registryNo', label: 'Registry No' },
        { key: 'consignee', label: 'Consignee' },
        { key: 'containerSpecs', label: 'Container Specs' },
        { key: 'numberAndKindOfPackage', label: 'Number and Kind of Package' },
        { key: 'vessel', label: 'Vessel' },
        { key: 'containerNoSealNo', label: 'Container No and Seal No' },
        { key: 'createdOn', label: 'Created On' },
        { key: 'status', label: 'Status' }
    ];

    // Handle opening profile - use navigation instead of state
    const handleOpenProfile = (row) => {
        navigate(`/finance/pro-number/${row.proNo}`);
    };

    // Set profile context for finance department
    useEffect(() => {
        setProfile && setProfile({ department: 'finance', proNo: null });
    }, [setProfile]);

    return (
        <DepartmentMain
            title="Finance"
            PieChartComponent={FinancePieChart}
            reminders={financeReminders}
            columns={columns}
            rows={financeData}
            onAdd={() => {}} // No add functionality for finance
            showAddButton={false}
            routePrefix="/finance"
            loading={loading}
            proKey="proNo"
            dateField="createdOn"
            searchKeys={['proNo', 'blNo', 'consignee', 'registryNo']}
            rowsPerPage={10}
            onOpenProfile={handleOpenProfile}
        />
    );
};

export default Finance;


