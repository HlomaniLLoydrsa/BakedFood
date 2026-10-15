import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, Eye, Edit2, Trash2, X, ExternalLink, Zap, Clock, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Drop } from '../../types';
import { formatDateTime } from '../../lib/format';
import { DropStatusBadge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';

export function DropsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [closingId, setClosingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['Campaigns'],
    queryFn: async () => {
      const res = await api.get('/drops');
      return res.data.drops as (Drop & { computedStatus: string })[];
    },
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/drops/${id}/close`),
    onSuccess: () => {
      toast.success('Drop closed');
      queryClient.invalidateQueries({ queryKey: ['Campaigns'] });
      setClosingId(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/drops/${id}/duplicate`),
    onSuccess: (res) => {
      toast.success('Drop duplicated');
      queryClient.invalidateQueries({ queryKey: ['Campaigns'] });
      navigate(`/admin/drops/${res.data.drop.id}/edit`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/drops/${id}`),
    onSuccess: () => {
      toast.success('Drop deleted');
      queryClient.invalidateQueries({ queryKey: ['Campaigns'] });
      setDeletingId(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/drop/${slug}`);
    toast.success('Link copied');
  }

  if (isLoading) return <PageSpinner />;

  const drops = data || [];
  const openDrops = drops.filter((d) => d.computedStatus === 'OPEN');
  const otherDrops = drops.filter((d) => d.computedStatus !== 'OPEN');

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">Drops</h1>
          <p className="text-xs text-stone-400 mt-0.5">{drops.length} drop{drops.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => navigate('/admin/drops/new')}
          className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-green-600 transition-colors"
        >
          <Plus size={13} /> Create Campaign
        </button>
      </div>

      {/* Empty */}
      {drops.length === 0 && (
        <div className="bg-black rounded-3xl p-10 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #16a34a 0%, transparent 60%)' }} />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Zap size={20} className="text-green-400" />
            </div>
            <h3 className="font-bold text-white mb-1">No campaigns yet</h3>
            <p className="text-xs text-white/40 mb-5">Create your first campaign to start collecting orders.</p>
            <button
              onClick={() => navigate('/admin/drops/new')}
              className="bg-green-500 text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-green-400 transition-colors"
            >
              Create Campaign
            </button>
          </div>
        </div>
      )}

      {/* Open drops */}
      {openDrops.length > 0 && (
        <div>
          <p className="text-2xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Open now</p>
          <div className="space-y-3">
            {openDrops.map((drop) => (
              <DropCard
                key={drop.id}
                drop={drop}
                onView={() => navigate(`/admin/drops/${drop.id}`)}
                onEdit={() => navigate(`/admin/drops/${drop.id}/edit`)}
                onCopy={() => copyLink(drop.slug)}
                onOpen={() => window.open(`/drop/${drop.slug}`, '_blank')}
                onClose={() => setClosingId(drop.id)}
                onDuplicate={() => duplicateMutation.mutate(drop.id)}
                onDelete={() => setDeletingId(drop.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other drops */}
      {otherDrops.length > 0 && (
        <div>
          {openDrops.length > 0 && (
            <p className="text-2xs font-bold text-stone-400 uppercase tracking-widest mb-2 px-1">Scheduled & past</p>
          )}
          <div className="space-y-3">
            {otherDrops.map((drop) => (
              <DropCard
                key={drop.id}
                drop={drop}
                onView={() => navigate(`/admin/drops/${drop.id}`)}
                onEdit={() => navigate(`/admin/drops/${drop.id}/edit`)}
                onCopy={() => copyLink(drop.slug)}
                onOpen={() => window.open(`/drop/${drop.slug}`, '_blank')}
                onClose={() => setClosingId(drop.id)}
                onDuplicate={() => duplicateMutation.mutate(drop.id)}
                onDelete={() => setDeletingId(drop.id)}
              />
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!closingId}
        onClose={() => setClosingId(null)}
        onConfirm={() => closingId && closeMutation.mutate(closingId)}
        title="Close Campaign"
        message="Are you sure you want to close this campaign? Customers will no longer be able to place orders."
        confirmText="Close Campaign"
        confirmVariant="danger"
        loading={closeMutation.isPending}
      />
      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Delete Drop"
        message="Are you sure you want to delete this drop? This cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

// ─── Individual drop card ─────────────────────────────────────────────────

function DropCard({
  drop, onView, onEdit, onCopy, onOpen, onClose, onDuplicate, onDelete,
}: {
  drop: Drop & { computedStatus: string };
  onView: () => void; onEdit: () => void; onCopy: () => void;
  onOpen: () => void; onClose: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const isOpen = drop.computedStatus === 'OPEN';

  return (
    <div className={`rounded-2xl border bg-white overflow-hidden ${isOpen ? 'border-green-200 ring-1 ring-green-100' : 'border-stone-100'}`}>
      {/* Top: status + name + arrow */}
      <div
        className="px-4 py-4 flex items-start justify-between gap-3 cursor-pointer"
        onClick={onView}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <DropStatusBadge status={drop.computedStatus as 'OPEN'} />
          </div>
          <h2 className="text-sm font-extrabold text-stone-900 leading-snug truncate">{drop.name}</h2>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            <span className="text-2xs text-stone-400 flex items-center gap-1">
              <Clock size={10} /> {formatDateTime(drop.opensAt)}
            </span>
            <span className="text-2xs text-stone-400">→ {formatDateTime(drop.closesAt)}</span>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-2xs font-bold text-stone-600">
              {drop._count?.orders || 0} order{(drop._count?.orders || 0) !== 1 ? 's' : ''}
            </span>
            {drop.dropProducts?.length > 0 && (
              <span className="text-2xs text-stone-400">
                {drop.dropProducts.length} product{drop.dropProducts.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <ChevronRight size={16} className="text-stone-300 flex-shrink-0 mt-1" />
      </div>

      {/* Bottom: action row */}
      <div className="px-3 pb-3 flex items-center gap-1.5 border-t border-stone-50 pt-2.5">
        <button onClick={onCopy} className="flex-1 flex items-center justify-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-2xs font-bold py-2 rounded-xl transition-colors">
          <Copy size={11} /> Copy link
        </button>
        <button onClick={onOpen} className="flex-1 flex items-center justify-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 text-2xs font-bold py-2 rounded-xl transition-colors">
          <ExternalLink size={11} /> Preview
        </button>
        <button onClick={onEdit} className="flex items-center justify-center w-8 h-8 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors">
          <Edit2 size={13} />
        </button>
        <button onClick={onDuplicate} className="flex items-center justify-center w-8 h-8 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors" title="Duplicate">
          <Copy size={13} />
        </button>
        {isOpen && (
          <button onClick={onClose} className="flex items-center justify-center w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors">
            <X size={13} />
          </button>
        )}
        <button onClick={onDelete} className="flex items-center justify-center w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
