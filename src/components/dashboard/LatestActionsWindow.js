import React from 'react';
import './LatestActionsWindow.css';

const LatestActionsWindow = ({ actions = [], loading = false }) => {
  const getDepartmentColor = (department) => {
    switch (department) {
      case 'shipment':
        return '#3b82f6'; // Blue
      case 'trucking':
        return '#f59e0b'; // Orange
      case 'finance':
        return '#16a34a'; // Green
      case 'verifier':
        return '#8b5cf6'; // Purple
      default:
        return '#6b7280'; // Gray
    }
  };

  const getDepartmentIcon = (department) => {
    switch (department) {
      case 'shipment':
        return '📦';
      case 'trucking':
        return '🚛';
      case 'finance':
        return '💰';
      case 'verifier':
        return '✅';
      default:
        return '📋';
    }
  };

  if (loading) {
    return (
      <div className="latest-actions-window">
        <div className="actions-header">
          <h3>Latest Actions</h3>
          <div className="actions-count">Loading...</div>
        </div>
        <div className="actions-body">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading recent actions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="latest-actions-window">
      <div className="actions-header">
        <h3>Latest Actions</h3>
        <div className="actions-count">{actions.length}</div>
      </div>
      <div className="actions-body">
        {actions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No recent actions</p>
          </div>
        ) : (
          <div className="actions-list">
            {actions.map((action) => (
              <div key={action.id} className="action-row">
                <div className="action-left">
                  <div 
                    className="department-indicator"
                    style={{ backgroundColor: getDepartmentColor(action.department) }}
                  >
                    {getDepartmentIcon(action.department)}
                  </div>
                </div>
                <div className="action-middle">
                  <div className="action-description">{action.description}</div>
                  <div className="action-user">by {action.userName}</div>
                </div>
                <div className="action-right">
                  <div className="action-time">{action.relativeTime}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LatestActionsWindow;
