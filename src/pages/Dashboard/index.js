import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import LatestActionsWindow from '../../components/dashboard/LatestActionsWindow';
import DashboardReminders from '../../components/dashboard/DashboardReminders';
import PieChartCarousel from '../../components/dashboard/PieChartCarousel';
import AnalyticsPreview from '../../components/dashboard/AnalyticsPreview';
import { getRecentActions } from '../../services/supabase/dashboardActions';
import { getAllReminders } from '../../services/supabase/dashboardReminders';

function Dashboard() {
  const [recentActions, setRecentActions] = useState([]);
  const [allReminders, setAllReminders] = useState([]);
  const [loadingActions, setLoadingActions] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      setLoadingActions(true);
      setLoadingReminders(true);
      
      // Fetch data in parallel
      const [actions, reminders] = await Promise.all([
        getRecentActions(20),
        getAllReminders()
      ]);
      
      setRecentActions(actions);
      setAllReminders(reminders);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoadingActions(false);
      setLoadingReminders(false);
    }
  };

  return (
    <div className="dashboard-container">

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={fetchDashboardData} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Row 1: Top - Actions + Reminders */}
      <div className="dashboard-top-row">
        <LatestActionsWindow 
          actions={recentActions} 
          loading={loadingActions} 
        />
        <DashboardReminders 
          reminders={allReminders} 
          loading={loadingReminders} 
        />
      </div>

              {/* Row 2: Pie Charts Carousel */}
              <PieChartCarousel />

              {/* Row 3: Analytics Preview */}
              <AnalyticsPreview />
    </div>
  );
}

export default Dashboard;


