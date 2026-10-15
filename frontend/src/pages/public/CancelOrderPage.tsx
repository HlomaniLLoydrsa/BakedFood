import { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Order } from '../../types';
import { formatCurrency } from '../../lib/format';
import { PageSpinner } from '../../components/ui/Spinner';

export function CancelOrderPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderNumber, phone],
    queryFn: async () => {
      const res = await api.get(`/orders/number/${orderNumber}?phone=${encodeURIComponent(phone)}`);
      return res.data.order as Order;
    },
    enabled: !!phone,
  });

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      toast.error('Please provide a reason (at least 5 characters)');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/orders/number/${orderNumber}/cancel`, {
        reason: reason.trim(),
        phone,
      });
      setCancelled(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <PageSpinner />;

  if (error || !order) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-stone-500 mb-4">Order not found.</p>
          <Link to="/track" className="text-sm text-green-600 font-semibold">Track another order</Link>
        </div>
      </div>
    );
  }

  // Can't cancel if already confirmed or completed
  const canCancel = order.orderStatus === 'PENDING';
  const alreadyCancelled = order.orderStatus === 'CANCELLED';

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-600">
            <ArrowLeft size={16} />
          </button>
          <h1 className="font-extrabold text-stone-900">Cancel Order</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Order summary */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <p className="text-xs text-stone-400 mb-1">Order</p>
          <p className="text-base font-extrabold text-stone-900">{order.orderNumber}</p>
          <p className="text-sm text-stone-600 mt-1">{order.customerName}</p>
          <div className="mt-2 space-y-1">
            {order.orderItems.map((i) => (
              <p key={i.id} className="text-xs text-stone-500">
                {i.productNameSnapshot} × {i.quantity} — {formatCurrency(Number(i.subtotal))}
              </p>
            ))}
          </div>
          <p className="text-sm font-bold text-stone-900 mt-2">Total: {formatCurrency(Number(order.totalAmount))}</p>
        </div>

        {/* Already cancelled */}
        {alreadyCancelled && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
            <XCircle size={28} className="text-red-400 mx-auto mb-2" />
            <p className="text-sm font-bold text-red-700">This order is already cancelled.</p>
          </div>
        )}

        {/* Cannot cancel — already confirmed */}
        {!canCancel && !alreadyCancelled && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 mb-1">Cannot cancel this order</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Your order has already been <strong>{order.orderStatus.toLowerCase()}</strong>.
                  Once an order is confirmed or completed it cannot be cancelled online.
                  Please contact us directly if you need help.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success state */}
        {cancelled && (
          <div className="bg-white rounded-2xl border border-stone-100 p-8 text-center">
            <XCircle size={36} className="text-red-400 mx-auto mb-3" />
            <h2 className="text-lg font-extrabold text-stone-900 mb-1">Order Cancelled</h2>
            <p className="text-sm text-stone-500 mb-5">Your order has been cancelled. We're sorry to see you go.</p>
            <Link to="/" className="inline-flex bg-black text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-green-600 transition-colors">
              Back to home
            </Link>
          </div>
        )}

        {/* Cancel form */}
        {canCancel && !cancelled && (
          <form onSubmit={handleCancel} className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  <strong>Are you sure?</strong> Once cancelled, this action cannot be undone.
                  If your order has already been prepared, cancellation may not be possible.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 p-4">
              <label className="text-sm font-bold text-stone-700 block mb-2">
                Why are you cancelling? <span className="text-red-400">*</span>
              </label>
              <textarea
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
                rows={4}
                placeholder="e.g. Changed my mind, ordered by mistake, found a better option…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-xs text-stone-400 mt-1">{reason.length} / 500 characters</p>
            </div>

            <button type="submit" disabled={submitting || reason.trim().length < 5}
              className="w-full py-4 bg-red-500 text-white font-extrabold text-sm rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              <XCircle size={17} />
              {submitting ? 'Cancelling…' : 'Confirm Cancellation'}
            </button>

            <button type="button" onClick={() => navigate(`/order/${orderNumber}/status?phone=${encodeURIComponent(phone)}`)}
              className="w-full py-3 bg-stone-100 text-stone-600 font-semibold text-sm rounded-full hover:bg-stone-200 transition-colors">
              Keep my order
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
