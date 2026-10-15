import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Image as ImageIcon, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Product } from '../../types';
import { formatCurrency } from '../../lib/format';
import { ConfirmModal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';

export function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const r = await api.get('/products'); return r.data.products as Product[]; },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      api.patch(`/products/${id}/availability`, { isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => {
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteId(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) return <PageSpinner />;
  const products = data || [];

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Products</h1>
          <p className="text-xs text-stone-400 mt-0.5">{products.length} product{products.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => navigate('/admin/products/new')}
          className="flex items-center gap-1.5 bg-black text-white text-xs font-bold px-4 py-2.5 rounded-full hover:bg-green-600 transition-colors">
          <Plus size={13} /> Add product
        </button>
      </div>

      {/* Empty state */}
      {products.length === 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 px-5 py-10 text-center">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Package size={20} className="text-stone-400" />
          </div>
          <p className="text-sm font-bold text-stone-900 mb-1">No products yet</p>
          <p className="text-xs text-stone-400 mb-5">Add your first product to start selling.</p>
          <button onClick={() => navigate('/admin/products/new')}
            className="bg-black text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-green-600 transition-colors">
            Add product
          </button>
        </div>
      )}

      {/* Product list */}
      {products.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden divide-y divide-stone-100">
          {products.map((product) => (
            <div key={product.id} className="flex items-center gap-3 px-4 py-3.5">
              {/* Image */}
              <div className="w-14 h-14 bg-stone-100 rounded-xl overflow-hidden flex-shrink-0">
                {product.imageUrl
                  ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={18} className="text-stone-400" /></div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-extrabold text-stone-900 truncate">{product.name}</p>
                <p className="text-sm font-bold text-green-600">{formatCurrency(Number(product.price))}<span className="text-xs font-normal text-stone-400"> / {product.sellingUnit}</span></p>
                {product.category && <p className="text-xs text-stone-400">{product.category.name}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Toggle */}
                <button
                  onClick={() => toggleMutation.mutate({ id: product.id, isAvailable: !product.isAvailable })}
                  title={product.isAvailable ? 'Hide from customers' : 'Show to customers'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${product.isAvailable ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}>
                  {product.isAvailable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                {/* Edit */}
                <button onClick={() => navigate(`/admin/products/${product.id}`)}
                  className="w-9 h-9 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl flex items-center justify-center transition-colors">
                  <Edit2 size={15} />
                </button>
                {/* Delete */}
                <button onClick={() => setDeleteId(product.id)}
                  className="w-9 h-9 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl flex items-center justify-center transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete product?" message="This product will be permanently deleted and cannot be recovered."
        confirmText="Delete" confirmVariant="danger" loading={deleteMutation.isPending}
      />
    </div>
  );
}
