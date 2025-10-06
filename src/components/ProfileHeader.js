import React from 'react';
import './ProfileHeader.css';

export default function ProfileHeader({ proNo, onAddDocument, onSearch }) {
    return (
        <div className="profile-header-bar">
            <div>
                <span className="profile-header-title">
                    PRO Number <span className="profile-header-prono">{proNo}</span>
                </span>
            </div>
            <div className="profile-header-actions">
                <button className="profile-header-add-btn" onClick={onAddDocument}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>+</span> Add Document
                </button>
                <input className="profile-header-search" placeholder="Search" onChange={onSearch} />
            </div>
        </div>
    );
}

export function ShipmentProfileHeader(props) {
    return <ProfileHeader department="Shipment" {...props} />;
}
export function TruckingProfileHeader(props) {
    return <ProfileHeader department="Trucking" {...props} />;
}
export function FinanceProfileHeader(props) {
    return <ProfileHeader department="Finance" {...props} />;
} 