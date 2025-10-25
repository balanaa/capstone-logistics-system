# Analytics Page - Quick Reference

## Visual Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Business Analytics                                         │
│  Performance metrics across all departments                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  💰 FINANCIAL PERFORMANCE                                   │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │ Unpaid   │  │  Paid    │  │Collection│                 │
│  │ ₱245,751 │  │ ₱892,340 │  │  78.4%   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│  Unpaid by Consignee:                                      │
│  ┌──────────┬─────────────┬────────┐                      │
│  │Consignee │   Amount    │  Count │                      │
│  ├──────────┼─────────────┼────────┤                      │
│  │PUREGOLD  │ ₱125,000.00 │    8   │                      │
│  │ROBINSONS │  ₱85,500.50 │    5   │                      │
│  │MONTOSCO  │  ₱35,250.00 │    3   │                      │
│  └──────────┴─────────────┴────────┘                      │
│                                                             │
│  Monthly Revenue Trends:                                   │
│  ┌────────┬──────────┬──────────┬──────────┬────────┐    │
│  │ Month  │ Revenue  │   Paid   │  Unpaid  │   %    │    │
│  ├────────┼──────────┼──────────┼──────────┼────────┤    │
│  │Oct 2024│₱156,780  │₱120,450  │ ₱36,330  │ 76.8%  │    │
│  │Nov 2024│₱189,650  │₱175,821  │ ₱13,830  │ 92.7%  │    │
│  │...     │   ...    │   ...    │   ...    │  ...   │    │
│  └────────┴──────────┴──────────┴──────────┴────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  🚛 TRUCKING PERFORMANCE                                    │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │Avg Days  │  │ Transit  │  │Best Avg  │                 │
│  │   5.8    │  │    12    │  │   4.5    │                 │
│  │Port→Yard │  │containers│  │Juan D.C. │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│  Average by Driver:                                        │
│  ┌─────────────┬──────────┬───────┬──────────────┐        │
│  │   Driver    │Avg Days  │ Trips │ Performance  │        │
│  ├─────────────┼──────────┼───────┼──────────────┤        │
│  │Juan D. Cruz │ 4.5 days │  24   │ [Excellent]  │        │
│  │Pedro Santos │ 5.2 days │  18   │ [Good]       │        │
│  │Maria Garcia │ 6.8 days │  15   │ [Fair]       │        │
│  │Jose Reyes   │ 7.1 days │  12   │ [Needs Imp.] │        │
│  └─────────────┴──────────┴───────┴──────────────┘        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  📄 DOCUMENT PROCESSING EFFICIENCY                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │Avg Time  │  │ Pending  │  │ Fastest  │                 │
│  │   2.3    │  │    7     │  │   1.8    │                 │
│  │Upload→OK │  │   docs   │  │   BOL    │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
│                                                             │
│  Processing by Type:                                       │
│  ┌──────────────┬──────────┬─────────┬────────┐           │
│  │Document Type │Avg Days  │Processed│ Speed  │           │
│  ├──────────────┼──────────┼─────────┼────────┤           │
│  │Bill of Lading│ 1.8 days │   45    │[Fast]  │           │
│  │Invoice       │ 2.1 days │   42    │[Normal]│           │
│  │Packing List  │ 2.5 days │   38    │[Normal]│           │
│  │Delivery Order│ 3.2 days │   35    │[Slow]  │           │
│  └──────────────┴──────────┴─────────┴────────┘           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ⚡ BOTTLENECK ANALYSIS                                     │
├─────────────────────────────────────────────────────────────┤
│  ⚠️  Note: Requires timestamp columns                      │
│      Add to pro table: status_updated_at,                  │
│      trucking_completed_at, finance_completed_at           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │Shipment  │  │Trucking  │  │ Finance  │                 │
│  │   N/A    │  │   N/A    │  │   N/A    │                 │
│  │  dept    │  │   dept   │  │   dept   │                 │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Color Coding

### Financial Cards

