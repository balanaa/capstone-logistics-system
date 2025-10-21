import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Forbidden403.css'

export default function Forbidden403() {
  const navigate = useNavigate()
  const { roles, user, getLandingPath } = useAuth()
  const homeHref = (() => {
    if (!user) return '/login'
    if (roles.includes('admin') || roles.includes('viewer')) return '/dashboard'
    if (roles.includes('verifier')) return '/verifier'
    if (roles.includes('shipment')) return '/shipment'
    if (roles.includes('finance')) return '/finance'
    if (roles.includes('trucking')) return '/trucking'
    return getLandingPath([])
  })()

  return (
    <div className="forbidden-page">
      <div className="forbidden-card">
        <div className="forbidden-code">403</div>
        <h2 className="forbidden-title">Unauthorized</h2>
        <p className="forbidden-text">You don’t have access to this page.</p>
        <div className="forbidden-actions">
          <button className="btn-secondary" onClick={() => window.history.back()}>Go Back</button>
          <button className="btn-primary" onClick={() => navigate(homeHref, { replace: true })}>Go Home</button>
        </div>
      </div>
    </div>
  )
}


