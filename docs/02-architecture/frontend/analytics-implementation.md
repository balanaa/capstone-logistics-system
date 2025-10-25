# Analytics Implementation Guide

## Overview

The Analytics page provides comprehensive business intelligence across all departments (Shipment, Trucking, Finance) with real-time metrics and performance tracking.

## Current Status

- ✅ **UI Complete**: Full analytics dashboard with mock data
- ✅ **Service Layer Ready**: All Supabase queries documented in `src/services/supabase/analytics.js`
- ⚠️ **Using Mock Data**: Currently displaying mock data for immediate visualization
- 🔜 **Ready to Switch**: Uncomment real queries when ready for production

---

## Analytics Categories

### 1. Financial Performance 💰

**Metrics:**

- Total Unpaid Amount
- Total Paid Amount (YTD)
- Collection Rate Percentage
- Unpaid Amount by Consignee
- Monthly Revenue Trends (Paid vs Unpaid)

**Data Sources:**

- `pro.finance_status` (Unpaid/Paid)
- `document_fields.value_number` where `canonical_key='total_amount'`
- `document_fields` for consignee information from BOL

**Implementation Status:**

- ✅ Mock data working
- ✅ Real queries ready in `analytics.js`
- ✅ No schema changes required

### 2. Trucking Performance 🚛

**Metrics:**

- Average Turnaround Days (Port → Yard)
- Average Days by Driver
- Containers Currently in Transit
- Driver Performance Rankings

**Data Sources:**

- `container_operations.departure_date_from_port`
- `container_operations.date_of_return_to_yard`
- `container_operations.driver`

**Implementation Status:**

- ✅ Mock data working
- ✅ Real queries ready in `analytics.js`
- ✅ No schema changes required

### 3. Document Processing Efficiency 📄

**Metrics:**

- Average Processing Time (Upload → Approval)
- Processing Time by Document Type
- Pending Documents Count
- Processing Speed Rankings

**Data Sources:**

- `documents.uploaded_at`
- `documents.updated_at`
- `documents.status` (pending_verifier/approved)
- `documents.document_type`

**Implementation Status:**

- ✅ Mock data working
- ✅ Real queries ready in `analytics.js`
- ⚠️ Requires `documents.updated_at` to be populated on approval
  - Currently exists but may need trigger to auto-update

### 4. Bottleneck Analysis ⚡

**Metrics:**

- Average Days in Shipment Department
- Average Days in Trucking Department
- Average Days in Finance Department
- Identification of slowest department

**Data Sources (REQUIRES NEW COLUMNS):**

- `pro.created_at` (shipment start)
- `pro.status_updated_at` (shipment completion) ⚠️ **NEEDS TO BE ADDED**
- `pro.trucking_completed_at` (trucking completion) ⚠️ **NEEDS TO BE ADDED**
- `pro.finance_completed_at` (finance completion) ⚠️ **NEEDS TO BE ADDED**

**Implementation Status:**

- ✅ Mock data working (shows N/A)
- ✅ Real queries ready in `analytics.js`
- ❌ **Schema changes required** - See below

---

## How to Switch from Mock Data to Real Data

### Step 1: Test Individual Queries

Open `src/services/supabase/analytics.js` and test each function individually:

```javascript
import {
  getTotalUnpaidAmount,
  getAverageTurnaroundDays,
} from "./services/supabase/analytics";

// Test in console or separate test file
const unpaid = await getTotalUnpaidAmount();
console.log("Unpaid amount:", unpaid);
```

### Step 2: Replace Mock Data in Analytics.js

In `src/pages/Analytics/Analytics.js`:

1. Uncomment the real Supabase implementation section (around line 50)
2. Comment out or remove the mock data section
3. Import the analytics service:

```javascript
import { fetchAllAnalyticsData } from "../../services/supabase/analytics";
```

4. Replace the `fetchAnalyticsData` function body:

```javascript
const fetchAnalyticsData = async () => {
  setLoading(true);
  try {
    const data = await fetchAllAnalyticsData();
    setAnalyticsData(data);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    // Optionally set error state
  } finally {
    setLoading(false);
  }
};
```

### Step 3: Enable Bottleneck Analysis (Optional)

To enable full bottleneck analysis, run the SQL migration:

1. Open Supabase SQL Editor
2. Run `docs/02-architecture/sql/add_completion_timestamps.sql`
3. This will:
   - Add 3 timestamp columns to `pro` table
   - Create triggers to auto-update timestamps
   - Enable bottleneck queries

---

## Database Schema Requirements

### ✅ Already Available

These tables/columns already exist:

