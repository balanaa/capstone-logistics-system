# PRO Status Workflow Documentation

## Overview

This document describes the PRO (Proforma Receipt Order) status system and how it maps to the Pipeline Progress Flow in the Analytics dashboard. The system tracks each PRO through three departments using a 3-status field approach.

---

## PRO Number System

### Definition

- **PRO Number**: Universal identifier for a shipment/transaction across all departments
- **Format**: `YYYYNNN` (e.g., `2025001`, `2025042`)
- **Uniqueness**: Globally unique across Shipment, Trucking, Finance, and Verifier departments
- **Purpose**: One PRO represents one complete shipment workflow

### Database Structure

```sql
-- Main PRO table
CREATE TABLE pro (
    pro_number TEXT PRIMARY KEY,  -- Format: YYYYNNN
    created_at TIMESTAMP DEFAULT NOW(),
    status TEXT,                 -- Shipment department status
    trucking_status TEXT,        -- Trucking department status
    finance_status TEXT          -- Finance department status
);
```

---

## Status Fields Per PRO

Each PRO has **3 status fields** that determine its current pipeline position:

### 1. `status` (Shipment Department)

| Status        | Description                                     | Next Action         |
| ------------- | ----------------------------------------------- | ------------------- |
| `'ongoing'`   | PRO is being processed in shipment department   | Continue processing |
| `'filed_boc'` | PRO has been filed with BOC (Bureau of Customs) | Awaiting completion |
| `'completed'` | Shipment department work is finished            | Move to Trucking    |

### 2. `trucking_status` (Trucking Department)

| Status        | Description                              | Next Action             |
| ------------- | ---------------------------------------- | ----------------------- |
| `'ongoing'`   | Container is being transported/delivered | Continue transportation |
| `'completed'` | Transportation and delivery finished     | Move to Finance         |

### 3. `finance_status` (Finance Department)

| Status     | Description               | Next Action       |
| ---------- | ------------------------- | ----------------- |
| `'Unpaid'` | Payment is pending        | Awaiting payment  |
| `'Paid'`   | Payment has been received | Workflow complete |

---

## Pipeline Stage Mapping Logic

The system determines which pipeline stage a PRO belongs to using this logic:

```javascript
function determinePipelineStage(pro) {
  if (pro.finance_status === "Paid") {
    return "Completed";
  } else if (
    pro.trucking_status === "completed" &&
    pro.finance_status === "Unpaid"
  ) {
    return "Finance";
  } else if (
    pro.status === "completed" &&
    pro.trucking_status !== "completed"
  ) {
    return "Trucking";
  } else {
    return "Shipment";
  }
}
```

### Pipeline Stage Rules

#### 🔵 Shipment Stage

**Conditions**: `status` is `'ongoing'` OR `'filed_boc'`

- **Activities**: Document verification, BOC filing, initial processing
- **Department**: Shipment
- **Next Trigger**: When `status` becomes `'completed'`

#### 🟠 Trucking Stage

**Conditions**: `status === 'completed'` AND `trucking_status === 'ongoing'`

- **Activities**: Container pickup, transportation, delivery
- **Department**: Trucking
- **Next Trigger**: When `trucking_status` becomes `'completed'`

#### 🟢 Finance Stage

**Conditions**: `trucking_status === 'completed'` AND `finance_status === 'Unpaid'`

- **Activities**: Invoicing, payment collection, financial processing
- **Department**: Finance
- **Next Trigger**: When `finance_status` becomes `'Paid'`

#### 🟣 Completed Stage

**Conditions**: `finance_status === 'Paid'`

- **Activities**: Final closure, archiving
- **Department**: All departments complete
- **Next**: End of workflow

---

## Complete PRO Journey Example

```
PRO-2025001 Complete Journey:

1. PRO Created
   ├── status: 'ongoing'
   ├── trucking_status: null
   ├── finance_status: null
   └── Pipeline Stage: 🔵 Shipment

2. BOC Filing Complete
   ├── status: 'filed_boc'
   ├── trucking_status: null
   ├── finance_status: null
   └── Pipeline Stage: 🔵 Shipment

3. Shipment Department Complete
   ├── status: 'completed'
   ├── trucking_status: 'ongoing'
   ├── finance_status: null
   └── Pipeline Stage: 🟠 Trucking

4. Transportation Complete
   ├── status: 'completed'
   ├── trucking_status: 'completed'
   ├── finance_status: 'Unpaid'
   └── Pipeline Stage: 🟢 Finance

5. Payment Received
   ├── status: 'completed'
   ├── trucking_status: 'completed'
   ├── finance_status: 'Paid'
   └── Pipeline Stage: 🟣 Completed
```

