// Analytics WebSocket Service
// Real-time data updates for Analytics page using Supabase Realtime

import { supabase } from './supabaseClient';

/**
 * Analytics WebSocket Manager
 * Handles real-time subscriptions for analytics data updates
 */
export class AnalyticsWebSocketManager {
  constructor() {
    this.channels = new Map();
    this.callbacks = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  /**
   * Initialize WebSocket connections for analytics
   * @param {Object} callbacks - Object containing callback functions for different data types
   */
  async initialize(callbacks = {}) {
    console.log('🔌 Initializing Analytics WebSocket connections...');
    
    this.callbacks = callbacks;
    
    try {
      // Subscribe to PRO table changes (affects financial analytics)
      await this.subscribeToPROChanges();
      
      // Subscribe to container_operations changes (affects trucking analytics)
      await this.subscribeToContainerOperationsChanges();
      
      // Subscribe to finance_receipts changes (affects financial analytics)
      await this.subscribeToFinanceReceiptsChanges();
      
      // Subscribe to documents changes (affects departmental workload)
      await this.subscribeToDocumentsChanges();
      
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ Analytics WebSocket connections initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Analytics WebSocket connections:', error);
      this.handleReconnection();
    }
  }

  /**
   * Subscribe to PRO table changes
   */
  async subscribeToPROChanges() {
    const channelName = 'analytics_pro_changes';
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: 'analytics_pro' }
        }
      })
      .on('postgres_changes', 
        { 
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'pro'
        }, 
        (payload) => {
          console.log('🔔 PRO table change detected:', payload);
          this.handlePROChange(payload);
        }
      )
      .subscribe((status, err) => {
        this.handleSubscriptionStatus(channelName, status, err);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to container_operations table changes
   */
  async subscribeToContainerOperationsChanges() {
    const channelName = 'analytics_container_operations_changes';
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: 'analytics_container_operations' }
        }
      })
      .on('postgres_changes', 
        { 
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'container_operations'
        }, 
        (payload) => {
          console.log('🔔 Container operations change detected:', payload);
          this.handleContainerOperationsChange(payload);
        }
      )
      .subscribe((status, err) => {
        this.handleSubscriptionStatus(channelName, status, err);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to finance_receipts table changes
   */
  async subscribeToFinanceReceiptsChanges() {
    const channelName = 'analytics_finance_receipts_changes';
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: 'analytics_finance_receipts' }
        }
      })
      .on('postgres_changes', 
        { 
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'finance_receipts'
        }, 
        (payload) => {
          console.log('🔔 Finance receipts change detected:', payload);
          this.handleFinanceReceiptsChange(payload);
        }
      )
      .subscribe((status, err) => {
        this.handleSubscriptionStatus(channelName, status, err);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Subscribe to documents table changes
   */
  async subscribeToDocumentsChanges() {
    const channelName = 'analytics_documents_changes';
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: 'analytics_documents' }
        }
      })
      .on('postgres_changes', 
        { 
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public', 
          table: 'documents'
        }, 
        (payload) => {
          console.log('🔔 Documents change detected:', payload);
          this.handleDocumentsChange(payload);
        }
      )
      .subscribe((status, err) => {
        this.handleSubscriptionStatus(channelName, status, err);
      });

    this.channels.set(channelName, channel);
  }

  /**
   * Handle PRO table changes
   */
  handlePROChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Determine which analytics sections need updates
    const affectedSections = [];
    
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      // New PRO or status change affects pipeline and workload
      affectedSections.push('pipeline', 'workload');
      
      // If finance status changed, affects financial analytics
      if (eventType === 'UPDATE' && oldRecord && 
          oldRecord.finance_status !== newRecord.finance_status) {
        affectedSections.push('financial');
      }
    }
    
    if (eventType === 'DELETE') {
      // PRO deletion affects all sections
      affectedSections.push('financial', 'pipeline', 'workload');
    }
    
    // Trigger callbacks for affected sections
    this.triggerCallbacks('pro', affectedSections, payload);
  }

  /**
   * Handle container_operations table changes
   */
  handleContainerOperationsChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    const affectedSections = [];
    
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      // Container operations affect trucking analytics and workload
      affectedSections.push('trucking', 'workload');
      
      // If status changed, affects pipeline
      if (eventType === 'UPDATE' && oldRecord && 
          oldRecord.status !== newRecord.status) {
        affectedSections.push('pipeline');
      }
    }
    
    if (eventType === 'DELETE') {
      affectedSections.push('trucking', 'workload', 'pipeline');
    }
    
    this.triggerCallbacks('container_operations', affectedSections, payload);
  }

  /**
   * Handle finance_receipts table changes
   */
  handleFinanceReceiptsChange(payload) {
    const { eventType } = payload;
    
    // Finance receipts changes affect financial analytics
    this.triggerCallbacks('finance_receipts', ['financial'], payload);
  }

  /**
   * Handle documents table changes
   */
  handleDocumentsChange(payload) {
    const { eventType } = payload;
    
    // Document changes affect departmental workload
    this.triggerCallbacks('documents', ['workload'], payload);
  }

  /**
   * Trigger callbacks for affected sections
   */
  triggerCallbacks(source, sections, payload) {
    sections.forEach(section => {
      const callbackKey = `${section}_update`;
      if (this.callbacks[callbackKey]) {
        console.log(`🔄 Triggering ${callbackKey} callback from ${source}`);
        this.callbacks[callbackKey](payload);
      }
    });
    
    // Also trigger general update callback
    if (this.callbacks.onDataUpdate) {
      this.callbacks.onDataUpdate(sections, payload);
    }
  }

  /**
   * Handle subscription status changes
   */
  handleSubscriptionStatus(channelName, status, err) {
    console.log(`📡 ${channelName} subscription status:`, status);
    
    if (err) {
      console.error(`❌ ${channelName} subscription error:`, err);
    }
    
    if (status === 'SUBSCRIBED') {
      console.log(`✅ Successfully subscribed to ${channelName}`);
    } else if (status === 'CHANNEL_ERROR') {
      console.error(`❌ ${channelName} subscription failed`);
      this.handleReconnection();
    } else if (status === 'TIMED_OUT') {
      console.error(`❌ ${channelName} subscription timed out`);
      this.handleReconnection();
    } else if (status === 'CLOSED') {
      console.error(`❌ ${channelName} connection closed`);
      this.handleReconnection();
    }
  }

  /**
   * Handle reconnection logic
   */
  async handleReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. WebSocket connections failed.');
      this.isConnected = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`🔄 Attempting to reconnect Analytics WebSocket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await this.initialize(this.callbacks);
      } catch (error) {
        console.error('❌ Reconnection attempt failed:', error);
        this.handleReconnection();
      }
    }, delay);
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      activeChannels: Array.from(this.channels.keys())
    };
  }

  /**
   * Clean up all WebSocket connections
   */
  cleanup() {
    console.log('🧹 Cleaning up Analytics WebSocket connections...');
    
    this.channels.forEach((channel, channelName) => {
      console.log(`🔌 Removing channel: ${channelName}`);
      supabase.removeChannel(channel);
    });
    
    this.channels.clear();
    this.callbacks.clear();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    console.log('✅ Analytics WebSocket connections cleaned up');
  }
}

/**
 * Create and export a singleton instance
 */
export const analyticsWebSocket = new AnalyticsWebSocketManager();

/**
 * Hook for using analytics WebSocket in React components
 */
export function useAnalyticsWebSocket(callbacks = {}) {
  const [connectionStatus, setConnectionStatus] = React.useState({
    isConnected: false,
    reconnectAttempts: 0,
    activeChannels: []
  });

  React.useEffect(() => {
    // Initialize WebSocket connections
    analyticsWebSocket.initialize({
      ...callbacks,
      onConnectionStatusChange: setConnectionStatus
    });

    // Cleanup on unmount
    return () => {
      analyticsWebSocket.cleanup();
    };
  }, []);

  // Update connection status periodically
  React.useEffect(() => {
    const interval = setInterval(() => {
      const status = analyticsWebSocket.getConnectionStatus();
      setConnectionStatus(status);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    connectionStatus,
    analyticsWebSocket
  };
}

// Import React for the hook
import React from 'react';
