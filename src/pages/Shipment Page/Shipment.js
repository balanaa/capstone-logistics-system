import { useState, useContext, useEffect } from 'react';
import ShipmentPieChart from "../../components/PieCharts/ShipmentPieChart";
import Department from '../../components/Department';
import { ProfileContext, ProDocumentListContext } from '../../App';
import { ShipmentProfileHeader } from '../../components/ProfileHeader';
import './ShipmentTable.css'; // Add a new CSS file for table styling

// New: Profile heading component for Shipment
function ShipmentProfile({ proNo, proDocumentList, setProDocumentList, onBack }) {
    return (
        <div>
            <ShipmentProfileHeader proNo={proNo} onBack={onBack} />
            <div style={{ overflowY: 'auto', paddingRight: 8 }}>
                <Department 
                    name="shipment"
                    proNo={proNo}
                    proDocumentList={proDocumentList}
                    setProDocumentList={setProDocumentList}
                />
            </div>
        </div>
    );
}

const Shipment = () => {
    const [profileProNo, setProfileProNo] = useState(null); // null = show table, otherwise show profile
    const { setProfile } = useContext(ProfileContext);
    const { proDocumentList, setProDocumentList } = useContext(ProDocumentListContext);
    const [search, setSearch] = useState('');

    const proNumbers = proDocumentList.map(pro => pro.proNo).filter(proNo => proNo.toLowerCase().includes(search.toLowerCase()));

    // Set/unset profile state for header (fix infinite loop)
    useEffect(() => {
        if (profileProNo) {
            setProfile && setProfile({ department: 'shipment', proNo: profileProNo });
        } else {
            setProfile && setProfile(null);
        }
    }, [profileProNo, setProfile]);

    return (
        <div>
            {!profileProNo && <ShipmentPieChart />}
            {profileProNo ? (
                <ShipmentProfile 
                    proNo={profileProNo} 
                    proDocumentList={proDocumentList}
                    setProDocumentList={setProDocumentList}
                    onBack={() => setProfileProNo(null)}
                />
            ) : (
                <div className="shipment-table-container">
                    <div className="shipment-table-header-row">
                        <h2 className="shipment-table-title">Shipment List</h2>
                        <button className="shipment-table-add-btn">
                            <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>+</span> Create New Record
                        </button>
                        <input
                            className="shipment-table-search"
                            placeholder="Search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <table className="shipment-table">
                        <thead>
                            <tr>
                                <th style={{ width: '120px' }}>Profile</th>
                                <th>PRO Number</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proNumbers.map((proNo) => (
                                <tr key={proNo}>
                                    <td>
                                        <button onClick={() => setProfileProNo(proNo)} className="shipment-table-profile-btn">Profile</button>
                                    </td>
                                    <td>{proNo}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Shipment;