- 🔴 **Red** - Unpaid (border-left: #dc2626)
- 🟢 **Green** - Paid (border-left: #16a34a)
- 🔵 **Blue** - Collection Rate (border-left: #2563eb)

### Trucking Cards

- 🟠 **Orange** - Avg Turnaround (border-left: #f59e0b)
- 🟣 **Purple** - In Transit (border-left: #8b5cf6)
- 🟢 **Green** - Best Driver (border-left: #10b981)

### Document Processing Cards

- 🔵 **Blue** - Avg Processing (border-left: #3b82f6)
- 🟠 **Orange** - Pending (border-left: #f59e0b)
- 🟢 **Green** - Fastest (border-left: #10b981)

### Performance Badges

- 🟢 **Excellent** - Green background (#d1fae5)
- 🔵 **Good** - Blue background (#dbeafe)
- 🟡 **Fair** - Yellow background (#fef3c7)
- 🔴 **Needs Improvement** - Red background (#fee2e2)

---

## Data Flow

```
User Opens Analytics Page
         ↓
   Loading State
         ↓
   fetchAnalyticsData()
         ↓
   [Currently: Mock Data]
   [Future: Real Queries]
         ↓
   Process & Format Data
         ↓
   Update State
         ↓
   Render Components
```

### Mock Data Flow (Current)

```javascript
fetchAnalyticsData()
  → setTimeout(800ms)  // Simulate loading
  → setAnalyticsData(mockData)
  → setLoading(false)
```

### Real Data Flow (Future)

```javascript
fetchAnalyticsData()
  → fetchAllAnalyticsData()
    → Promise.all([
        getTotalUnpaidAmount(),
        getTotalPaidAmount(),
        getUnpaidAmountByConsignee(),
        // ... 10 more queries
      ])
  → setAnalyticsData(realData)
  → setLoading(false)
```

---

## Key Calculations

### Financial

```javascript
// Collection Rate
collectionRate = (paidAmount / (paidAmount + unpaidAmount)) * 100;

// Monthly totals
revenue = paid + unpaid;
collectionPercent = (paid / revenue) * 100;
```

### Trucking

```javascript
// Turnaround Days
days = (returnDate - departDate) / (1000 * 60 * 60 * 24);

// Average by driver
avgDays = totalDays / trips;
```

### Document Processing

```javascript
// Processing Time
days = (approvalDate - uploadDate) / (1000 * 60 * 60 * 24);

// Speed classification
fast = avgDays < 2;
normal = avgDays >= 2 && avgDays < 3;
slow = avgDays >= 3;
```

---

## Responsive Breakpoints

### Desktop (> 1200px)

- 3-column KPI cards
- Full-width tables
- All details visible

### Tablet (768px - 1200px)

- 2-column KPI cards
- Scrollable tables
- Compact spacing

### Mobile (< 768px)

- 1-column layout
- Stacked cards
- Horizontal scroll tables
- Reduced font sizes

---

## API Reference

### Main Component

```javascript
// src/pages/Analytics/Analytics.js

function Analytics() {
  const [analyticsData, setAnalyticsData] = useState({...});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  return (
    <div className="analytics-container">
      {/* Sections */}
    </div>
  );
}
```

### Service Functions

```javascript
// src/services/supabase/analytics.js

// Financial
getTotalUnpaidAmount() → number
getTotalPaidAmount() → number
getUnpaidAmountByConsignee() → Array<{consignee, amount, count}>
getMonthlyRevenueTrends() → Array<{month, revenue, paid, unpaid}>

// Trucking
getAverageTurnaroundDays() → number
getAverageTurnaroundByDriver() → Array<{driver, avgDays, trips}>
getContainersInTransit() → number

// Documents
getAverageDocProcessingTime() → number
getProcessingTimeByDocType() → Array<{docType, avgDays, count}>
getPendingDocumentsCount() → number

// Bottleneck (requires schema changes)
getAverageShipmentDays() → number
getAverageTruckingDays() → number
getAverageFinanceDays() → number

// All-in-one
fetchAllAnalyticsData() → Object (all metrics)
```

---

## CSS Classes Reference

### Layout

- `.analytics-container` - Main wrapper
- `.analytics-section` - Each metric category
- `.kpi-cards` - Grid of KPI cards
- `.analytics-widget` - Table containers

### Components

- `.kpi-card` - Individual metric card
- `.kpi-label` - Card title
- `.kpi-value` - Large number
- `.kpi-sublabel` - Subtitle text

### Tables

- `.analytics-table` - Main table style
- `.consignee-name` - Bold primary column
- `.amount-cell` - Right-aligned money
- `.performance-badge` - Colored status badge

---

## Example Usage in Other Components

### Import Analytics

```javascript
import Analytics from "./pages/Analytics";

function App() {
  return (
    <Routes>
      <Route path="/analytics" element={<Analytics />} />
    </Routes>
  );
}
```

### Link to Analytics

```javascript
<Link to="/analytics">View Analytics</Link>
```

---

## Testing Examples

### Test Individual Query

```javascript
import { getTotalUnpaidAmount } from "./services/supabase/analytics";

// In component or test file
const testUnpaid = async () => {
  const amount = await getTotalUnpaidAmount();
  console.log("Unpaid:", amount);
};
```

### Test All Queries

```javascript
import { fetchAllAnalyticsData } from "./services/supabase/analytics";

const testAll = async () => {
  const data = await fetchAllAnalyticsData();
  console.table(data);
};
```

---

## Quick Switch to Real Data

**Step 1:** Open `src/pages/Analytics/Analytics.js`

**Step 2:** Find line ~30 and replace:

```javascript
// FROM THIS (Mock):
const fetchAnalyticsData = async () => {
  setLoading(true);
  await new Promise(resolve => setTimeout(resolve, 800));
  const mockData = {...};
  setAnalyticsData(mockData);
  setLoading(false);
};

// TO THIS (Real):
import { fetchAllAnalyticsData } from '../../services/supabase/analytics';

const fetchAnalyticsData = async () => {
  setLoading(true);
  try {
    const data = await fetchAllAnalyticsData();
    setAnalyticsData(data);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Done!** Analytics now uses real data.

---

## Performance Tips

### Caching

```javascript
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes
let cache = null;
let lastFetch = null;

if (cache && Date.now() - lastFetch < CACHE_TIME) {
  return cache;
}
```

### Debouncing

```javascript
const debouncedFetch = debounce(fetchAnalyticsData, 1000);
```

### Real-time Updates

```javascript
useEffect(() => {
  const sub = supabase
    .channel("analytics")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pro" },
      () => fetchAnalyticsData()
    )
    .subscribe();

  return () => sub.unsubscribe();
}, []);
```

---

## Common Pitfalls

❌ **Don't** query on every render
✅ **Do** use `useEffect` with proper dependencies

❌ **Don't** fetch data synchronously
✅ **Do** use async/await with try/catch

❌ **Don't** ignore loading/error states
✅ **Do** provide user feedback

❌ **Don't** hardcode data in components
✅ **Do** use service layer separation

---

## Quick Checklist

- [x] Component created
- [x] Styles applied
- [x] Mock data working
- [x] Service layer ready
- [ ] Real data tested
- [ ] Performance optimized
- [ ] Error handling added
- [ ] Mobile responsive verified
- [ ] Accessibility checked
- [ ] Documentation reviewed
