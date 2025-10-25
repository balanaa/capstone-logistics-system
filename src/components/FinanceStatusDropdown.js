import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFinanceStatus, updateFinanceStatus } from '../services/supabase/financeStatus';

const FinanceStatusDropdown = ({ proNumber, currentStatus, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState(currentStatus || 'Unpaid');
    const [loading, setLoading] = useState(false);
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

    const handleStatusChange = async (newStatus) => {
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

export default FinanceStatusDropdown;
