import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loading from './Loading'

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const { user, roles, loading, authReady } = useAuth()
  const location = useLocation()
  const [timedOut, setTimedOut] = React.useState(false)
  const safeRoles = Array.isArray(roles) ? roles : []
  const [roleWaitElapsed, setRoleWaitElapsed] = React.useState(false)
  const waitMs = 800

  React.useEffect(() => {
    if (!authReady || loading) {
      const id = setTimeout(() => setTimedOut(true), 3000)
      return () => clearTimeout(id)
    }
    setTimedOut(false)
    return undefined
  }, [authReady, loading])

  // If we have a user but roles are still empty, wait briefly to avoid false 403 after refresh
  React.useEffect(() => {
    if (authReady && user && safeRoles.length === 0) {
      const id = setTimeout(() => setRoleWaitElapsed(true), waitMs)
      return () => clearTimeout(id)
    }
    setRoleWaitElapsed(false)
    return undefined
  }, [authReady, user, safeRoles.length])

  

  if (!authReady || loading) return <Loading />
  if (!user) return <Navigate to="/403" replace state={{ from: location }} />
  if (safeRoles.length === 0 && !roleWaitElapsed) return <Loading />
  if (allowedRoles.length > 0) {
    const has = safeRoles.some(r => allowedRoles.includes(r)) || safeRoles.includes('admin')
    if (!has) return <Navigate to="/403" replace />
  }

  return children
}


