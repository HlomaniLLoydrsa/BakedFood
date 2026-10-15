import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Copy, ExternalLink, Edit, X, Download, BarChart3,
  ShoppingBag, Package, DollarSign, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Drop } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/format';
import { Button } from '../../components/ui/Button';
import { DropStatusBadge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/Modal';
import { CountdownTimer } from '../../components/ui/CountdownTimer';
import { PageSpinner } from '../../components/ui/Spinner';

interface DemandItem {
  productId: string;
  productNameSnapshot: string;
  sellingUnitSnapshot: string;
  _sum: { quantity: number | null; subtotal: string | null };
  _count: { orderId: number };
}

export function DropDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const { data: dropData, isLoading } = useQuery({
    queryKey: ['drop', id],
    queryFn: async () => {
      const res = await api.get(`/drops/${id}`);
      return res.data.drop as Drop & { computedStatus: string };
    },
  });

  const { data: demandData } = useQuery({
    queryKey: ['drop-demand', id],
    queryFn: async () => {
      const res = await api.get(`/drops/${id}/demand`);
      return res.data.demand as DemandItem[];
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/drops/${id}/close`),
    onSuccess: () => {
      toast.success('Drop closed');
      queryClient.invalidateQueries({ queryKey: ['drop', id] });
      setShowCloseConfirm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function copyLink() {
    const url = `${window.location.origin}/drop/${dropData!.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  }

  function handleExport() {
    api.get(`/orders/export/${id}`, { responseType: 'blob' }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-${dropData?.slug}.csv`;
      a.click();
    }).catch(() => toast.error('Export failed'));
  }

  if (isLoading) return <PageSpinner />;
  if (!dropData) return null;

  const drop = dropData;
  const computedStatus = drop.computedStatus || drop.status;
  const demand = demandData || [];
  const totalUnits = demand.reduce((s, d) => s + (d._sum.quantity || 0), 0);
  const totalRevenue = demand.reduce((s, d) => s + parseFloat(d._sum.subtotal || '0'), 0);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin/drops')} className="p-2 rounded-lg hover:bg-stone-100 text-stone-600">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <DropStatusBadge status={computedStatus as 'OPEN'} />
          </div>
          <h1 className="page-title">{drop.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={copyLink}>
            <Copy size={14} />
            Copy Link
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.open(`/drop/${drop.slug}`, '_blank')}>
            <ExternalLink size={14} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/admin/drops/${id}/edit`)}>
            <Edit size={14} />
            Edit
          </Button>
          {computedStatus === 'OPEN' && (
            <Button variant="danger" size="sm" onClick={() => setShowCloseConfirm(true)}>
              <X size={14} />
              Close Drop
            </Button>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-100 shadow-soft p-4">
          <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><Clock size={12} />Opens</p>
          <p className="text-sm font-semibold text-stone-900">{formatDateTime(drop.opensAt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-100 shadow-soft p-4">
          <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><Clock size={12} />Closes</p>
          <p className="text-sm font-semibold text-stone-900">{formatDateTime(drop.closesAt)}</p>
          {computedStatus === 'OPEN' && (
            <div className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
              In <CountdownTimer targetDate={drop.closesAt} className="text-emerald-700" />
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-stone-100 shadow-soft p-4">
          <p className="text-xs text-stone-500 mb-1">Drop Link</p>
          <p className="text-sm font-mono text-stone-600 truncate">droply/{drop.slug}</p>
        </div>
      </div>

      {/* Demand Summary */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-soft mb-6">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-stone-500" />
            <h2 className="section-title">Product Demand</h2>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-stone-100 border-b border-stone-100">
          {[
            { label: 'Total Orders', value: drop._count?.orders || 0, icon: ShoppingBag },
            { label: 'Total Units', value: totalUnits, icon: Package },
            { label: 'Revenue', value: formatCurrency(totalRevenue), icon: DollarSign },
          ].map((s) => (
            <div key={s.label} className="px-6 py-4">
              <p className="text-xs text-stone-500 mb-1 flex items-center gap-1"><s.icon size={12} />{s.label}</p>
              <p className="text-xl font-bold text-stone-900">{s.value}</p>
            </div>
          ))}
        </div>

        {demand.length > 0 ? (
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {demand.map((item) => (
                <div key={item.productId} className="bg-stone-50 rounded-xl p-4">
                  <p className="text-xs text-stone-500 mb-1 truncate">{item.productNameSnapshot}</p>
                  <p className="text-2xl font-bold text-stone-900">{item._sum.quantity || 0}</p>
                  <p className="text-xs text-stone-400">× {item.sellingUnitSnapshot}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-stone-400">No orders yet.</div>
        )}
      </div>

      {/* Products in drop */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-soft mb-6">
        <div className="px-6 py-4 border-b border-stone-100">
          <h2 className="section-title">Products in Drop</h2>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {drop.dropProducts.map((dp) => (
            <div key={dp.id} className="flex items-center gap-3 p-3 rounded-xl border border-stone-100">
              {dp.product.imageUrl ? (
                <img src={dp.product.imageUrl} alt={dp.product.name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center">
                  <Package size={14} className="text-stone-400" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">{dp.product.name}</p>
                <p className="text-xs text-stone-400">{formatCurrency(Number(dp.price))} / {dp.product.sellingUnit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* View Orders CTA */}
      <div className="flex gap-3">
        <Button onClick={() => navigate(`/admin/orders?dropId=${id}`)}>
          <ShoppingBag size={16} />
          View Orders
        </Button>
      </div>

      <ConfirmModal
        isOpen={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={() => closeMutation.mutate()}
        title="Close Campaign"
        message="Are you sure you want to close this campaign? Customers will no longer be able to place orders."
        confirmText="Close Campaign"
        confirmVariant="danger"
        loading={closeMutation.isPending}
      />
    </div>
  );
}
