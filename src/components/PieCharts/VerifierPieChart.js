import React, { useEffect, useState } from "react";
import './PieChart.css';
import '../Colors.css';
import { getVerifierStatusCounts } from '../../services/supabase/verifierStatus';

const VerifyPieChart = () => {
  const [statusCounts, setStatusCounts] = useState({
    pending: 0,
    resolved: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatusCounts = async () => {
      try {
        setLoading(true);
        setError(null);
        const counts = await getVerifierStatusCounts();
        setStatusCounts(counts);
      } catch (err) {
        console.error("Error fetching Verify status counts:", err);
        setError("Failed to load status data");
        setStatusCounts({ pending: 0, resolved: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStatusCounts();
  }, []);

  const total = statusCounts.pending + statusCounts.resolved;
  
  const pendingPercentage = total ? (statusCounts.pending / total) * 100 : 0;
  const resolvedPercentage = total ? (statusCounts.resolved / total) * 100 : 0;

  if (loading) {
    return (
      <div className="chart-container">
        <div className="window-header">Verify Status Chart</div>
        <div className="window-body">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            Loading status data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="window-header">Verify Status Chart</div>
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
      <div className="window-header">Verify Status Chart</div>
      <div className="window-body">
        
        <div className="pie-chart-outline">
          <div 
            className="pie-chart verify-pie-chart"
            style={{
              '--pending': `${pendingPercentage}%`,
              '--total': '100%'
            }}
          >
            <div className="pie-content">
              <span>{total}</span>
              <div className="total-label">Total Conflicts</div>
            </div>
          </div>
        </div>

        <div className="chart-stats">
          <div className="stat-row">
            <span className="stat-label" style={{ color: '#f59e0b' }}>Pending</span>
            <span className="stat-value" style={{ color: '#f59e0b' }}>{statusCounts.pending}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label" style={{ color: '#10b981' }}>Resolved</span>
            <span className="stat-value" style={{ color: '#10b981' }}>{statusCounts.resolved}</span>
          </div>
          <div className="stat-row total">
            <span className="stat-label">Total</span>
            <span className="stat-value">{total}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default VerifyPieChart;

