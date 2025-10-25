import React, { useState, useEffect } from 'react';
import './ProfileHeader.css';
import StatusDropdown from './StatusDropdown';
import TruckingStatusDropdown from './TruckingStatusDropdown';
import FinanceStatusDropdown from './FinanceStatusDropdown';
import { getShipmentStatus } from '../services/supabase/shipmentStatus';
import { getFinanceStatus } from '../services/supabase/financeStatus';

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

export function ShipmentProfileHeader({ proNo, onBack, documents = [], onStatusChange }) {
    const [currentStatus, setCurrentStatus] = useState('ongoing');
    const [loading, setLoading] = useState(true);

    // Load current status from database
    useEffect(() => {
        const loadStatus = async () => {
            try {
                setLoading(true);
                const statusData = await getShipmentStatus(proNo);
                setCurrentStatus(statusData.status);
            } catch (error) {
                console.error('Error loading status:', error);
                setCurrentStatus('ongoing'); // Default fallback
            } finally {
                setLoading(false);
            }
        };

        loadStatus();
    }, [proNo]);

    const handleStatusChange = (newStatus) => {
        setCurrentStatus(newStatus);
        if (onStatusChange) {
            onStatusChange(newStatus);
        }
    };

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
                <StatusDropdown 
                    proNumber={proNo}
                    currentStatus={currentStatus}
                    onStatusChange={handleStatusChange}
                />
            </div>
            <div className="shipment-header-right">
                <div className="shipment-header-buttons">
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
                </div>
                <div className="shipment-header-search">
                    <i className="fi fi-rs-search"></i>
                    <input type="text" placeholder="Search" />
                </div>
            </div>
        </div>
    );
}
export function TruckingProfileHeader({ proNo, onBack, documents = [], onStatusChange, containerRefreshTrigger }) {
    const [currentStatus, setCurrentStatus] = useState('ongoing');
    const [loading, setLoading] = useState(true);

    // Load current status from database
    useEffect(() => {
        const loadStatus = async () => {
            try {
                setLoading(true);
                // For now, we'll determine status based on container operations
                // This can be enhanced to use a dedicated trucking status table later
                const { getTruckingTableData } = await import('../services/supabase/truckingStatus');
                const truckingData = await getTruckingTableData();
                const proData = truckingData.find(row => row.proNo === proNo);
                setCurrentStatus(proData?.rawStatus || 'ongoing');
            } catch (error) {
                console.error('Error loading trucking status:', error);
                setCurrentStatus('ongoing'); // Default fallback
            } finally {
                setLoading(false);
            }
        };

        loadStatus();
    }, [proNo]);

    const handleStatusChange = (newStatus) => {
        setCurrentStatus(newStatus);
        if (onStatusChange) {
            onStatusChange(newStatus);
        }
    };

    return (
        <div className="trucking-profile-header-bar">
            <div className="trucking-header-left">
                <span className="trucking-header-title">
                    PRO Number <span className="trucking-header-prono">{proNo}</span>
                </span>
                <TruckingStatusDropdown 
                    proNumber={proNo}
                    currentStatus={currentStatus}
                    onStatusChange={handleStatusChange}
                    refreshTrigger={containerRefreshTrigger}
                />
            </div>
            <div className="trucking-header-right">
                <div className="trucking-header-search">
                    <i className="fi fi-rs-search"></i>
                    <input type="text" placeholder="Search" />
                </div>
            </div>
        </div>
    );
}
export function FinanceProfileHeader({ proNo, onBack, onStatusChange, onSearch }) {
    const [currentStatus, setCurrentStatus] = useState('Unpaid');
    const [loading, setLoading] = useState(true);

    // Load current status from database
    useEffect(() => {
        const loadStatus = async () => {
            try {
                setLoading(true);
                const statusData = await getFinanceStatus(proNo);
                setCurrentStatus(statusData.status);
            } catch (error) {
                console.error('Error loading finance status:', error);
                setCurrentStatus('Unpaid'); // Default fallback
            } finally {
                setLoading(false);
            }
        };

        loadStatus();
    }, [proNo]);

    const handleStatusChange = (newStatus) => {
        setCurrentStatus(newStatus);
        if (onStatusChange) {
            onStatusChange(newStatus);
        }
    };

    const handleSearch = (e) => {
        if (onSearch) {
            onSearch(e.target.value);
        }
    };

    return (
        <div className="shipment-profile-header-bar">
            <div className="shipment-header-left">
                <span className="shipment-header-title">
                    PRO Number <span className="shipment-header-prono">{proNo}</span>
                </span>
                <FinanceStatusDropdown 
                    proNumber={proNo}
                    currentStatus={currentStatus}
                    onStatusChange={handleStatusChange}
                />
            </div>
            <div className="shipment-header-right">
                <div className="shipment-header-search">
                    <i className="fi fi-rs-search"></i>
                    <input type="text" placeholder="Search" onChange={handleSearch} />
                </div>
            </div>
        </div>
    );
} 