import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Package, Tag, DollarSign, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Product, Category } from '../../types';
import { FileUpload } from '../../components/ui/FileUpload';
import { PageSpinner } from '../../components/ui/Spinner';

const SELLING_UNITS = [
  'Each', 'Box', 'Pack', 'Portion', 'Tray', 'Bottle',
  '100g', '200g', '250g', '500g', '1kg',
];

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    price: '',
    sellingUnit: '',
    customUnit: '',
    useCustomUnit: false,
    maxQuantity: '',
    isAvailable: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.categories as Category[];
    },
  });

  const { data: productData, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data.product as Product;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (productData) {
      const knownUnit = SELLING_UNITS.map((u) => u.toLowerCase()).includes(productData.sellingUnit.toLowerCase());
      setForm({
        name: productData.name,
        description: productData.description || '',
        categoryId: productData.categoryId || '',
        price: String(productData.price),
        sellingUnit: knownUnit ? productData.sellingUnit : '',
        customUnit: knownUnit ? '' : productData.sellingUnit,
        useCustomUnit: !knownUnit,
        maxQuantity: productData.maxQuantity ? String(productData.maxQuantity) : '',
        isAvailable: productData.isAvailable,
      });
    }
  }, [productData]);

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => {
      if (isEdit) return api.put(`/products/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/admin/products');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const finalUnit = form.useCustomUnit ? form.customUnit.trim() : form.sellingUnit;

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Product name is required';
    if (!form.price || isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) errs.price = 'Enter a valid price';
    if (!finalUnit) errs.unit = 'Select or type a selling unit';
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('description', form.description.trim());
    fd.append('price', form.price);
    fd.append('sellingUnit', finalUnit);
    fd.append('isAvailable', String(form.isAvailable));
    if (form.categoryId) fd.append('categoryId', form.categoryId);
    if (form.maxQuantity) fd.append('maxQuantity', form.maxQuantity);
    if (imageFile) fd.append('image', imageFile);
    mutation.mutate(fd);
  }

  if (isEdit && productLoading) return <PageSpinner />;

  const categories = categoriesData || [];

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/products')}
          className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-full flex items-center justify-center text-stone-600 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">{isEdit ? 'Edit Product' : 'New Product'}</h1>
          <p className="text-xs text-stone-400">Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-3">

        {/* Image */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-amber-50 rounded-lg flex items-center justify-center">
              <Package size={13} className="text-amber-600" />
            </div>
            <p className="text-xs font-bold text-stone-700">Product Photo</p>
          </div>
          <FileUpload
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={setImageFile}
            value={imageFile}
            currentUrl={productData?.imageUrl}
            hint="JPG, PNG or WEBP — max 10MB"
          />
        </div>

        {/* Name & Description */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
              <Tag size={13} className="text-blue-600" />
            </div>
            <p className="text-xs font-bold text-stone-700">Product Info</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1.5">Product Name <span className="text-red-400">*</span></label>
            <input
              className={`w-full px-4 py-3 bg-stone-50 border rounded-xl text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all ${errors.name ? 'border-red-300 ring-1 ring-red-300' : 'border-stone-200'}`}
              placeholder="e.g. Chocolate Muffin"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1.5">Description <span className="text-stone-400">(optional)</span></label>
            <textarea
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
              placeholder="Tell customers what makes this product special..."
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
        </div>

        {/* Price & Unit */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-green-50 rounded-lg flex items-center justify-center">
              <DollarSign size={13} className="text-green-600" />
            </div>
            <p className="text-xs font-bold text-stone-700">Pricing</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1.5">Price (R) <span className="text-red-400">*</span></label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={`w-full px-4 py-3 bg-stone-50 border rounded-xl text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all ${errors.price ? 'border-red-300 ring-1 ring-red-300' : 'border-stone-200'}`}
              placeholder="0.00"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            />
            {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1.5">
              Selling Unit <span className="text-red-400">*</span>
              <span className="text-stone-400 font-normal ml-1">— what are you selling per unit?</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {SELLING_UNITS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, sellingUnit: u, useCustomUnit: false }))}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    !form.useCustomUnit && form.sellingUnit === u
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {u}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, useCustomUnit: true, sellingUnit: '' }))}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                  form.useCustomUnit
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                Custom
              </button>
            </div>
            {form.useCustomUnit && (
              <input
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                placeholder="e.g. 250ml, half dozen, slice..."
                value={form.customUnit}
                onChange={(e) => setForm((f) => ({ ...f, customUnit: e.target.value }))}
                autoFocus
              />
            )}
            {errors.unit && <p className="text-xs text-red-500 mt-1">{errors.unit}</p>}
            {finalUnit && (
              <p className="text-xs text-stone-400 mt-1.5">
                Will show as: <strong className="text-stone-700">R{form.price || '0'} / {finalUnit}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Category & Stock */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-violet-50 rounded-lg flex items-center justify-center">
              <Layers size={13} className="text-violet-600" />
            </div>
            <p className="text-xs font-bold text-stone-700">More Options</p>
          </div>

          {categories.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">Category <span className="text-stone-400">(optional)</span></label>
              <select
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              >
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-stone-600 block mb-1.5">Max quantity <span className="text-stone-400">(optional — leave blank for unlimited)</span></label>
            <input
              type="number"
              min="1"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              placeholder="e.g. 50"
              value={form.maxQuantity}
              onChange={(e) => setForm((f) => ({ ...f, maxQuantity: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-3 py-1 cursor-pointer">
            <div
              onClick={() => setForm((f) => ({ ...f, isAvailable: !f.isAvailable }))}
              className={`w-11 h-6 rounded-full transition-colors relative ${form.isAvailable ? 'bg-green-500' : 'bg-stone-200'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isAvailable ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm font-semibold text-stone-700">
              {form.isAvailable ? 'Available to customers' : 'Hidden from customers'}
            </span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-4 bg-black text-white font-bold text-sm rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
        </button>

        <button
          type="button"
          onClick={() => navigate('/admin/products')}
          className="w-full py-3 bg-stone-100 text-stone-600 font-semibold text-sm rounded-full hover:bg-stone-200 transition-colors"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