---

## Analytics Pipeline Visualization

### Visual Components

#### Top Row (Stage Counts)

- Each colored box shows the **number of PROs** currently in that stage
- Colors match department themes:
  - 🔵 Blue: Shipment
  - 🟠 Orange: Trucking
  - 🟢 Green: Finance
  - 🟣 Purple: Completed

#### Bottom Bar (Progress Visualization)

- Horizontal bar shows **proportional distribution**
- Each colored segment represents the percentage of total PROs in that stage
- **Width = Percentage**: Wider segments = more PROs in that stage

### Data Source

The pipeline data comes from `analyticsData.pipelineSummary`:

```javascript
{
  shipment: 0,    // Count of PROs in shipment stage
  trucking: 0,   // Count of PROs in trucking stage
  finance: 0,    // Count of PROs in finance stage
  completed: 0,  // Count of PROs completed
  total: 0       // Total PROs across all stages
}
```

---

## Business Value & Use Cases

### Bottleneck Identification

- **High Shipment Count**: Need more shipment department resources
- **High Trucking Count**: Transportation delays or capacity issues
- **High Finance Count**: Payment collection bottlenecks
- **Low Completed Count**: Overall process inefficiency

### Resource Planning

- **Workload Distribution**: See where work is concentrated
- **Staff Allocation**: Determine where to add more team members
- **Process Optimization**: Identify slowest stages for improvement

### Performance Monitoring

- **Flow Rate**: How quickly PROs move through stages
- **Completion Rate**: Percentage of PROs reaching completion
- **Stage Efficiency**: Time spent in each department

---

## Status Transition Rules

### Valid Transitions

#### Shipment Department

```
ongoing → filed_boc → completed
```

#### Trucking Department

```
null → ongoing → completed
```

#### Finance Department

```
null → Unpaid → Paid
```

### Invalid States

- `trucking_status` cannot be `'completed'` if `status` is not `'completed'`
- `finance_status` cannot be `'Paid'` if `trucking_status` is not `'completed'`
- `finance_status` cannot be `'Unpaid'` if `trucking_status` is not `'completed'`

---

## Implementation Notes

### Database Queries

```sql
-- Get pipeline summary counts
SELECT
  COUNT(CASE WHEN status IN ('ongoing', 'filed_boc') THEN 1 END) as shipment,
  COUNT(CASE WHEN status = 'completed' AND trucking_status = 'ongoing' THEN 1 END) as trucking,
  COUNT(CASE WHEN trucking_status = 'completed' AND finance_status = 'Unpaid' THEN 1 END) as finance,
  COUNT(CASE WHEN finance_status = 'Paid' THEN 1 END) as completed,
  COUNT(*) as total
FROM pro;
```

### Frontend Integration

The pipeline visualization is implemented in:

- **Component**: `src/pages/Analytics/Analytics.js`
- **Styling**: `src/pages/Analytics/Analytics.css`
- **Data Service**: `src/services/supabase/analytics.js`

---

## Troubleshooting

### Common Issues

#### PRO Stuck in Wrong Stage

- **Check**: All three status fields are correctly set
- **Verify**: Status transitions follow valid rules
- **Fix**: Update status fields to match current department work

#### Pipeline Counts Don't Match

- **Check**: Database queries are using correct logic
- **Verify**: Status field values are consistent
- **Fix**: Ensure all PROs have valid status combinations

#### Visual Display Issues

- **Check**: CSS classes are properly applied
- **Verify**: Progress segment widths are calculated correctly
- **Fix**: Ensure total count is not zero (causes division by zero)

---

## Future Enhancements

### Planned Features

- **Status History**: Track status changes over time
- **Performance Metrics**: Average time per stage
- **Alert System**: Notify when PROs are stuck too long
- **Automated Transitions**: Auto-update statuses based on triggers

### Technical Improvements

- **Real-time Updates**: Live pipeline updates without refresh
- **Historical Analysis**: Pipeline trends over time
- **Department-specific Views**: Filter by department
- **Export Functionality**: Export pipeline data for reporting

---

## Related Documentation

- [Document Flows](./document-flows.md) - Upload and processing workflows
- [PRO Number Specification](./pro-number.md) - PRO number format and rules
- [Verifier Workflow Guide](../04-ops/verifier-workflow-guide.md) - Conflict resolution process
- [Analytics Service](../02-architecture/data-and-storage/storage-and-database-access.md) - Data access patterns

---

_Last Updated: [Current Date]_  
_Version: 1.0_  
_Status: Active Implementation_
