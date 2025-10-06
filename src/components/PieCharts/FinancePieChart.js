import React, { useEffect, useState } from "react";
import './PieChart.css';
import '../Colors.css';

const FinancePieChart = () => {
  const [transactions, setTransactions] = useState({
    completed: 0,
    ongoing: 0
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/billinginvoices/stats")
      .then(res => res.json())
      .then(data => {
        setTransactions({
          completed: Number(data.completed),
          ongoing: Number(data.ongoing)
        });
      })
      .catch(err => console.error("Error fetching Finance stats:", err));
  }, []);

  const total = transactions.completed + transactions.ongoing;
  const completedPercentage = total ? (transactions.completed / total) * 100 : 0;

  return (
    <div className="chart-container">
      <div className="window-header">Finance Pie Chart</div>
      <div className="window-body">
        <div className="pie-chart-outline">
          <div
            className="pie-chart"
            style={{
              '--completed': `${completedPercentage}%`,
              '--total': '100%'
            }}
          >
            <div className="pie-content">
              <span id="total-transactions">{total}</span>
              <small className="total-label">Finance</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancePieChart;