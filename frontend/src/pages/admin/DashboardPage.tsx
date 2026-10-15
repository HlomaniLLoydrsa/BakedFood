import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Package, DollarSign, TrendingUp, Clock, Send, Eye, Copy, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { CountdownTimer } from '../../components/ui/CountdownTimer';
import { PageSpinner } from '../../components/ui/Spinner';
import { ConfirmModal } from '../../components/ui/Modal';

interface ActiveDrop {
  id: string; name: string; slug: string; closesAt: string; opensAt: string;
  computedStatus: string; totalOrders: number; totalUnits: number;
  totalRevenue: number; verifiedRevenue: number; popPendingRevenue: number; cashPendingRevenue: number;
  demand: Array<{ name: string; unit: string; qty: number }>;
}

interface DashboardData {
  activeDrops: ActiveDrop[];
  allTimeOrders: number;
  allTimeRevenue: number;
  recentOrders: Array<{
    id: string; orderNumber: string; customerName: string; totalAmount: number;
    paymentStatus: string; orderStatus: string; createdAt: string;
    drop: { name: string };
    orderItems: Array<{ productNameSnapshot: string; quantity: number }>;
  }>;
}

// Payment status → readable label + colour
function paymentColour(s: string) {
  if (s === 'PAYMENT_VERIFIED' || s === 'CASH_RECEIVED') return { dot: 'bg-green-500',  text: 'text-green-700',  bg: 'bg-green-50',  label: 'Paid' };
  if (s === 'POP_SUBMITTED')                              return { dot: 'bg-amber-400',  text: 'text-amber-700',  bg: 'bg-amber-50',  label: 'POP sent' };
  if (s === 'PAYMENT_REJECTED')                          return { dot: 'bg-red-500',    text: 'text-red-700',    bg: 'bg-red-50',    label: 'Rejected' };
  if (s === 'CASH_PENDING')                              return { dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50', label: 'Cash due' };
  return                                                        { dot: 'bg-stone-400',  text: 'text-stone-600',  bg: 'bg-stone-100', label: 'Pending' };
}

function orderStatusColour(s: string) {
  if (s === 'COMPLETED')  return { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Completed' };
  if (s === 'READY')      return { bg: 'bg-blue-50',   text: 'text-blue-700',   label: 'Ready' };
  if (s === 'PREPARING')  return { bg: 'bg-violet-50', text: 'text-violet-700', label: 'Preparing' };
  if (s === 'CONFIRMED')  return { bg: 'bg-sky-50',    text: 'text-sky-700',    label: 'Confirmed' };
  if (s === 'CANCELLED')  return { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Cancelled' };
  return                         { bg: 'bg-stone-100', text: 'text-stone-600',  label: 'Pending' };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => { const r = await api.get('/dashboard'); return r.data as DashboardData; },
    refetchInterval: 30_000,
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/drops/${id}/close`),
    onSuccess: () => { toast.success('Order window closed'); refetch(); setClosingId(null); },
    onError: () => toast.error('Failed to close'),
  });

  if (isLoading) return <PageSpinner />;

  const { activeDrops = [], allTimeOrders = 0, allTimeRevenue = 0, recentOrders = [] } = data || {};

  return (
    <div className="space-y-5">

      {/* ── Active order window ───────────────────── */}
      {activeDrops.length > 0 ? activeDrops.map((drop) => (
        <div key={drop.id}>
          {/* Header card */}
          <div className="bg-black rounded-2xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 relative" style={{ background: 'linear-gradient(135deg,#000 0%,#0d2b1a 100%)' }}>
              {/* Green glow */}
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #16a34a 0%, transparent 55%)' }} />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-green-400 bg-green-500/15 border border-green-500/25 px-2.5 py-1 rounded-full mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Accepting orders
                    </span>
                    <h2 className="text-lg font-extrabold text-white leading-tight">{drop.name}</h2>
                  </div>
                  <button onClick={() => setClosingId(drop.id)}
                    className="flex-shrink-0 text-[11px] font-bold text-red-400 bg-red-500/15 border border-red-500/25 px-3 py-1.5 rounded-full hover:bg-red-500/25 transition-colors">
                    Close
                  </button>
                </div>
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <Clock size={12} />
                  <span>Closes in</span>
                  <CountdownTimer targetDate={drop.closesAt} className="font-bold text-white" />
                </div>
                {/* Quick actions */}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/drop/${drop.slug}`); toast.success('Link copied'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 border border-white/10 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-white/15 transition-colors">
                    <Copy size={13} /> Copy order link
                  </button>
                  <button onClick={() => navigate(`/admin/orders?dropId=${drop.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 border border-white/10 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-white/15 transition-colors">
                    <Eye size={13} /> View orders
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              { label: 'Orders received',  value: String(drop.totalOrders),                  icon: ShoppingBag, colour: 'text-blue-600',   bg: 'bg-blue-50'   },
              { label: 'Units ordered',    value: String(drop.totalUnits),                   icon: Package,     colour: 'text-violet-600', bg: 'bg-violet-50' },
              { label: 'Total revenue',    value: formatCurrency(drop.totalRevenue),         icon: DollarSign,  colour: 'text-green-600',  bg: 'bg-green-50'  },
              { label: 'Verified / paid',  value: formatCurrency(drop.verifiedRevenue),      icon: TrendingUp,  colour: 'text-emerald-600',bg: 'bg-emerald-50'},
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-2xl border border-stone-100 px-4 py-4">
                <div className={`w-8 h-8 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
                  <s.icon size={15} className={s.colour} />
                </div>
                <p className="text-xl font-extrabold text-stone-900">{s.value}</p>
                <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* What customers ordered */}
          {drop.demand.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 mt-3">
              <div className="px-4 py-3 border-b border-stone-100">
                <p className="text-sm font-extrabold text-stone-900">What customers ordered</p>
                <p className="text-xs text-stone-400 mt-0.5">This tells you exactly how much to prepare</p>
              </div>
              <div className="divide-y divide-stone-100">
                {drop.demand.map((item) => (
                  <div key={item.name} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-semibold text-stone-900">{item.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-extrabold text-green-600">{item.qty}</span>
                      <span className="text-xs text-stone-400">× {item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Pending */}
              <div className="px-4 py-3 border-t border-stone-100 bg-stone-50 rounded-b-2xl flex gap-4">
                <p className="text-xs text-stone-500">POP pending: <span className="font-bold text-amber-600">{formatCurrency(drop.popPendingRevenue)}</span></p>
                <p className="text-xs text-stone-500">Cash pending: <span className="font-bold text-stone-700">{formatCurrency(drop.cashPendingRevenue)}</span></p>
              </div>
            </div>
          )}
        </div>
      )) : (
        /* No active window */
        <div className="bg-white rounded-2xl border border-stone-100 px-5 py-8 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={20} className="text-stone-400" />
          </div>
          <p className="text-sm font-bold text-stone-900 mb-1">No active order window</p>
          <p className="text-xs text-stone-400 mb-4">Go to <strong>Publish</strong> to open a new order window for your customers.</p>
          <button onClick={() => navigate('/admin/publish/new')}
            className="inline-flex items-center gap-2 bg-green-500 text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-green-600 transition-colors">
            <Send size={13} /> Publish products
          </button>
        </div>
      )}

      {/* ── All-time stats ────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-stone-100 px-4 py-4">
          <p className="text-xs text-stone-400 mb-1">Total orders (all time)</p>
          <p className="text-2xl font-extrabold text-stone-900">{allTimeOrders}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 px-4 py-4">
          <p className="text-xs text-stone-400 mb-1">Total revenue (all time)</p>
          <p className="text-2xl font-extrabold text-green-600">{formatCurrency(allTimeRevenue)}</p>
        </div>
      </div>

      {/* ── Recent orders ─────────────────────────── */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <p className="text-sm font-extrabold text-stone-900">Recent orders</p>
            <button onClick={() => navigate('/admin/orders')} className="text-xs font-bold text-green-600">View all</button>
          </div>
          <div className="divide-y divide-stone-100">
            {recentOrders.map((o) => {
              const pay = paymentColour(o.paymentStatus);
              const ord = orderStatusColour(o.orderStatus);
              return (
                <div key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)}
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-stone-50">
                  {/* Initials */}
                  <div className="w-9 h-9 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-extrabold text-stone-600">
                      {o.customerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-900 truncate">{o.customerName}</p>
                    <p className="text-xs text-stone-400 truncate">{o.orderItems.map((i) => `${i.productNameSnapshot} ×${i.quantity}`).join(', ')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <p className="text-sm font-extrabold text-stone-900">{formatCurrency(Number(o.totalAmount))}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pay.bg} ${pay.text}`}>{pay.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!closingId}
        onClose={() => setClosingId(null)}
        onConfirm={() => closingId && closeMutation.mutate(closingId)}
        title="Close order window?"
        message="Customers will no longer be able to place orders once you close this window."
        confirmText="Yes, close it"
        confirmVariant="danger"
        loading={closeMutation.isPending}
      />
    </div>
  );
}
