import { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package, Zap, ChevronDown, MessageCircle, Search, Clock } from 'lucide-react';
import api from '../../lib/api';
import { Settings } from '../../types';
import { formatCurrency } from '../../lib/format';
import { CountdownTimer } from '../../components/ui/CountdownTimer';

// ─── Types ────────────────────────────────────────────────────────────────
interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  description: string;
  isOpen: boolean;
  opensAt: string;
  closesAt: string;
  computedStatus: string;
  dropProducts: Array<{
    productId: string;
    price: number;
    isSoldOut: boolean;
    product: {
      id: string;
      name: string;
      description?: string;
      imageUrl?: string;
      sellingUnit: string;
      isAvailable: boolean;
      category?: { name: string };
    };
  }>;
}

// ─── Video hero ───────────────────────────────────────────────────────────
function VideoHero({ businessName, storeOpen, storeSlug, closesAt }: {
  businessName?: string;
  storeOpen: boolean;
  storeSlug?: string;
  closesAt?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);

  const VIDEO_SRC = '/video/background.mp4';

  return (
    <section className="relative w-full overflow-hidden" style={{ height: '100svh', minHeight: 580 }}>
      {/* Video */}
      <video ref={videoRef} src={VIDEO_SRC}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay loop muted playsInline />

      {/* Fallback gradient */}
      <div className="absolute inset-0 bg-black" style={{ display: 'none' }} />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 h-full flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-5 pt-6 pb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/10 border border-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Zap size={14} className="text-green-400" />
            </div>
            <span className="text-white font-bold tracking-tight">{businessName || 'Droply'}</span>
          </div>
          <Link to="/admin"
            className="text-xs font-semibold text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30">
            Admin
          </Link>
        </nav>

        {/* Hero text */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">

          {/* Status pill */}
          {storeOpen ? (
            <div className="flex items-center gap-2 bg-green-500/15 border border-green-500/25 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 text-xs font-bold uppercase tracking-widest">Orders open now</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Coming soon</span>
            </div>
          )}

          <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-[1.0] tracking-tight mb-5 max-w-sm">
            Fresh.<br />
            <span className="text-green-400">Limited.</span><br />
            Real.
          </h1>

          <p className="text-white/50 text-sm leading-relaxed mb-4 max-w-xs">
            Browse what's available, pick your quantity and place your order — no account needed.
          </p>

          {/* Countdown if store is open */}
          {storeOpen && closesAt && (
            <div className="flex items-center gap-2 text-white/50 text-xs mb-8">
              <Clock size={12} />
              <span>Orders close in</span>
              <CountdownTimer targetDate={closesAt} className="font-extrabold text-white" />
            </div>
          )}
          {!storeOpen && <div className="mb-8" />}

          {/* CTA buttons */}
          <div className="flex flex-col items-center gap-3">
            {storeOpen && storeSlug ? (
              <Link to={`/drop/${storeSlug}`}
                className="group inline-flex items-center gap-3 bg-green-500 text-white text-sm font-bold px-7 py-3.5 rounded-full hover:bg-green-400 transition-colors shadow-lg shadow-green-500/25">
                Order now
                <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowRight size={14} />
                </span>
              </Link>
            ) : (
              <a href="#products"
                className="group inline-flex items-center gap-3 bg-white/15 border border-white/20 text-white text-sm font-bold px-7 py-3.5 rounded-full hover:bg-white/20 transition-colors backdrop-blur-sm">
                See our products
                <span className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                  <ChevronDown size={14} />
                </span>
              </a>
            )}

            {/* Track order — always visible in hero */}
            <Link to="/track"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white text-xs font-semibold transition-colors">
              <Search size={13} />
              Track an existing order
            </Link>
          </div>
        </div>

        {/* Scroll nudge */}
        <div className="flex justify-center pb-6">
          <ChevronDown size={20} className="text-white/20 animate-bounce" />
        </div>
      </div>
    </section>
  );
}

// ─── Products section ─────────────────────────────────────────────────────
function ProductsSection({ store, isLoading }: {
  store?: StoreInfo;
  isLoading: boolean;
}) {
  const products = store?.dropProducts ?? [];
  const availableProducts = products.filter((dp) => dp.product.isAvailable);
  const storeOpen = store?.computedStatus === 'OPEN';

  return (
    <section id="products" className="bg-white py-10 px-4">
      <div className="max-w-lg mx-auto">

        {/* Section header */}
        <div className="mb-6">
          <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">What we offer</p>
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-2xl font-extrabold text-black tracking-tight">
              {store?.name || 'Our Products'}
            </h2>
            {storeOpen && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Open now
              </span>
            )}
          </div>
          {store?.description && (
            <p className="text-sm text-stone-500 mt-1 leading-relaxed">{store.description}</p>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-stone-100 animate-pulse">
                <div className="bg-stone-100 aspect-square" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-stone-100 rounded-full w-3/4" />
                  <div className="h-4 bg-stone-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No products */}
        {!isLoading && availableProducts.length === 0 && (
          <div className="rounded-3xl bg-black py-16 px-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #16a34a 0%, transparent 60%)' }} />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Zap size={20} className="text-green-400" />
              </div>
              <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-2">Stay tuned</p>
              <h3 className="text-lg font-bold text-white mb-1">Products coming soon</h3>
              <p className="text-white/30 text-sm">Follow us to be the first to know.</p>
            </div>
          </div>
        )}

        {/* Product grid */}
        {!isLoading && availableProducts.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {availableProducts.map((dp) => (
                <div key={dp.productId}
                  className={`rounded-2xl overflow-hidden border bg-white transition-all ${
                    storeOpen && !dp.isSoldOut
                      ? 'border-stone-100 hover:border-green-300 hover:shadow-card cursor-pointer'
                      : 'border-stone-100 opacity-80'
                  }`}
                  onClick={() => storeOpen && store?.slug && !dp.isSoldOut && (window.location.href = `/drop/${store.slug}`)}
                >
                  {/* Image */}
                  <div className="aspect-square bg-stone-50 overflow-hidden relative">
                    {dp.product.imageUrl ? (
                      <img src={dp.product.imageUrl} alt={dp.product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={28} className="text-stone-300" />
                      </div>
                    )}
                    {dp.isSoldOut && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">Sold out</span>
                      </div>
                    )}
                    {storeOpen && !dp.isSoldOut && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <ArrowRight size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-xs font-bold text-stone-900 leading-snug mb-0.5 truncate">{dp.product.name}</p>
                    {dp.product.category && (
                      <p className="text-[10px] text-stone-400 mb-1">{dp.product.category.name}</p>
                    )}
                    <p className="text-sm font-extrabold text-black">
                      {formatCurrency(dp.price)}
                      <span className="text-[10px] font-normal text-stone-400"> /{dp.product.sellingUnit}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Main CTA */}
            {storeOpen && store?.slug ? (
              <Link to={`/drop/${store.slug}`}
                className="w-full flex items-center justify-between bg-black text-white text-sm font-bold px-6 py-4 rounded-full hover:bg-green-600 transition-colors group">
                Place your order
                <span className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <ArrowRight size={15} />
                </span>
              </Link>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 bg-stone-100 text-stone-400 text-sm font-semibold px-6 py-4 rounded-full">
                <Clock size={14} />
                Orders not open yet — check back soon
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ─── Reviews section ──────────────────────────────────────────────────────
function ReviewsSection() {
  const { data } = useQuery({
    queryKey: ['reviews'],
    queryFn: async () => {
      const r = await api.get('/reviews');
      return r.data.reviews as Array<{
        id: string; customerName: string; rating: number; message: string; createdAt: string;
      }>;
    },
  });

  const reviews = data || [];
  if (reviews.length === 0) return null;

  return (
    <section className="bg-white py-10 px-4">
      <div className="max-w-lg mx-auto">
        <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2">What customers say</p>
        <h2 className="text-2xl font-extrabold text-black mb-6 tracking-tight">Reviews</h2>
        <div className="space-y-3">
          {reviews.slice(0, 3).map((r) => (
            <div key={r.id} className="bg-stone-50 rounded-2xl border border-stone-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-stone-900">{r.customerName}</p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < r.rating ? '#fbbf24' : '#e5e7eb'}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">"{r.message}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────
function HowItWorks() {
  return (
    <section className="bg-black py-12 px-4">
      <div className="max-w-lg mx-auto">
        <p className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Simple process</p>
        <h2 className="text-2xl font-extrabold text-white mb-8 tracking-tight">How it works</h2>
        <div className="space-y-0">
          {[
            { n: '01', t: 'Browse products', d: 'See what\'s available with prices and details.' },
            { n: '02', t: 'Place your order', d: 'Select quantity, enter your details, choose delivery or collection.' },
            { n: '03', t: 'Pay',             d: 'EFT or cash on delivery — no account needed.' },
            { n: '04', t: 'We prepare',      d: 'We prepare your order and contact you via WhatsApp.' },
          ].map((s, i) => (
            <div key={s.n} className={`flex gap-5 py-5 ${i < 3 ? 'border-b border-white/5' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-extrabold text-green-400">{s.n}</span>
              </div>
              <div className="pt-1">
                <p className="text-sm font-bold text-white mb-0.5">{s.t}</p>
                <p className="text-xs text-white/40 leading-relaxed">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────
function Footer({ settings }: { settings?: Settings }) {
  return (
    <footer className="bg-black border-t border-white/5 px-4 py-8">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
            <Zap size={14} className="text-green-400" />
          </div>
          <span className="font-bold text-white tracking-tight">{settings?.businessName || 'Droply'}</span>
        </div>

        {(settings?.businessWhatsapp || settings?.businessEmail) && (
          <div className="flex flex-wrap gap-3 mb-6">
            {settings?.businessWhatsapp && (
              <a href={`https://wa.me/${settings.businessWhatsapp.replace(/[^0-9]/g, '')}`}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">
                <MessageCircle size={13} className="text-green-400" />
                WhatsApp
              </a>
            )}
            {settings?.businessEmail && (
              <a href={`mailto:${settings.businessEmail}`}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold px-4 py-2 rounded-full transition-colors">
                {settings.businessEmail}
              </a>
            )}
          </div>
        )}

        <div className="border-t border-white/5 pt-5 flex items-center justify-between">
          <Link to="/track"
            className="flex items-center gap-2 text-xs font-semibold text-white/30 hover:text-white transition-colors">
            <Search size={12} className="text-green-400" />
            Track my order
          </Link>
          <p className="text-xs text-white/20">Powered by Droply</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export function LandingPage() {
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => { const r = await api.get('/settings'); return r.data.settings as Settings; },
  });

  // Pull from the persistent store — auto-syncs available products
  const { data: storeData, isLoading } = useQuery({
    queryKey: ['store-public'],
    queryFn: async () => {
      const r = await api.get('/store/public');
      return r.data.drop as StoreInfo;
    },
    refetchInterval: 60_000,
  });

  const storeOpen = storeData?.computedStatus === 'OPEN';

  return (
    <div className="min-h-screen bg-black">
      <VideoHero
        businessName={settings?.businessName}
        storeOpen={storeOpen}
        storeSlug={storeData?.slug}
        closesAt={storeData?.closesAt}
      />
      <ProductsSection store={storeData} isLoading={isLoading} />
      <ReviewsSection />
      <HowItWorks />
      <Footer settings={settings} />
    </div>
  );
}
