import React, { useState, useEffect, useRef } from 'react';
import { updateContainerOperation } from '../services/supabase/containerOperations';
import { supabase } from '../services/supabase/client';

const ContainerStatusDropdown = ({ operationId, currentStatus, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState(currentStatus || 'booking');
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);

    // Update local status when currentStatus prop changes
    React.useEffect(() => {
        setStatus(currentStatus || 'booking');
    }, [currentStatus]);

    const statusOptions = [
        { value: 'booking', label: 'Booking', class: 'booking' },
        { value: 'delivering', label: 'Delivering', class: 'delivering' },
        { value: 'returned', label: 'Returned', class: 'returned' }
    ];

    // Close dropdown when clicking outside
    React.useEffect(() => {
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

    const handleStatusChange = async (newStatus) => {
        if (newStatus === status) {
            setIsOpen(false);
            return;
        }

        try {
            setLoading(true);
            // Get current user ID
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;
            
            if (!userId) {
                throw new Error('User not authenticated');
            }
            
            await updateContainerOperation(operationId, { status: newStatus }, userId);
            setStatus(newStatus);
            setIsOpen(false);
            
            // Notify parent component
            if (onStatusChange) {
                onStatusChange(newStatus);
            }
        } catch (error) {
            console.error('Error updating container status:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplayClass = (statusValue) => {
        const classMap = {
            'booking': 'container-status-booking',
            'delivering': 'container-status-delivering',
            'returned': 'container-status-returned'
        };
        return classMap[statusValue] || 'container-status-booking';
    };

    const formatStatusForDisplay = (statusValue) => {
        const statusMap = {
            'booking': 'Booking',
            'delivering': 'Delivering',
            'returned': 'Returned'
        };
        return statusMap[statusValue] || 'Booking';
    };

    return (
        <div className="container-status-dropdown-container" ref={dropdownRef}>
            <div 
                className={`container-status-display ${getStatusDisplayClass(status)} ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ opacity: loading ? 0.7 : 1 }}
            >
                {formatStatusForDisplay(status)}
                {loading && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>...</span>}
            </div>
            
            {isOpen && (
                <div className="container-status-dropdown">
                    {statusOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`container-status-option ${option.value === status ? 'selected' : ''}`}
                            onClick={() => handleStatusChange(option.value)}
                        >
                            <div className={`container-status-option-icon ${option.class}`}></div>
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ContainerStatusDropdown;
