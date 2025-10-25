import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logo from '../../logo.png'
import './Header.css'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { roles, signOut, getLandingPath } = useAuth()
  
  const handleLogout = () => {
    try { signOut?.() } catch (_e) {}
    navigate('/login', { replace: true })
    setTimeout(() => {
      if (window?.location?.pathname !== '/login') {
        window.location.href = '/login'
      }
    }, 150)
  }
  
  // Determine page title based on current route
  const getPageTitle = () => {
    const path = location.pathname
    
    // Check if we're on a profile page (contains /pro-number/)
    if (path.includes('/pro-number/')) {
      // Extract department from path (e.g., /shipment/pro-number/PRO001 -> Shipment)
      if (path.startsWith('/shipment')) return 'Shipment - Profile'
      if (path.startsWith('/trucking')) return 'Trucking - Profile'
      if (path.startsWith('/finance')) return 'Finance - Profile'
    }
    
    // Check for verifier routes
    if (path.startsWith('/verifier')) {
      if (path === '/verifier') return 'Verifier Queue'
      return 'Verifier - Review'
    }
    
    // Exact matches for main pages
    const titleMap = {
      '/dashboard': 'Dashboard',
      '/shipment': 'Shipment',
      '/trucking': 'Trucking',
      '/finance': 'Finance',
      '/analytics': 'Analytics',
      '/user-management': 'User Management'
    }
    
    return titleMap[path] || 'Dashboard'
  }
  
  const title = getPageTitle()
  const homeHref = (() => {
    if (roles.includes('admin') || roles.includes('viewer')) return '/dashboard'
    if (roles.includes('verifier')) return '/verifier'
    if (roles.includes('shipment')) return '/shipment'
    if (roles.includes('finance')) return '/finance'
    if (roles.includes('trucking')) return '/trucking'
    return getLandingPath([])
  })()
  return (
    <header className="header-icons">
      <Link to={homeHref}>
        <img className="logo" src={logo} alt="Logo" width="60" />
      </Link>
      <h2 className="current-tab">{title}</h2>
      <ul>
        <li>
          <a 
            href="https://mail.yahoo.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="icon-button" 
            aria-label="Email" 
            title="Email"
          >
            <i className="fi fi-rs-envelope" />
          </a>
        </li>
        <li>
          <button type="button" className="icon-button" aria-label="Notifications" title="Notifications">
            <i className="fi fi-rs-bell" />
          </button>
        </li>
        <li><Link to="/user-management"><i className="fi fi-rs-circle-user"></i></Link></li>
        <li>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
            className="icon-button"
          >
            <i className="fi fi-rs-exit" />
          </button>
        </li>
      </ul>
    </header>
  )
}


