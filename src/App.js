import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation
} from 'react-router-dom';
import logo from './logo.png';
import './App.css';
import Dashboard from './pages/Dashboard';
import Shipment from './pages/Shipment Page/Shipment';
import Trucking from './pages/Trucking Page/Trucking';
import Finance from './pages/Finance Page/Finance';
import Analytics from './pages/Analytics';
import React from 'react';
import { proDocumentList as initialProDocumentList } from './data';

// Context to share profile state
export const ProfileContext = React.createContext({ profile: null, setProfile: () => {} });
export const ProDocumentListContext = React.createContext({ proDocumentList: [], setProDocumentList: () => {} });

function App() {
  const [profile, setProfile] = useState(null); // { department: 'shipment', proNo: 'PRO001' } or null
  const [proDocumentList, setProDocumentList] = useState(initialProDocumentList);
  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      <ProDocumentListContext.Provider value={{ proDocumentList, setProDocumentList }}>
        <Router>
          <div className="App">
            <Header />
            <Sidebar />
            <MainContent />
          </div>
        </Router>
      </ProDocumentListContext.Provider>
    </ProfileContext.Provider>
  );
}

function Header() {
  const location = useLocation();
  const { profile } = React.useContext(ProfileContext);

  const getTitle = () => {
    if (profile && profile.department) {
      // Capitalize department
      return `${profile.department.charAt(0).toUpperCase() + profile.department.slice(1)} - Profile`;
    }
    switch(location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/shipment': return 'Shipment';
      case '/trucking': return 'Trucking';
      case '/finance': return 'Finance';
      case '/analytics': return 'Business Analytics';
      default: return 'Dashboard';
    }
  };

  return (
    <header className="header-icons">
      <Link to="/">
        <img className="logo" src={ logo } alt="Logo" width="60" />
      </Link>
      <h2 className="current-tab">{ getTitle() }</h2>
      <ul>
        <li><a href=""><i className="fi fi-rs-envelope"></i></a></li>
        <li><a href=""><i className="fi fi-rs-bell"></i></a></li>
        <li><a href=""><i className="fi fi-rs-circle-user"></i></a></li>
      </ul>
    </header>
  );
}

function Sidebar() {
  const location = useLocation();
  const sidebarItems = [
    { path: '/dashboard', icon: 'fi fi-rs-house-chimney-blank', label: 'Dashboard' },
    { path: '/shipment', icon: 'fi fi-rs-ship', label: 'Shipment' },
    { path: '/trucking', icon: 'fi fi-rs-truck-container', label: 'Trucking' },
    { path: '/finance', icon: 'fi fi-rs-calculator-money', label: 'Finance' },
    { path: '/analytics', icon: 'fi fi-rs-chart-histogram', label: 'Analytics' }
  ];

  return (
    <aside>
      <ul>
        {sidebarItems.map((item) => (
          <li 
            key={item.path}
            className={location.pathname === item.path ? 'active' : ''}
          >
            <Link to={item.path}>
              <i className={item.icon} />
              <span className="icon-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function MainContent() {
  return (
    <main>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/shipment" element={<Shipment />} />
        <Route path="/trucking" element={<Trucking />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/analytics" element={<Analytics />} />
      </Routes>
    </main>
  );
}

export default App;