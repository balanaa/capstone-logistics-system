import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useNavigate
} from 'react-router-dom';
import './App.css';
import './mobile.css';
import Dashboard from './pages/Dashboard';
import Shipment from './pages/Shipment/Shipment';
import ShipmentProfile from './pages/Shipment/ShipmentProfile';
import Trucking from './pages/Trucking/Trucking';
import TruckingProfile from './pages/Trucking/TruckingProfile';
import Finance from './pages/Finance/Finance';
import FinanceProfile from './pages/Finance/FinanceProfile';
import Analytics from './pages/Analytics';
import Verifier from './pages/Verifier/Verifier';
import StorageTest from './pages/StorageTest';
import Log from './pages/Log';
import UserManagement from './pages/Auth/UserManagement';
import Camera from './pages/Camera/Camera';
import React from 'react';
import { proDocumentList as initialProDocumentList } from './data';
import { AuthProvider, useAuth } from './context/AuthContext'
import { MobileProvider } from './context/MobileContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import ErrorBoundary from './components/common/ErrorBoundary'
import Loading from './components/common/Loading'
import LandingPage from './pages/LandingPage'
import Login from './pages/Auth/Login'
import ResetPassword from './pages/Auth/ResetPassword'
import Forbidden403 from './pages/Forbidden403'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'

// Context to share profile state
export const ProfileContext = React.createContext({ profile: null, setProfile: () => {} });
export const ProDocumentListContext = React.createContext({ proDocumentList: [], setProDocumentList: () => {} });

function App() {
  const [profile, setProfile] = useState(null); // { department: 'shipment', proNo: 'PRO001' } or null
  const [proDocumentList, setProDocumentList] = useState(initialProDocumentList);
  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      <ProDocumentListContext.Provider value={{ proDocumentList, setProDocumentList }}>
        <MobileProvider>
          <Router>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </Router>
        </MobileProvider>
      </ProDocumentListContext.Provider>
    </ProfileContext.Provider>
  );
}

function AppContent() {
  const location = useLocation();
  
  // Debug logging
  console.log('AppContent - Current pathname:', location.pathname);
  
  // For public routes, don't use AuthProvider
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/camera' || location.pathname === '/reset-password' || location.pathname === '/403') {
    console.log('AppContent - Using public routes for:', location.pathname);
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/camera" element={<Camera />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/403" element={<Forbidden403 />} />
      </Routes>
    );
  }
  
  console.log('AppContent - Using AuthProvider for:', location.pathname);
  // For all other routes, use AuthProvider
  return (
    <AuthProvider>
      <Shell>
        <MainContent />
      </Shell>
    </AuthProvider>
  );
}
function MainContent() {
  return (
    <Routes>
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['admin','viewer']}>
          <Dashboard />
        </ProtectedRoute>
      } />
      
      <Route path="/analytics" element={
        <ProtectedRoute allowedRoles={['admin','viewer']}>
          <Analytics />
        </ProtectedRoute>
      } />
      
      {/* Shipment routes */}
      <Route path="/shipment" element={
        <ProtectedRoute allowedRoles={['shipment','admin','viewer']}>
          <Shipment />
        </ProtectedRoute>
      } />
      <Route path="/shipment/pro-number/:proNo" element={
        <ProtectedRoute allowedRoles={['shipment','verifier','admin','viewer']}>
          <ShipmentProfile />
        </ProtectedRoute>
      } />
      
      {/* Trucking routes */}
      <Route path="/trucking" element={
        <ProtectedRoute allowedRoles={['trucking','admin','viewer']}>
          <Trucking />
        </ProtectedRoute>
      } />
      <Route path="/trucking/pro-number/:proNo" element={
        <ProtectedRoute allowedRoles={['trucking','admin','viewer']}>
          <TruckingProfile />
        </ProtectedRoute>
      } />
      
      {/* Finance routes */}
      <Route path="/finance" element={
        <ProtectedRoute allowedRoles={['finance','admin','viewer']}>
          <Finance />
        </ProtectedRoute>
      } />
      <Route path="/finance/pro-number/:proNo" element={
        <ProtectedRoute allowedRoles={['finance','admin','viewer']}>
          <FinanceProfile />
        </ProtectedRoute>
      } />
      
      {/* Verifier routes */}
      <Route path="/verifier" element={
        <ProtectedRoute allowedRoles={['verifier','admin','viewer']}>
          <Verifier />
        </ProtectedRoute>
      } />
      
      {/* User Management */}
      <Route path="/user-management" element={
        <ProtectedRoute allowedRoles={['admin','viewer']}>
          <UserManagement />
        </ProtectedRoute>
      } />

      {/* Storage test route */}
      <Route path="/storage-test" element={
        <ProtectedRoute allowedRoles={['shipment','trucking','finance','verifier','admin','viewer']}>
          <StorageTest />
        </ProtectedRoute>
      } />

      {/* Actions Log route */}
      <Route path="/log" element={
        <ProtectedRoute allowedRoles={['admin','viewer']}>
          <Log />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function Shell({ children }) {
  const location = useLocation();
  const { user, loading, authReady } = useAuth();
  const isStandalone = false; // No standalone routes in Shell since all public routes are handled separately
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (authReady && !loading && !user && !isStandalone) {
      navigate('/403', { replace: true });
    }
  }, [authReady, loading, user, isStandalone, navigate]);
  
  if (isStandalone) return <>{children}</>;
  if (!authReady || loading) return <Loading />;
  
  return (
    <div className="App">
      <Header />
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}

export default App;