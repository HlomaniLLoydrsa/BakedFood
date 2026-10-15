import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Checkout is now part of the drop page itself.
// Redirect anyone who lands here back to the drop page.
export function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/drop/${slug}`, { replace: true });
  }, [slug, navigate]);

  return null;
}
