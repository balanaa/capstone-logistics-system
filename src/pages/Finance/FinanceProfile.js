import { useParams, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import Department from '../../components/Department';
import { FinanceProfileHeader } from '../../components/ProfileHeader';
import { ProDocumentListContext } from '../../App';

export default function FinanceProfile() {
    const { proNo } = useParams();
    const navigate = useNavigate();
    const { proDocumentList, setProDocumentList } = useContext(ProDocumentListContext);

    const handleBack = () => {
        navigate('/finance');
    };

    return (
        <div>
            <FinanceProfileHeader proNo={proNo} onBack={handleBack} />
            <div style={{ overflowY: 'auto', paddingRight: 8 }}>
                <Department 
                    name="finance"
                    proNo={proNo}
                    proDocumentList={proDocumentList}
                    setProDocumentList={setProDocumentList}
                />
            </div>
        </div>
    );
}


