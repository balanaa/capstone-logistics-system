Frontend Routing Map

Routing map (React Router) — plain text usage

Routes

Path Component Access (allowedRoles) Notes

/ Redirect Public Redirects to /login if not authenticated; if authenticated, redirect to landing per roles.
/login Login Public Entry point for all users.
/dashboard Dashboard ['admin','viewer'] Default landing for admin/viewer; viewer is read-only.
/analytics Analytics ['admin','viewer'] Reports and insights (viewer read-only).
/shipment ShipmentList ['shipment','admin','viewer'] Shipment department list view.
/shipment/pro-number/:proNo ShipmentProfile ['shipment','verifier','admin','viewer'] Profile for a shipment (keyed by PRO No). Verifier has access here.
/trucking TruckingList ['trucking','admin','viewer'] Trucking list view.
/trucking/pro-number/:proNo TruckingProfile ['trucking','admin','viewer'] Trucking profile by PRO No.
/finance FinanceList ['finance','admin','viewer'] Finance list view.
/finance/pro-number/:proNo FinanceProfile ['finance','admin','viewer'] Finance profile by PRO No.
/verifier VerifierQueue ['verifier','admin','viewer'] Queue of pending shipment checks (viewer read-only).
/verifier/:id VerifierReview ['verifier','admin','viewer'] Review page for a shipment document (viewer read-only).
/user-management UserManagement ['admin','viewer'] Manage/view users and roles. Admin edits; viewer is read-only.
/403 Forbidden Public 403 Unauthorized page with "Go Back" action.

ProtectedRoute usage (plain text)

<Route path="/shipment" element={
<ProtectedRoute allowedRoles={['shipment','admin','viewer']}>
<ShipmentList/>
</ProtectedRoute>
} />

Notes

- Always include 'admin'. Include 'viewer' for read-only access across routes.
- `analytics` role has been removed (replaced by viewer + admin).
- Sidebar hides links the user doesn't have roles for. Admin and Viewer see all sidebar links. Employees with multiple department roles do not see a Dashboard tab or Analytics tab.
- User Management icon is in the Header (with the "circle-user" icon), visible to admin and viewer only.
- Route params should use the visible segment `pro-number` and the param name `:proNo` (e.g., `/shipment/pro-number/PRO-0001`).
