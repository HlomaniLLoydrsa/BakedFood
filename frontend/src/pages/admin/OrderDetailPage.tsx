import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, FileText, ExternalLink, User, MapPin, Phone, Mail, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Order, PaymentStatus } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { PaymentStatusBadge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';

// Simplified status badge for admin
function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    PENDING:   { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Pending' },
    CONFIRMED: { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Confirmed' },
    COMPLETED: { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Completed' },
    CANCELLED: { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelled' },
  };
  const s = map[status] || { bg: 'bg-stone-100', text: 'text-stone-600', label: status };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {s.label}
    </span>
  );
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [popModalOpen, setPopModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}`);
      return res.data.order as Order & { cancelReason?: string };
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (payload: { status: PaymentStatus; rejectionReason?: string }) =>
      api.patch(`/orders/${id}/payment-status`, payload),
    onSuccess: () => {
      toast.success('Payment updated');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setRejectModalOpen(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'CONFIRMED' | 'COMPLETED') =>
      api.patch(`/orders/${id}/order-status`, { status }),
    onSuccess: (res) => {
      const s = res.data.order.orderStatus;
      toast.success(s === 'CONFIRMED' ? '✅ Order confirmed' : '🎉 Order completed');
      queryClient.invalidateQueries({ queryKey: ['order', id] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <PageSpinner />;
  if (!data) return null;

  const order = data as Order & { cancelReason?: string };
  const isCancelled = order.orderStatus === 'CANCELLED';
  const isCompleted = order.orderStatus === 'COMPLETED';
  const isConfirmed = order.orderStatus === 'CONFIRMED';
  const isPending   = order.orderStatus === 'PENDING';

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/orders')}
          className="w-9 h-9 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <StatusPill status={order.orderStatus} />
            <PaymentStatusBadge status={order.paymentStatus} size="sm" />
          </div>
          <h1 className="text-lg font-extrabold text-stone-900">{order.orderNumber}</h1>
        </div>
      </div>

      {/* Cancelled reason */}
      {isCancelled && order.cancelReason && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
          <XCircle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-red-700 mb-0.5">Cancelled by customer</p>
            <p className="text-sm text-red-600">"{order.cancelReason}"</p>
          </div>
        </div>
      )}

      {/* ── Order status actions ── */}
      {!isCancelled && !isCompleted && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
            <p className="text-xs font-extrabold text-stone-600 uppercase tracking-widest">Update Order Status</p>
          </div>
          <div className="p-4">
            {/* Visual flow */}
            <div className="flex items-center gap-2 mb-4">
              {['PENDING','CONFIRMED','COMPLETED'].map((s, i) => {
                const done    = (s === 'PENDING' && ['CONFIRMED','COMPLETED'].includes(order.orderStatus)) ||
                                (s === 'CONFIRMED' && order.orderStatus === 'COMPLETED');
                const current = order.orderStatus === s;
                return (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <div className={`flex-1 flex flex-col items-center gap-1`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold border-2 transition-all ${
                        done    ? 'bg-green-500 border-green-500 text-white' :
                        current ? 'bg-stone-900 border-stone-900 text-white' :
                                  'bg-white border-stone-200 text-stone-400'
                      }`}>
                        {done ? '✓' : i+1}
                      </div>
                      <p className={`text-[10px] font-bold text-center ${current ? 'text-stone-900' : done ? 'text-green-600' : 'text-stone-400'}`}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </p>
                    </div>
                    {i < 2 && <div className={`w-4 h-0.5 flex-shrink-0 ${done || (current && s !== 'COMPLETED') ? 'bg-green-500' : 'bg-stone-200'}`} />}
                  </div>
                );
              })}
            </div>

            {/* Action button */}
            {isPending && (
              <button
                onClick={() => statusMutation.mutate('CONFIRMED')}
                disabled={statusMutation.isPending}
                className="w-full py-3 bg-blue-500 text-white font-bold text-sm rounded-xl hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> Confirm Order
              </button>
            )}
            {isConfirmed && (
              <button
                onClick={() => statusMutation.mutate('COMPLETED')}
                disabled={statusMutation.isPending}
                className="w-full py-3 bg-green-500 text-white font-bold text-sm rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} /> Mark as Completed
              </button>
            )}
            <p className="text-[11px] text-stone-400 text-center mt-2">
              {isPending && 'Confirming locks the order — customer can no longer cancel.'}
              {isConfirmed && 'Mark completed once delivered or collected.'}
            </p>
          </div>
        </div>
      )}

      {/* Completed message */}
      {isCompleted && (
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
          <p className="text-sm font-bold text-green-700">Order completed — no further changes allowed.</p>
        </div>
      )}

      {/* ── Items ── */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <p className="text-xs font-extrabold text-stone-600 uppercase tracking-widest">Order Items</p>
        </div>
        <div className="p-4 space-y-3">
          {order.orderItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-stone-900">{item.productNameSnapshot} × {item.quantity}</p>
                <p className="text-xs text-stone-400">{formatCurrency(Number(item.unitPrice))} / {item.sellingUnitSnapshot}</p>
              </div>
              <span className="text-sm font-bold text-stone-900">{formatCurrency(Number(item.subtotal))}</span>
            </div>
          ))}
          <div className="border-t border-stone-100 pt-3 flex justify-between">
            <span className="text-sm font-extrabold text-stone-900">Total</span>
            <span className="text-base font-extrabold text-green-600">{formatCurrency(Number(order.totalAmount))}</span>
          </div>
        </div>
      </div>

      {/* ── Payment ── */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <p className="text-xs font-extrabold text-stone-600 uppercase tracking-widest">Payment</p>
          <PaymentStatusBadge status={order.paymentStatus} size="sm" />
        </div>
        <div className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-400">Method</span>
            <span className="font-semibold">{order.paymentMethod === 'EFT' ? 'EFT / Bank Transfer' : 'Cash on Delivery'}</span>
          </div>
          {order.payment?.reference && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-400">Reference</span>
              <span className="font-mono font-semibold">{order.payment.reference}</span>
            </div>
          )}

          {/* POP */}
          {order.payment?.proofUrl && (
            <div>
              <p className="text-xs text-stone-400 mb-2">Proof of Payment</p>
              {order.payment.proofUrl.endsWith('.pdf') ? (
                <a href={order.payment.proofUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium hover:bg-stone-100 transition-colors">
                  <FileText size={14} /> View PDF <ExternalLink size={12} className="text-stone-400" />
                </a>
              ) : (
                <div className="relative w-28 h-28 rounded-xl overflow-hidden border border-stone-200 cursor-pointer"
                  onClick={() => setPopModalOpen(true)}>
                  <img src={order.payment.proofUrl} alt="POP" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <ExternalLink size={16} className="text-white" />
                  </div>
                </div>
              )}
            </div>
          )}

          {order.payment?.rejectionReason && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-xs font-bold text-red-700 mb-0.5">Rejection reason</p>
              <p className="text-sm text-red-600">{order.payment.rejectionReason}</p>
            </div>
          )}

          {/* Payment action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {order.paymentMethod === 'EFT' && ['POP_SUBMITTED','AWAITING_PAYMENT'].includes(order.paymentStatus) && (
              <>
                <button onClick={() => paymentMutation.mutate({ status: 'PAYMENT_VERIFIED' })}
                  disabled={paymentMutation.isPending}
                  className="flex-1 py-2.5 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50">
                  ✓ Verify Payment
                </button>
                <button onClick={() => setRejectModalOpen(true)}
                  className="flex-1 py-2.5 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100">
                  ✗ Reject
                </button>
              </>
            )}
            {order.paymentMethod === 'CASH' && order.paymentStatus === 'CASH_PENDING' && (
              <button onClick={() => paymentMutation.mutate({ status: 'CASH_RECEIVED' })}
                disabled={paymentMutation.isPending}
                className="w-full py-2.5 bg-green-500 text-white text-xs font-bold rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50">
                ✓ Mark Cash Received
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Customer ── */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <p className="text-xs font-extrabold text-stone-600 uppercase tracking-widest">Customer</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-extrabold text-stone-600">
                {order.customerName.split(' ').map((n) => n[0]).join('').slice(0,2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold text-stone-900">{order.customerName}</p>
              <p className="text-xs text-stone-400">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
          <a href={`tel:${order.phone}`} className="flex items-center gap-3 py-2.5 px-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
            <Phone size={14} className="text-stone-400" />
            <span className="text-sm font-semibold text-stone-900">{order.phone}</span>
          </a>
          {order.email && (
            <a href={`mailto:${order.email}`} className="flex items-center gap-3 py-2.5 px-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
              <Mail size={14} className="text-stone-400" />
              <span className="text-sm font-semibold text-stone-900">{order.email}</span>
            </a>
          )}
          <div className="flex items-start gap-3 py-2.5 px-3 bg-stone-50 rounded-xl">
            <MapPin size={14} className="text-stone-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-stone-400">{order.fulfilmentMethod === 'DELIVERY' ? 'Delivery address' : 'Collection'}</p>
              <p className="text-sm font-semibold text-stone-900">{order.deliveryAddress || 'Customer will collect'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Reject payment modal */}
      <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Reject Payment" size="sm">
        <div className="p-5">
          <div className="mb-3">
            <label className="text-xs font-bold text-stone-600 block mb-1.5">Reason (optional)</label>
            <input
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black transition-all"
              placeholder="e.g. Incorrect amount, wrong reference…"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRejectModalOpen(false)}
              className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold text-sm rounded-xl hover:bg-stone-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => paymentMutation.mutate({ status: 'PAYMENT_REJECTED', rejectionReason })}
              disabled={paymentMutation.isPending}
              className="flex-1 py-3 bg-red-500 text-white font-bold text-sm rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50">
              Reject
            </button>
          </div>
        </div>
      </Modal>

      {/* POP image modal */}
      <Modal isOpen={popModalOpen} onClose={() => setPopModalOpen(false)} title="Proof of Payment" size="lg">
        <div className="p-4">
          {order.payment?.proofUrl && (
            <img src={order.payment.proofUrl} alt="POP" className="w-full rounded-xl" />
          )}
        </div>
      </Modal>
    </div>
  );
}
