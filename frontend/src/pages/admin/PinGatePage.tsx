import { useState, useRef, useEffect } from 'react';
import { Zap, Delete } from 'lucide-react';
import api, { getErrorMessage } from '../../lib/api';
import { setPinVerified } from '../../lib/pin';

interface PinGatePageProps {
  onVerified: () => void;
}

export function PinGatePage({ onVerified }: PinGatePageProps) {
  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [isFirst, setIsFirst] = useState(false);
  const [step, setStep]       = useState<'enter' | 'setup_new' | 'setup_confirm'>('enter');
  const [newPin, setNewPin]   = useState('');

  // Check if PIN exists
  useEffect(() => {
    api.get('/pin/exists').then((r) => {
      if (!r.data.exists) setIsFirst(true);
    }).catch(() => {});
  }, []);

  async function verify(code: string) {
    setLoading(true);
    setError('');
    try {
      await api.post('/pin/verify', { pin: code });
      setPinVerified();
      onVerified();
    } catch (err) {
      setError('Incorrect PIN. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  async function setupPin(code: string, confirm: string) {
    if (code !== confirm) { setError('PINs do not match. Try again.'); setNewPin(''); setPin(''); setStep('setup_new'); return; }
    setLoading(true);
    try {
      await api.post('/pin/set', { newPin: code });
      setPinVerified();
      onVerified();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleDigit(d: string) {
    if (loading) return;
    const next = pin + d;
    if (next.length > 6) return;
    setPin(next);
    setError('');

    if (next.length === 4) {
      // 4 digits entered — act
      if (isFirst) {
        if (step === 'enter') {
          // First time: treat as the new PIN
          setNewPin(next);
          setPin('');
          setStep('setup_confirm');
        } else if (step === 'setup_confirm') {
          setupPin(newPin, next);
        }
      } else {
        verify(next);
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    setError('');
  }

  const dots = Array.from({ length: 4 }, (_, i) => i < pin.length);

  const title = isFirst
    ? step === 'enter' ? 'Create a PIN' : 'Confirm your PIN'
    : 'Admin Access';

  const subtitle = isFirst
    ? step === 'enter' ? 'Set a 4-digit PIN to protect your admin panel.' : 'Enter your PIN again to confirm.'
    : 'Enter your PIN to continue.';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-5">
      {/* Logo */}
      <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/25">
        <Zap size={26} className="text-white" />
      </div>

      <h1 className="text-2xl font-extrabold text-stone-900 mb-1">{title}</h1>
      <p className="text-sm text-stone-400 mb-10 text-center max-w-xs">{subtitle}</p>

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
