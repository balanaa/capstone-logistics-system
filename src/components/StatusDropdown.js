import React, { useState, useEffect, useRef } from 'react';
import { updateShipmentStatus, formatStatusForDisplay, getStatusClass } from '../services/supabase/shipmentStatus';
import { useAuth } from '../context/AuthContext';

const StatusDropdown = ({ proNumber, currentStatus, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState(currentStatus || 'ongoing');
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const { user } = useAuth();

    const statusOptions = [
        { value: 'ongoing', label: 'Ongoing', class: 'ongoing' },
        { value: 'filed_boc', label: 'Filed BoC', class: 'filed-boc' },
        { value: 'completed', label: 'Completed', class: 'completed' }
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Update local status when prop changes
    useEffect(() => {
        setStatus(currentStatus || 'ongoing');
    }, [currentStatus]);

    const handleStatusChange = async (newStatus) => {
        if (newStatus === status) {
            setIsOpen(false);
            return;
        }

        try {
            setLoading(true);
            await updateShipmentStatus(proNumber, newStatus, user.id);
            setStatus(newStatus);
            setIsOpen(false);
            
            // Notify parent component
            if (onStatusChange) {
                onStatusChange(newStatus);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            // You could add a toast notification here
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplayClass = (statusValue) => {
        const classMap = {
            'ongoing': 'status-ongoing',
            'filed_boc': 'status-filed-boc',
            'completed': 'status-complete'
        };
        return classMap[statusValue] || 'status-pending';
    };

    return (
        <div className="status-dropdown-container" ref={dropdownRef}>
            <div 
                className={`status-display ${getStatusDisplayClass(status)} ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ opacity: loading ? 0.7 : 1 }}
            >
                {formatStatusForDisplay(status)}
                {loading && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>...</span>}
            </div>
            
            {isOpen && (
                <div className="status-dropdown">
                    {statusOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`status-option ${option.value === status ? 'selected' : ''}`}
                            onClick={() => handleStatusChange(option.value)}
                        >
                            <div className={`status-option-icon ${option.class}`}></div>
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StatusDropdown;
