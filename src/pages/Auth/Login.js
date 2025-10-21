// src/pages/Auth/Login.js
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../index.css'
import './Login.css'
import loginBg from '../../assets/auth/login-background.png'
import systemLogo from '../../assets/auth/system-logo.png'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, getLandingPath } = useAuth()

  // form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // errors: field-level and global
  const [fieldErrors, setFieldErrors] = useState({ email: '', password: '' })
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)

  // helper to detect basic email validity
  const isValidEmail = (v) => /\S+@\S+\.\S+/.test(v)

  // Clear errors when user starts typing
  const handleEmailChange = (e) => {
    const value = e.target.value
    setEmail(value)
    
    // Clear error if email becomes valid
    if (fieldErrors.email) {
      if (isValidEmail(value.trim())) {
        setFieldErrors(prev => ({ ...prev, email: '' }))
        setGlobalError('')
      }
    }
  }

  const handlePasswordChange = (e) => {
    const value = e.target.value
    setPassword(value)
    
    // Clear error as soon as user types anything
    if (fieldErrors.password) {
      setFieldErrors(prev => ({ ...prev, password: '' }))
      setGlobalError('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGlobalError('')
    setFieldErrors({ email: '', password: '' })

    // quick client validation
    const fe = {}
    if (!email.trim()) fe.email = 'Email is required'
    else if (!isValidEmail(email.trim())) fe.email = 'Enter a valid email address'
    if (!password) fe.password = 'Password is required'

    if (fe.email || fe.password) {
      setFieldErrors(fe)
      return
    }

    setLoading(true)
    try {
      // signIn is expected to return { error, landingPath } or throw
      const { error: err, landingPath } = await signIn({ email: email.trim(), password })
      setLoading(false)

      if (err) {
        // try to classify the error to a field if possible
        const msg = err.message || String(err)
        // naive classification
        if (/password|credentials|invalid/i.test(msg)) {
          setFieldErrors({ password: msg })
        } else if (/email|user|account/i.test(msg)) {
          setFieldErrors({ email: msg })
        } else {
          setGlobalError(msg)
        }
        return
      }

      // success: compute landing path (from auth context or provided)
      const path = landingPath || getLandingPath?.() || '/dashboard'
      const redirectTo = location.state?.from?.pathname || path
      // extra safety: hard redirect if SPA routing is jammed
      try { navigate(redirectTo, { replace: true }) } catch (_e) {}
      setTimeout(() => {
        if (window?.location?.pathname !== redirectTo) {
          window.location.href = redirectTo
        }
      }, 100)
    } catch (err) {
      setLoading(false)
      setGlobalError(err.message || 'Unexpected error')
    }
  }

  // Determine if there's any error to show
  const hasError = globalError || fieldErrors.email || fieldErrors.password
  const errorMessage = globalError || fieldErrors.email || fieldErrors.password

  return (
    <div className="auth-page" style={{ backgroundImage: `url(${loginBg})` }}>
      <div className="auth-card" role="main" aria-labelledby="auth-title">
        <h1 id="auth-title" className="auth-title">Login</h1>
        <img src={systemLogo} alt="System logo" className="auth-logo" />

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {/* Universal error message */}
          <p className={`error-message ${hasError ? 'show' : ''}`} role="alert">
            {errorMessage || 'Error'}
          </p>

          {/* Email field */}
          <div className={`input-group ${fieldErrors.email ? 'has-error' : ''}`}>
            <input
              type="email"
              id="email"
              className="input-field"
              placeholder=" "
              value={email}
              onChange={handleEmailChange}
              aria-invalid={!!fieldErrors.email}
              required
            />
            <label htmlFor="email" className="floating-label">Email address</label>
          </div>

          {/* Password field with toggle */}
          <div className={`input-group ${fieldErrors.password ? 'has-error' : ''}`}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="input-field"
              placeholder=" "
              value={password}
              onChange={handlePasswordChange}
              aria-invalid={!!fieldErrors.password}
              required
            />
            <label htmlFor="password" className="floating-label">Password</label>
            <button
              type="button"
              className="eye-icon"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(s => !s)}
            >
              {showPassword ? (
                <i className="fi fi-rs-crossed-eye"></i>
              ) : (
                <i className="fi fi-rs-eye"></i>
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="auth-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
