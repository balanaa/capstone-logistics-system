import { useParams, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import Department from '../../components/Department';
import { TruckingProfileHeader } from '../../components/ProfileHeader';
import { ProDocumentListContext } from '../../App';

export default function TruckingProfile() {
    const { proNo } = useParams();
    const navigate = useNavigate();
    const { proDocumentList, setProDocumentList } = useContext(ProDocumentListContext);

    const handleBack = () => {
        navigate('/trucking');
    };

    return (
        <div>
            <TruckingProfileHeader proNo={proNo} onBack={handleBack} />
            <div style={{ overflowY: 'auto', paddingRight: 8 }}>
                <Department 
                    name="trucking"
                    proNo={proNo}
                    proDocumentList={proDocumentList}
                    setProDocumentList={setProDocumentList}
                />
            </div>
        </div>
    );
}


