import { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import { setAdminToken } from '../../lib/pin';

interface PinGatePageProps {
  onVerified: () => void;
}

export function PinGatePage({ onVerified }: PinGatePageProps) {
  const [pin, setPin]           = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function login(code: string) {
    setLoading(true);
    setError('');
    try {
      const r = await api.post('/pin/login', { pin: code });
      setAdminToken(r.data.token);
      onVerified();
    } catch (err) {
      setError(getErrorMessage(err) || 'Incorrect PIN. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(d: string) {
    if (loading) return;
    const next = pin + d;
    if (next.length > 4) return;
    setPin(next);
    setError('');
    if (next.length === 4) login(next);
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    setError('');
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5">
      {/* Logo */}
      <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/25">
        <Lock size={24} className="text-white" />
      </div>

      <h1 className="text-2xl font-extrabold text-stone-900 mb-1">Admin Access</h1>
      <p className="text-sm text-stone-400 mb-8 text-center max-w-xs">Enter your 4-digit PIN to continue.</p>

      {/* PIN dots */}
      <div className="flex items-center gap-4 mb-8">
        {dots.map((filled, i) => (
          <div key={i} className={`w-4 h-4 rounded-full transition-all ${filled ? 'bg-green-500 scale-110' : 'bg-stone-200'}`} />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm font-semibold text-red-500 mb-6 text-center">{error}</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === '⌫') return (
            <button key={i} onClick={handleDelete}
              className="h-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center text-stone-500 hover:bg-stone-100 active:bg-stone-200 transition-colors shadow-soft">
              <Delete size={20} />
            </button>
          );
          return (
            <button key={i} onClick={() => handleDigit(d)} disabled={loading}
              className="h-16 bg-white border border-stone-200 rounded-2xl flex items-center justify-center text-xl font-bold text-stone-900 hover:bg-stone-50 active:bg-stone-100 transition-colors shadow-soft disabled:opacity-50">
              {d}
            </button>
          );
        })}
      </div>

      {loading && <p className="text-xs text-stone-400 mt-6">Verifying…</p>}
    </div>
  );
}
