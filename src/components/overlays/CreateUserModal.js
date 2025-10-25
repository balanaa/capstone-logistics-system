import React, { useState } from 'react'
import { supabase } from '../../services/supabase/client'
import './CreateUserModal.css'

export default function CreateUserModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    confirmPassword: '',
    shipment: 'no_access',
    shipment_approval: 'no_access',
    trucking: 'no_access',
    finance: 'no_access'
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }
    
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email')
      return false
    }
    
    if (!formData.full_name.trim()) {
      setError('Full name is required')
      return false
    }
    
    if (!formData.password) {
      setError('Password is required')
      return false
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return false
    }
    
    return true
  }

  // Convert permission level to boolean flags
  const getPermissionFlags = (level) => {
    switch (level) {
      case 'no_access':
        return { canView: false, canWrite: false, canDelete: false }
      case 'can_view':
        return { canView: true, canWrite: false, canDelete: false }
      case 'can_edit':
        return { canView: true, canWrite: true, canDelete: false }
      case 'all_access':
        return { canView: true, canWrite: true, canDelete: true }
      default:
        return { canView: false, canWrite: false, canDelete: false }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    setError('')
    
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name.trim()
          }
        }
      })
      
      if (authError) throw authError
      
      if (!authData.user) {
        throw new Error('Failed to create user')
      }
      
      // Update profile with full_name and department roles
      const departmentRoles = []
      if (formData.shipment !== 'no_access') departmentRoles.push('shipment')
      if (formData.trucking !== 'no_access') departmentRoles.push('trucking')
      if (formData.finance !== 'no_access') departmentRoles.push('finance')
      if (formData.shipment_approval !== 'no_access') departmentRoles.push('verifier')
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          roles: departmentRoles
        })
        .eq('id', authData.user.id)
      
      if (profileError) {
        console.error('Profile update error:', profileError)
      }
      
      // Create permissions record with granular flags
      const shipmentFlags = getPermissionFlags(formData.shipment)
      const truckingFlags = getPermissionFlags(formData.trucking)
      const financeFlags = getPermissionFlags(formData.finance)
      
      const { error: permissionsError } = await supabase
        .from('permissions')
        .insert({
          user_id: authData.user.id,
          shipment_can_view: shipmentFlags.canView,
          shipment_can_write: shipmentFlags.canWrite,
          shipment_can_delete: shipmentFlags.canDelete,
          trucking_can_view: truckingFlags.canView,
          trucking_can_write: truckingFlags.canWrite,
          trucking_can_delete: truckingFlags.canDelete,
          finance_can_view: financeFlags.canView,
          finance_can_write: financeFlags.canWrite,
          finance_can_delete: financeFlags.canDelete
        })
      
      if (permissionsError) {
        console.error('Permissions insert error:', permissionsError)
        throw new Error('Failed to set user permissions')
      }
      
      onSuccess()
    } catch (err) {
      console.error('Error creating user:', err)
      setError(err.message || 'Failed to create user')
      setLoading(false)
    }
  }

  const permissionOptions = [
    { value: 'no_access', label: 'No Access' },
    { value: 'can_view', label: 'Can View' },
    { value: 'can_edit', label: 'Can View, Can Upload, Can Edit' },
    { value: 'all_access', label: 'All Access' }
  ]

  const approvalOptions = [
    { value: 'no_access', label: 'No Access' },
    { value: 'can_view', label: 'Can View' },
    { value: 'can_edit', label: 'Can View, Can Edit' }
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Account</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fi fi-rs-cross"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-user-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-section">
            <h3>Account Information</h3>
            
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="user@example.com"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="full_name">Full Name *</label>
              <input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleChange('full_name', e.target.value)}
                placeholder="John Doe"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                placeholder="At least 6 characters"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                placeholder="Re-enter password"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Permissions</h3>
            
            <div className="form-group">
              <label htmlFor="shipment">Access To Shipment</label>
              <select
                id="shipment"
                value={formData.shipment}
                onChange={(e) => handleChange('shipment', e.target.value)}
                disabled={loading}
              >
                {permissionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="shipment_approval">Access To Shipment Approval</label>
              <select
                id="shipment_approval"
                value={formData.shipment_approval}
                onChange={(e) => handleChange('shipment_approval', e.target.value)}
                disabled={loading}
              >
                {approvalOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="trucking">Access To Trucking</label>
              <select
                id="trucking"
                value={formData.trucking}
                onChange={(e) => handleChange('trucking', e.target.value)}
                disabled={loading}
              >
                {permissionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="finance">Access To Finance</label>
              <select
                id="finance"
                value={formData.finance}
                onChange={(e) => handleChange('finance', e.target.value)}
                disabled={loading}
              >
                {permissionOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
