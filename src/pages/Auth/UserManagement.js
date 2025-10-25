import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabase/client'
import { useAuth } from '../../context/AuthContext'
import './UserManagement.css'
import CreateUserModal from '../../components/overlays/CreateUserModal'

export default function UserManagement() {
  const { roles } = useAuth()
  const isAdmin = roles.includes('admin')
  
  // State
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  
  const rowsPerPage = 10

  // Fetch users from profiles table joined with permissions table
  const fetchUsers = async () => {
    setLoading(true)
    try {
      // First get all users from profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, roles, created_at')
        .order('created_at', { ascending: false })
      
      if (profilesError) throw profilesError
      
      // Then get permissions for all users
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*')
      
      if (permissionsError) console.warn('Permissions error:', permissionsError)
      
      // Merge profiles with permissions
      const mergedUsers = (profilesData || []).map(profile => {
        const perms = permissionsData?.find(p => p.user_id === profile.id) || {}
        return {
          ...profile,
          shipment_can_view: perms.shipment_can_view || false,
          shipment_can_write: perms.shipment_can_write || false,
          shipment_can_delete: perms.shipment_can_delete || false,
          trucking_can_view: perms.trucking_can_view || false,
          trucking_can_write: perms.trucking_can_write || false,
          trucking_can_delete: perms.trucking_can_delete || false,
          finance_can_view: perms.finance_can_view || false,
          finance_can_write: perms.finance_can_write || false,
          finance_can_delete: perms.finance_can_delete || false
        }
      })
      
      setUsers(mergedUsers)
    } catch (err) {
      console.error('Error fetching users:', err)
      showToast('Error loading users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Show toast notification
  const showToast = (message) => {
    setToastMessage(message)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Convert boolean flags to permission level
  const getPermissionLevel = (canView, canWrite, canDelete) => {
    if (!canView && !canWrite && !canDelete) return 'no_access'
    if (canView && canWrite && canDelete) return 'all_access'
    if (canView && canWrite && !canDelete) return 'can_edit'
    if (canView && !canWrite && !canDelete) return 'can_view'
    return 'no_access'
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

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    let filtered = [...users]
    
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(search) ||
        user.full_name?.toLowerCase().includes(search) ||
        user.id?.toLowerCase().includes(search)
      )
    }
    
    return filtered
  }, [users, searchTerm])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage))
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  )

  // Update user permission for a department (ENHANCED VERSION)
  const updatePermission = async (userId, department, level) => {
    if (!isAdmin) {
      showToast('Only admins can edit permissions')
      return
    }
    
    try {
      const flags = getPermissionFlags(level)
      const user = users.find(u => u.id === userId)
      if (!user) return
      
      // Step 1: Update permissions table
      const updateData = {
        [`${department}_can_view`]: flags.canView,
        [`${department}_can_write`]: flags.canWrite,
        [`${department}_can_delete`]: flags.canDelete,
        updated_at: new Date().toISOString()
      }
      
      const { error: permError } = await supabase
        .from('permissions')
        .update(updateData)
        .eq('user_id', userId)
      
      if (permError) throw permError
      
      // Step 2: Update roles array in profiles table
      let newRoles = [...(user.roles || [])]
      const departmentRole = department // 'shipment', 'trucking', or 'finance'
      
      if (level === 'no_access') {
        // Remove department role if no access
        newRoles = newRoles.filter(role => role !== departmentRole)
      } else {
        // Add department role if any access (view, edit, or all)
        if (!newRoles.includes(departmentRole)) {
          newRoles.push(departmentRole)
        }
      }
      
      // Update profiles table with new roles
      const { error: rolesError } = await supabase
        .from('profiles')
        .update({ roles: newRoles })
        .eq('id', userId)
      
      if (rolesError) throw rolesError
      
      // Step 3: Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { 
          ...u, 
          [`${department}_can_view`]: flags.canView,
          [`${department}_can_write`]: flags.canWrite,
          [`${department}_can_delete`]: flags.canDelete,
          roles: newRoles
        } : u
      ))
      
      showToast('Permission and role updated')
    } catch (err) {
      console.error('Error updating permission:', err)
      showToast('Error updating permission: ' + (err.message || 'Unknown error'))
    }
  }

  // Update Shipment Approval (verifier role) - updates roles array in profiles
  const updateShipmentApproval = async (userId, level) => {
    if (!isAdmin) {
      showToast('Only admins can edit permissions')
      return
    }
    
    try {
      const user = users.find(u => u.id === userId)
      if (!user) return
      
      let newRoles = user.roles || []
      
      // Manage verifier role based on permission level
      if (level === 'no_access') {
        newRoles = newRoles.filter(r => r !== 'verifier')
      } else {
        if (!newRoles.includes('verifier')) {
          newRoles = [...newRoles, 'verifier']
        }
      }
      
      // Update profiles table
      const { error } = await supabase
        .from('profiles')
        .update({ roles: newRoles })
        .eq('id', userId)
      
      if (error) throw error
      
      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, roles: newRoles } : u
      ))
      
      showToast('Shipment Approval permission updated')
    } catch (err) {
      console.error('Error updating shipment approval:', err)
      showToast('Error updating shipment approval permission')
    }
  }

  // Send password reset email
  const handlePasswordReset = async (email) => {
    if (!isAdmin) {
      showToast('Only admins can reset passwords')
      return
    }
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      showToast(`Password reset email sent to ${email}`)
    } catch (err) {
      console.error('Error sending password reset:', err)
      showToast('Error sending password reset email')
    }
  }

  // Delete user
  const handleDeleteUser = async (userId, email) => {
    if (!isAdmin) {
      showToast('Only admins can delete users')
      return
    }
    
    if (!window.confirm(`Are you sure you want to delete user ${email}?`)) {
      return
    }
    
    try {
      // Delete from profiles (permissions will cascade delete)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
      
      if (error) throw error
      
      // Update local state
      setUsers(prev => prev.filter(u => u.id !== userId))
      showToast('User deleted successfully')
    } catch (err) {
      console.error('Error deleting user:', err)
      showToast('Error deleting user')
    }
  }

  // Permission dropdown options
  const permissionOptions = [
    { value: 'no_access', label: 'No Access' },
    { value: 'can_view', label: 'Can View' },
    { value: 'can_edit', label: 'Can View, Can Upload, Can Edit' },
    { value: 'all_access', label: 'All Access' }
  ]

  // Shipment Approval options (simpler - just verifier role toggle)
  const approvalOptions = [
    { value: 'no_access', label: 'No Access' },
    { value: 'can_view', label: 'Can View' },
    { value: 'can_edit', label: 'Can View, Can Edit' }
  ]

  // Pagination controls
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const paginationButtons = useMemo(() => {
    const buttons = []
    const maxButtons = 5
    let start = Math.max(1, currentPage - 2)
    let end = Math.min(totalPages, start + maxButtons - 1)
    
    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1)
    }
    
    for (let i = start; i <= end; i++) {
      buttons.push(i)
    }
    
    return buttons
  }, [currentPage, totalPages])

  // Mobile card component
  const MobileUserCard = ({ user, index }) => (
    <div className="mobile-user-card">
      <div className="mobile-user-header">
        <div className="mobile-user-info">
          <div className="mobile-user-id">ID: {(currentPage - 1) * rowsPerPage + index + 1}</div>
          <div className="mobile-user-name">{user.full_name || 'N/A'}</div>
          <div className="mobile-user-email">{user.email}</div>
        </div>
        {isAdmin && (
          <div className="mobile-user-actions">
            <button
              className="btn-action btn-reset"
              onClick={() => handlePasswordReset(user.email)}
              title="Send password reset email"
            >
              <i className="fi fi-rs-key"></i>
            </button>
            <button
              className="btn-action btn-delete"
              onClick={() => handleDeleteUser(user.id, user.email)}
              title="Delete user"
            >
              <i className="fi fi-rs-trash"></i>
            </button>
          </div>
        )}
      </div>
      
      <div className="mobile-permissions">
        <div className="mobile-permission-group">
          <label className="mobile-permission-label">Shipment Access</label>
          <select
            className="mobile-permission-select"
            value={getPermissionLevel(user.shipment_can_view, user.shipment_can_write, user.shipment_can_delete)}
            onChange={(e) => updatePermission(user.id, 'shipment', e.target.value)}
            disabled={!isAdmin}
          >
            {permissionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mobile-permission-group">
          <label className="mobile-permission-label">Shipment Approval</label>
          <select
            className="mobile-permission-select"
            value={user.roles?.includes('verifier') ? 'can_edit' : 'no_access'}
            onChange={(e) => updateShipmentApproval(user.id, e.target.value)}
            disabled={!isAdmin}
          >
            {approvalOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mobile-permission-group">
          <label className="mobile-permission-label">Trucking Access</label>
          <select
            className="mobile-permission-select"
            value={getPermissionLevel(user.trucking_can_view, user.trucking_can_write, user.trucking_can_delete)}
            onChange={(e) => updatePermission(user.id, 'trucking', e.target.value)}
            disabled={!isAdmin}
          >
            {permissionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="mobile-permission-group">
          <label className="mobile-permission-label">Finance Access</label>
          <select
            className="mobile-permission-select"
            value={getPermissionLevel(user.finance_can_view, user.finance_can_write, user.finance_can_delete)}
            onChange={(e) => updatePermission(user.id, 'finance', e.target.value)}
            disabled={!isAdmin}
          >
            {permissionOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )

  return (
    <div className="user-management-page">
      {/* Header */}
      <div className="user-mgmt-header">
        <h1 className="user-mgmt-title">User List</h1>
        
        <div className="user-mgmt-controls">
          {isAdmin && (
            <button 
              className="btn-create-user"
              onClick={() => setShowCreateModal(true)}
            >
              <i className="fi fi-rs-square-plus"></i>
              Create New Account
            </button>
          )}
          
          
          
          <div className="search-wrapper">
            <i className="fi fi-rs-search search-icon"></i>
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="search-input"
            />
          </div>
          
          
        </div>
      </div>

      {/* Desktop Table */}
      <div className="user-table-wrapper">
        <table className="user-table">
          <thead>
            <tr>
              <th>Account ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Access To Shipment</th>
              <th>Access To Shipment Approval</th>
              <th>Access To Trucking</th>
              <th>Access To Finance</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '2rem' }}>
                  Loading users...
                </td>
              </tr>
            ) : currentUsers.length > 0 ? (
              currentUsers.map((user, index) => (
                <tr key={user.id}>
                  <td>{(currentPage - 1) * rowsPerPage + index + 1}</td>
                  <td>{user.full_name || 'N/A'}</td>
                  <td>{user.email}</td>
                  
                  {/* Shipment Access */}
                  <td>
                    <select
                      className="permission-select"
                      value={getPermissionLevel(user.shipment_can_view, user.shipment_can_write, user.shipment_can_delete)}
                      onChange={(e) => updatePermission(user.id, 'shipment', e.target.value)}
                      disabled={!isAdmin}
                    >
                      {permissionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Shipment Approval Access (Verifier role) */}
                  <td>
                    <select
                      className="permission-select"
                      value={user.roles?.includes('verifier') ? 'can_edit' : 'no_access'}
                      onChange={(e) => updateShipmentApproval(user.id, e.target.value)}
                      disabled={!isAdmin}
                    >
                      {approvalOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Trucking Access */}
                  <td>
                    <select
                      className="permission-select"
                      value={getPermissionLevel(user.trucking_can_view, user.trucking_can_write, user.trucking_can_delete)}
                      onChange={(e) => updatePermission(user.id, 'trucking', e.target.value)}
                      disabled={!isAdmin}
                    >
                      {permissionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Finance Access */}
                  <td>
                    <select
                      className="permission-select"
                      value={getPermissionLevel(user.finance_can_view, user.finance_can_write, user.finance_can_delete)}
                      onChange={(e) => updatePermission(user.id, 'finance', e.target.value)}
                      disabled={!isAdmin}
                    >
                      {permissionOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Actions */}
                  {isAdmin && (
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-action btn-reset"
                          onClick={() => handlePasswordReset(user.email)}
                          title="Send password reset email"
                        >
                          <i className="fi fi-rs-key"></i>
                        </button>
                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          title="Delete user"
                        >
                          <i className="fi fi-rs-trash"></i>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '2rem' }}>
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="mobile-user-cards">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Loading users...
          </div>
        ) : currentUsers.length > 0 ? (
          currentUsers.map((user, index) => (
            <MobileUserCard key={user.id} user={user} index={index} />
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            No users found
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="user-pagination">
        <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
          &lt;
        </button>
        
        {paginationButtons.map(page => (
          <button
            key={page}
            className={page === currentPage ? 'active' : ''}
            onClick={() => goToPage(page)}
          >
            {page}
          </button>
        ))}
        
        {paginationButtons[paginationButtons.length - 1] < totalPages && (
          <>
            <span className="pagination-ellipsis">...</span>
            <button onClick={() => goToPage(totalPages)}>
              {totalPages}
            </button>
          </>
        )}
        
        <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
          &gt;
        </button>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchUsers()
            showToast('User created successfully')
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}
    </div>
  )
}
