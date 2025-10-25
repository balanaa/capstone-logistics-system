# Container Operations Table Documentation

## Overview

The `container_operations` table manages individual container operations for trucking departments. It tracks detailed information about each container's journey from port departure to yard return, including driver details, truck information, and important dates.

## Purpose

This table serves as the central repository for container operation data, enabling:

- **Container Tracking**: Monitor each container's operational status
- **Driver Management**: Track driver assignments and truck details
- **Date Management**: Record departure and return dates
- **Cross-Department Access**: Both Shipment and Trucking departments can access the same data

## Table Structure

### Core Fields

| Field              | Type | Description                                        |
| ------------------ | ---- | -------------------------------------------------- |
| `id`               | UUID | Primary key (auto-generated)                       |
| `pro_number`       | TEXT | References `pro(pro_number)` - shipment identifier |
| `container_number` | TEXT | Container identifier (NOT NULL)                    |
| `seal_number`      | TEXT | Seal number (optional)                             |

### Operation Fields

| Field                      | Type | Description                     | Format    |
| -------------------------- | ---- | ------------------------------- | --------- |
| `departure_date_from_port` | DATE | When container left the port    | MM/DD/YY  |
| `driver`                   | TEXT | Driver name                     | Free text |
| `truck_plate_number`       | TEXT | License plate number            | Free text |
| `chassis_number`           | TEXT | Truck chassis identifier        | Free text |
| `date_of_return_to_yard`   | DATE | When container returned to yard | MM/DD/YY  |

### Metadata Fields

| Field        | Type      | Description          |
| ------------ | --------- | -------------------- |
| `created_at` | TIMESTAMP | Record creation time |

**Note**: Detailed tracking (updates, deletions, user actions) is handled by the existing `actions_log` table, following the same pattern as other tables in the system.

## Data Flow

### 1. Auto-Generation

- **Trigger**: When BOL document is uploaded
- **Source**: `container_seal_pairs` from BOL `document_fields`
- **Process**: Automatically creates one record per container/seal pair
- **Result**: Empty operation fields ready for user input

### 2. User Input

- **Interface**: ContainerBlock component in TruckingProfile
- **Editing**: Inline editing with auto-save
- **Validation**: Container number required for new records
- **Persistence**: Immediate save on field blur

### 3. Cross-Department Access

- **Shipment Department**: Can view all container operations
- **Trucking Department**: Can view, edit, and manage operations
- **Shared Data**: Both departments work with the same records

## Security & Permissions

### Role-Based Access Control (RLS)

The table uses Row Level Security with role-based permissions:

#### Roles

- **Admin**: Full access (bypasses all permission checks)
- **Verifier**: Full access (bypasses all permission checks)
- **Trucking**: Full access (view, write, delete)
- **Shipment**: View access only
- **Viewer**: View access only

#### Permission Levels

- **View**: Can read container operation data
- **Write**: Can create and update operations
- **Delete**: Can remove container operations

### RLS Policies

1. **SELECT**: Users with trucking view permission OR admin/verifier roles
2. **INSERT**: Users with trucking write permission OR admin/verifier roles
3. **UPDATE**: Users with trucking write permission OR admin/verifier roles
4. **DELETE**: Users with trucking delete permission OR admin/verifier roles

## Database Constraints

### Unique Constraints

- `(pro_number, container_number)` - One operation record per container per PRO

### Foreign Keys

- `pro_number` → `pro(pro_number)` ON DELETE CASCADE

### Indexes

- `idx_container_operations_pro` - Fast PRO-based queries
- `idx_container_operations_container` - Fast container-based queries
- `idx_container_operations_created` - Fast time-based sorting

## Triggers

### Actions Logging

- **Function**: `log_container_operations_actions()`
- **Trigger**: `log_container_operations_actions_trigger`
- **Purpose**: Logs all create/update/delete operations to `actions_log` table
- **Actions**: `create_container_operation`, `update_container_operation`, `delete_container_operation`

### Auto-Generation from BOL

- **Function**: `create_container_operations_from_bol()`
- **Trigger**: `create_container_operations_trigger`
- **Purpose**: Creates operation records when BOL documents are uploaded

## Usage Examples

### Creating Records

```sql
-- Auto-generated when BOL is uploaded
INSERT INTO container_operations (pro_number, container_number, seal_number)
VALUES ('1234567', 'MSCU1234567', 'S123456');
```

### Updating Operations

```sql
-- Update driver and departure date
UPDATE container_operations
SET driver = 'John Doe',
    departure_date_from_port = '2025-01-15'
WHERE pro_number = '1234567'
AND container_number = 'MSCU1234567';
-- Note: User tracking is automatically handled by actions_log trigger
```

### Querying Data

```sql
-- Get all operations for a PRO
SELECT * FROM container_operations
WHERE pro_number = '1234567'
ORDER BY created_at;
```

## Integration Points

### Frontend Components

- **ContainerBlock**: Main editing interface
- **TruckingProfile**: Container management page
- **ShipmentProfile**: View-only access

### Backend Services

- **Supabase Client**: Database operations
- **RLS Policies**: Security enforcement
- **Auto-triggers**: Data generation

## Future Enhancements

### Potential Additions

- **Status Tracking**: Add operational status field
- **Location Tracking**: Add GPS coordinates
- **Photo Attachments**: Add image upload capability
- **Notifications**: Add alert system for overdue returns
- **Reporting**: Add analytics and reporting features

### Performance Optimizations

- **Partitioning**: Partition by date for large datasets
- **Caching**: Add Redis caching for frequent queries
- **Archiving**: Archive completed operations

## Maintenance

### Regular Tasks

- **Data Cleanup**: Remove orphaned records
- **Index Maintenance**: Rebuild indexes periodically
- **Permission Audits**: Review user access regularly

### Monitoring

- **Query Performance**: Monitor slow queries
- **Storage Usage**: Track table growth
- **Access Patterns**: Analyze usage statistics
