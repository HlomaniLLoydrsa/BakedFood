import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronRight, SlidersHorizontal, ShoppingBag } from 'lucide-react';
import api from '../../lib/api';
import { Order, Drop } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { PageSpinner } from '../../components/ui/Spinner';

// Colour helpers
function payTag(s: string) {
  if (s === 'PAYMENT_VERIFIED' || s === 'CASH_RECEIVED') return { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Paid' };
  if (s === 'POP_SUBMITTED')                             return { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'POP sent' };
  if (s === 'PAYMENT_REJECTED')                          return { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Rejected' };
  if (s === 'CASH_PENDING')                              return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Cash due' };
  return                                                        { bg: 'bg-stone-100',  text: 'text-stone-600',  label: 'Awaiting' };
}

function orderTag(s: string) {
  if (s === 'COMPLETED')  return { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Completed' };
  if (s === 'READY')      return { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Ready' };
  if (s === 'PREPARING')  return { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Preparing' };
  if (s === 'CONFIRMED')  return { bg: 'bg-sky-100',    text: 'text-sky-700',    label: 'Confirmed' };
  if (s === 'CANCELLED')  return { bg: 'bg-red-100',    text: 'text-red-700',    label: 'Cancelled' };
  return                         { bg: 'bg-stone-100',  text: 'text-stone-600',  label: 'Pending' };
}

const PAYMENT_FILTERS = [
  { value: '', label: 'All' },
  { value: 'AWAITING_PAYMENT', label: 'Awaiting' },
  { value: 'POP_SUBMITTED',    label: 'POP sent' },
  { value: 'PAYMENT_VERIFIED', label: 'Paid' },
  { value: 'PAYMENT_REJECTED', label: 'Rejected' },
  { value: 'CASH_PENDING',     label: 'Cash due' },
  { value: 'CASH_RECEIVED',    label: 'Cash received' },
];

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING',   label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PREPARING', label: 'Preparing' },
  { value: 'READY',     label: 'Ready' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch]         = useState('');
  const [showFilters, setFilters]   = useState(false);
  const [payFilter, setPayFilter]   = useState(searchParams.get('paymentStatus') || '');
  const [ordFilter, setOrdFilter]   = useState(searchParams.get('orderStatus') || '');
  const dropId                       = searchParams.get('dropId') || '';

  const { data: dropsData } = useQuery({
    queryKey: ['drops'],
    queryFn: async () => { const r = await api.get('/drops'); return r.data.drops as Drop[]; },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { search, payFilter, ordFilter, dropId }],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (search)    p.set('search',        search);
      if (payFilter) p.set('paymentStatus', payFilter);
      if (ordFilter) p.set('orderStatus',   ordFilter);
      if (dropId)    p.set('dropId',        dropId);
      const r = await api.get(`/orders?${p}`);
      return { orders: r.data.orders as Order[], total: r.data.total as number };
    },
  });

  const orders = data?.orders || [];
  const total  = data?.total  || 0;
  const hasFilters = !!(payFilter || ordFilter || dropId || search);

  function clearFilters() { setPayFilter(''); setOrdFilter(''); setSearch(''); setSearchParams({}); }

  return (
    <div className="space-y-3 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Orders</h1>
          <p className="text-xs text-stone-400 mt-0.5">{total} order{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setFilters((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-full border transition-colors ${showFilters || hasFilters ? 'bg-black text-white border-black' : 'bg-white text-stone-600 border-stone-200'}`}>
          <SlidersHorizontal size={13} />
          Filter
          {hasFilters && <span className="w-4 h-4 bg-green-500 rounded-full text-white text-[10px] font-extrabold flex items-center justify-center">!</span>}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          className="w-full pl-11 pr-10 py-3.5 bg-white border border-stone-200 rounded-2xl text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
          placeholder="Search by name, order number or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center text-stone-500">
            <X size={12} />
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-4">

          {/* Drop filter */}
          {(dropsData?.length || 0) > 0 && (
            <div>
              <p className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-2">Order window</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { const p = new URLSearchParams(searchParams); p.delete('dropId'); setSearchParams(p); }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${!dropId ? 'bg-black text-white border-black' : 'bg-white text-stone-600 border-stone-200'}`}>
                  All
                </button>
                {dropsData?.map((d) => (
                  <button key={d.id} onClick={() => { const p = new URLSearchParams(searchParams); p.set('dropId', d.id); setSearchParams(p); }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${dropId === d.id ? 'bg-black text-white border-black' : 'bg-white text-stone-600 border-stone-200'}`}>
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment filter */}
          <div>
            <p className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-2">Payment status</p>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_FILTERS.map((f) => (
                <button key={f.value} onClick={() => setPayFilter(f.value)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${payFilter === f.value ? 'bg-black text-white border-black' : 'bg-white text-stone-600 border-stone-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Order status filter */}
          <div>
            <p className="text-[10px] font-extrabold text-stone-400 uppercase tracking-widest mb-2">Order status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((f) => (
                <button key={f.value} onClick={() => setOrdFilter(f.value)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${ordFilter === f.value ? 'bg-black text-white border-black' : 'bg-white text-stone-600 border-stone-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Orders */}
      {isLoading ? (
        <PageSpinner />
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 py-12 text-center px-5">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShoppingBag size={20} className="text-stone-400" />
          </div>
          <p className="text-sm font-bold text-stone-900 mb-1">No orders yet</p>
          <p className="text-xs text-stone-400">
            {hasFilters ? 'No orders match your filters.' : 'Orders will appear here when customers place them.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden divide-y divide-stone-100">
          {orders.map((order) => {
            const pay = payTag(order.paymentStatus);
            const ord = orderTag(order.orderStatus);
            return (
              <div key={order.id} onClick={() => navigate(`/admin/orders/${order.id}`)}
                className="flex items-center gap-3 px-4 py-4 cursor-pointer active:bg-stone-50 transition-colors">

                {/* Avatar */}
                <div className="w-10 h-10 bg-stone-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-extrabold text-stone-600">
                    {order.customerName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-stone-900 truncate">{order.customerName}</p>
                    <span className="text-[10px] font-bold text-stone-400 flex-shrink-0">{order.orderNumber}</span>
                  </div>
                  <p className="text-xs text-stone-400 truncate">
                    {order.orderItems.map((i) => `${i.productNameSnapshot} ×${i.quantity}`).join(', ')}
                  </p>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${pay.bg} ${pay.text}`}>{pay.label}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${ord.bg} ${ord.text}`}>{ord.label}</span>
                  </div>
                </div>

                {/* Amount */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <p className="text-sm font-extrabold text-stone-900">{formatCurrency(Number(order.totalAmount))}</p>
                  <p className="text-[10px] text-stone-400">{formatDateTime(order.createdAt).split(',')[0]}</p>
                </div>

                <ChevronRight size={15} className="text-stone-300 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
