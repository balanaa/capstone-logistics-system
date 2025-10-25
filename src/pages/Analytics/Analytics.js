import React, { useEffect, useState } from 'react';
import './Analytics.css';
import { 
  fetchAllAnalyticsData 
} from '../../services/supabase/analytics';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

function Analytics() {
  const [analyticsData, setAnalyticsData] = useState({
    // Financial Analytics
    unpaidAmount: 0,
    paidAmount: 0,
    unpaidByConsignee: [],
    revenueByMonth: [],
    
    // Trucking Analytics
    avgTurnaroundDays: 0,
    avgTurnaroundByDriver: [],
    containersInTransit: 0,
    containersToBeBooked: 0,
    
    // Cross-Departmental Pipeline
    pipelineData: [],
    pipelineSummary: { shipment: 0, trucking: 0, finance: 0, completed: 0, total: 0 },
    
    // Departmental Workload
    departmentalWorkload: { shipment: 0, trucking: 0, finance: 0, total: 0 }
  });
  
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
    period: 'Max'
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  // Handle hash navigation for scroll anchoring
  useEffect(() => {
    if (window.location.hash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.querySelector(window.location.hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  // Also handle hash changes while on the page
  useEffect(() => {
    const handleHashChange = () => {
      const element = document.querySelector(window.location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleDateRangeChange = (startDate, endDate, period) => {
    setDateRange({ startDate, endDate, period });
  };

  const clearFilters = () => {
    setDateRange({
      startDate: null,
      endDate: null,
      period: 'Max'
    });
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    
    try {
      // Fetch real data from Supabase
      const data = await fetchAllAnalyticsData(dateRange.startDate, dateRange.endDate);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Fallback to empty data on error
      setAnalyticsData({
        unpaidAmount: 0,
        paidAmount: 0,
        unpaidByConsignee: [],
        revenueByMonth: [],
        avgTurnaroundDays: 0,
        avgTurnaroundByDriver: [],
        containersInTransit: 0,
        containersToBeBooked: 0,
        pipelineData: [],
        pipelineSummary: { shipment: 0, trucking: 0, finance: 0, completed: 0, total: 0 },
        departmentalWorkload: { shipment: 0, trucking: 0, finance: 0, total: 0 }
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <>

      {/* SECTION 1: FINANCIAL ANALYTICS */}
      <section id="financial-performance" className="analytics-section">
        <h3 className="section-title">Financial Performance</h3>
        
        {/* Date Range Filter for Financial */}
        <div className="date-filter-inline">
          <div className="date-filter-content">
            <div className="date-inputs">
              <div className="date-input-group">
                <label>Starting From:</label>
                <input 
                  type="date" 
                  value={dateRange.startDate || ''} 
                  onChange={(e) => handleDateRangeChange(e.target.value, dateRange.endDate, 'Custom')}
                />
              </div>
              <div className="date-input-group">
                <label>Ending To:</label>
                <input 
                  type="date" 
                  value={dateRange.endDate || ''} 
                  onChange={(e) => handleDateRangeChange(dateRange.startDate, e.target.value, 'Custom')}
                />
              </div>
            </div>
            <div className="period-buttons">
              {['24h', '7d', '14d', '1m', '3m', 'Max'].map(period => (
                <button 
                  key={period}
                  className={`period-btn ${dateRange.period === period ? 'active' : ''}`}
                  onClick={() => {
                    const now = new Date();
                    let startDate = null;
                    
                    switch(period) {
                      case '24h':
                        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        break;
                      case '7d':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                      case '14d':
                        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                        break;
                      case '1m':
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                      case '3m':
                        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                      case 'Max':
                        startDate = null;
                        break;
                    }
                    
                    handleDateRangeChange(
                      startDate ? startDate.toISOString().split('T')[0] : null,
                      period === 'Max' ? null : now.toISOString().split('T')[0],
                      period
                    );
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <button className="clear-filter-btn" onClick={clearFilters}>
            <i className="fi fi-rs-clear-alt"></i>
            Clear Filters
          </button>
        </div>
        
        {/* Revenue Overview Cards */}
        <div className="kpi-cards">
          <div className="kpi-card unpaid">
            <div className="kpi-label">Total Unpaid</div>
            <div className="kpi-value">₱{analyticsData.unpaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="kpi-card paid">
            <div className="kpi-label">Total Paid (YTD)</div>
            <div className="kpi-value">₱{analyticsData.paidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="kpi-card revenue">
            <div className="kpi-label">Collection Rate</div>
            <div className="kpi-value">
              {((analyticsData.paidAmount / (analyticsData.paidAmount + analyticsData.unpaidAmount)) * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Revenue Trends Chart */}
        <div className="analytics-widget">
          <div className="chart-header">
            <div className="chart-title">
              {(() => {
                const isMobile = window.innerWidth <= 480;
                if (isMobile) {
                  return 'Revenue';
                }
                return 'Revenue Performance';
              })()}
            </div>
            <div className="chart-period">
              {(() => {
                const isMobile = window.innerWidth <= 480;
                if (dateRange.period === 'Max' || (!dateRange.startDate && !dateRange.endDate)) {
                  return isMobile ? 'All' : 'All Time';
                } else if (dateRange.period === '24h') {
                  return isMobile ? '24h' : '24 Hours';
                } else if (dateRange.period === '7d') {
                  return isMobile ? '7d' : '7 Days';
                } else if (dateRange.period === '14d') {
                  return isMobile ? '14d' : '14 Days';
                } else if (dateRange.period === '1m') {
                  return isMobile ? '1m' : '1 Month';
                } else if (dateRange.period === '3m') {
                  return isMobile ? '3m' : '3 Months';
                } else if (dateRange.startDate && dateRange.endDate) {
                  const start = new Date(dateRange.startDate);
                  const end = new Date(dateRange.endDate);
                  const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
                  
                  if (daysDiff <= 30) {
                    return isMobile ? 'Daily' : 'Daily View';
                  } else {
                    return isMobile ? 'Monthly' : 'Monthly View';
                  }
                }
                return isMobile ? 'Custom' : 'Custom Range';
              })()}
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={analyticsData.revenueByMonth}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis 
                  dataKey="month" 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  label={{ 
                    value: (() => {
                      if (dateRange.period === 'Max' || (!dateRange.startDate && !dateRange.endDate)) {
                        return 'Month';
                      } else if (dateRange.startDate && dateRange.endDate) {
                        const start = new Date(dateRange.startDate);
                        const end = new Date(dateRange.endDate);
                        const daysDiff = (end - start) / (1000 * 60 * 60 * 24);
                        return daysDiff <= 30 ? 'Day' : 'Month';
                      }
                      return 'Time Period';
                    })(),
                    position: 'insideBottom',
                    offset: -5,
                    style: { textAnchor: 'middle', fill: '#666', fontSize: '12px' }
                  }}
                />
                <YAxis 
                  stroke="#666"
                  fontSize={12}
                  tick={{ fill: '#666' }}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    `₱${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    name === 'revenue' ? 'Total Revenue' : 
                    name === 'paid' ? 'Paid Amount' : 'Unpaid Amount'
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  wrapperStyle={{ 
                    paddingTop: '20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  formatter={(value) => {
                    // Shorten text on mobile
                    const isMobile = window.innerWidth <= 480;
                    if (isMobile) {
                      return value === 'revenue' ? 'Total' : 
                             value === 'paid' ? 'Paid' : 'Unpaid';
                    }
                    return value === 'revenue' ? 'Total Revenue' : 
                           value === 'paid' ? 'Paid Amount' : 'Unpaid Amount';
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#2563eb" 
                  strokeWidth={3}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: '#2563eb', strokeWidth: 2 }}
                  name="revenue"
                />
                <Line 
                  type="monotone" 
                  dataKey="paid" 
                  stroke="#16a34a" 
                  strokeWidth={2}
                  dot={{ fill: '#16a34a', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#16a34a', strokeWidth: 2 }}
                  name="paid"
                />
                <Line 
                  type="monotone" 
                  dataKey="unpaid" 
                  stroke="#dc2626" 
                  strokeWidth={2}
                  dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2 }}
                  name="unpaid"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Unpaid by Consignee - 3 Blocks */}
        {analyticsData.unpaidAmount > 0 && analyticsData.unpaidByConsignee.length > 0 && (
          <div className="analytics-widget">
            <h4 className="widget-title">Unpaid Amount by Consignee</h4>
            <div className="consignee-blocks">
              {analyticsData.unpaidByConsignee.map((item, idx) => (
                <div key={idx} className={`consignee-block ${item.consignee.toLowerCase()}`}>
                  <div className="consignee-name">{item.consignee}</div>
                  <div className="consignee-amount">₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  <div className="consignee-count">{item.count} PROs</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: DEPARTMENTAL WORKLOAD */}
      <section id="departmental-workload" className="analytics-section">
        <h3 className="section-title">Departmental Workload</h3>
        
        <div className="kpi-cards workload-cards">
          <div className="kpi-card workload shipment">
            <div className="kpi-label">Shipment Dept</div>
            <div className="kpi-value">{analyticsData.departmentalWorkload.shipment}</div>
            <div className="kpi-sublabel">PROs needing attention</div>
          </div>
           <div className="kpi-card workload trucking">
             <div className="kpi-label">Trucking Dept</div>
             <div className="kpi-value">{analyticsData.departmentalWorkload.trucking}</div>
             <div className="kpi-sublabel">Containers to be returned</div>
           </div>
          <div className="kpi-card workload finance">
            <div className="kpi-label">Finance Dept</div>
            <div className="kpi-value">{analyticsData.departmentalWorkload.finance}</div>
            <div className="kpi-sublabel">Unpaid PROs</div>
          </div>
          <div className="kpi-card workload total">
            <div className="kpi-label">Total Workload</div>
            <div className="kpi-value">{analyticsData.departmentalWorkload.total}</div>
            <div className="kpi-sublabel">Across all departments</div>
          </div>
        </div>
      </section>

      {/* SECTION 3: CROSS-DEPARTMENTAL PIPELINE VIEW */}
      <section id="cross-departmental-pipeline" className="analytics-section">
        <h3 className="section-title">Cross-Departmental Pipeline</h3>
        
        {/* Date Range Filter for Pipeline */}
        <div className="date-filter-inline">
          <div className="date-filter-content">
            <div className="date-inputs">
              <div className="date-input-group">
                <label>Starting From:</label>
                <input 
                  type="date" 
                  value={dateRange.startDate || ''} 
                  onChange={(e) => handleDateRangeChange(e.target.value, dateRange.endDate, 'Custom')}
                />
              </div>
              <div className="date-input-group">
                <label>Ending To:</label>
                <input 
                  type="date" 
                  value={dateRange.endDate || ''} 
                  onChange={(e) => handleDateRangeChange(dateRange.startDate, e.target.value, 'Custom')}
                />
              </div>
            </div>
            <div className="period-buttons">
              {['24h', '7d', '14d', '1m', '3m', 'Max'].map(period => (
                <button 
                  key={period}
                  className={`period-btn ${dateRange.period === period ? 'active' : ''}`}
                  onClick={() => {
                    const now = new Date();
                    let startDate = null;
                    
                    switch(period) {
                      case '24h':
                        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        break;
                      case '7d':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                      case '14d':
                        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                        break;
                      case '1m':
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                      case '3m':
                        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                      case 'Max':
                        startDate = null;
                        break;
                    }
                    
                    handleDateRangeChange(
                      startDate ? startDate.toISOString().split('T')[0] : null,
                      period === 'Max' ? null : now.toISOString().split('T')[0],
                      period
                    );
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <button className="clear-filter-btn" onClick={clearFilters}>
            <i className="fi fi-rs-clear-alt"></i>
            Clear Filters
          </button>
        </div>

        {/* Pipeline Progress Visualization */}
        <div className="analytics-widget">
          <h4 className="widget-title">Pipeline Progress Flow</h4>
          <div className="pipeline-container">
            <div className="pipeline-progress">
              <div className="pipeline-content">
                <div className="pipeline-stages">
                  <div className="stage shipment">
                    <div className="stage-label">Shipment</div>
                    <div className="stage-count">{analyticsData.pipelineSummary.shipment}</div>
                  </div>
                  <div className="stage trucking">
                    <div className="stage-label">Trucking</div>
                    <div className="stage-count">{analyticsData.pipelineSummary.trucking}</div>
                  </div>
                  <div className="stage finance">
                    <div className="stage-label">Finance</div>
                    <div className="stage-count">{analyticsData.pipelineSummary.finance}</div>
                  </div>
                  <div className="stage completed">
                    <div className="stage-label">Completed</div>
                    <div className="stage-count">{analyticsData.pipelineSummary.completed}</div>
                  </div>
                </div>
                <div className="progress-bar">
                  {(() => {
                    const shipmentPercent = (analyticsData.pipelineSummary.shipment / analyticsData.pipelineSummary.total) * 100;
                    const truckingPercent = (analyticsData.pipelineSummary.trucking / analyticsData.pipelineSummary.total) * 100;
                    const financePercent = (analyticsData.pipelineSummary.finance / analyticsData.pipelineSummary.total) * 100;
                    const completedPercent = (analyticsData.pipelineSummary.completed / analyticsData.pipelineSummary.total) * 100;
                    
                    console.log('Pipeline Debug:', {
                      shipment: { count: analyticsData.pipelineSummary.shipment, percent: shipmentPercent },
                      trucking: { count: analyticsData.pipelineSummary.trucking, percent: truckingPercent },
                      finance: { count: analyticsData.pipelineSummary.finance, percent: financePercent },
                      completed: { count: analyticsData.pipelineSummary.completed, percent: completedPercent },
                      total: analyticsData.pipelineSummary.total
                    });
                    
                    return (
                      <>
                        <div className="progress-segment shipment" style={{ 
                          '--segment-height': `${shipmentPercent}%`,
                          '--segment-width': `${shipmentPercent}%`,
                          width: `${shipmentPercent}%`
                        }}></div>
                        <div className="progress-segment trucking" style={{ 
                          '--segment-height': `${truckingPercent}%`,
                          '--segment-width': `${truckingPercent}%`,
                          width: `${truckingPercent}%`
                        }}></div>
                        <div className="progress-segment finance" style={{ 
                          '--segment-height': `${financePercent}%`,
                          '--segment-width': `${financePercent}%`,
                          width: `${financePercent}%`
                        }}></div>
                        <div className="progress-segment completed" style={{ 
                          '--segment-height': `${completedPercent}%`,
                          '--segment-width': `${completedPercent}%`,
                          width: `${completedPercent}%`
                        }}></div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="pipeline-total">
                <span>Total PROs: {analyticsData.pipelineSummary.total}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: TRUCKING ANALYTICS */}
      <section id="trucking-performance" className="analytics-section">
        <h3 className="section-title">Trucking Performance</h3>
        
        {/* Date Range Filter for Trucking */}
        <div className="date-filter-inline">
          <div className="date-filter-content">
            <div className="date-inputs">
              <div className="date-input-group">
                <label>Starting From:</label>
                <input 
                  type="date" 
                  value={dateRange.startDate || ''} 
                  onChange={(e) => handleDateRangeChange(e.target.value, dateRange.endDate, 'Custom')}
                />
              </div>
              <div className="date-input-group">
                <label>Ending To:</label>
                <input 
                  type="date" 
                  value={dateRange.endDate || ''} 
                  onChange={(e) => handleDateRangeChange(dateRange.startDate, e.target.value, 'Custom')}
                />
              </div>
            </div>
            <div className="period-buttons">
              {['24h', '7d', '14d', '1m', '3m', 'Max'].map(period => (
                <button 
                  key={period}
                  className={`period-btn ${dateRange.period === period ? 'active' : ''}`}
                  onClick={() => {
                    const now = new Date();
                    let startDate = null;
                    
                    switch(period) {
                      case '24h':
                        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                        break;
                      case '7d':
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                      case '14d':
                        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
                        break;
                      case '1m':
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                      case '3m':
                        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                      case 'Max':
                        startDate = null;
                        break;
                    }
                    
                    handleDateRangeChange(
                      startDate ? startDate.toISOString().split('T')[0] : null,
                      period === 'Max' ? null : now.toISOString().split('T')[0],
                      period
                    );
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <button className="clear-filter-btn" onClick={clearFilters}>
            <i className="fi fi-rs-clear-alt"></i>
            Clear Filters
          </button>
        </div>
        
        <div className="kpi-cards">
          <div className="kpi-card trucking">
            <div className="kpi-label">Avg Turnaround Days</div>
            <div className="kpi-value">{analyticsData.avgTurnaroundDays.toFixed(1)}</div>
            <div className="kpi-sublabel">Port → Yard</div>
          </div>
           <div className="kpi-card transit">
             <div className="kpi-label">Containers in Transit</div>
             <div className="kpi-value">{analyticsData.containersInTransit}</div>
             <div className="kpi-sublabel">Delivering</div>
           </div>
          <div className="kpi-card booked">
            <div className="kpi-label">Containers to be Booked</div>
            <div className="kpi-value">{analyticsData.containersToBeBooked}</div>
            <div className="kpi-sublabel">Awaiting booking</div>
          </div>
        </div>
      </section>
    </>
  );
}

// Helper function to format document type names
function formatDocTypeName(docType) {
  const names = {
    'bill_of_lading': 'Bill of Lading',
    'invoice': 'Invoice',
    'packing_list': 'Packing List',
    'delivery_order': 'Delivery Order'
  };
  return names[docType] || docType;
}

export default Analytics;

