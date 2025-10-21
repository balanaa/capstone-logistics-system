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

export function ShipmentProfileHeader({ proNo, onBack, documents = [] }) {
    // Check if required documents are present
    const hasBOL = documents.some(doc => doc.documentType === 'bill_of_lading');
    const hasInvoice = documents.some(doc => doc.documentType === 'invoice');
    const hasPackingList = documents.some(doc => doc.documentType === 'packing_list');
    
    // Create Entry Form is enabled when BOL, Invoice, and Packing List are all present
    const canCreateEntryForm = hasBOL && hasInvoice && hasPackingList;
    
    // Create Container Guaranty is enabled after Create Entry Form is completed
    // For now, we'll assume it's enabled when all documents are present
    // This logic can be updated when Entry Form functionality is implemented
    const canCreateContainerGuaranty = canCreateEntryForm;

    return (
        <div className="shipment-profile-header-bar">
            <div className="shipment-header-left">
                <span className="shipment-header-title">
                    PRO Number <span className="shipment-header-prono">{proNo}</span>
                </span>
            </div>
            <div className="shipment-header-right">
                <button 
                    className={`shipment-header-btn ${canCreateEntryForm ? 'enabled' : 'disabled'}`}
                    disabled={!canCreateEntryForm}
                    onClick={() => {
                        if (canCreateEntryForm) {
                            // TODO: Implement Create Entry Form functionality
                            console.log('Create Entry Form clicked');
                        }
                    }}
                >
                    <span className="btn-icon">+</span>
                    Create Entry Form
                </button>
                <button 
                    className={`shipment-header-btn ${canCreateContainerGuaranty ? 'enabled' : 'disabled'}`}
                    disabled={!canCreateContainerGuaranty}
                    onClick={() => {
                        if (canCreateContainerGuaranty) {
                            // TODO: Implement Create Container Guaranty functionality
                            console.log('Create Container Guaranty clicked');
                        }
                    }}
                >
                    <span className="btn-icon">+</span>
                    Create Container Guaranty
                </button>
                <div className="shipment-header-search">
                    <i className="fi fi-rs-search"></i>
                    <input type="text" placeholder="Search" />
                </div>
            </div>
        </div>
    );
}
export function TruckingProfileHeader(props) {
    return <ProfileHeader department="Trucking" {...props} />;
}
export function FinanceProfileHeader(props) {
    return <ProfileHeader department="Finance" {...props} />;
} 