import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFinanceStatus, updateFinanceStatus } from '../services/supabase/financeStatus';
import { getReceiptsByPro } from '../services/supabase/financeReceipts';

const FinanceStatusDropdown = ({ proNumber, currentStatus, onStatusChange, onHighlightNoReceipts }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState(currentStatus || 'Unpaid');
    const [loading, setLoading] = useState(false);
    const [hasReceipts, setHasReceipts] = useState(false);
    const [checkingReceipts, setCheckingReceipts] = useState(true);
    const dropdownRef = useRef(null);
    const { user } = useAuth();

    const statusOptions = [
        { value: 'Unpaid', label: 'Unpaid', class: 'unpaid' },
        { value: 'Paid', label: 'Paid', class: 'paid' }
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
        setStatus(currentStatus || 'Unpaid');
    }, [currentStatus]);

    // Check if receipts exist for this PRO
    useEffect(() => {
        const checkReceipts = async () => {
            if (!proNumber) return;
            
            setCheckingReceipts(true);
            try {
                const receipts = await getReceiptsByPro(proNumber);
                setHasReceipts(receipts && receipts.length > 0);
            } catch (error) {
                console.error('Error checking receipts:', error);
                setHasReceipts(false);
            } finally {
                setCheckingReceipts(false);
            }
        };
        
        checkReceipts();
    }, [proNumber]);

    const handleStatusChange = async (newStatus) => {
        // Prevent selecting "Paid" status if no receipts exist
        if (newStatus === 'Paid' && !hasReceipts) {
            alert('Please create at least one receipt before marking as paid');
            setIsOpen(false);
            return;
        }

        if (newStatus === status) {
            setIsOpen(false);
            return;
        }

        try {
            setLoading(true);
            await updateFinanceStatus(proNumber, newStatus, user.id);
            setStatus(newStatus);
            setIsOpen(false);
            
            // Notify parent component
            if (onStatusChange) {
                onStatusChange(newStatus);
            }
        } catch (error) {
            console.error('Error updating finance status:', error);
            // You could add a toast notification here
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplayClass = (statusValue) => {
        const classMap = {
            'Unpaid': 'status-unpaid',
            'Paid': 'status-paid'
        };
        return classMap[statusValue] || 'status-unpaid';
    };

    return (
        <div className="status-dropdown-container" ref={dropdownRef}>
            <div 
                className={`status-display ${getStatusDisplayClass(status)} ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                style={{ opacity: loading ? 0.7 : 1 }}
            >
                {status}
                {loading && <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem' }}>...</span>}
            </div>
            
            {isOpen && (
                <div className="status-dropdown">
                    {statusOptions.map((option) => {
                        // Check if "Paid" status is disabled due to no receipts
                        const isPaidDisabled = option.value === 'Paid' && !hasReceipts;
                        const tooltipMessage = isPaidDisabled ? 'Create at least one receipt before marking as paid' : '';

                        return (
                            <div
                                key={option.value}
                                className={`status-option ${option.value === status ? 'selected' : ''} ${isPaidDisabled ? 'disabled' : ''}`}
                                onClick={() => !isPaidDisabled && handleStatusChange(option.value)}
                                onMouseEnter={() => {
                                    if (isPaidDisabled && onHighlightNoReceipts) {
                                        onHighlightNoReceipts(true);
                                    }
                                }}
                                onMouseLeave={() => {
                                    if (isPaidDisabled && onHighlightNoReceipts) {
                                        onHighlightNoReceipts(false);
                                    }
                                }}
                                style={{
                                    opacity: isPaidDisabled ? 0.5 : 1,
                                    cursor: isPaidDisabled ? 'not-allowed' : 'pointer',
                                    pointerEvents: isPaidDisabled ? 'auto' : 'auto'
                                }}
                                title={tooltipMessage}
                            >
                                <div className={`status-option-icon ${option.class}`}></div>
                                {option.label}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default FinanceStatusDropdown;
