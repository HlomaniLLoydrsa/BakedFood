import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Public pages
import { LandingPage }      from './pages/public/LandingPage';
import { DropPage }         from './pages/public/DropPage';
import { CheckoutPage }     from './pages/public/CheckoutPage';
import { OrderSuccessPage } from './pages/public/OrderSuccessPage';
import { OrderStatusPage }  from './pages/public/OrderStatusPage';
import { CancelOrderPage }  from './pages/public/CancelOrderPage';
import { ReviewPage }       from './pages/public/ReviewPage';

// Admin pages
import { AdminLoginPage }   from './pages/admin/AdminLoginPage';
import { DashboardPage }    from './pages/admin/DashboardPage';
import { ProductsPage }     from './pages/admin/ProductsPage';
import { ProductFormPage }  from './pages/admin/ProductFormPage';
import { PublishPage }      from './pages/admin/PublishPage';
import { OrdersPage }       from './pages/admin/OrdersPage';
import { OrderDetailPage }  from './pages/admin/OrderDetailPage';
import { SettingsPage }     from './pages/admin/SettingsPage';

function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"                           element={<LandingPage />} />
      <Route path="/drop/:slug"                 element={<DropPage />} />
      <Route path="/drop/:slug/checkout"        element={<CheckoutPage />} />
      <Route path="/order/:orderNumber/success" element={<OrderSuccessPage />} />
      <Route path="/order/:orderNumber/status"  element={<OrderStatusPage />} />
      <Route path="/order/:orderNumber/cancel"  element={<CancelOrderPage />} />
      <Route path="/order/:orderNumber/review"  element={<ReviewPage />} />
      <Route path="/track"                      element={<OrderStatusPage />} />

      {/* ── Admin (PIN protected) ── */}
      <Route path="/admin/login"        element={<AdminLoginPage />} />
      <Route path="/admin"              element={<AdminRoute><DashboardPage /></AdminRoute>} />
      <Route path="/admin/products"     element={<AdminRoute><ProductsPage /></AdminRoute>} />
      <Route path="/admin/products/new" element={<AdminRoute><ProductFormPage /></AdminRoute>} />
      <Route path="/admin/products/:id" element={<AdminRoute><ProductFormPage /></AdminRoute>} />
      <Route path="/admin/publish"      element={<AdminRoute><PublishPage /></AdminRoute>} />
      <Route path="/admin/orders"       element={<AdminRoute><OrdersPage /></AdminRoute>} />
      <Route path="/admin/orders/:id"   element={<AdminRoute><OrderDetailPage /></AdminRoute>} />
      <Route path="/admin/settings"     element={<AdminRoute><SettingsPage /></AdminRoute>} />

      <Route path="/admin/drops"     element={<Navigate to="/admin/publish" replace />} />
      <Route path="/admin/drops/*"   element={<Navigate to="/admin/publish" replace />} />
      <Route path="/admin/publish/*" element={<Navigate to="/admin/publish" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
