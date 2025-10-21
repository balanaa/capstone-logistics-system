import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

export default function Sidebar() {
  const location = useLocation()
  const { roles } = useAuth()

  const items = [
    { path: '/dashboard', icon: 'fi fi-rs-house-chimney-blank', label: 'Dashboard', roles: ['admin','viewer'] },
    { path: '/shipment', icon: 'fi fi-rs-ship', label: 'Shipment', roles: ['shipment','admin','viewer'] },
    { path: '/trucking', icon: 'fi fi-rs-truck-container', label: 'Trucking', roles: ['trucking','admin','viewer'] },
    { path: '/finance', icon: 'fi fi-rs-calculator-money', label: 'Finance', roles: ['finance','admin','viewer'] },
    { path: '/analytics', icon: 'fi fi-rs-chart-histogram', label: 'Analytics', roles: ['admin','viewer'] }
  ]

  const canSee = (allowed) => roles.some(r => allowed.includes(r)) || roles.includes('admin') || roles.includes('viewer')
  
  // Check if current path is active (exact match OR starts with for nested routes)
  const isActive = (itemPath) => {
    const currentPath = location.pathname
    
    // Exact match for dashboard and analytics
    if (itemPath === '/dashboard' || itemPath === '/analytics') {
      return currentPath === itemPath
    }
    
    // For department pages, match if current path starts with item path
    // This will highlight "Shipment" tab when on /shipment or /shipment/pro-number/PRO001
    return currentPath.startsWith(itemPath)
  }

  return (
    <aside>
      <ul>
        {items.filter(i => canSee(i.roles)).map(item => (
          <li key={item.path} className={isActive(item.path) ? 'active' : ''}>
            <Link to={item.path}>
              <i className={item.icon} />
              <span className="icon-label">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  )
}


