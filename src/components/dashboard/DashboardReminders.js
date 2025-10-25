import React from 'react';
import './DashboardReminders.css';
import { groupRemindersByUrgency } from '../../services/supabase/dashboardReminders';

const DashboardReminders = ({ reminders = [], loading = false }) => {
  const getDepartmentColor = (department) => {
    switch (department) {
      case 'shipment':
        return '#3b82f6'; // Blue
      case 'trucking':
        return '#f59e0b'; // Orange
      case 'finance':
        return '#16a34a'; // Green
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
      default:
        return '📋';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return '#dc2626'; // Red
      case 'high':
        return '#f59e0b'; // Orange
      case 'normal':
        return '#3b82f6'; // Blue
      case 'low':
        return '#6b7280'; // Gray
      default:
        return '#6b7280';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return '🔴';
      case 'high':
        return '🟠';
      case 'normal':
        return '🔵';
      case 'low':
        return '⚪';
      default:
        return '⚪';
    }
  };

  const handleReminderClick = (reminder) => {
    // Navigate to department page based on reminder department
    const departmentRoutes = {
      shipment: '/shipment',
      trucking: '/trucking',
      finance: '/finance'
    };
    
    const route = departmentRoutes[reminder.department];
    if (route) {
      window.location.href = route;
    }
  };

  if (loading) {
    return (
      <div className="dashboard-reminders">
        <div className="reminders-header">
          <h3>Reminders</h3>
          <div className="reminders-count">Loading...</div>
        </div>
        <div className="reminders-body">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading reminders...</p>
          </div>
        </div>
      </div>
    );
  }

  const groupedReminders = groupRemindersByUrgency(reminders);
  const totalReminders = reminders.length;

  return (
    <div className="dashboard-reminders">
      <div className="reminders-header">
        <h3>Reminders</h3>
        <div className="reminders-count">{totalReminders}</div>
      </div>
      <div className="reminders-body">
        {totalReminders === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No active reminders</p>
          </div>
        ) : (
          <div className="reminders-list">
            {/* Overdue Reminders */}
            {groupedReminders.overdue.length > 0 && (
              <div className="urgency-group">
                <div className="urgency-header overdue">
                  <span className="urgency-icon">🔴</span>
                  <span className="urgency-title">Overdue ({groupedReminders.overdue.length})</span>
                </div>
                {groupedReminders.overdue.map((reminder) => (
                  <div 
                    key={reminder.id} 
                    className="reminder-row overdue"
                    onClick={() => handleReminderClick(reminder)}
                  >
                    <div className="reminder-left">
                      <div 
                        className="department-badge"
                        style={{ backgroundColor: getDepartmentColor(reminder.department) }}
                      >
                        {getDepartmentIcon(reminder.department)}
                      </div>
                    </div>
                    <div className="reminder-middle">
                      <div className="reminder-title">{reminder.title}</div>
                      <div className="reminder-pro">for {reminder.proNumber}</div>
                    </div>
                    <div className="reminder-right">
                      <div className="reminder-deadline overdue">{reminder.relativeDeadline}</div>
                      <div className="priority-indicator">
                        {getPriorityIcon(reminder.priority)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Due Today */}
            {groupedReminders.today.length > 0 && (
              <div className="urgency-group">
                <div className="urgency-header today">
                  <span className="urgency-icon">🟡</span>
                  <span className="urgency-title">Due Today ({groupedReminders.today.length})</span>
                </div>
                {groupedReminders.today.map((reminder) => (
                  <div 
                    key={reminder.id} 
                    className="reminder-row today"
                    onClick={() => handleReminderClick(reminder)}
                  >
                    <div className="reminder-left">
                      <div 
                        className="department-badge"
                        style={{ backgroundColor: getDepartmentColor(reminder.department) }}
                      >
                        {getDepartmentIcon(reminder.department)}
                      </div>
                    </div>
                    <div className="reminder-middle">
                      <div className="reminder-title">{reminder.title}</div>
                      <div className="reminder-pro">for {reminder.proNumber}</div>
                    </div>
                    <div className="reminder-right">
                      <div className="reminder-deadline today">{reminder.relativeDeadline}</div>
                      <div className="priority-indicator">
                        {getPriorityIcon(reminder.priority)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming */}
            {groupedReminders.upcoming.length > 0 && (
              <div className="urgency-group">
                <div className="urgency-header upcoming">
                  <span className="urgency-icon">🔵</span>
                  <span className="urgency-title">Upcoming ({groupedReminders.upcoming.length})</span>
                </div>
                {groupedReminders.upcoming.slice(0, 5).map((reminder) => (
                  <div 
                    key={reminder.id} 
                    className="reminder-row upcoming"
                    onClick={() => handleReminderClick(reminder)}
                  >
                    <div className="reminder-left">
                      <div 
                        className="department-badge"
                        style={{ backgroundColor: getDepartmentColor(reminder.department) }}
                      >
                        {getDepartmentIcon(reminder.department)}
                      </div>
                    </div>
                    <div className="reminder-middle">
                      <div className="reminder-title">{reminder.title}</div>
                      <div className="reminder-pro">for {reminder.proNumber}</div>
                    </div>
                    <div className="reminder-right">
                      <div className="reminder-deadline upcoming">{reminder.relativeDeadline}</div>
                      <div className="priority-indicator">
                        {getPriorityIcon(reminder.priority)}
                      </div>
                    </div>
                  </div>
                ))}
                {groupedReminders.upcoming.length > 5 && (
                  <div className="more-reminders">
                    +{groupedReminders.upcoming.length - 5} more upcoming
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardReminders;
