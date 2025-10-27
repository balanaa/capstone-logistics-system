# 403 Error Redirect to Login Page - Implementation Guide

## Overview

This document outlines the implementation plan to redirect all 403 (Forbidden) errors directly to the login page instead of showing the current 403 error page. This change will simplify the user experience by removing the intermediate 403 page and immediately directing users to authenticate.

## Current State Analysis

### Current 403 Error Flow

1. **Unauthenticated users** accessing protected routes → `/403` page
2. **Authenticated users** accessing unauthorized routes → `/403` page
3. **403 page** shows "Go Home" button that redirects based on user state:
   - No user → `/login`
   - Authenticated user → role-based dashboard

### Current Implementation Locations

#### 1. ProtectedRoute Component (`src/components/common/ProtectedRoute.js`)

```javascript
// Line 36: Unauthenticated users redirected to /403
if (!user) return <Navigate to="/403" replace state={{ from: location }} />;

// Line 40: Role-based access denied redirected to /403
if (!has) return <Navigate to="/403" replace />;
```

#### 2. Shell Component (`src/App.js`)

```javascript
// Line 182: Unauthenticated users in protected routes redirected to /403
if (authReady && !loading && !user && !isStandalone) {
  navigate("/403", { replace: true });
}
```

#### 3. Forbidden403 Page (`src/pages/Forbidden403.js`)

```javascript
// Lines 9-17: Determines home route based on user state
const homeHref = (() => {
  if (!user) return "/login";
  if (roles.includes("admin") || roles.includes("viewer")) return "/dashboard";
  // ... other role-based routes
})();
```

## Proposed Changes

### Option 1: Direct Redirect to Login (Recommended)

Redirect all 403 scenarios directly to `/login` regardless of user authentication state.

#### Changes Required:

1. **Update ProtectedRoute.js**

```javascript
// Change line 36 from:
if (!user) return <Navigate to="/403" replace state={{ from: location }} />;
// To:
if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

// Change line 40 from:
if (!has) return <Navigate to="/403" replace />;
// To:
if (!has) return <Navigate to="/login" replace />;
```

2. **Update App.js Shell Component**

```javascript
// Change line 182 from:
if (authReady && !loading && !user && !isStandalone) {
  navigate("/403", { replace: true });
}
// To:
if (authReady && !loading && !user && !isStandalone) {
  navigate("/login", { replace: true });
}
```

3. **Remove 403 Route from Public Routes**

```javascript
// In App.js, remove '/403' from public routes check (line 69)
if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/camera' || location.pathname === '/reset-password') {
  // Remove: || location.pathname === '/403'
```

4. **Remove 403 Route Definition**

```javascript
// Remove from Routes (line 77):
<Route path="/403" element={<Forbidden403 />} />
```

### Option 2: Conditional Redirect (Alternative)

Keep the 403 page but modify it to always redirect to login.

#### Changes Required:

1. **Update Forbidden403.js**

```javascript
// Replace the entire component with:
export default function Forbidden403() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Always redirect to login
    navigate("/login", { replace: true });
  }, [navigate]);

  return <Loading />; // Show loading while redirecting
}
```

## Implementation Steps

### Step 1: Backup Current Implementation

```bash
# Create a backup branch
git checkout -b backup-403-current-implementation
git add .
git commit -m "Backup current 403 error handling implementation"
git checkout main
```

### Step 2: Implement Direct Redirect (Option 1)

1. **Update ProtectedRoute.js**

```bash
# Edit the file and make the changes as outlined above
```

2. **Update App.js**

```bash
# Edit the file and make the changes as outlined above
```

3. **Remove 403 Route**

```bash
# Remove the 403 route from the Routes component
```

### Step 3: Clean Up Unused Files (Optional)

```bash
# Remove 403 page files if no longer needed
rm src/pages/Forbidden403.js
rm src/pages/Forbidden403.css
```

### Step 4: Update Documentation

- Update routing documentation
- Update authentication flow documentation
- Update troubleshooting guides

## Testing Scenarios

### Test Cases to Verify:

1. **Unauthenticated User Access**

   - Navigate to `/dashboard` → Should redirect to `/login`
   - Navigate to `/shipment` → Should redirect to `/login`
   - Navigate to `/finance` → Should redirect to `/login`

2. **Authenticated User with Insufficient Permissions**

   - Login as `finance` user
   - Navigate to `/trucking` → Should redirect to `/login`
   - Login as `shipment` user
   - Navigate to `/finance` → Should redirect to `/login`

3. **Direct URL Access**

   - Type protected URL directly in browser → Should redirect to `/login`
   - Refresh page on protected route → Should redirect to `/login`

4. **Browser Back Button**
   - After redirect to login, use back button → Should stay on login or redirect again

## Benefits of This Change

1. **Simplified User Experience**: No intermediate 403 page
2. **Consistent Behavior**: All access denied scenarios handled uniformly
3. **Reduced Code Complexity**: Fewer components and routes to maintain
4. **Clear User Intent**: Users immediately know they need to authenticate
5. **Better Security**: No information leakage about what routes exist

## Potential Considerations

1. **User Confusion**: Users might not understand why they're redirected to login
2. **Lost Context**: Users lose the original URL they were trying to access
3. **Role-Based Redirects**: Authenticated users with wrong roles also go to login instead of their dashboard

## Rollback Plan

If issues arise, rollback can be performed by:

1. **Restore from backup branch**

```bash
git checkout backup-403-current-implementation
git checkout main
git reset --hard backup-403-current-implementation
```

2. **Or manually revert changes**
   - Restore original ProtectedRoute.js
   - Restore original App.js
   - Add back 403 route

## Implementation Priority

**High Priority** - This change affects core authentication flow and should be implemented carefully with thorough testing.

## Related Documentation

- [Authentication and RBAC Architecture](../docs/02-architecture/auth-and-rbac/)
- [Frontend Routing Map](../docs/02-architecture/frontend/front-end-routing-map.md)
- [Debug Auth Routing](../docs/04-ops/troubleshooting/debug-auth-routing.md)

---

**Created:** $(date)  
**Status:** Ready for Implementation  
**Reviewer:** [To be assigned]
