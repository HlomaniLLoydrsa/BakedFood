import { Navigate } from 'react-router-dom';
// Login is no longer required — redirect straight to admin dashboard
export function AdminLoginPage() {
  return <Navigate to="/admin" replace />;
}
