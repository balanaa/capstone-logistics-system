# Frontend Structure

## Frontend folder summary (what to build for today)

- Keep all client code in `src/`.
- Keep CSS in `src/styles/` and import in components (centralized styles for easier traversal).
- Components are small, composable, and department-focused.

## Top-level `src/` layout (suggested)

```
src/
  index.js
  App.js
  assets/            # logos, wireframe images
  components/
    common/          # Button, Modal, ProtectedRoute, Icon
    layout/          # Header, Sidebar
    overlays/        # AddDocumentOverlay, VerifierOverlay
    tables/          # Reusable table component + typed tables
    departments/     # DepartmentMain (parent), ShipmentMain, TruckingMain, FinanceMain
    forms/           # ShipmentForm, TruckingForm, FinanceForm
    verifier/        # Verifier field list, mapping modal
  pages/
    Auth/
      Login.js
    Dashboard/
      Dashboard.js
    Analytics/
      Analytics.js
    Shipment/
      ShipmentList.js
      ShipmentProfile.js
    Trucking/
      TruckingList.js
      TruckingProfile.js
    Finance/
      FinanceList.js
      FinanceProfile.js
    Verifier/
      VerifierQueue.js
      VerifierReview.js
  services/
    supabaseClient.js   # single Supabase client used by all services
    api.js              # thin wrappers for Edge Functions / API calls
  utils/
    normalize.js        # normalizeLabel, normalizeValue (wired; can be no-ops initially)
    mappingUtils.js     # regex helpers, mapping helpers
  styles/
    global.css
```

## Component responsibilities (brief)

- **Header:** notifications icon, user menu, quick link to Gmail.
- **Sidebar:** role-aware navigation links (hide pages user lacks). Admin and Viewer sees all.
- **DepartmentMain (parent):** shared layout for pie chart + reminders + table list; typed children (ShipmentMain, TruckingMain, FinanceMain) provide columns/data.
- **AddDocumentOverlay:** upload + preview + prefilled form.
- **VerifierOverlay:** preview + extracted items + mapping modal + actions.
- **ProtectedRoute:** blocks unauthorized access and redirects to /login.
- **ErrorBoundary (global):** wraps `<Routes>` to surface runtime errors instead of blank pages.
- **Loading (small spinner):** shown during auth initialization and guard waits to avoid blank screens.
- **MiniOverlay (shared):** small centered modal used for confirmations and error messages.

## Design notes

- Prefill forms with server OCR output but require uploader to confirm required fields before submit.
- Keep UI minimal and consistent; avoid heavy animations.
- Make the Verifier UI focus on comparing the original file (left) with prefilled data (right).

---

See also:

- `docs/02-architecture/auth-and-rbac/roles-and-access.md`
- `docs/03-specs/domain/document-flows.md`
- `docs/02-architecture/data-and-storage/storage-and-database-access.md`
