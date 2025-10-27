import React, { useState, useEffect, useRef } from 'react';
import { updateTruckingCompletionStatus } from '../services/supabase/truckingStatus';
import { supabase } from '../services/supabase/client';

const TruckingStatusDropdown = ({ proNumber, currentStatus, onStatusChange, refreshTrigger, onHighlightContainers }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState(currentStatus || 'ongoing');
    const [loading, setLoading] = useState(false);
    const [allContainersReturned, setAllContainersReturned] = useState(false);
    const [checkingContainers, setCheckingContainers] = useState(false);
    const [nonReturnedContainerIds, setNonReturnedContainerIds] = useState([]);
    const dropdownRef = useRef(null);

    // Update local state when currentStatus prop changes
    useEffect(() => {
        setStatus(currentStatus || 'ongoing');
    }, [currentStatus]);

    // Check if all containers are returned when component mounts, proNumber changes, or refreshTrigger changes
    useEffect(() => {
        const checkContainers = async () => {
            if (!proNumber) return;
            
            setCheckingContainers(true);
            try {
                // Get container operations to check which ones are not returned
                const { data: operations, error } = await supabase
                    .from('container_operations')
                    .select('id, status')
                    .eq('pro_number', proNumber);
                
                if (error) throw error;
                
                const allReturned = operations.every(op => op.status === 'returned');
                setAllContainersReturned(allReturned);
                
                // Track which container IDs are not returned
                const nonReturnedIds = operations
                    .filter(op => op.status !== 'returned')
                    .map(op => op.id);
                setNonReturnedContainerIds(nonReturnedIds);
                
                console.log(`[TruckingStatusDropdown] PRO ${proNumber}: All containers returned: ${allReturned}, Non-returned IDs:`, nonReturnedIds);
            } catch (error) {
                console.error('Error checking container status:', error);
                setAllContainersReturned(false);
            } finally {
                setCheckingContainers(false);
            }
        };

        checkContainers();
    }, [proNumber, refreshTrigger]);

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

    const statusOptions = [
        { value: 'ongoing', label: 'Ongoing', class: 'ongoing' },
        { value: 'completed', label: 'Completed', class: 'completed' }
    ];

    const handleStatusChange = async (newStatus) => {
        if (newStatus === status) {
            setIsOpen(false);
            return;
        }

        // Validate: Cannot set to completed unless all containers are returned
        if (newStatus === 'completed' && !allContainersReturned) {
            alert('Cannot mark as completed. All containers must be returned first.');
            setIsOpen(false);
            return;
        }

        setLoading(true);
        try {
            // Get current user ID
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;
            
            if (!userId) {
                throw new Error('User not authenticated');
            }
            
            // Update in database
            await updateTruckingCompletionStatus(proNumber, newStatus, userId);
            
            // Update local state
            setStatus(newStatus);
            
            // Notify parent component
            if (onStatusChange) {
                onStatusChange(newStatus);
            }
            
            setIsOpen(false);
        } catch (error) {
            console.error('Error updating trucking status:', error);
            // Revert local state on error
            setStatus(status);
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplayClass = (statusValue) => {
        const classMap = {
            'ongoing': 'status-ongoing',
            'completed': 'status-completed'
        };
        return classMap[statusValue] || 'status-ongoing';
    };

    const formatStatusForDisplay = (statusValue) => {
        const statusMap = {
            'ongoing': 'Ongoing',
            'completed': 'Completed'
        };
        return statusMap[statusValue] || 'Ongoing';
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
                    {statusOptions.map((option) => {
                        const isDisabled = option.value === 'completed' && !allContainersReturned;
                        return (
                            <div
                                key={option.value}
                                className={`status-option ${option.value === status ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                onClick={() => !isDisabled && handleStatusChange(option.value)}
                                onMouseEnter={() => {
                                    if (isDisabled && onHighlightContainers && nonReturnedContainerIds.length > 0) {
                                        onHighlightContainers(nonReturnedContainerIds);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (isDisabled && onHighlightContainers) {
                                        onHighlightContainers([]);
                                    }
                                }}
                                style={{ 
                                    opacity: isDisabled ? 0.5 : 1,
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    pointerEvents: 'auto'
                                }}
                                title={isDisabled ? 'All containers must be returned first' : ''}
                            >
                                <div className={`status-option-icon ${option.class}`}></div>
                                {option.label}
                                {isDisabled && <span style={{ fontSize: '0.8rem', marginLeft: '0.5rem' }}>(Locked)</span>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default TruckingStatusDropdown;