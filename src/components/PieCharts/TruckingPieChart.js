import React, { useEffect, useState } from "react";
import './PieChart.css';
import '../Colors.css';
import { getContainerOperationsCompletionCounts } from '../../services/supabase/containerOperations';

const TruckingPieChart = () => {
  const [completionCounts, setCompletionCounts] = useState({
    ongoing: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompletionCounts = async () => {
      try {
        setLoading(true);
        setError(null);
        const counts = await getContainerOperationsCompletionCounts();
        setCompletionCounts(counts);
      } catch (err) {
        console.error("Error fetching Trucking completion counts:", err);
        setError("Failed to load completion data");
        setCompletionCounts({ ongoing: 0, completed: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchCompletionCounts();
  }, []);

  const total = completionCounts.ongoing + completionCounts.completed;
  
  const ongoingPercentage = total ? (completionCounts.ongoing / total) * 100 : 0;
  const completedPercentage = total ? (completionCounts.completed / total) * 100 : 0;

  if (loading) {
    return (
      <div className="chart-container">
        <div className="window-header">Trucking Status Chart</div>
        <div className="window-body">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            Loading trucking data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="window-header">Trucking Status Chart</div>
        <div className="window-body">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <div className="window-header">Trucking Status Chart</div>
      <div className="window-body">
        <div className="pie-chart-outline">
          <div
            className="pie-chart trucking-completion-pie-chart"
            style={{
              '--ongoing': `${ongoingPercentage}%`,
              '--completed': `${completedPercentage}%`,
              '--total': '100%'
            }}
          >
            <div className="pie-content">
              <span id="total-transactions">{total}</span>
              <small className="total-label">Total</small>
            </div>
          </div>
        </div>
        <div className="chart-stats">
          <div className="stat-row">
            <div className="stat-label ongoing">Ongoing:</div>
            <div className="stat-value ongoing">{completionCounts.ongoing}</div>
          </div>
          <div className="stat-row">
            <div className="stat-label completed">Completed:</div>
            <div className="stat-value completed">{completionCounts.completed}</div>
          </div>
          <div className="stat-row total">
            <div className="stat-label">Total:</div>
            <div className="stat-value">{total}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TruckingPieChart;
