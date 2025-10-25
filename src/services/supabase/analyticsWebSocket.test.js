// Analytics WebSocket Test
// Simple test to verify WebSocket functionality

import { analyticsWebSocket } from './analyticsWebSocket';

/**
 * Test WebSocket functionality for Analytics
 */
export function testAnalyticsWebSocket() {
  console.log('🧪 Starting Analytics WebSocket Test...');
  
  let testResults = {
    initialization: false,
    callbacks: false,
    cleanup: false,
    errors: []
  };
  
  try {
    // Test 1: Initialize WebSocket connections
    console.log('Test 1: Initializing WebSocket connections...');
    
    const testCallbacks = {
      financial_update: (payload) => {
        console.log('✅ Financial callback triggered:', payload);
        testResults.callbacks = true;
      },
      trucking_update: (payload) => {
        console.log('✅ Trucking callback triggered:', payload);
        testResults.callbacks = true;
      },
      pipeline_update: (payload) => {
        console.log('✅ Pipeline callback triggered:', payload);
        testResults.callbacks = true;
      },
      workload_update: (payload) => {
        console.log('✅ Workload callback triggered:', payload);
        testResults.callbacks = true;
      },
      onDataUpdate: (sections, payload) => {
        console.log('✅ General data update callback triggered:', sections, payload);
        testResults.callbacks = true;
      },
      onConnectionStatusChange: (status) => {
        console.log('✅ Connection status callback triggered:', status);
        testResults.callbacks = true;
      }
    };
    
    // Initialize WebSocket connections
    analyticsWebSocket.initialize(testCallbacks)
      .then(() => {
        console.log('✅ WebSocket initialization successful');
        testResults.initialization = true;
        
        // Test 2: Check connection status
        setTimeout(() => {
          const status = analyticsWebSocket.getConnectionStatus();
          console.log('📊 Connection Status:', status);
          
          if (status.isConnected) {
            console.log('✅ WebSocket connections are active');
          } else {
            console.log('⚠️ WebSocket connections are not active');
          }
          
          // Test 3: Cleanup
          setTimeout(() => {
            console.log('Test 3: Testing cleanup...');
            analyticsWebSocket.cleanup();
            
            const finalStatus = analyticsWebSocket.getConnectionStatus();
            if (!finalStatus.isConnected && finalStatus.activeChannels.length === 0) {
              console.log('✅ Cleanup successful');
              testResults.cleanup = true;
            } else {
              console.log('❌ Cleanup failed');
            }
            
            // Print test results
            console.log('🧪 Analytics WebSocket Test Results:', testResults);
            
            if (testResults.initialization && testResults.cleanup) {
              console.log('🎉 All tests passed! WebSocket functionality is working correctly.');
            } else {
              console.log('❌ Some tests failed. Check the implementation.');
            }
            
          }, 2000); // Wait 2 seconds before cleanup test
          
        }, 3000); // Wait 3 seconds to check connection status
        
      })
      .catch((error) => {
        console.error('❌ WebSocket initialization failed:', error);
        testResults.errors.push(error);
      });
      
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    testResults.errors.push(error);
  }
  
  return testResults;
}

/**
 * Test WebSocket with mock data updates
 */
export function testWebSocketWithMockData() {
  console.log('🧪 Testing WebSocket with mock data...');
  
  const mockCallbacks = {
    financial_update: (payload) => {
      console.log('💰 Mock financial update received:', payload);
    },
    trucking_update: (payload) => {
      console.log('🚛 Mock trucking update received:', payload);
    },
    pipeline_update: (payload) => {
      console.log('📊 Mock pipeline update received:', payload);
    },
    workload_update: (payload) => {
      console.log('⚡ Mock workload update received:', payload);
    },
    onDataUpdate: (sections, payload) => {
      console.log('🔄 Mock general update received:', sections, payload);
    }
  };
  
  // Initialize WebSocket
  analyticsWebSocket.initialize(mockCallbacks)
    .then(() => {
      console.log('✅ Mock WebSocket initialized');
      
      // Simulate some database changes (these would normally come from Supabase)
      setTimeout(() => {
        console.log('📝 Simulating database changes...');
        
        // In a real scenario, these would be triggered by actual database changes
        // For testing, we can manually trigger the callbacks
        const mockPayload = {
          eventType: 'INSERT',
          new: { id: 1, status: 'test' },
          old: null
        };
        
        mockCallbacks.financial_update(mockPayload);
        mockCallbacks.trucking_update(mockPayload);
        mockCallbacks.pipeline_update(mockPayload);
        mockCallbacks.workload_update(mockPayload);
        
        console.log('✅ Mock data updates sent');
        
        // Cleanup after test
        setTimeout(() => {
          analyticsWebSocket.cleanup();
          console.log('✅ Mock test cleanup completed');
        }, 1000);
        
      }, 2000);
      
    })
    .catch((error) => {
      console.error('❌ Mock WebSocket test failed:', error);
    });
}

// Export test functions for use in browser console or other test files
if (typeof window !== 'undefined') {
  window.testAnalyticsWebSocket = testAnalyticsWebSocket;
  window.testWebSocketWithMockData = testWebSocketWithMockData;
}
