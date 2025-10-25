import React, { useEffect, useState } from "react";
import './PieChart.css';
import '../Colors.css';
import { getShipmentStatusCounts, formatStatusForDisplay } from '../../services/supabase/shipmentStatus';

const ShipmentPieChart = () => {
  const [statusCounts, setStatusCounts] = useState({
    ongoing: 0,
    filed_boc: 0,
    completed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatusCounts = async () => {
      try {
        setLoading(true);
        setError(null);
        const counts = await getShipmentStatusCounts();
        setStatusCounts(counts);
      } catch (err) {
        console.error("Error fetching Shipment status counts:", err);
        setError("Failed to load status data");
        // Fallback to default counts
        setStatusCounts({ ongoing: 0, filed_boc: 0, completed: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchStatusCounts();
  }, []);

  const total = statusCounts.ongoing + statusCounts.filed_boc + statusCounts.completed;
  
  // Calculate percentages for each status
  const ongoingPercentage = total ? (statusCounts.ongoing / total) * 100 : 0;
  const filedBocPercentage = total ? (statusCounts.filed_boc / total) * 100 : 0;
  const completedPercentage = total ? (statusCounts.completed / total) * 100 : 0;

  if (loading) {
    return (
      <div className="chart-container">
        <div className="window-header">Shipment Status Chart</div>
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
        <div className="window-header">Shipment Status Chart</div>
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
      <div className="window-header">Shipment Status Chart</div>
      <div className="window-body">
        <div className="pie-chart-outline">
          <div
            className="pie-chart status-pie-chart"
            style={{
              '--ongoing': `${ongoingPercentage}%`,
              '--filed-boc': `${filedBocPercentage}%`,
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
            <div className="stat-value ongoing">{statusCounts.ongoing}</div>
          </div>
          <div className="stat-row">
            <div className="stat-label filed-boc">Filed BoC:</div>
            <div className="stat-value filed-boc">{statusCounts.filed_boc}</div>
          </div>
          <div className="stat-row">
            <div className="stat-label completed">Completed:</div>
            <div className="stat-value completed">{statusCounts.completed}</div>
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

export default ShipmentPieChart;