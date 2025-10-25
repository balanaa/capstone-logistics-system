# Analytics WebSocket Implementation

## Overview

The Analytics page now includes real-time WebSocket functionality using Supabase Realtime. This enables live updates of analytics data when changes occur in the database, providing users with up-to-date information without manual refresh.

## Features

### 🔌 Real-time Data Updates

- **Financial Analytics**: Updates when PROs are created, updated, or finance status changes
- **Trucking Analytics**: Updates when container operations change status
- **Pipeline Analytics**: Updates when PROs move between departments
- **Workload Analytics**: Updates when documents are processed or containers change status

### 📡 Connection Management

- **Automatic Reconnection**: Handles connection drops with exponential backoff
- **Connection Status Monitoring**: Visual indicators show connection status
- **Graceful Cleanup**: Properly closes connections when component unmounts

### 🎯 Smart Updates

- **Selective Refresh**: Only updates affected analytics sections
- **Efficient Queries**: Uses targeted database queries for specific data types
- **Error Handling**: Graceful fallback when WebSocket connections fail

## Implementation Details

### WebSocket Service (`analyticsWebSocket.js`)

The service manages multiple WebSocket channels:

```javascript
// Subscribe to different table changes
- PRO table changes → Financial & Pipeline updates
- container_operations changes → Trucking & Workload updates
- finance_receipts changes → Financial updates
- documents changes → Workload updates
```

### Analytics Component Integration

The Analytics component now includes:

1. **WebSocket Initialization**: Sets up real-time subscriptions on component mount
2. **Callback Handlers**: Individual refresh functions for each analytics section
3. **Status Indicators**: Visual feedback for connection status and last update time
4. **Error Handling**: Fallback to manual refresh when WebSocket fails

## Usage

### Basic Implementation

```javascript
import { analyticsWebSocket } from "../../services/supabase/analyticsWebSocket";

// Initialize WebSocket connections
const callbacks = {
  financial_update: (payload) => {
    // Refresh financial data
    refreshFinancialData();
  },
  trucking_update: (payload) => {
    // Refresh trucking data
    refreshTruckingData();
  },
  // ... other callbacks
};

analyticsWebSocket.initialize(callbacks);
```

### React Hook Usage

```javascript
import { useAnalyticsWebSocket } from "../../services/supabase/analyticsWebSocket";

function MyComponent() {
  const { connectionStatus, analyticsWebSocket } = useAnalyticsWebSocket({
    financial_update: (payload) => refreshFinancialData(),
    trucking_update: (payload) => refreshTruckingData(),
    // ... other callbacks
  });

  return (
    <div>
      <div>
        Connection Status:{" "}
        {connectionStatus.isConnected ? "Connected" : "Disconnected"}
      </div>
      {/* Your analytics content */}
    </div>
  );
}
```

## Database Tables Monitored

### PRO Table

- **Events**: INSERT, UPDATE, DELETE
- **Triggers**: Financial analytics, pipeline analytics, workload analytics
- **Key Fields**: `finance_status`, `trucking_status`, `status`

### Container Operations Table

- **Events**: INSERT, UPDATE, DELETE
- **Triggers**: Trucking analytics, workload analytics
- **Key Fields**: `status`, `departure_date_from_port`, `date_of_return_to_yard`

### Finance Receipts Table

- **Events**: INSERT, UPDATE, DELETE
- **Triggers**: Financial analytics
- **Key Fields**: `receipt_type`, `receipt_data`

### Documents Table

- **Events**: INSERT, UPDATE, DELETE
- **Triggers**: Workload analytics
- **Key Fields**: `status`, `department`

## Visual Indicators

### Real-time Status Bar

- **Green Dot**: WebSocket connected and active
- **Red Dot**: WebSocket disconnected
- **Last Update Time**: Shows when data was last refreshed
- **Reconnection Info**: Shows reconnection attempts when disconnected

### Loading States

- **Initial Load**: Shows loading spinner with WebSocket status
- **Real-time Updates**: Smooth data updates without full page refresh

## Error Handling

### Connection Failures

- **Automatic Reconnection**: Up to 5 attempts with exponential backoff
- **Fallback Mode**: Continues to work with manual refresh if WebSocket fails
- **User Notification**: Visual indicators show connection status

### Data Update Failures

- **Individual Section Updates**: If one section fails, others continue working
- **Error Logging**: Detailed console logs for debugging
- **Graceful Degradation**: Falls back to last known data

## Performance Considerations

### Efficient Updates

- **Selective Refresh**: Only updates affected analytics sections
- **Debounced Updates**: Prevents excessive API calls during rapid changes
- **Connection Pooling**: Reuses WebSocket connections efficiently

### Resource Management

- **Automatic Cleanup**: Closes connections when component unmounts
- **Memory Management**: Properly removes event listeners and callbacks
- **Connection Limits**: Respects Supabase connection limits

## Testing

### Manual Testing

```javascript
// In browser console
testAnalyticsWebSocket(); // Test basic functionality
testWebSocketWithMockData(); // Test with mock data
```

### Automated Testing

- Unit tests for WebSocket service
- Integration tests for Analytics component
- E2E tests for real-time updates

## Troubleshooting

### Common Issues

1. **WebSocket Not Connecting**

   - Check Supabase project settings
   - Verify Realtime is enabled
   - Check network connectivity

2. **Updates Not Triggering**

   - Verify database triggers are set up
   - Check table permissions
   - Review callback implementations

3. **Performance Issues**
   - Monitor connection count
   - Check for memory leaks
   - Review update frequency

### Debug Mode

Enable detailed logging by setting:

```javascript
localStorage.setItem("analytics-debug", "true");
```

## Future Enhancements

### Planned Features

- **Push Notifications**: Browser notifications for important updates
- **Offline Support**: Cache data for offline viewing
- **Custom Filters**: Real-time updates based on user-selected filters
- **Analytics Alerts**: Notifications for threshold breaches

### Performance Optimizations

- **Data Compression**: Reduce WebSocket payload size
- **Batch Updates**: Group multiple changes into single updates
- **Smart Caching**: Cache frequently accessed data
- **Connection Optimization**: Reduce connection overhead

## Security Considerations

### Data Privacy

- **User Isolation**: WebSocket channels are user-specific
- **Permission Checks**: Respects database row-level security
- **Data Encryption**: All WebSocket traffic is encrypted

### Access Control

- **Authentication Required**: WebSocket connections require valid session
- **Role-based Access**: Different users see different data
- **Audit Logging**: All WebSocket activities are logged

## Monitoring

### Connection Metrics

- **Active Connections**: Monitor concurrent WebSocket connections
- **Update Frequency**: Track how often data updates occur
- **Error Rates**: Monitor connection failures and retry attempts

### Performance Metrics

- **Update Latency**: Time from database change to UI update
- **Memory Usage**: Monitor WebSocket service memory consumption
- **CPU Usage**: Track processing overhead of real-time updates

---

## Quick Start

1. **Enable Realtime** in your Supabase project
2. **Import the service** in your Analytics component
3. **Initialize WebSocket** with appropriate callbacks
4. **Add status indicators** to your UI
5. **Test the functionality** with the provided test functions

The WebSocket implementation is now fully integrated and ready for production use!
