# Container Action Logging Test Guide

## How to Test Container Block Action Logging

### Method 1: Using the Test Component (Recommended)

1. **Navigate to any Trucking Profile page** (e.g., `/trucking/PRO2025001`)
2. **Click "Show Action Log Test"** button at the top
3. **Run the following tests:**
   - **Test Container Status Change** - Changes a container status (booking → delivering → returned)
   - **Test Container Details Update** - Updates driver name
   - **Test Trucking Status Change** - Changes trucking status (ongoing → completed)
   - **Check Recent Logs** - Shows recent action log entries

### Method 2: Manual Testing

1. **Go to a Trucking Profile** with container operations
2. **Change container status** using the dropdown (booking → delivering → returned)
3. **Edit container details** (driver name, chassis number, dates)
4. **Change trucking status** to completed (if all containers are returned)

### Method 3: Database Query

Run this SQL query to check recent action logs:

```sql
SELECT
  al.created_at,
  al.action,
  al.target_type,
  al.payload->>'notification_message' as message,
  al.payload->>'pro_number' as pro,
  al.payload->>'container_number' as container,
  al.payload->>'old_status' as old_status,
  al.payload->>'new_status' as new_status,
  u.email as user_email
FROM actions_log al
JOIN auth.users u ON al.user_id = u.id
WHERE al.action IN ('container_status_changed', 'container_details_updated', 'trucking_status_changed')
ORDER BY al.created_at DESC
LIMIT 20;
```

## Expected Action Types

### 1. Container Status Changes

- **Action**: `container_status_changed`
- **Target Type**: `container_operation`
- **Message**: `"Container MSCU1234567 status changed to 'returned'"`

### 2. Container Details Updates

- **Action**: `container_details_updated`
- **Target Type**: `container_operation`
- **Message**: `"Container MSCU1234567 details updated"`
- **Payload includes**: `changed_fields`, `old_values`, `new_values`

### 3. Trucking Status Changes

- **Action**: `trucking_status_changed`
- **Target Type**: `pro`
- **Message**: `"PRO 2025001 moved to Finance Department"` (when completed)
- **Message**: `"PRO 2025001 trucking status changed to 'ongoing'"` (when ongoing)

## Troubleshooting

### No Logs Appearing?

1. **Check Console Logs**: Look for `✅ Logged container action:` or `✅ Logged trucking status action:` messages
2. **Check User Authentication**: Make sure you're logged in
3. **Check Database Connection**: Verify Supabase connection is working
4. **Check for Errors**: Look for `❌ Error logging` messages in console

### Common Issues

1. **Missing userId**: Check if user is authenticated
2. **Missing containerId**: Check if container operation exists
3. **Database Permissions**: Ensure user has INSERT permissions on actions_log table

## Test Data Requirements

- At least one PRO with `status = 'completed'` in shipment
- At least one container operation record
- Authenticated user session

## Verification Checklist

- [ ] Container status changes are logged
- [ ] Container detail edits are logged
- [ ] Trucking status changes are logged
- [ ] Notification messages are correct
- [ ] User information is captured
- [ ] Timestamps are accurate
- [ ] Payload data is complete

## Sample Expected Output

```
created_at              | action                    | message
2025-01-15 10:30:00    | container_status_changed | Container MSCU1234567 status changed to 'returned'
2025-01-15 10:25:00    | container_details_updated | Container MSCU1234567 details updated
2025-01-15 10:20:00    | trucking_status_changed   | PRO 2025001 moved to Finance Department
```

## Next Steps

After confirming logging works:

1. Remove the test component from production
2. Set up real-time notifications using Supabase subscriptions
3. Create notification UI components
4. Add filtering and search functionality
