import React, { useState, useEffect } from 'react';
import VerifyPieChart from '../../components/PieCharts/VerifierPieChart';
import RemindersPanel from '../../components/departments/RemindersPanel';
import VerifierQueue from '../../components/Tables/VerifierQueue';
import ConflictResolutionOverlay from '../../components/overlays/ConflictResolutionOverlay';
import { getVerifierConflicts, dismissConflict } from '../../services/supabase/verifierStatus';
import './Verifier.css';

const Verifier = () => {
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Mock reminders for flagged documents (showing how long ago they were flagged)
  const verifierReminders = [
    {
      title: 'High Priority Conflict',
      proNo: '2025001',
      deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
    },
    {
      title: 'Quantity Mismatch',
      proNo: '2025003',
      deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
    },
    {
      title: 'Pending Review',
      proNo: '2025005',
      deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    }
  ];

  // Fetch conflicts on mount
  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      const data = await getVerifierConflicts();
      setConflicts(data);
    } catch (error) {
      console.error('Error loading conflicts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (conflict) => {
    setSelectedConflict(conflict);
    setOverlayOpen(true);
  };

  const handleDismiss = async (conflict) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to dismiss the conflict for PRO ${conflict.proNo}?\n\n` +
      `Conflict: ${conflict.conflictType}\n` +
      `This will mark the conflict as a false positive.`
    );

    if (confirmed) {
      try {
        await dismissConflict(conflict.id, 'Dismissed by verifier');
        // Remove from local state
        setConflicts(prev => prev.filter(c => c.id !== conflict.id));
        alert('Conflict dismissed successfully');
      } catch (error) {
        console.error('Error dismissing conflict:', error);
        alert('Failed to dismiss conflict. Please try again.');
      }
    }
  };

  const handleCloseOverlay = () => {
    setOverlayOpen(false);
    setSelectedConflict(null);
  };

  const handleConflictResolved = () => {
    // Remove resolved conflict from list
    if (selectedConflict) {
      setConflicts(prev => prev.filter(c => c.id !== selectedConflict.id));
    }
    handleCloseOverlay();
    // Optionally reload conflicts
    loadConflicts();
  };

  return (
    <div className="verifier-page">
      {/* Top section: Pie Chart + Reminders */}
      <div className="dept-top">
        <VerifyPieChart />
        <RemindersPanel title="Conflict Reminders" reminders={verifierReminders} />
      </div>

      {/* Queue section */}
      <div className="verifier-queue-section">
        <VerifierQueue
          conflicts={conflicts}
          onReview={handleReview}
          onDismiss={handleDismiss}
          loading={loading}
        />
      </div>

      {/* Conflict Resolution Overlay */}
      {overlayOpen && selectedConflict && (
        <ConflictResolutionOverlay
          conflict={selectedConflict}
          onClose={handleCloseOverlay}
          onResolved={handleConflictResolved}
        />
      )}
    </div>
  );
};

export default Verifier;

