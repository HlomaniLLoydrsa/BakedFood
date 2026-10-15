import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, MessageCircle, Phone, Mail, Package, Search } from 'lucide-react';
import api from '../../lib/api';
import { Order, Settings } from '../../types';
import { formatCurrency } from '../../lib/format';
import { PageSpinner } from '../../components/ui/Spinner';

interface SuccessState {
  order?: Order;
  productName?: string;
  sellingUnit?: string;
}

export function OrderSuccessPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const state = (location.state as SuccessState) || {};

  const { data: fetchedOrder } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: async () => {
      // This fallback is only used if navigating directly — requires the phone
      // from location search params as a fallback
      const res = await api.get(`/orders/number/${orderNumber}?phone=`);
      return res.data.order as Order;
    },
    enabled: false, // success page always comes with navigation state
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.settings as Settings;
    },
  });

  const order = state.order || fetchedOrder;
  if (!order) return <PageSpinner />;

  const item = order.orderItems[0];
  const isEft = order.paymentMethod === 'EFT';
  const popSubmitted = order.paymentStatus === 'POP_SUBMITTED';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">

      {/* ── Dark confirmation header ─────────────────── */}
      <div
        className="px-5 pt-14 pb-10 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1c1917 0%, #3d2c1a 100%)' }}
      >
        {/* Warm glow */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 80%, #d4a853 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10">
          {/* Check circle */}
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>

          <p className="text-warm-300 text-xs font-bold uppercase tracking-widest mb-2">
            Order confirmed
          </p>
          <h1 className="text-2xl font-bold text-white mb-1">
            Thank you, {order.customerName.split(' ')[0]}!
          </h1>
          <p className="text-stone-400 text-sm">
            Your order has been received.
          </p>
        </div>
      </div>

      {/* ── Order details card ───────────────────────── */}
      <div className="max-w-lg mx-auto w-full px-4 -mt-4 pb-10">

        {/* Main card */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-card overflow-hidden mb-3">

          {/* Order number row */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-50">
            <div>
              <p className="text-xs text-stone-400 mb-0.5">Order number</p>
              <p className="text-base font-bold text-stone-900">{order.orderNumber}</p>
            </div>
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Received
            </div>
          </div>

          {/* Product */}
          <div className="px-5 py-4 border-b border-stone-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package size={16} className="text-stone-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-stone-900">
                  {item?.productNameSnapshot ?? state.productName}
                </p>
                <p className="text-xs text-stone-400">
                  {item?.quantity} × {item?.sellingUnitSnapshot ?? state.sellingUnit}
                </p>
              </div>
              <p className="text-sm font-bold text-stone-900">
                {formatCurrency(Number(order.totalAmount))}
              </p>
            </div>
          </div>

          {/* Details grid */}
          <div className="px-5 py-4 grid grid-cols-2 gap-y-3 gap-x-4">
            <div>
              <p className="text-xs text-stone-400 mb-0.5">Fulfilment</p>
              <p className="text-sm font-semibold text-stone-900">
                {order.fulfilmentMethod === 'DELIVERY' ? '🚚 Delivery' : '🏪 Collection'}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400 mb-0.5">Payment</p>
              <p className="text-sm font-semibold text-stone-900">
                {isEft ? 'EFT' : 'Cash on delivery'}
              </p>
            </div>
            {order.deliveryAddress && (
              <div className="col-span-2">
                <p className="text-xs text-stone-400 mb-0.5">Delivery address</p>
                <p className="text-sm text-stone-700">{order.deliveryAddress}</p>
              </div>
            )}
          </div>

          {/* Payment notice */}
          {isEft ? (
            <div className={`mx-4 mb-4 p-3.5 rounded-2xl border ${
              popSubmitted
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-amber-50 border-amber-100'
            }`}>
              <p className={`text-xs font-semibold ${popSubmitted ? 'text-emerald-800' : 'text-amber-800'}`}>
                {popSubmitted
                  ? '✓ Proof of payment received — we\'ll verify and confirm soon.'
                  : 'Please make your EFT payment using your order number as reference.'}
              </p>
            </div>
          ) : (
            <div className="mx-4 mb-4 p-3.5 rounded-2xl bg-stone-50 border border-stone-100">
              <p className="text-xs text-stone-600">
                Cash payment will be collected on delivery.
              </p>
            </div>
          )}
        </div>

        {/* Contact card */}
        {settings && (settings.businessWhatsapp || settings.businessPhone || settings.businessEmail) && (
          <div className="bg-white rounded-3xl border border-stone-100 shadow-soft p-5 mb-3">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
              {settings.businessName ? `Contact ${settings.businessName}` : 'Need help?'}
            </p>
            <div className="space-y-2">
              {settings.businessWhatsapp && (
                <a
                  href={`https://wa.me/${settings.businessWhatsapp.replace(/[^0-9]/g, '')}`}
                  className="flex items-center gap-3 px-4 py-3 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={15} className="text-emerald-700" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">WhatsApp</p>
                    <p className="text-sm font-semibold text-stone-900">{settings.businessWhatsapp}</p>
                  </div>
                </a>
              )}
              {settings.businessPhone && settings.businessPhone !== settings.businessWhatsapp && (
                <a
                  href={`tel:${settings.businessPhone}`}
                  className="flex items-center gap-3 px-4 py-3 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone size={15} className="text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Phone</p>
                    <p className="text-sm font-semibold text-stone-900">{settings.businessPhone}</p>
                  </div>
                </a>
              )}
              {settings.businessEmail && (
                <a
                  href={`mailto:${settings.businessEmail}`}
                  className="flex items-center gap-3 px-4 py-3 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail size={15} className="text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-400">Email</p>
                    <p className="text-sm font-semibold text-stone-900">{settings.businessEmail}</p>
                  </div>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Track order + back link */}
        <div className="space-y-3">
          {/* Track order CTA */}
          <Link
            to={`/order/${order.orderNumber}/status?phone=${encodeURIComponent(order.phone || '')}`}
            className="flex items-center justify-between bg-white rounded-2xl border border-stone-100 shadow-soft px-5 py-4 hover:bg-stone-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-stone-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <Search size={15} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900">Track your order</p>
                <p className="text-xs text-stone-400">See live status updates anytime</p>
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-stone-300 group-hover:text-stone-500 transition-colors flex-shrink-0">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          {/* Back to drop */}
          <div className="text-center pt-1">
            <Link
              to={`/drop/${order.drop?.slug || ''}`}
              className="text-sm text-stone-400 hover:text-stone-700 transition-colors"
            >
              ← Back to drop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
