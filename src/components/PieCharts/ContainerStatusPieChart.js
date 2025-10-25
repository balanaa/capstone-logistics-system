import React, { useEffect, useState } from "react";
import './PieChart.css';
import '../Colors.css';
import { getContainerOperationsStatusCounts } from '../../services/supabase/containerOperations';

const ContainerStatusPieChart = () => {
  const [statusCounts, setStatusCounts] = useState({
    booking: 0,
    delivering: 0,
    returned: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStatusCounts = async () => {
      try {
        setLoading(true);
        setError(null);
        const counts = await getContainerOperationsStatusCounts();
        setStatusCounts(counts);
      } catch (err) {
        console.error("Error fetching Container status counts:", err);
        setError("Failed to load status data");
        setStatusCounts({ booking: 0, delivering: 0, returned: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchStatusCounts();
  }, []);

  const total = statusCounts.booking + statusCounts.delivering + statusCounts.returned;
  
  const bookingPercentage = total ? (statusCounts.booking / total) * 100 : 0;
  const deliveringPercentage = total ? (statusCounts.delivering / total) * 100 : 0;
  const returnedPercentage = total ? (statusCounts.returned / total) * 100 : 0;

  if (loading) {
    return (
      <div className="chart-container">
        <div className="window-header">Container Status Chart</div>
        <div className="window-body">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            Loading container data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="window-header">Container Status Chart</div>
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
      <div className="window-header">Container Status Chart</div>
      <div className="window-body">
        <div className="pie-chart-outline">
          <div
            className="pie-chart trucking-pie-chart"
            style={{
              '--booking': `${bookingPercentage}%`,
              '--delivering': `${deliveringPercentage}%`,
              '--returned': `${returnedPercentage}%`,
              '--total': '100%'
            }}
          >
            <div className="pie-content">
              <span id="total-transactions">{total}</span>
              <small className="total-label">Total Containers</small>
            </div>
          </div>
        </div>
        <div className="chart-stats">
          <div className="stat-row">
            <div className="stat-label booking">Booking:</div>
            <div className="stat-value booking">{statusCounts.booking}</div>
          </div>
          <div className="stat-row">
            <div className="stat-label delivering">Delivering:</div>
            <div className="stat-value delivering">{statusCounts.delivering}</div>
          </div>
          <div className="stat-row">
            <div className="stat-label returned">Returned:</div>
            <div className="stat-value returned">{statusCounts.returned}</div>
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

export default ContainerStatusPieChart;
