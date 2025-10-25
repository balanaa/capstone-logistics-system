import React, { useState } from 'react';
import { supabase } from '../services/supabase/client';
import { updateContainerOperation } from '../services/supabase/containerOperations';
import { updateTruckingCompletionStatus } from '../services/supabase/truckingStatus';

export default function ContainerLogTest() {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { 
      message, 
      type, 
      timestamp: new Date().toLocaleTimeString() 
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  // Test 1: Container Status Change
  const testContainerStatusChange = async () => {
    setLoading(true);
    try {
      addResult('🧪 Testing Container Status Change...', 'info');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addResult('❌ No authenticated user found', 'error');
        return;
      }

      // Get a container operation to test with
      const { data: containers, error: fetchError } = await supabase
        .from('container_operations')
        .select('id, container_number, pro_number, status')
        .limit(1);

      if (fetchError || !containers || containers.length === 0) {
        addResult('❌ No container operations found to test with', 'error');
        return;
      }

      const container = containers[0];
      const newStatus = container.status === 'booking' ? 'delivering' : 'booking';
      
      addResult(`📦 Testing with container: ${container.container_number}`, 'info');
      addResult(`🔄 Changing status from '${container.status}' to '${newStatus}'`, 'info');

      // Update the container status
      await updateContainerOperation(container.id, { status: newStatus }, user.id);
      
      addResult('✅ Container status update completed', 'success');
      addResult('📝 Check actions_log table for new entry', 'info');
      
    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Test 2: Container Details Update
  const testContainerDetailsUpdate = async () => {
    setLoading(true);
    try {
      addResult('🧪 Testing Container Details Update...', 'info');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addResult('❌ No authenticated user found', 'error');
        return;
      }

      // Get a container operation to test with
      const { data: containers, error: fetchError } = await supabase
        .from('container_operations')
        .select('id, container_number, pro_number, driver')
        .limit(1);

      if (fetchError || !containers || containers.length === 0) {
        addResult('❌ No container operations found to test with', 'error');
        return;
      }

      const container = containers[0];
      const newDriver = `Test Driver ${Date.now()}`;
      
      addResult(`📦 Testing with container: ${container.container_number}`, 'info');
      addResult(`👤 Changing driver from '${container.driver || 'empty'}' to '${newDriver}'`, 'info');

      // Update the container details
      await updateContainerOperation(container.id, { driver: newDriver }, user.id);
      
      addResult('✅ Container details update completed', 'success');
      addResult('📝 Check actions_log table for new entry', 'info');
      
    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Test 3: Trucking Status Change
  const testTruckingStatusChange = async () => {
    setLoading(true);
    try {
      addResult('🧪 Testing Trucking Status Change...', 'info');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addResult('❌ No authenticated user found', 'error');
        return;
      }

      // Get a PRO to test with
      const { data: pros, error: fetchError } = await supabase
        .from('pro')
        .select('pro_number, trucking_status')
        .limit(1);

      if (fetchError || !pros || pros.length === 0) {
        addResult('❌ No PROs found to test with', 'error');
        return;
      }

      const pro = pros[0];
      const newStatus = pro.trucking_status === 'ongoing' ? 'completed' : 'ongoing';
      
      addResult(`📋 Testing with PRO: ${pro.pro_number}`, 'info');
      addResult(`🔄 Changing trucking status from '${pro.trucking_status || 'ongoing'}' to '${newStatus}'`, 'info');

      // Update the trucking status
      await updateTruckingCompletionStatus(pro.pro_number, newStatus, user.id);
      
      addResult('✅ Trucking status update completed', 'success');
      addResult('📝 Check actions_log table for new entry', 'info');
      
    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Test 4: Direct Log Test
  const testDirectLogging = async () => {
    setLoading(true);
    try {
      addResult('🧪 Testing Direct Container Logging...', 'info');
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addResult('❌ No authenticated user found', 'error');
        return;
      }

      addResult(`👤 User ID: ${user.id}`, 'info');

      // Test direct logging call
      const { logContainerAction } = await import('../services/supabase/containerOperations');
      
      addResult('📝 Calling logContainerAction directly...', 'info');
      
      await logContainerAction({
        userId: user.id,
        action: 'container_status_changed',
        containerId: 'test-container-id',
        proNumber: 'TEST123',
        containerNumber: 'TEST1234567',
        payload: {
          old_status: 'booking',
          new_status: 'delivering',
          notification_message: 'Test container status changed to delivering'
        }
      });
      
      addResult('✅ Direct logging call completed', 'success');
      addResult('📝 Check actions_log table for test entry', 'info');
      
    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error');
      console.error('Direct logging test error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test 5: Check Recent Logs
  const checkRecentLogs = async () => {
    setLoading(true);
    try {
      addResult('🔍 Checking Recent Action Logs...', 'info');
      
      const { data: logs, error } = await supabase
        .from('actions_log')
        .select(`
          id,
          created_at,
          action,
          target_type,
          target_id,
          payload,
          user_id
        `)
        .in('action', ['container_status_changed', 'container_details_updated', 'trucking_status_changed'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        addResult(`❌ Error fetching logs: ${error.message}`, 'error');
        return;
      }

      if (!logs || logs.length === 0) {
        addResult('📭 No recent container/trucking logs found', 'warning');
        return;
      }

      addResult(`📊 Found ${logs.length} recent logs:`, 'success');
      
      logs.forEach((log, index) => {
        const payload = log.payload || {};
        const message = payload.notification_message || `${log.action} for ${payload.pro_number || payload.container_number || log.target_id}`;
        
        addResult(`${index + 1}. ${log.action} - ${message}`, 'info');
        addResult(`   Time: ${new Date(log.created_at).toLocaleString()}`, 'info');
        addResult(`   Target: ${log.target_type} (${log.target_id})`, 'info');
      });
      
    } catch (error) {
      addResult(`❌ Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getResultStyle = (type) => {
    const styles = {
      info: { color: '#333', backgroundColor: '#f0f0f0' },
      success: { color: '#155724', backgroundColor: '#d4edda' },
      error: { color: '#721c24', backgroundColor: '#f8d7da' },
      warning: { color: '#856404', backgroundColor: '#fff3cd' }
    };
    return styles[type] || styles.info;
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Container Block Action Logging Test</h2>
      <p>This component tests the action logging functionality for container operations and trucking status changes.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testContainerStatusChange} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Test Container Status Change
        </button>
        
        <button 
          onClick={testContainerDetailsUpdate} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Test Container Details Update
        </button>
        
        <button 
          onClick={testTruckingStatusChange} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Test Trucking Status Change
        </button>
        
        <button 
          onClick={testDirectLogging} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Test Direct Logging
        </button>
        
        <button 
          onClick={checkRecentLogs} 
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 16px' }}
        >
          Check Recent Logs
        </button>
        
        <button 
          onClick={clearResults} 
          style={{ padding: '8px 16px' }}
        >
          Clear Results
        </button>
      </div>

      {loading && (
        <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '4px', marginBottom: '10px' }}>
          ⏳ Running test...
        </div>
      )}

      <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px' }}>
        {testResults.map((result, index) => (
          <div 
            key={index} 
            style={{ 
              padding: '8px 12px', 
              borderBottom: '1px solid #eee',
              ...getResultStyle(result.type)
            }}
          >
            <span style={{ fontWeight: 'bold' }}>[{result.timestamp}]</span> {result.message}
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>Expected Action Types:</h3>
        <ul>
          <li><strong>container_status_changed</strong> - When container status changes (booking → delivering → returned)</li>
          <li><strong>container_details_updated</strong> - When container details are edited (driver, chassis, dates)</li>
          <li><strong>trucking_status_changed</strong> - When trucking status changes (ongoing → completed)</li>
        </ul>
        
        <h3>Database Query to Check Logs:</h3>
        <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
{`SELECT
  al.created_at,
  al.action,
  al.target_type,
  al.payload->>'notification_message' as message,
  al.payload->>'pro_number' as pro,
  al.payload->>'container_number' as container,
  u.email as user_email
FROM actions_log al
JOIN auth.users u ON al.user_id = u.id
WHERE al.action IN ('container_status_changed', 'container_details_updated', 'trucking_status_changed')
ORDER BY al.created_at DESC
LIMIT 20;`}
        </pre>
      </div>
    </div>
  );
}
