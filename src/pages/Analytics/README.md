# Analytics Page

## Overview

Comprehensive business intelligence dashboard showing performance metrics across Shipment, Trucking, and Finance departments.

## Current Status

✅ **Working with Mock Data**  
🔄 **Ready to switch to Real Supabase Data**

## Features

### 💰 Financial Performance

- Total unpaid/paid amounts
- Collection rate tracking
- Unpaid breakdown by consignee
- Monthly revenue trends

### 🚛 Trucking Performance

- Average turnaround days (Port → Yard)
- Driver performance rankings
- Containers in transit count

### 📄 Document Processing

- Average processing time (Upload → Approval)
- Processing speed by document type
- Pending documents count

### ⚡ Bottleneck Analysis

- Average days per department
- Cross-department comparison
- _(Requires DB schema changes)_

## Files

```
src/pages/Analytics/
├── index.js              # Export wrapper
├── Analytics.js          # Main component (mock data)
├── Analytics.css         # Styles
└── README.md            # This file

src/services/supabase/
└── analytics.js         # Real database queries (ready to use)

docs/02-architecture/
├── frontend/
│   ├── analytics-implementation.md  # Full implementation guide
│   └── analytics-quick-reference.md # Quick reference
└── sql/
    └── add_completion_timestamps.sql # Optional bottleneck schema
```

## Switch to Real Data

**3 Simple Steps:**

1. Import the service:

```javascript
import { fetchAllAnalyticsData } from "../../services/supabase/analytics";
```

2. Replace mock data call in `fetchAnalyticsData()`:

```javascript
const data = await fetchAllAnalyticsData();
setAnalyticsData(data);
```

3. Test it:

```javascript
npm start
// Navigate to /analytics
```

## Documentation

📖 **Full Guide:** `docs/02-architecture/frontend/analytics-implementation.md`  
📊 **Quick Reference:** `docs/02-architecture/frontend/analytics-quick-reference.md`  
📝 **Changelog:** `docs/04-ops/changelogs/CHANGELOG-analytics-implementation.md`

## Mock Data

Current mock includes:

- **Financial:** ₱245,751 unpaid, ₱892,340 paid
- **Trucking:** 5.8 days avg, 12 containers in transit
- **Documents:** 2.3 days avg, 7 pending
- **Revenue:** 6 months of trend data

## Real Data Requirements

### Already Available ✅

- `pro` table with finance/trucking status
- `container_operations` table with dates
- `documents` table with timestamps
- `document_fields` table with invoice amounts

### Optional for Bottleneck ⚠️

Run SQL: `docs/02-architecture/sql/add_completion_timestamps.sql`

## Testing

Test individual queries:

```javascript
import { getTotalUnpaidAmount } from "./services/supabase/analytics";

const amount = await getTotalUnpaidAmount();
console.log("Unpaid:", amount); // Should return number
```

## Support

Questions? Check:

1. Full implementation guide
2. Service layer comments
3. SQL migration files
4. Changelog documentation
