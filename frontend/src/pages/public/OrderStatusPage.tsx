import { useState } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Package, CheckCircle, Clock, Truck, XCircle, AlertCircle, ArrowLeft, Zap, RotateCw, Phone } from 'lucide-react';
import api from '../../lib/api';
import { Order, OrderStatus, PaymentStatus, Settings } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { PageSpinner } from '../../components/ui/Spinner';

// ─── Status steps ─────────────────────────────────────────────────────────
interface StatusStep { key: OrderStatus; label: string; description: string; icon: React.ElementType; }

const ORDER_STEPS: StatusStep[] = [
  { key: 'PENDING',   label: 'Order Received',  description: 'Your order has been placed.',                         icon: Package     },
  { key: 'CONFIRMED', label: 'Confirmed',        description: 'Your order has been confirmed and is being prepared.', icon: CheckCircle },
  { key: 'COMPLETED', label: 'Completed',        description: 'Order delivered/collected. Enjoy!',                   icon: Truck       },
];
const STEP_ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED'];

function stepIndex(status: OrderStatus) { return STEP_ORDER.indexOf(status); }

// ─── Payment banner ───────────────────────────────────────────────────────
function PaymentBanner({ status, method }: { status: PaymentStatus; method: string }) {
  const map: Partial<Record<PaymentStatus, { bg: string; border: string; text: string; icon: React.ElementType; message: string }>> = {
    AWAITING_PAYMENT: { bg:'bg-amber-50',   border:'border-amber-100',   text:'text-amber-800',   icon:AlertCircle,  message:'Awaiting payment. Please make your EFT payment using your order number as reference.' },
    POP_SUBMITTED:    { bg:'bg-sky-50',     border:'border-sky-100',     text:'text-sky-800',     icon:Clock,        message:"Proof of payment submitted — we're verifying it now." },
    PAYMENT_VERIFIED: { bg:'bg-emerald-50', border:'border-emerald-100', text:'text-emerald-800', icon:CheckCircle,  message:'Payment verified. ✓' },
    PAYMENT_REJECTED: { bg:'bg-red-50',     border:'border-red-100',     text:'text-red-800',     icon:XCircle,      message:'Payment could not be verified. Please contact us.' },
    CASH_PENDING:     { bg:'bg-stone-50',   border:'border-stone-200',   text:'text-stone-700',   icon:Clock,        message:'Cash on delivery — payment collected on arrival.' },
    CASH_RECEIVED:    { bg:'bg-emerald-50', border:'border-emerald-100', text:'text-emerald-800', icon:CheckCircle,  message:'Cash payment received. ✓' },
  };
  const cfg = map[status];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-3 p-4 rounded-2xl border ${cfg.bg} ${cfg.border}`}>
      <Icon size={16} className={`${cfg.text} flex-shrink-0 mt-0.5`} />
      <div>
        <p className={`text-xs font-bold ${cfg.text} mb-0.5`}>{method === 'EFT' ? 'EFT Payment' : 'Cash on Delivery'}</p>
        <p className={`text-xs ${cfg.text} leading-relaxed`}>{cfg.message}</p>
      </div>
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────
function Stepper({ status }: { status: OrderStatus }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
        <XCircle size={18} className="text-red-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-800">Order Cancelled</p>
          <p className="text-xs text-red-600 mt-0.5">This order has been cancelled. Contact us if you have questions.</p>
        </div>
      </div>
    );
  }

  const current = stepIndex(status);
  return (
    <div className="space-y-0">
      {ORDER_STEPS.map((step, i) => {
        const done   = i < current;
        const active = i === current;
        const Icon   = step.icon;
        const isLast = i === ORDER_STEPS.length - 1;
        return (
          <div key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                done ? 'bg-green-500' : active ? 'bg-stone-900 ring-4 ring-stone-200' : 'bg-stone-100'
              }`}>
                {done
                  ? <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l4 4 6-8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <Icon size={14} className={done || active ? 'text-white' : 'text-stone-400'} />
                }
              </div>
              {!isLast && <div className={`w-0.5 flex-1 my-1 min-h-[24px] ${done ? 'bg-green-500' : 'bg-stone-100'}`} />}
            </div>
            <div className={`pt-1 ${isLast ? 'pb-0' : 'pb-6'}`}>
              <p className={`text-sm font-bold ${done || active ? 'text-stone-900' : 'text-stone-300'}`}>
                {step.label}
                {active && <span className="ml-2 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Now</span>}
              </p>
              {(done || active) && <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{step.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Lookup form — collects order number AND phone ─────────────────────────
function OrderLookup({ defaultOrderNumber = '', defaultPhone = '' }: { defaultOrderNumber?: string; defaultPhone?: string }) {
  const navigate = useNavigate();
  const [orderNum, setOrderNum] = useState(defaultOrderNumber);
  const [phone, setPhone]       = useState(defaultPhone);
  const [error, setError]       = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = orderNum.trim().toUpperCase();
    const ph  = phone.trim();
    if (!num)  { setError('Please enter your order number');    return; }
    if (!ph || ph.length < 7) { setError('Please enter your phone number'); return; }
    setError('');
    // Encode phone in query string so the status page can fetch with verification
    navigate(`/order/${num}/status?phone=${encodeURIComponent(ph)}`);
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="bg-white border-b border-stone-100 px-5 h-14 flex items-center gap-2">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="font-bold text-stone-900 text-sm">Droply</span>
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 max-w-sm mx-auto w-full">
        <div className="w-14 h-14 bg-stone-900 rounded-2xl flex items-center justify-center mb-5">
          <Search size={22} className="text-white" />
        </div>
        <h1 className="text-xl font-extrabold text-stone-900 mb-1 text-center">Track your order</h1>
        <p className="text-sm text-stone-500 text-center mb-8 leading-relaxed">
          Enter your order number and the phone number you used when ordering.
        </p>

        <form onSubmit={handleSubmit} noValidate className="w-full space-y-3">
          {/* Order number */}
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1.5">Order number</label>
            <input
              className="w-full px-4 py-3.5 bg-white border border-stone-200 rounded-2xl text-sm font-mono font-bold text-center tracking-wider uppercase placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              placeholder="DROP-1001"
              value={orderNum}
              onChange={(e) => { setOrderNum(e.target.value); setError(''); }}
              autoFocus
              autoCapitalize="characters"
            />
          </div>

          {/* Phone number */}
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1.5">
              <span className="flex items-center gap-1.5">
                <Phone size={12} className="text-green-500" />
                Phone number used when ordering
              </span>
            </label>
            <input
              type="tel"
              className="w-full px-4 py-3.5 bg-white border border-stone-200 rounded-2xl text-sm font-medium placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
              placeholder="+27 82 123 4567"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setError(''); }}
            />
            <p className="text-[11px] text-stone-400 mt-1">This verifies you are the owner of this order.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <button type="submit"
            className="w-full py-4 bg-stone-900 text-white font-extrabold text-sm rounded-full hover:bg-green-600 transition-colors">
            Track Order
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main status page ──────────────────────────────────────────────────────
export function OrderStatusPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();
  const phone           = searchParams.get('phone') || '';

  // Always call hooks before any conditional returns
  const { data: order, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['order-status', orderNumber, phone],
    queryFn: async () => {
      const res = await api.get(`/orders/number/${orderNumber}?phone=${encodeURIComponent(phone)}`);
      return res.data.order as Order & { cancelReason?: string };
    },
    refetchInterval: 30_000,
    retry: false,
    // Only fetch when we have both values
    enabled: !!orderNumber && !!phone,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.settings as Settings;
    },
  });

  // Show lookup form if either field is missing
  if (!orderNumber || !phone) {
    return <OrderLookup defaultOrderNumber={orderNumber || ''} />;
  }

  if (isLoading) return <PageSpinner />;

  // Wrong phone / not found — show lookup again with error message
  if (error) {
    const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error || '';
    const isWrongPhone = msg.toLowerCase().includes('phone') || msg.includes('403');
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <header className="bg-white border-b border-stone-100 px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate('/track')} className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-600">
            <ArrowLeft size={15} />
          </button>
          <span className="font-bold text-stone-900 text-sm">Track Order</span>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-5 text-center py-12 max-w-sm mx-auto">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
            <AlertCircle size={20} className="text-red-400" />
          </div>
          <h2 className="font-extrabold text-stone-900 mb-2">
            {isWrongPhone ? 'Phone number doesn\'t match' : 'Order not found'}
          </h2>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">
            {isWrongPhone
              ? 'The phone number you entered doesn\'t match the one used to place this order. Please try again.'
              : `We couldn't find order ${orderNumber}. Please check and try again.`}
          </p>
          <button onClick={() => navigate('/track')}
            className="py-3 px-6 bg-stone-900 text-white text-sm font-bold rounded-full hover:bg-green-600 transition-colors">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const item = order.orderItems[0];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/track')} className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors">
              <ArrowLeft size={15} />
            </button>
            <div>
              <p className="text-xs text-stone-400">Order</p>
              <p className="text-sm font-extrabold text-stone-900 leading-none">{order.orderNumber}</p>
            </div>
          </div>
          <button onClick={() => refetch()} disabled={isFetching}
            className={`flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition-colors ${isFetching ? 'opacity-50' : ''}`}>
            <RotateCw size={13} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 pb-12 space-y-4">

        {/* Status card */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-soft overflow-hidden">
          <div className="px-5 py-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #1c1917 0%, #0d2b1a 100%)' }}>
            <div className="absolute inset-0 opacity-25"
              style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #16a34a 0%, transparent 55%)' }} />
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">Order status</p>
                <p className="text-white text-xl font-extrabold">{order.orderNumber}</p>
                <p className="text-white/50 text-xs mt-1">{formatDateTime(order.createdAt)}</p>
              </div>
              {order.orderStatus === 'COMPLETED' ? (
                <span className="bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-bold px-3 py-1.5 rounded-full">Completed ✓</span>
              ) : order.orderStatus === 'CANCELLED' ? (
                <span className="bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold px-3 py-1.5 rounded-full">Cancelled</span>
              ) : (
                <span className="flex items-center gap-1.5 bg-green-500/20 border border-green-500/30 text-green-300 text-xs font-bold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> In progress
                </span>
              )}
            </div>
          </div>
          <div className="px-5 py-5">
            <Stepper status={order.orderStatus as OrderStatus} />
          </div>
        </div>

        {/* Cancellation reason */}
        {order.orderStatus === 'CANCELLED' && (order as Order & { cancelReason?: string }).cancelReason && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <XCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-700 mb-0.5">Cancellation reason</p>
              <p className="text-sm text-red-600">"{(order as Order & { cancelReason?: string }).cancelReason}"</p>
            </div>
          </div>
        )}

        {/* Payment */}
        <PaymentBanner status={order.paymentStatus as PaymentStatus} method={order.paymentMethod} />

        {/* Order details */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-50">
            <p className="text-xs font-extrabold text-stone-400 uppercase tracking-widest">Order details</p>
          </div>
          {item && (
            <div className="px-5 py-4 border-b border-stone-50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package size={16} className="text-stone-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">{item.productNameSnapshot}</p>
                  <p className="text-xs text-stone-400">{item.quantity} × {item.sellingUnitSnapshot}</p>
                </div>
              </div>
              <p className="text-sm font-bold text-stone-900 flex-shrink-0">{formatCurrency(Number(item.subtotal))}</p>
            </div>
          )}
          <div className="px-5 py-4 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-stone-400 mb-0.5">Total</p>
              <p className="text-sm font-extrabold text-stone-900">{formatCurrency(Number(order.totalAmount))}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-0.5">Payment</p>
              <p className="text-sm font-semibold text-stone-900">{order.paymentMethod === 'EFT' ? 'EFT' : 'Cash on delivery'}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-0.5">Fulfilment</p>
              <p className="text-sm font-semibold text-stone-900">
                {order.fulfilmentMethod === 'DELIVERY' ? '🚚 Delivery' : '🏪 Collection'}
              </p>
            </div>
            {order.deliveryAddress && (
              <div>
                <p className="text-xs text-stone-400 mb-0.5">Address</p>
                <p className="text-xs text-stone-700 leading-relaxed">{order.deliveryAddress}</p>
              </div>
            )}
          </div>
        </div>

        {/* Contact */}
        {settings && (settings.businessWhatsapp || settings.businessPhone) && (
          <div className="bg-white rounded-3xl border border-stone-100 shadow-soft px-5 py-4">
            <p className="text-xs font-extrabold text-stone-400 uppercase tracking-widest mb-3">Need help?</p>
            {settings.businessWhatsapp && (
              <a href={`https://wa.me/${settings.businessWhatsapp.replace(/[^0-9]/g,'')}?text=Hi, I need help with order ${order.orderNumber}`}
                className="flex items-center gap-3 py-2.5 px-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#16a34a"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.418A9.956 9.956 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a7.966 7.966 0 01-4.073-1.113l-.291-.174-3.02.861.872-3.023-.189-.308A7.964 7.964 0 014 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
                </div>
                <div>
                  <p className="text-xs text-stone-400">WhatsApp us</p>
                  <p className="text-sm font-semibold text-stone-900">{settings.businessWhatsapp}</p>
                </div>
              </a>
            )}
          </div>
        )}

        <p className="text-center text-xs text-stone-400">Auto-updates every 30 seconds.</p>

        {/* Cancel (only when PENDING) */}
        {order.orderStatus === 'PENDING' && (
          <div className="bg-white rounded-3xl border border-stone-100 shadow-soft px-5 py-4 text-center">
            <p className="text-xs text-stone-400 mb-3">Changed your mind?</p>
            <Link to={`/order/${order.orderNumber}/cancel?phone=${encodeURIComponent(phone)}`}
              className="inline-flex items-center gap-2 text-red-500 text-sm font-bold hover:text-red-700 transition-colors">
              Cancel this order
            </Link>
          </div>
        )}

        {/* Review (only when COMPLETED) */}
        {order.orderStatus === 'COMPLETED' && (
          <div className="bg-white rounded-3xl border border-stone-100 shadow-soft px-5 py-5 text-center">
            <p className="text-sm font-bold text-stone-900 mb-1">Enjoyed your order? 🎉</p>
            <p className="text-xs text-stone-400 mb-4">Leave a review — it means a lot to us.</p>
            <Link to={`/order/${order.orderNumber}/review`}
              className="inline-flex items-center gap-2 bg-amber-400 text-stone-900 text-sm font-bold px-6 py-3 rounded-full hover:bg-amber-300 transition-colors">
              ⭐ Leave a review
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
