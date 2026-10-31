import { useState } from 'react';
import { isPinVerified } from '../../lib/pin';
import { PinGatePage } from '../../pages/admin/PinGatePage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Admin is protected by a PIN. The PIN is exchanged for a short-lived JWT
// (see PinGatePage → /api/pin/login) which the API layer enforces on every
// admin request. This component just decides whether to show the gate.
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [verified, setVerified] = useState<boolean>(isPinVerified());

  if (!verified) {
    return <PinGatePage onVerified={() => setVerified(true)} />;
  }

  return <>{children}</>;
}
