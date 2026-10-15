import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Package, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Product, Drop } from '../../types';
import { formatCurrency } from '../../lib/format';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';

function toDatetimeLocal(dateStr: string): string {
  try {
    return format(new Date(dateStr), "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

export function DropFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '',
    description: '',
    opensAt: '',
    closesAt: '',
    allowDelivery: true,
    allowCollection: true,
    allowEft: true,
    allowCash: true,
  });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await api.get('/products');
      return res.data.products as Product[];
    },
  });

  const { data: dropData, isLoading: dropLoading } = useQuery({
    queryKey: ['drop', id],
    queryFn: async () => {
      const res = await api.get(`/drops/${id}`);
      return res.data.drop as Drop;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (dropData) {
      setForm({
        name: dropData.name,
        description: dropData.description || '',
        opensAt: toDatetimeLocal(dropData.opensAt),
        closesAt: toDatetimeLocal(dropData.closesAt),
        allowDelivery: dropData.allowDelivery,
        allowCollection: dropData.allowCollection,
        allowEft: dropData.allowEft,
        allowCash: dropData.allowCash,
      });
      setSelectedProductIds(dropData.dropProducts.map((dp) => dp.productId));
    }
  }, [dropData]);

  const mutation = useMutation({
    mutationFn: async (payload: object) => {
      if (isEdit) {
        return api.put(`/drops/${id}`, payload);
      }
      return api.post('/drops', payload);
    },
    onSuccess: (res) => {
      toast.success(isEdit ? 'Drop updated' : 'Drop created');
      queryClient.invalidateQueries({ queryKey: ['Campaigns'] });
      navigate(`/admin/drops/${res.data.drop.id}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  }

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Drop name is required';
    if (!form.opensAt) errs.opensAt = 'Opening date/time is required';
    if (!form.closesAt) errs.closesAt = 'Closing date/time is required';
    if (form.opensAt && form.closesAt && new Date(form.closesAt) <= new Date(form.opensAt))
      errs.closesAt = 'Closing time must be after opening time';
    if (selectedProductIds.length === 0) errs.products = 'Select at least one product';
    if (!form.allowDelivery && !form.allowCollection) errs.fulfilment = 'Enable at least one fulfilment option';
    if (!form.allowEft && !form.allowCash) errs.payment = 'Enable at least one payment option';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    mutation.mutate({
      ...form,
      opensAt: new Date(form.opensAt).toISOString(),
      closesAt: new Date(form.closesAt).toISOString(),
      productIds: selectedProductIds,
    });
  }

  const products = productsData || [];

  if (isEdit && dropLoading) return <PageSpinner />;

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate('/admin/drops')} className="p-2 rounded-lg hover:bg-stone-100 text-stone-600">
          <ArrowLeft size={18} />
        </button>
        <h1 className="page-title">{isEdit ? 'Edit Campaign' : 'Create Campaign'}</h1>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} noValidate>
          {/* Drop Info */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-soft p-6 space-y-5 mb-4">
            <h2 className="section-title border-b border-stone-100 pb-3">Drop Information</h2>
            <Input
              label="Drop Name"
              required
              placeholder="Weekend Food Drop"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              error={errors.name}
            />
            <Textarea
              label="Description"
              placeholder="Describe what's available in this drop..."
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Order Window */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-soft p-6 space-y-5 mb-4">
            <h2 className="section-title border-b border-stone-100 pb-3">Order Window</h2>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Opens At"
                required
                type="datetime-local"
                value={form.opensAt}
                onChange={(e) => setForm((f) => ({ ...f, opensAt: e.target.value }))}
                error={errors.opensAt}
              />
              <Input
                label="Closes At"
                required
                type="datetime-local"
                value={form.closesAt}
                onChange={(e) => setForm((f) => ({ ...f, closesAt: e.target.value }))}
                error={errors.closesAt}
              />
            </div>
          </div>

          {/* Products */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-soft p-6 mb-4">
            <h2 className="section-title border-b border-stone-100 pb-3 mb-4">Products</h2>
            {errors.products && <p className="text-xs text-red-600 mb-3">{errors.products}</p>}
            {products.length === 0 ? (
              <div className="text-center py-6 text-stone-400">
                <Package size={24} className="mx-auto mb-2" />
                <p className="text-sm">No products yet. Create some first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <label
                    key={product.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      selectedProductIds.includes(product.id)
                        ? 'border-stone-900 bg-stone-50'
                        : 'border-stone-100 hover:border-stone-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="w-4 h-4"
                    />
                    <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={14} className="text-stone-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-stone-900">{product.name}</p>
                      <p className="text-xs text-stone-400">{formatCurrency(Number(product.price))} / {product.sellingUnit}</p>
                    </div>
                    {!product.isAvailable && (
                      <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">Unavailable</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-soft p-6 space-y-5 mb-4">
            <h2 className="section-title border-b border-stone-100 pb-3">Options</h2>

            <div>
              <p className="label-base mb-2">Fulfilment</p>
              {errors.fulfilment && <p className="text-xs text-red-600 mb-2">{errors.fulfilment}</p>}
              <div className="flex gap-4">
                {[
                  { key: 'allowDelivery', label: 'Delivery' },
                  { key: 'allowCollection', label: 'Collection' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[key as keyof typeof form] as boolean}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium text-stone-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="label-base mb-2">Payment Methods</p>
              {errors.payment && <p className="text-xs text-red-600 mb-2">{errors.payment}</p>}
              <div className="flex gap-4">
                {[
                  { key: 'allowEft', label: 'EFT / Bank Transfer' },
                  { key: 'allowCash', label: 'Cash on Delivery' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form[key as keyof typeof form] as boolean}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm font-medium text-stone-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/drops')}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Save Changes' : 'Create Campaign'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
