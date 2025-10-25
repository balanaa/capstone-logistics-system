import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-logo">
            <h1>Logistics Management System</h1>
            <p className="hero-subtitle">Streamline your shipping operations with our comprehensive logistics platform</p>
          </div>
          
          <div className="hero-actions">
            <Link to="/login" className="btn btn-primary">
              Sign In
            </Link>
            <a href="#features" className="btn btn-secondary">
              Learn More
            </a>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="hero-icons">
            <div className="icon-card">
              <div className="icon">📦</div>
              <span>Shipment</span>
            </div>
            <div className="icon-card">
              <div className="icon">🚛</div>
              <span>Trucking</span>
            </div>
            <div className="icon-card">
              <div className="icon">💰</div>
              <span>Finance</span>
            </div>
            <div className="icon-card">
              <div className="icon">✅</div>
              <span>Verification</span>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className="features-section">
        <div className="container">
          <h2>Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📄</div>
              <h3>Document Management</h3>
              <p>Upload, edit, and manage Bill of Lading, Invoices, Packing Lists, and Delivery Orders</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Analytics</h3>
              <p>Track shipments, monitor status, and get insights with comprehensive dashboards</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Workflow Automation</h3>
              <p>Automated status updates and notifications across departments</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Multi-Department</h3>
              <p>Shipment, Trucking, Finance, and Verification departments in one platform</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Mobile Ready</h3>
              <p>Access your logistics data anywhere with our responsive design</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Reliable</h3>
              <p>Enterprise-grade security with role-based access control</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="container">
          <h2>Ready to streamline your logistics?</h2>
          <p>Join our platform and experience efficient shipment management</p>
          <Link to="/login" className="btn btn-primary btn-large">
            Get Started
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        <div className="container">
          <p>&copy; 2024 Logistics Management System. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
