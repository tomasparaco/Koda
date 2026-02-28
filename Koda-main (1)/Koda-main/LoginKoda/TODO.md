# TODO - Role-based Dashboard Implementation

## Task
Implement logic in App.tsx and UserDashboard.tsx so that when the user logs in, depending on their role, they are shown either:
- Administrator dashboard (DashboardLayout)
- Neighbor dashboard (UserDashboard)

## Steps:
- [ ] 1. Modify App.tsx to check user role and route to appropriate dashboard
- [ ] 2. Test and verify the implementation

## Implementation Details:
- After successful login, check `propiedad.rol`
- If `rol === 'admin'` → render `DashboardLayout` (admin dashboard with Usuarios tab)
- If `rol !== 'admin'` (e.g., 'propietario') → render `UserDashboard` (neighbor dashboard)
