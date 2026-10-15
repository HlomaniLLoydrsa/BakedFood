import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, Clock, AlertCircle, Package, Truck, Store, Building2, ChevronDown, Zap, ShoppingBag } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Drop, DropProduct, Settings } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { CountdownTimer } from '../../components/ui/CountdownTimer';
import { FileUpload } from '../../components/ui/FileUpload';
import { PageSpinner } from '../../components/ui/Spinner';
import { Input, Textarea } from '../../components/ui/Input';

// Cart state: productId → quantity
type Cart = Record<string, number>;

function cartTotal(cart: Cart, dropProducts: DropProduct[]): number {
  return Object.entries(cart).reduce((sum, [productId, qty]) => {
    const dp = dropProducts.find((d) => d.productId === productId);
    return sum + (dp ? Number(dp.price) * qty : 0);
  }, 0);
}

function cartItems(cart: Cart, dropProducts: DropProduct[]) {
  return Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([productId, qty]) => {
      const dp = dropProducts.find((d) => d.productId === productId)!;
      return { productId, qty, dp };
    });
}

export function DropPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const formRef = useRef<HTMLDivElement>(null);

  const { data: dropData, isLoading: dropLoading } = useQuery({
    queryKey: ['drop', slug],
    queryFn: async () => {
      const res = await api.get(`/drops/public/${slug}`);
      return res.data.drop as Drop;
    },
    refetchInterval: 60_000,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.settings as Settings;
    },
  });

  // ── State ──────────────────────────────────────────────────────────────────
  const [expired, setExpired]   = useState(false);
  const [cart, setCart]         = useState<Cart>({});

  const [form, setForm] = useState({
    customerName: '',
    phone: '',
    fulfilmentMethod: 'DELIVERY' as 'DELIVERY' | 'COLLECTION',
    deliveryAddress: '',
    paymentMethod: 'EFT' as 'EFT' | 'CASH',
  });
  const [popFile, setPopFile]   = useState<File | null>(null);
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const drop           = dropData;
  const computedStatus = drop?.computedStatus || drop?.status;
  const isClosed       = computedStatus === 'CLOSED' || computedStatus === 'CANCELLED' || expired;
  const isScheduled    = computedStatus === 'SCHEDULED';
  const isOpen         = !isClosed && !isScheduled;

  const total    = drop ? cartTotal(cart, drop.dropProducts) : 0;
  const items    = drop ? cartItems(cart, drop.dropProducts)  : [];
  const hasItems = items.length > 0;

  function setQty(productId: string, qty: number) {
    setCart((prev) => ({ ...prev, [productId]: Math.max(0, qty) }));
  }

  function scrollToForm() {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.customerName.trim()) errs.customerName = 'Full name is required';
    if (!form.phone.trim() || form.phone.length < 7) errs.phone = 'Valid phone number is required';
    if (form.fulfilmentMethod === 'DELIVERY' && !form.deliveryAddress.trim()) errs.deliveryAddress = 'Delivery address is required';
    if (form.paymentMethod === 'EFT' && !popFile) errs.pop = 'Please upload proof of payment';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!drop || !hasItems) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const orderRes = await api.post('/orders', {
        dropId: drop.id,
        customerName: form.customerName,
        phone: form.phone,
        fulfilmentMethod: form.fulfilmentMethod,
        deliveryAddress: form.deliveryAddress || undefined,
        paymentMethod: form.paymentMethod,
        items: items.map((i) => ({ productId: i.productId, quantity: i.qty })),
      });
      const order = orderRes.data.order;

      if (form.paymentMethod === 'EFT' && popFile) {
        const fd = new FormData();
        fd.append('proof', popFile);
        await api.post(`/orders/${order.id}/upload-pop`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      navigate(`/order/${order.orderNumber}/success`, {
        state: { order },
        replace: true,
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (dropLoading) return <PageSpinner />;

  if (!drop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="text-center max-w-xs">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={22} className="text-stone-400" />
          </div>
          <h1 className="text-lg font-bold text-stone-900 mb-2">Not found</h1>
          <p className="text-sm text-stone-500">This link doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // ── Shared header ──────────────────────────────────────────────────────────
  const Header = () => (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
            <Zap size={13} className="text-white" />
          </div>
          <span className="font-bold text-stone-900 text-sm">{settings?.businessName || 'Droply'}</span>
        </div>
        <Link to="/track" className="text-xs font-semibold text-stone-400 hover:text-stone-700 transition-colors">
          Track order
        </Link>
      </div>
    </header>
  );

  // ── CLOSED ─────────────────────────────────────────────────────────────────
  if (isClosed) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-sm mx-auto">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock size={22} className="text-stone-400" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-3">Orders Closed</h1>
          <p className="text-stone-500 text-sm leading-relaxed">This order window has ended. Check back for the next one.</p>
        </div>
      </div>
    );
  }

  // ── SCHEDULED ──────────────────────────────────────────────────────────────
  if (isScheduled) {
    return (
      <div className="min-h-screen bg-stone-50">
        <Header />
        <div className="max-w-lg mx-auto px-5 py-16 text-center">
          <div className="w-12 h-12 bg-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Clock size={20} className="text-white" />
          </div>
          <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Coming soon</p>
          <h1 className="text-2xl font-bold text-stone-900 mb-2">{drop.name}</h1>
          <p className="text-stone-500 text-sm mb-1">Orders open at</p>
          <p className="text-lg font-bold text-stone-900">{formatDateTime(drop.opensAt)}</p>
        </div>
      </div>
    );
  }

  // ── OPEN ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-stone-50">

      {/* Header with countdown */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-900 rounded-lg flex items-center justify-center">
              <Zap size={13} className="text-white" />
            </div>
            <span className="font-bold text-stone-900 text-sm">{settings?.businessName || 'Droply'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/track" className="text-xs font-semibold text-stone-400 hover:text-stone-700 transition-colors">
              Track order
            </Link>
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <CountdownTimer targetDate={drop.closesAt} onExpire={() => setExpired(true)} className="font-bold text-stone-900" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto">

        {/* Drop title */}
        <div className="px-5 pt-6 pb-2">
          <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">{drop.name}</h1>
          {drop.description && <p className="text-sm text-stone-500 mt-1 leading-relaxed">{drop.description}</p>}
        </div>

        {/* ── PRODUCT GRID ──────────────────────────────────────────────────── */}
        <div className="px-5 pb-4 space-y-3">
          {drop.dropProducts.map((dp) => {
            const qty    = cart[dp.productId] || 0;
            const maxQty = dp.remaining !== null && dp.remaining !== undefined ? dp.remaining : 999;

            return (
              <div key={dp.productId}
                className={`bg-white rounded-2xl border overflow-hidden transition-all ${
                  qty > 0 ? 'border-green-300 shadow-sm' : 'border-stone-100'
                } ${dp.isSoldOut ? 'opacity-50' : ''}`}>

                <div className="flex gap-3 p-3">
                  {/* Image */}
                  <div className="w-20 h-20 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                    {dp.product.imageUrl
                      ? <img src={dp.product.imageUrl} alt={dp.product.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-stone-300" /></div>
                    }
                  </div>

                  {/* Info + controls */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-stone-900 leading-snug truncate">{dp.product.name}</p>
                        {dp.product.description && (
                          <p className="text-xs text-stone-400 leading-relaxed mt-0.5 line-clamp-2">{dp.product.description}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-extrabold text-stone-900">{formatCurrency(dp.price)}</p>
                        <p className="text-[10px] text-stone-400">/ {dp.product.sellingUnit}</p>
                      </div>
                    </div>

                    {dp.isSoldOut ? (
                      <p className="text-xs font-bold text-red-500 mt-2">Sold out</p>
                    ) : (
                      <div className="flex items-center justify-between mt-2">
                        {/* Subtotal */}
                        <p className="text-sm font-bold text-green-600">
                          {qty > 0 ? formatCurrency(Number(dp.price) * qty) : <span className="text-stone-300">—</span>}
                        </p>

                        {/* Qty controls */}
                        <div className="flex items-center gap-0">
                          <button
                            onClick={() => setQty(dp.productId, qty - 1)}
                            disabled={qty <= 0}
                            className="w-9 h-9 border border-r-0 border-stone-200 rounded-l-xl bg-white flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <div className="w-10 h-9 border-y border-stone-200 bg-white flex items-center justify-center">
                            <span className="text-sm font-bold text-stone-900 tabular-nums">{qty}</span>
                          </div>
                          <button
                            onClick={() => setQty(dp.productId, qty + 1)}
                            disabled={qty >= maxQty}
                            className="w-9 h-9 border border-l-0 border-stone-200 rounded-r-xl bg-white flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-30 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    {maxQty <= 5 && maxQty < 999 && !dp.isSoldOut && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-1">Only {maxQty} left</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── RUNNING TOTAL + ORDER CTA ─────────────────────────────────────── */}
        {hasItems && (
          <div className="px-5 pb-4">
            <div className="bg-stone-900 rounded-2xl px-5 py-4">
              {/* Line items */}
              <div className="space-y-1.5 mb-3">
                {items.map(({ productId, qty, dp }) => (
                  <div key={productId} className="flex justify-between text-xs text-stone-400">
                    <span>{dp.product.name} × {qty}</span>
                    <span>{formatCurrency(Number(dp.price) * qty)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-stone-400">Total</p>
                  <p className="text-xl font-extrabold text-white">{formatCurrency(total)}</p>
                </div>
                <button
                  onClick={scrollToForm}
                  className="flex items-center gap-2 bg-green-500 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-green-400 transition-colors"
                >
                  <ShoppingBag size={15} />
                  Order & Pay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DIVIDER ───────────────────────────────────────────────────────── */}
        <div className="mx-5 border-t border-stone-100 my-3" />

        {/* ── CHECKOUT FORM ─────────────────────────────────────────────────── */}
        <div ref={formRef} className="px-5 pt-4 pb-16">
          {!hasItems && (
            <div className="text-center py-6">
              <ShoppingBag size={28} className="text-stone-200 mx-auto mb-2" />
              <p className="text-sm text-stone-400">Add products above to place an order</p>
            </div>
          )}

          {hasItems && (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <p className="text-xs font-extrabold text-stone-400 uppercase tracking-widest">Your details</p>

              {/* Name + Phone — NO EMAIL */}
              <div className="space-y-3">
                <Input
                  label="Full Name"
                  required
                  placeholder="Jane Smith"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  error={errors.customerName}
                />
                <Input
                  label="WhatsApp / Mobile Number"
                  required
                  type="tel"
                  placeholder="+27 82 123 4567"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  error={errors.phone}
                />
              </div>

              {/* Fulfilment */}
              <div>
                <p className="label-base mb-2">Delivery or Collection?</p>
                <div className="space-y-2">
                  {drop.allowDelivery && (
                    <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${form.fulfilmentMethod === 'DELIVERY' ? 'border-stone-900 bg-stone-50' : 'border-stone-200'}`}>
                      <input type="radio" name="fulfilment" value="DELIVERY" checked={form.fulfilmentMethod === 'DELIVERY'} onChange={() => setForm((f) => ({ ...f, fulfilmentMethod: 'DELIVERY' }))} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Truck size={14} className="text-stone-500" />
                          <span className="text-sm font-semibold text-stone-900">Delivery</span>
                        </div>
                        {settings?.deliveryInstructions && <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{settings.deliveryInstructions}</p>}
                      </div>
                    </label>
                  )}
                  {drop.allowCollection && (
                    <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${form.fulfilmentMethod === 'COLLECTION' ? 'border-stone-900 bg-stone-50' : 'border-stone-200'}`}>
                      <input type="radio" name="fulfilment" value="COLLECTION" checked={form.fulfilmentMethod === 'COLLECTION'} onChange={() => setForm((f) => ({ ...f, fulfilmentMethod: 'COLLECTION' }))} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Store size={14} className="text-stone-500" />
                          <span className="text-sm font-semibold text-stone-900">Collection</span>
                        </div>
                        {settings?.collectionInstructions && <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">{settings.collectionInstructions}</p>}
                      </div>
                    </label>
                  )}
                </div>
                {form.fulfilmentMethod === 'DELIVERY' && (
                  <div className="mt-3">
                    <Textarea
                      label="Delivery Address"
                      required
                      placeholder="14 Oak Street, Claremont, Cape Town, 7708"
                      rows={3}
                      value={form.deliveryAddress}
                      onChange={(e) => setForm((f) => ({ ...f, deliveryAddress: e.target.value }))}
                      error={errors.deliveryAddress}
                    />
                  </div>
                )}
              </div>

              {/* Payment */}
              <div>
                <p className="label-base mb-2">Payment method</p>
                <div className="space-y-2 mb-4">
                  {drop.allowEft && (
                    <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${form.paymentMethod === 'EFT' ? 'border-stone-900 bg-stone-50' : 'border-stone-200'}`}>
                      <input type="radio" name="payment" value="EFT" checked={form.paymentMethod === 'EFT'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'EFT' }))} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-stone-500" />
                          <span className="text-sm font-semibold text-stone-900">EFT / Bank Transfer</span>
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">Upload proof of payment below.</p>
                      </div>
                    </label>
                  )}
                  {drop.allowCash && (
                    <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${form.paymentMethod === 'CASH' ? 'border-stone-900 bg-stone-50' : 'border-stone-200'}`}>
                      <input type="radio" name="payment" value="CASH" checked={form.paymentMethod === 'CASH'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'CASH' }))} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-semibold text-stone-900">Cash on Delivery</span>
                        <p className="text-xs text-stone-400 mt-0.5">Pay when your order arrives.</p>
                      </div>
                    </label>
                  )}
                </div>

                {/* EFT bank details + POP */}
                {form.paymentMethod === 'EFT' && settings && (
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 space-y-4">
                    <div>
                      <p className="text-xs font-extrabold text-stone-400 uppercase tracking-widest mb-3">Bank details</p>
                      <div className="space-y-1.5">
                        {([
                          ['Bank', settings.bankName],
                          ['Account holder', settings.bankAccountHolder],
                          ['Account number', settings.bankAccountNumber],
                          ['Branch code', settings.bankBranchCode],
                          ['Account type', settings.bankAccountType],
                        ] as [string, string | undefined][])
                          .filter(([, v]) => v)
                          .map(([label, value]) => (
                            <div key={label} className="flex justify-between text-sm">
                              <span className="text-stone-400">{label}</span>
                              <span className="font-semibold text-stone-900">{value}</span>
                            </div>
                          ))}
                      </div>
                      {settings.eftInstructions && (
                        <p className="text-xs text-stone-400 mt-3 pt-3 border-t border-stone-200 leading-relaxed">{settings.eftInstructions}</p>
                      )}
                    </div>
                    <FileUpload
                      label="Upload Proof of Payment"
                      accept="image/jpeg,image/jpg,image/png,application/pdf"
                      onChange={setPopFile}
                      value={popFile}
                      hint="JPG, PNG or PDF — max 10MB"
                      error={errors.pop}
                    />
                  </div>
                )}

                {form.paymentMethod === 'CASH' && (
                  <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100">
                    <p className="text-sm text-stone-600 leading-relaxed">Payment will be collected when your order is delivered.</p>
                  </div>
                )}
              </div>

              {/* Order summary */}
              <div className="bg-white rounded-2xl border border-stone-100 px-4 py-4 space-y-2">
                <p className="text-xs font-extrabold text-stone-400 uppercase tracking-widest mb-1">Order summary</p>
                {items.map(({ productId, qty, dp }) => (
                  <div key={productId} className="flex justify-between text-sm">
                    <span className="text-stone-600">{dp.product.name} × {qty} <span className="text-stone-400">{dp.product.sellingUnit}</span></span>
                    <span className="font-semibold text-stone-900">{formatCurrency(Number(dp.price) * qty)}</span>
                  </div>
                ))}
                <div className="border-t border-stone-100 pt-2 flex justify-between font-extrabold text-stone-900">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-stone-900 text-white text-base font-extrabold rounded-full flex items-center justify-between px-6 hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Placing order…' : `Pay ${formatCurrency(total)}`}
                {!submitting && <span className="text-stone-400 font-normal text-sm">{items.length} item{items.length !== 1 ? 's' : ''}</span>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
