import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AnalyticsPreview.css';

const AnalyticsPreview = () => {
  const navigate = useNavigate();

  const analyticsSections = [
    {
      id: 'financial-performance',
      title: 'Financial Performance',
      icon: '💰',
      description: 'Revenue trends and payment status',
      metrics: [
        { label: 'Total Unpaid', value: '₱1.2M', color: '#dc2626' },
        { label: 'Collection Rate', value: '85.3%', color: '#16a34a' }
      ],
      color: '#16a34a'
    },
    {
      id: 'departmental-workload',
      title: 'Departmental Workload',
      icon: '📊',
      description: 'Current workload across departments',
      metrics: [
        { label: 'Shipment', value: '12', color: '#3b82f6' },
        { label: 'Trucking', value: '8', color: '#f59e0b' },
        { label: 'Finance', value: '5', color: '#16a34a' }
      ],
      color: '#3b82f6'
    },
    {
      id: 'cross-departmental-pipeline',
      title: 'Pipeline Overview',
      icon: '🔄',
      description: 'Cross-departmental progress flow',
      metrics: [
        { label: 'In Progress', value: '25', color: '#f59e0b' },
        { label: 'Completed', value: '18', color: '#16a34a' }
      ],
      color: '#8b5cf6'
    },
    {
      id: 'trucking-performance',
      title: 'Trucking Performance',
      icon: '🚛',
      description: 'Container operations and efficiency',
      metrics: [
        { label: 'Avg Turnaround', value: '2.3 days', color: '#3b82f6' },
        { label: 'In Transit', value: '15', color: '#f59e0b' }
      ],
      color: '#f59e0b'
    }
  ];

  const handleCardClick = (sectionId) => {
    navigate(`/analytics#${sectionId}`);
  };

  return (
    <div className="analytics-preview">
      <div className="preview-header">
        <h3>Analytics Overview</h3>
      </div>
      
      <div className="preview-grid">
        {analyticsSections.map((section) => (
          <div 
            key={section.id} 
            className="analytics-card"
            onClick={() => handleCardClick(section.id)}
            style={{ '--card-color': section.color }}
          >
            <div className="card-header">
              <div className="card-icon">{section.icon}</div>
              <h4 className="card-title">{section.title}</h4>
            </div>
            
            <div className="card-content">
              <p className="card-description">{section.description}</p>
              
              <div className="card-metrics">
                {section.metrics.map((metric, index) => (
                  <div key={index} className="metric-item">
                    <span 
                      className="metric-value"
                      style={{ color: metric.color }}
                    >
                      {metric.value}
                    </span>
                    <span className="metric-label">{metric.label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="card-footer">
              <span className="card-link">View Details →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsPreview;
