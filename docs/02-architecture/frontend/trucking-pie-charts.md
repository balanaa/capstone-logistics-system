# Trucking Department Pie Charts

## Overview

The Trucking department displays two distinct pie charts that serve different purposes in tracking shipment and container operations.

## Chart 1: Container Status Chart

### Purpose

Tracks the **individual container status** within the trucking operations process.

### Data Source

- **Table**: `container_operations`
- **Field**: `status`
- **Scope**: Individual containers across all shipments

### Status Categories

- **Booking**: Containers that are booked but not yet in transit
- **Delivering**: Containers currently being transported/delivered
- **Returned**: Containers that have completed their journey and returned to the yard

### Display

- **Total Label**: "Total Containers"
- **Count**: Number of individual containers
- **Colors**:
  - Booking: Purple (`#8b5cf6`)
  - Delivering: Orange (`#f59e0b`)
  - Returned: Green (`#10b981`)

### Use Case

Operations managers can see the distribution of container statuses across all active shipments to understand:

- How many containers are in each stage of the delivery process
- Resource allocation needs (drivers, trucks, yard space)
- Bottlenecks in the delivery pipeline

## Chart 2: Trucking Status Chart

### Purpose

Tracks the **overall shipment completion status** for the trucking department.

### Data Source

- **Table**: `container_operations`
- **Field**: `status` (aggregated by shipment)
- **Scope**: Shipments as a whole

### Status Categories

- **Ongoing**: Shipments with containers still in "booking" or "delivering" status
- **Completed**: Shipments where ALL containers have "returned" status

### Display

- **Total Label**: "Total Shipments"
- **Count**: Number of shipments (PROs)
- **Colors**:
  - Ongoing: Blue (`#3b82f6`)
  - Completed: Green (`#10b981`)

### Logic

```javascript
// A shipment is considered "completed" only when ALL its containers are returned
if (allContainersInShipment.status === "returned") {
  shipmentStatus = "completed";
} else {
  shipmentStatus = "ongoing";
}
```

### Use Case

Department managers can see the overall completion rate of shipments to understand:

- How many shipments are fully completed vs still in progress
- Department performance metrics
- Workload distribution and completion rates

## Key Differences

| Aspect           | Container Status Chart   | Trucking Status Chart      |
| ---------------- | ------------------------ | -------------------------- |
| **Granularity**  | Individual containers    | Entire shipments           |
| **Purpose**      | Container-level tracking | Shipment-level tracking    |
| **Status Logic** | Direct container status  | Aggregated shipment status |
| **Use Case**     | Operational management   | Strategic overview         |
| **Total Count**  | Total containers         | Total shipments            |

## Data Flow

1. **Container Operations**: Created from BOL data or manually added
2. **Status Updates**: Updated via ContainerBlock component inline editing
3. **Chart Updates**: Real-time updates as container statuses change
4. **Aggregation**: Trucking chart aggregates container statuses by shipment

## Technical Implementation

### Container Status Chart

```javascript
// Counts containers by individual status
const counts = { booking: 0, delivering: 0, returned: 0 };
data.forEach((operation) => {
  counts[operation.status]++;
});
```

### Trucking Status Chart

```javascript
// Groups containers by shipment, then determines shipment status
const shipmentStatuses = {};
data.forEach((operation) => {
  if (!shipmentStatuses[operation.pro_number]) {
    shipmentStatuses[operation.pro_number] = [];
  }
  shipmentStatuses[operation.pro_number].push(operation.status);
});

// Determine if shipment is completed (all containers returned)
Object.values(shipmentStatuses).forEach((containerStatuses) => {
  const isCompleted = containerStatuses.every(
    (status) => status === "returned"
  );
  counts[isCompleted ? "completed" : "ongoing"]++;
});
```

## Future Enhancements

- **Time-based tracking**: Add timestamps for status transitions
- **Performance metrics**: Average delivery times, completion rates
- **Alert system**: Notifications for overdue containers
- **Historical data**: Trends over time for both charts