```sql
-- pro table
pro.finance_status (Unpaid/Paid)
pro.trucking_status (ongoing/completed)
pro.status (ongoing/filed_boc/completed)
pro.created_at

-- container_operations table
container_operations.departure_date_from_port
container_operations.date_of_return_to_yard
container_operations.driver

-- documents table
documents.uploaded_at
documents.updated_at
documents.status (pending_verifier/approved)
documents.document_type

-- document_fields table
document_fields.canonical_key
document_fields.value_number (for invoice amounts)
document_fields.normalized_value
```

### ⚠️ Optional Additions for Bottleneck Analysis

Add these columns to enable department-level bottleneck tracking:

```sql
-- Run: docs/02-architecture/sql/add_completion_timestamps.sql

ALTER TABLE pro
  ADD COLUMN status_updated_at TIMESTAMP,
  ADD COLUMN trucking_completed_at TIMESTAMP,
  ADD COLUMN finance_completed_at TIMESTAMP;
```

**Triggers will automatically update these when:**

- `status` changes to 'completed' → `status_updated_at`
- `trucking_status` changes to 'completed' → `trucking_completed_at`
- `finance_status` changes to 'Paid' → `finance_completed_at`

---

## Performance Considerations

### Query Optimization

All queries in `analytics.js` use:

- ✅ Proper indexes (documented in SQL files)
- ✅ Selective filtering (only completed/approved records)
- ✅ Parallel execution (`Promise.all()`)

### Caching Strategy

Consider implementing caching for analytics data:

```javascript
// Example: Cache for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let cachedData = null;
let lastFetch = null;

const fetchAnalyticsData = async () => {
  const now = Date.now();
  if (cachedData && lastFetch && now - lastFetch < CACHE_DURATION) {
    setAnalyticsData(cachedData);
    return;
  }

  // Fetch fresh data...
  const data = await fetchAllAnalyticsData();
  cachedData = data;
  lastFetch = now;
  setAnalyticsData(data);
};
```

### Real-time Updates

For real-time analytics, use Supabase subscriptions:

```javascript
useEffect(() => {
  // Subscribe to pro table changes
  const subscription = supabase
    .channel("analytics-updates")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pro" },
      () => {
        // Refresh analytics when data changes
        fetchAnalyticsData();
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## Testing Checklist

Before switching to real data:

- [ ] Test all individual query functions in `analytics.js`
- [ ] Verify data types match expected format
- [ ] Check for null/undefined values
- [ ] Test with empty database (no data case)
- [ ] Test with large dataset (performance)
- [ ] Verify consignee name normalization
- [ ] Test date calculations (timezone handling)
- [ ] Verify currency formatting
- [ ] Test responsive design with real data
- [ ] Check error handling and loading states

---

## Common Issues & Solutions

### Issue: Invoice amounts showing as 0

**Cause:** `value_number` is null or not properly stored

**Solution:**

```sql
-- Check if invoice amounts are stored
SELECT canonical_key, value_number, normalized_value
FROM document_fields
WHERE canonical_key = 'total_amount';

-- If value_number is null, may need to backfill
UPDATE document_fields
SET value_number = CAST(normalized_value AS NUMERIC)
WHERE canonical_key = 'total_amount'
  AND value_number IS NULL
  AND normalized_value IS NOT NULL;
```

### Issue: Turnaround days calculation incorrect

**Cause:** Timezone mismatches or null dates

**Solution:**

- Ensure dates are stored in UTC
- Add null checks in queries
- Verify date format consistency

### Issue: Consignee names not grouping correctly

**Cause:** Inconsistent naming in database

**Solution:**

- Use `normalizeConsigneeName()` helper function
- Verify BOL consignee field is populated
- Check for typos in consignee names

---

## Future Enhancements

### Phase 2 Analytics (Planned)

1. **Predictive Analytics**

   - Revenue forecasting
   - Payment delay predictions
   - Container demand forecasting

2. **Advanced Visualizations**

   - Time series charts (line/area charts)
   - Heatmaps for busiest periods
   - Geographical distribution maps

3. **Export & Reporting**

   - PDF export functionality
   - Excel report generation
   - Scheduled email reports

4. **Filtering & Drill-down**

   - Date range filters
   - Consignee-specific views
   - Driver performance details
   - Document type breakdowns

5. **Comparative Analytics**
   - Year-over-year comparisons
   - Month-over-month trends
   - Department efficiency rankings

---

## Related Files

- **Frontend**: `src/pages/Analytics/Analytics.js`
- **Styles**: `src/pages/Analytics/Analytics.css`
- **Service Layer**: `src/services/supabase/analytics.js`
- **SQL Migration**: `docs/02-architecture/sql/add_completion_timestamps.sql`
- **Index**: `src/pages/Analytics/index.js`

---

## Questions & Support

For issues or questions about analytics implementation:

1. Check console logs for detailed error messages
2. Verify database schema matches requirements
3. Test individual query functions before full integration
4. Review this documentation for common solutions
