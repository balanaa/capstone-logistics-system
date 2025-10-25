import React, { useEffect, useState } from "react";
import './PieChart.css';
import '../Colors.css';
import { getFinanceCompletionCounts } from '../../services/supabase/financeCompletion';

const FinancePieChart = () => {
  const [completionCounts, setCompletionCounts] = useState({
    unpaid: 0,
    paid: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCompletionCounts = async () => {
      try {
        setLoading(true);
        setError(null);
        const counts = await getFinanceCompletionCounts();
        setCompletionCounts(counts);
      } catch (err) {
        console.error("Error fetching Finance completion counts:", err);
        setError("Failed to load completion data");
        setCompletionCounts({ unpaid: 0, paid: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchCompletionCounts();
  }, []);

  const total = completionCounts.unpaid + completionCounts.paid;
  
  const unpaidPercentage = total ? (completionCounts.unpaid / total) * 100 : 0;
  const paidPercentage = total ? (completionCounts.paid / total) * 100 : 0;

  if (loading) {
    return (
      <div className="chart-container">
        <div className="window-header">Finance Status Chart</div>
        <div className="window-body">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            Loading finance data...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="window-header">Finance Status Chart</div>
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
      <div className="window-header">Finance Status Chart</div>
      <div className="window-body">
        <div className="pie-chart-outline">
          <div
            className="pie-chart finance-completion-pie-chart"
            style={{
              '--unpaid': `${unpaidPercentage}%`,
              '--paid': `${paidPercentage}%`,
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
            <div className="stat-label unpaid">Unpaid:</div>
            <div className="stat-value unpaid">{completionCounts.unpaid}</div>
          </div>
          <div className="stat-row">
            <div className="stat-label paid">Paid:</div>
            <div className="stat-value paid">{completionCounts.paid}</div>
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

export default FinancePieChart;