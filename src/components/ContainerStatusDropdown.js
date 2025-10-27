import React, { useState, useEffect, useRef } from 'react';
import { updateContainerOperation } from '../services/supabase/containerOperations';
import { supabase } from '../services/supabase/client';

const ContainerStatusDropdown = ({ 
    operationId, 
    currentStatus, 
    onStatusChange, 
    returnDate,
    departureDate,
    driver,
    truckPlateNumber,
    onHighlightMissingFields
}) => {
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
        // Prevent selecting "delivering" status if requirements not met
        if (newStatus === 'delivering' && (!departureDate || !driver || !truckPlateNumber)) {
            alert('Please set departure date, driver, and plate number first to mark as delivering');
            setIsOpen(false);
            return;
        }
        
        // Prevent selecting "returned" status if return date is not set
        if (newStatus === 'returned' && !returnDate) {
            alert('Please set return date first to mark as returned');
            setIsOpen(false);
            return;
        }
        
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
                    {statusOptions.map((option) => {
                        // Check if status is disabled based on requirements
                        const isDeliveringDisabled = option.value === 'delivering' && (!departureDate || !driver || !truckPlateNumber);
                        const isReturnedDisabled = option.value === 'returned' && !returnDate;
                        const isDisabled = isDeliveringDisabled || isReturnedDisabled;
                        
                        // Get tooltip message
                        let tooltipMessage = '';
                        if (isDeliveringDisabled) {
                            tooltipMessage = 'Set departure date, driver, and plate number first';
                        } else if (isReturnedDisabled) {
                            tooltipMessage = 'Set return date first to mark as returned';
                        }
                        
                        // Determine which fields are missing for highlighting
                        const getMissingFields = () => {
                            const missing = [];
                            if (option.value === 'delivering' || option.value === 'returned') {
                                if (!departureDate) missing.push('departure_date_from_port');
                                if (!driver) missing.push('driver');
                                if (!truckPlateNumber) missing.push('truck_plate_number');
                            }
                            if (option.value === 'returned' && !returnDate) {
                                missing.push('date_of_return_to_yard');
                            }
                            return missing;
                        };
                        
                        return (
                            <div
                                key={option.value}
                                className={`container-status-option ${option.value === status ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                onClick={() => !isDisabled && handleStatusChange(option.value)}
                                onMouseEnter={() => {
                                    if (isDisabled && onHighlightMissingFields) {
                                        onHighlightMissingFields(getMissingFields());
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (isDisabled && onHighlightMissingFields) {
                                        onHighlightMissingFields([]);
                                    }
                                }}
                                style={{ 
                                    opacity: isDisabled ? 0.5 : 1,
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    pointerEvents: isDisabled ? 'auto' : 'auto'
                                }}
                                title={tooltipMessage}
                            >
                                <div className={`container-status-option-icon ${option.class}`}></div>
                                {option.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ContainerStatusDropdown;
