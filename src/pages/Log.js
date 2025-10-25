import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase/client'
import LogTest from '../components/LogTest'
import './Log.css'

export default function Log() {
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // all, document_file_uploaded, document_data_uploaded, document_file_replaced, document_data_updated, document_deleted, container_status_changed, container_details_updated, trucking_status_changed, receipt_created, receipt_updated, receipt_deleted
  const [connectionStatus, setConnectionStatus] = useState('connecting') // connecting, connected, disconnected
  const [lastUpdate, setLastUpdate] = useState(null)

  // Fetch initial actions
  useEffect(() => {
    fetchActions()
  }, [])

  // Set up real-time subscription
  useEffect(() => {
    console.log('Setting up websocket subscription...')
    
    const channel = supabase
      .channel('actions_log_changes', {
        config: {
          broadcast: { self: false },
          presence: { key: 'actions_log' }
        }
      })
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'actions_log'
        }, 
        (payload) => {
          console.log('🔔 Raw websocket payload:', payload)
          
          // Process all action types (documents, containers, trucking)
          console.log('🔔 New action received:', payload.new)
          setActions(prev => [payload.new, ...prev])
          setLastUpdate(new Date())
        }
      )
      .subscribe((status, err) => {
        console.log('Websocket subscription status:', status)
        if (err) {
          console.error('❌ Websocket subscription error:', err)
        }
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to actions_log changes')
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Websocket subscription failed')
          setConnectionStatus('disconnected')
        } else if (status === 'TIMED_OUT') {
          console.error('❌ Websocket subscription timed out')
          setConnectionStatus('disconnected')
        } else if (status === 'CLOSED') {
          console.error('❌ Websocket connection closed')
          setConnectionStatus('disconnected')
        }
      })

    return () => {
      console.log('Cleaning up websocket subscription...')
      supabase.removeChannel(channel)
    }
  }, [])

  // Fallback: Poll for updates every 30 seconds if websocket is disconnected
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      console.log('Setting up fallback polling...')
      const interval = setInterval(() => {
        console.log('Polling for new actions...')
        fetchActions()
      }, 30000) // Poll every 30 seconds

      return () => {
        console.log('Cleaning up polling interval...')
        clearInterval(interval)
      }
    }
  }, [connectionStatus])

  // Additional safety: Poll every 60 seconds even when "connected" to catch missed updates
  useEffect(() => {
    console.log('Setting up safety polling...')
    const interval = setInterval(() => {
      console.log('Safety poll for missed updates...')
      fetchActions()
    }, 60000) // Poll every 60 seconds

    return () => {
      console.log('Cleaning up safety polling interval...')
      clearInterval(interval)
    }
  }, [])

  const fetchActions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('actions_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setActions(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action) => {
    switch (action) {
      case 'document_file_uploaded':
        return '📤'
      case 'document_data_uploaded':
        return '📋'
      case 'document_file_replaced':
        return '🔄'
      case 'document_data_updated':
        return '✏️'
      case 'document_deleted':
        return '🗑️'
      case 'container_status_changed':
        return '📦'
      case 'container_details_updated':
        return '✏️'
      case 'trucking_status_changed':
        return '🚛'
      case 'receipt_created':
        return '📄'
      case 'receipt_updated':
        return '✏️'
      case 'receipt_deleted':
        return '🗑️'
      default:
        return '📄'
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case 'document_file_uploaded':
        return '#10b981' // green
      case 'document_data_uploaded':
        return '#3b82f6' // blue
      case 'document_file_replaced':
        return '#f59e0b' // amber
      case 'document_data_updated':
        return '#8b5cf6' // purple
      case 'document_deleted':
        return '#ef4444' // red
      case 'container_status_changed':
        return '#06b6d4' // cyan
      case 'container_details_updated':
        return '#84cc16' // lime
      case 'trucking_status_changed':
        return '#f97316' // orange
      case 'receipt_created':
        return '#059669' // emerald
      case 'receipt_updated':
        return '#7c3aed' // violet
      case 'receipt_deleted':
        return '#ef4444' // red
      default:
        return '#6b7280' // gray
    }
  }

  const getActionText = (action) => {
    switch (action) {
      case 'document_file_uploaded':
        return 'Uploaded new document'
      case 'document_data_uploaded':
        return 'Uploaded document to existing PRO'
      case 'document_file_replaced':
        return 'Replaced document file'
      case 'document_data_updated':
        return 'Updated document data'
      case 'document_deleted':
        return 'Deleted document'
      case 'container_status_changed':
        return 'Container status changed'
      case 'container_details_updated':
        return 'Container details updated'
      case 'trucking_status_changed':
        return 'Trucking status changed'
      case 'receipt_created':
        return 'Receipt created'
      case 'receipt_updated':
        return 'Receipt updated'
      case 'receipt_deleted':
        return 'Receipt deleted'
      default:
        return action
    }
  }

  const formatTime = (timestamp) => {
    // Parse the UTC timestamp correctly
    const utcDate = new Date(timestamp)
    const now = new Date()
    
    // Calculate difference in milliseconds
    const diffMs = now - utcDate
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    // For older dates, show local date/time in Singapore timezone
    return utcDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Singapore'
    })
  }

  const getUserName = (action) => {
    // Get username from payload, fallback to user ID
    return action.payload?.user_name || `User ${action.user_id?.substring(0, 8)}...` || 'Unknown User'
  }

  // Debug function to check timezone conversion
  const debugTimezone = (timestamp) => {
    const utcDate = new Date(timestamp)
    const singaporeDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }))
    
    console.log('Debug timezone conversion:')
    console.log('Original timestamp:', timestamp)
    console.log('UTC date:', utcDate.toISOString())
    console.log('Singapore time:', utcDate.toLocaleString('en-US', { 
      timeZone: 'Asia/Singapore',
      hour12: true 
    }))
    console.log('Current time:', new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Singapore',
      hour12: true 
    }))
  }

  const filteredActions = filter === 'all' 
    ? actions 
    : actions.filter(action => action.action === filter)

  if (loading) {
    return (
      <div className="log-container">
        <div className="log-header">
          <h1>Actions Log</h1>
          <div className="loading">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="log-container">
        <div className="log-header">
          <h1>Actions Log</h1>
          <div className="error">Error: {error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="log-container">
      <div className="log-header">
        <h1>Actions Log</h1>
        <div className="log-controls">
          <div className="connection-status">
            <span className={`status-indicator ${connectionStatus}`}>
              {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'connecting' ? '🟡' : '🔴'}
            </span>
            <span className="status-text">
              {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
            {lastUpdate && (
              <span className="last-update" title={`Exact time: ${lastUpdate.toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}`}>
                Last update: {formatTime(lastUpdate.toISOString())}
              </span>
            )}
          </div>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Actions</option>
            <option value="document_file_uploaded">File Uploaded</option>
            <option value="document_data_uploaded">Data Uploaded</option>
            <option value="document_file_replaced">File Replaced</option>
            <option value="document_data_updated">Data Updated</option>
            <option value="document_deleted">Document Deleted</option>
            <option value="container_status_changed">Container Status</option>
            <option value="container_details_updated">Container Details</option>
            <option value="trucking_status_changed">Trucking Status</option>
            <option value="receipt_created">Receipt Created</option>
            <option value="receipt_updated">Receipt Updated</option>
            <option value="receipt_deleted">Receipt Deleted</option>
          </select>
          <button onClick={fetchActions} className="refresh-btn">
            🔄 Refresh
          </button>
          <button 
            onClick={() => {
              if (actions.length > 0) {
                debugTimezone(actions[0].created_at)
              }
            }} 
            className="refresh-btn"
            style={{ background: '#6b7280' }}
          >
            🕐 Debug Time
          </button>
          <button 
            onClick={() => {
              console.log('=== WEBSOCKET DEBUG INFO ===')
              console.log('Connection status:', connectionStatus)
              console.log('Last update:', lastUpdate)
              console.log('Current actions count:', actions.length)
              console.log('Most recent action:', actions[0])
              console.log('Supabase client:', supabase)
            }} 
            className="refresh-btn"
            style={{ background: '#dc2626' }}
          >
            🔍 Debug WS
          </button>
        </div>
      </div>

      {/* Test Component */}
      <div style={{ marginBottom: '30px', padding: '20px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <LogTest />
      </div>

      <div className="actions-list">
        {filteredActions.length === 0 ? (
          <div className="no-actions">
            No actions found. Try uploading or editing a document to see activity.
          </div>
        ) : (
          filteredActions.map((action) => (
            <div 
              key={action.id} 
              className="action-item"
              style={{ borderLeftColor: getActionColor(action.action) }}
            >
              <div className="action-icon">
                {getActionIcon(action.action)}
              </div>
              
              <div className="action-content">
                <div className="action-header">
                  <span className="action-text">
                    {getActionText(action.action)}
                  </span>
                  <span className="action-time" title={`Exact time: ${new Date(action.created_at).toLocaleString('en-US', { timeZone: 'Asia/Singapore' })}`}>
                    {formatTime(action.created_at)}
                  </span>
                </div>
                
                <div className="action-details">
                  <div className="action-user">
                    👤 by {getUserName(action)}
                  </div>
                  
                  {/* Document actions */}
                  {action.target_type === 'document' && (
                    <div className="action-document">
                      📄 {action.payload?.document_type?.replace('_', ' ').toUpperCase()} 
                      {action.payload?.pro_number && (
                        <span className="pro-number">PRO {action.payload.pro_number}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Container actions */}
                  {action.target_type === 'container_operation' && (
                    <div className="action-document">
                      📦 Container {action.payload?.container_number}
                      {action.payload?.pro_number && (
                        <span className="pro-number">PRO {action.payload.pro_number}</span>
                      )}
                    </div>
                  )}
                  
                  {/* Trucking actions */}
                  {action.target_type === 'pro' && (
                    <div className="action-document">
                      🚛 PRO {action.payload?.pro_number}
                    </div>
                  )}
                  
                  {/* Finance receipt actions */}
                  {action.target_type === 'finance_receipt' && (
                    <div className="action-document">
                      📄 {action.payload?.receipt_type_display || action.payload?.receipt_type?.replace('_', ' ').toUpperCase()}
                      {action.payload?.pro_number && (
                        <span className="pro-number">PRO {action.payload.pro_number}</span>
                      )}
                    </div>
                  )}
                  
                  {action.payload?.file_path && (
                    <div className="action-file">
                      📁 {action.payload.file_path.split('/').pop()}
                    </div>
                  )}
                  
                  {/* Show notification message if available */}
                  {action.payload?.notification_message && (
                    <div className="action-message">
                      💬 {action.payload.notification_message}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="log-footer">
        <div className="stats">
          Total Actions: {actions.length} | 
          Showing: {filteredActions.length} | 
          Real-time updates enabled
        </div>
      </div>
    </div>
  )
}
