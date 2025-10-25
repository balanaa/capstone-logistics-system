import React, { useState } from 'react'
import { supabase } from '../services/supabase/client'

export default function LogTest() {
  const [testResult, setTestResult] = useState('')
  const [loading, setLoading] = useState(false)

  const testLogAction = async () => {
    setLoading(true)
    setTestResult('Testing...')
    
    try {
      // Get current user details
      const { data: sess } = await supabase.auth.getSession()
      const userId = sess?.session?.user?.id
      const user = sess?.session?.user
      const userName = user?.user_metadata?.full_name || user?.email || `User ${userId?.substring(0, 8)}`
      
      if (!userId) {
        setTestResult('❌ No user session found')
        return
      }

      // Insert a test action log entry
      const { data, error } = await supabase
        .from('actions_log')
        .insert({
          user_id: userId,
          action: 'document_data_updated',
          target_type: 'document',
          target_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
          payload: {
            pro_number: 'TEST001',
            department: 'shipment',
            document_type: 'invoice',
            user_name: userName // Include username in payload
          }
        })
        .select()

      if (error) throw error

      setTestResult(`✅ Test action logged successfully! Check the Actions Log page to see it appear in real-time.`)
      
    } catch (err) {
      setTestResult(`❌ Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '600px', 
      margin: '0 auto',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h2>Actions Log Test</h2>
      <p>This will insert a test action log entry to verify the websocket functionality.</p>
      
      <button 
        onClick={testLogAction}
        disabled={loading}
        style={{
          padding: '12px 24px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          marginBottom: '20px'
        }}
      >
        {loading ? 'Testing...' : 'Test Actions Log'}
      </button>
      
      {testResult && (
        <div style={{
          padding: '12px',
          background: testResult.includes('✅') ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${testResult.includes('✅') ? '#22c55e' : '#ef4444'}`,
          borderRadius: '6px',
          color: testResult.includes('✅') ? '#166534' : '#dc2626'
        }}>
          {testResult}
        </div>
      )}
      
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#6b7280' }}>
        <p><strong>Instructions:</strong></p>
        <ol>
          <li>Click "Test Actions Log" button above</li>
          <li>Open the Actions Log page at <code>/log</code></li>
          <li>Watch for the new test entry to appear in real-time</li>
          <li>Try uploading/editing documents to see live updates</li>
        </ol>
      </div>
    </div>
  )
}
