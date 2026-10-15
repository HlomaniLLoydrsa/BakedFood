import { useState, useEffect } from 'react';
import { isPinVerified } from '../../lib/pin';
import { PinGatePage } from '../../pages/admin/PinGatePage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [verified, setVerified] = useState<boolean | null>(null);

  useEffect(() => {
    setVerified(isPinVerified());
  }, []);

  // Loading state — don't flash PIN screen briefly if already verified
  if (verified === null) return null;

  if (!verified) {
    return <PinGatePage onVerified={() => setVerified(true)} />;
  }

  return <>{children}</>;
}
