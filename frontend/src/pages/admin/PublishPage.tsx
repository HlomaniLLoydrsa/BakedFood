import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Copy, ExternalLink, Clock, CheckCircle, XCircle, ShoppingBag, Users } from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { CountdownTimer } from '../../components/ui/CountdownTimer';
import { PageSpinner } from '../../components/ui/Spinner';

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  opensAt: string;
  closesAt: string;
  isOpen: boolean;
  totalOrders: number;
  status: string;
}

function toLocal(d: string) {
  try { return format(new Date(d), "yyyy-MM-dd'T'HH:mm"); } catch { return ''; }
}

export function PublishPage() {
  const queryClient = useQueryClient();

  // ── Fetch store ────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['store'],
    queryFn: async () => {
      const r = await api.get('/store');
      return r.data.store as Store;
    },
    refetchInterval: 30_000,
  });

  // ── Local form state ───────────────────────────────────────────────
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');
  const [opensAt, setOpensAt]     = useState('');
  const [closesAt, setClosesAt]   = useState('');
  const [dirty, setDirty]         = useState(false);

  // Populate form when data loads
  useEffect(() => {
    if (data && !dirty) {
      setName(data.name);
      setDesc(data.description || '');
      setOpensAt(toLocal(data.opensAt));
      setClosesAt(toLocal(data.closesAt));
    }
  }, [data, dirty]);

  // ── Save mutation ──────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: object) => api.put('/store', payload),
    onSuccess: (res) => {
      toast.success('Saved');
      setDirty(false);
      queryClient.setQueryData(['store'], res.data.store);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // ── Open/close toggle mutation ─────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: (isOpen: boolean) => api.put('/store', {
      isOpen,
      name,
      description,
      opensAt:  new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
    }),
    onSuccess: (res) => {
      const s = res.data.store as Store;
      queryClient.setQueryData(['store'], s);
      toast.success(s.isOpen ? '🟢 Store is now OPEN — share your link!' : '🔴 Store closed');
      setDirty(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!opensAt || !closesAt) { toast.error('Set opening and closing times'); return; }
    if (new Date(closesAt) <= new Date(opensAt)) { toast.error('Closing time must be after opening time'); return; }
    saveMutation.mutate({
      name,
      description,
      opensAt:  new Date(opensAt).toISOString(),
      closesAt: new Date(closesAt).toISOString(),
    });
  }

  function copyLink() {
    if (!data) return;
    navigator.clipboard.writeText(`${window.location.origin}/drop/${data.slug}`);
    toast.success('Link copied!');
  }

  if (isLoading) return <PageSpinner />;
  if (!data) return null;

  const store = data;
  const shareUrl = `${window.location.origin}/drop/${store.slug}`;

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-extrabold text-stone-900">Publish</h1>
        <p className="text-xs text-stone-400 mt-0.5">Manage your store and order window</p>
      </div>

      {/* ── Store status card ───────────────────────────────────────── */}
      <div className={`rounded-2xl overflow-hidden ${store.isOpen ? 'bg-black' : 'bg-white border border-stone-100'}`}>
        {store.isOpen ? (
          /* OPEN state */
          <div className="px-5 py-5 relative" style={{ background: 'linear-gradient(135deg, #000 0%, #0d2b1a 100%)' }}>
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 80% 30%, #16a34a 0%, transparent 55%)' }} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-green-300 bg-green-500/20 border border-green-500/30 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Store is OPEN
                </span>
                <button
                  onClick={() => toggleMutation.mutate(false)}
                  disabled={toggleMutation.isPending}
                  className="text-xs font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-full hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  Close store
                </button>
              </div>
              <h2 className="text-lg font-extrabold text-white mb-1">{store.name}</h2>
              <div className="flex items-center gap-2 text-xs text-white/50 mb-4">
                <Clock size={12} />
                <span>Closes in</span>
                <CountdownTimer targetDate={store.closesAt} className="font-extrabold text-white" />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={14} className="text-green-400" />
                  <span className="text-white font-extrabold">{store.totalOrders}</span>
                  <span className="text-white/40 text-xs">orders</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* CLOSED state */
          <div className="px-5 py-5">
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                <XCircle size={12} />
                Store is CLOSED
              </span>
              <span className="text-xs text-stone-400">{store.totalOrders} orders total</span>
            </div>
            <p className="text-sm text-stone-500 mt-2">
              Set your open and close time below, then tap <strong className="text-stone-900">Open Store</strong>.
            </p>
          </div>
        )}
      </div>

      {/* ── Share link ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-100 px-4 py-4">
        <p className="text-xs font-extrabold text-stone-500 uppercase tracking-widest mb-3">Your order link</p>
        <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 mb-3">
          <p className="text-xs text-stone-600 font-mono flex-1 truncate">{shareUrl}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 bg-black text-white text-xs font-bold py-2.5 rounded-xl hover:bg-green-600 transition-colors">
            <Copy size={13} /> Copy link
          </button>
          <button onClick={() => window.open(`/drop/${store.slug}`, '_blank')}
            className="flex-1 flex items-center justify-center gap-2 bg-stone-100 text-stone-700 text-xs font-bold py-2.5 rounded-xl hover:bg-stone-200 transition-colors">
            <ExternalLink size={13} /> Preview
          </button>
        </div>
        <p className="text-[11px] text-stone-400 mt-2 text-center">
          Share this link on WhatsApp, Instagram or Facebook
        </p>
      </div>

      {/* ── Edit form ────────────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
          <p className="text-xs font-extrabold text-stone-700">Store settings</p>
        </div>

        <div className="p-4 space-y-4">

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1.5">
              Title <span className="text-stone-400 font-normal">— shown to customers</span>
            </label>
            <input
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              placeholder="e.g. Weekend Special, Friday Drop…"
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1.5">
              Description <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
              placeholder="Tell customers what's available this time…"
              rows={2}
              value={description}
              onChange={(e) => { setDesc(e.target.value); setDirty(true); }}
            />
          </div>

          {/* Time window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1.5">Orders open</label>
              <input
                type="datetime-local"
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                value={opensAt}
                onChange={(e) => { setOpensAt(e.target.value); setDirty(true); }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-600 block mb-1.5">Orders close</label>
              <input
                type="datetime-local"
                min={opensAt || new Date().toISOString().slice(0, 16)}
                className="w-full px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                value={closesAt}
                onChange={(e) => { setClosesAt(e.target.value); setDirty(true); }}
              />
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="w-full py-3 bg-stone-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* ── Open/Close store ────────────────────────────────────────── */}
      {!store.isOpen && (
        <button
          onClick={() => {
            if (!opensAt || !closesAt) { toast.error('Set opening and closing times first'); return; }
            if (new Date(closesAt) <= new Date(opensAt)) { toast.error('Closing time must be after opening time'); return; }
            toggleMutation.mutate(true);
          }}
          disabled={toggleMutation.isPending}
          className="w-full py-4 bg-green-500 text-white font-extrabold text-base rounded-2xl hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
        >
          <CheckCircle size={20} />
          {toggleMutation.isPending ? 'Opening…' : 'Open Store'}
        </button>
      )}

      {/* Info */}
      <div className="bg-stone-50 border border-stone-100 rounded-2xl px-4 py-4">
        <p className="text-xs font-extrabold text-stone-700 mb-2">How this works</p>
        <div className="space-y-1.5">
          {[
            'All products with "Show to customers" ON are automatically included.',
            'Customers place orders via your link during the open window.',
            'Close the store when done — orders stop immediately.',
            'You can re-open it any time by changing the time and clicking Open Store.',
          ].map((tip) => (
            <div key={tip} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-green-500 flex-shrink-0 mt-1.5" />
              <p className="text-xs text-stone-500 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// Keep these exports so existing imports don't break
export { PublishPage as PublishListPage, PublishPage as PublishFormPage };
