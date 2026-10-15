import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, Eye, EyeOff, Store, Landmark, Truck, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Settings } from '../../types';
import { FileUpload } from '../../components/ui/FileUpload';
import { PageSpinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { clearPin } from '../../lib/pin';

// ── Field components defined OUTSIDE the page so they never remount ───────
function Field({
  label, value, onChange, placeholder, type = 'text', hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-stone-600 block mb-1.5">{label}</label>
      <input
        type={type}
        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-[11px] text-stone-400 mt-1">{hint}</p>}
    </div>
  );
}

function AreaField({
  label, value, onChange, placeholder, rows = 3,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-stone-600 block mb-1.5">{label}</label>
      <textarea
        rows={rows}
        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Card({ icon: Icon, iconBg, iconFg, title, children }: {
  icon: React.ElementType; iconBg: string; iconFg: string;
  title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-stone-100">
        <div className={`w-7 h-7 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon size={14} className={iconFg} />
        </div>
        <p className="text-sm font-extrabold text-stone-900">{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

// ── PIN Section — placed OUTSIDE SettingsPage to avoid re-mount bug ──────
function PinSection() {
  const [open, setOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleSave() {
    if (newPin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    if (newPin !== confirmPin) { setError('PINs do not match'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/pin/set', { currentPin: currentPin || undefined, newPin });
      toast.success('PIN updated. You will need to re-enter it next time.');
      clearPin();
      setOpen(false);
      setCurrentPin(''); setNewPin(''); setConfirmPin('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally { setLoading(false); }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-stone-100">
          <div className="w-7 h-7 bg-stone-100 rounded-lg flex items-center justify-center">
            <KeyRound size={14} className="text-stone-600" />
          </div>
          <p className="text-sm font-extrabold text-stone-900">Admin PIN</p>
        </div>
        <div className="p-4 flex items-center justify-between">
          <p className="text-xs text-stone-500">Protects the admin panel from customers.</p>
          <button onClick={() => setOpen(true)}
            className="text-xs font-bold text-green-600 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full hover:bg-green-100 transition-colors">
            Change PIN
          </button>
        </div>
      </div>

      <Modal isOpen={open} onClose={() => { setOpen(false); setError(''); }} title="Change Admin PIN" size="sm">
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1.5">Current PIN <span className="text-stone-400">(leave blank if first time)</span></label>
            <input type="password" maxLength={8}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              placeholder="Current PIN"
              value={currentPin}
              onChange={(e) => { setCurrentPin(e.target.value); setError(''); }}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1.5">New PIN <span className="text-red-400">*</span></label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} maxLength={8}
                className="w-full px-4 py-3 pr-10 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                placeholder="4–8 digits"
                value={newPin}
                onChange={(e) => { setNewPin(e.target.value.replace(/\D/g,'')); setError(''); }}
              />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-600 block mb-1.5">Confirm New PIN <span className="text-red-400">*</span></label>
            <input type="password" maxLength={8}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              placeholder="Repeat new PIN"
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g,'')); setError(''); }}
            />
          </div>
          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={() => { setOpen(false); setError(''); }}
              className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold text-sm rounded-xl hover:bg-stone-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={loading}
              className="flex-1 py-3 bg-green-500 text-white font-bold text-sm rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50">
              {loading ? 'Saving…' : 'Save PIN'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [codeError, setCodeError] = useState('');

  const [form, setForm] = useState({
    businessName: '', businessPhone: '', businessWhatsapp: '', businessEmail: '', businessAddress: '',
    bankName: '', bankAccountHolder: '', bankAccountNumber: '', bankBranchCode: '', bankAccountType: '',
    eftInstructions: '', deliveryEnabled: 'true', collectionEnabled: 'true',
    deliveryInstructions: '', collectionInstructions: '',
  });

  const set = (key: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => { const r = await api.get('/settings'); return r.data.settings as Settings; },
  });

  useEffect(() => {
    if (data) {
      setForm((f) => ({
        ...f,
        businessName: data.businessName || '',
        businessPhone: data.businessPhone || '',
        businessWhatsapp: data.businessWhatsapp || '',
        businessEmail: data.businessEmail || '',
        businessAddress: data.businessAddress || '',
        bankName: data.bankName || '',
        bankAccountHolder: data.bankAccountHolder || '',
        bankAccountNumber: data.bankAccountNumber || '',
        bankBranchCode: data.bankBranchCode || '',
        bankAccountType: data.bankAccountType || '',
        eftInstructions: data.eftInstructions || '',
        deliveryEnabled: data.deliveryEnabled || 'true',
        collectionEnabled: data.collectionEnabled || 'true',
        deliveryInstructions: data.deliveryInstructions || '',
        collectionInstructions: data.collectionInstructions || '',
      }));
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (fd: FormData) => api.put('/settings', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => {
      toast.success('Settings saved');
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setCodeModalOpen(false); setAdminCode(''); setCodeError('');
    },
    onError: (err) => {
      const msg = getErrorMessage(err);
      if (msg.toLowerCase().includes('invalid access code') || msg.includes('403')) {
        setCodeError('Incorrect access code. Please try again.');
      } else {
        toast.error(msg);
        setCodeModalOpen(false);
      }
    },
  });

  function handleSaveClick() {
    setCodeError(''); setAdminCode(''); setCodeModalOpen(true);
  }

  function handleConfirmSave() {
    if (!adminCode.trim()) { setCodeError('Please enter your access code'); return; }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('adminCode', adminCode);
    if (logoFile) fd.append('logo', logoFile);
    mutation.mutate(fd);
  }

  if (isLoading) return <PageSpinner />;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div>
        <h1 className="text-xl font-extrabold text-stone-900">Settings</h1>
        <p className="text-xs text-stone-400 mt-0.5">Your business and payment details</p>
      </div>

      {/* Business */}
      <Card icon={Store} iconBg="bg-green-50" iconFg="text-green-600" title="Business Info">
        <FileUpload
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={setLogoFile}
          value={logoFile}
          currentUrl={data?.businessLogo}
          hint="Your logo — shown to customers"
        />
        <Field label="Business Name" value={form.businessName} onChange={set('businessName')} placeholder="The Good Batch" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" type="tel" value={form.businessPhone} onChange={set('businessPhone')} placeholder="+27 82 555 1234" />
          <Field label="WhatsApp" type="tel" value={form.businessWhatsapp} onChange={set('businessWhatsapp')} placeholder="+27 82 555 1234" />
        </div>
        <Field label="Email" type="email" value={form.businessEmail} onChange={set('businessEmail')} placeholder="hello@yourbusiness.co.za" />
        <Field label="Address" value={form.businessAddress} onChange={set('businessAddress')} placeholder="Cape Town, Western Cape" />
      </Card>

      {/* Banking */}
      <Card icon={Landmark} iconBg="bg-blue-50" iconFg="text-blue-600" title="Banking (for EFT)">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bank Name" value={form.bankName} onChange={set('bankName')} placeholder="FNB" />
          <Field label="Account Type" value={form.bankAccountType} onChange={set('bankAccountType')} placeholder="Cheque" />
        </div>
        <Field label="Account Holder" value={form.bankAccountHolder} onChange={set('bankAccountHolder')} placeholder="The Good Batch" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Account Number" value={form.bankAccountNumber} onChange={set('bankAccountNumber')} placeholder="62012345678" />
          <Field label="Branch Code" value={form.bankBranchCode} onChange={set('bankBranchCode')} placeholder="250655" />
        </div>
        <AreaField label="EFT Instructions" value={form.eftInstructions} onChange={set('eftInstructions')} placeholder="Use your order number as the payment reference…" />
      </Card>

      {/* Fulfilment */}
      <Card icon={Truck} iconBg="bg-violet-50" iconFg="text-violet-600" title="Delivery & Collection">
        {/* Delivery toggle */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-semibold text-stone-700">Enable Delivery</span>
          <div onClick={() => set('deliveryEnabled')(form.deliveryEnabled === 'true' ? 'false' : 'true')}
            className={`w-11 h-6 rounded-full relative transition-colors ${form.deliveryEnabled === 'true' ? 'bg-green-500' : 'bg-stone-200'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.deliveryEnabled === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
        <AreaField label="Delivery Instructions" rows={2} value={form.deliveryInstructions} onChange={set('deliveryInstructions')} placeholder="We deliver across Cape Town…" />

        <div className="border-t border-stone-100 pt-4" />

        {/* Collection toggle */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-semibold text-stone-700">Enable Collection</span>
          <div onClick={() => set('collectionEnabled')(form.collectionEnabled === 'true' ? 'false' : 'true')}
            className={`w-11 h-6 rounded-full relative transition-colors ${form.collectionEnabled === 'true' ? 'bg-green-500' : 'bg-stone-200'}`}>
            <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.collectionEnabled === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </label>
        <AreaField label="Collection Instructions" rows={2} value={form.collectionInstructions} onChange={set('collectionInstructions')} placeholder="Collect from…" />
      </Card>

      {/* PIN management */}
      <PinSection />

      {/* Save */}
      <button
        onClick={handleSaveClick}
        className="w-full py-4 bg-green-500 text-white font-extrabold text-sm rounded-2xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-500/25"
      >
        <Lock size={16} /> Save settings
      </button>

      {/* Access code modal */}
      <Modal isOpen={codeModalOpen} onClose={() => { setCodeModalOpen(false); setCodeError(''); }} title="Enter Access Code" size="sm">
        <div className="p-6">
          <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100 mb-5">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <Lock size={14} className="text-white" />
            </div>
            <p className="text-sm text-stone-600">Enter your admin access code to save.</p>
          </div>

          <div className="relative mb-1">
            <input
              type={showCode ? 'text' : 'password'}
              className="w-full px-4 py-3 pr-10 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
              placeholder="Access code"
              value={adminCode}
              onChange={(e) => { setAdminCode(e.target.value); setCodeError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmSave(); }}
              autoFocus
            />
            <button type="button" onClick={() => setShowCode(!showCode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
              {showCode ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {codeError && <p className="text-xs text-red-600 mb-1 mt-1.5">{codeError}</p>}

          <div className="flex gap-3 mt-5">
            <button onClick={() => { setCodeModalOpen(false); setCodeError(''); }}
              className="flex-1 py-3 bg-stone-100 text-stone-600 font-bold text-sm rounded-xl hover:bg-stone-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleConfirmSave} disabled={mutation.isPending}
              className="flex-1 py-3 bg-green-500 text-white font-bold text-sm rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50">
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
