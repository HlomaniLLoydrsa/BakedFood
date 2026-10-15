import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Star, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { getErrorMessage } from '../../lib/api';
import { Order } from '../../types';
import { PageSpinner } from '../../components/ui/Spinner';

export function ReviewPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderNumber],
    queryFn: async () => {
      const r = await api.get(`/orders/number/${orderNumber}`);
      return r.data.order as Order;
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { toast.error('Please select a star rating'); return; }
    if (message.trim().length < 5) { toast.error('Please write a short review'); return; }
    setSubmitting(true);
    try {
      await api.post('/reviews', { orderNumber, rating, message: message.trim() });
      setSubmitted(true);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <PageSpinner />;

  if (!order) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-stone-500 mb-4">Order not found.</p>
          <Link to="/" className="text-sm text-green-600 font-semibold">Go home</Link>
        </div>
      </div>
    );
  }

  if (order.orderStatus !== 'COMPLETED') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Star size={20} className="text-stone-400" />
          </div>
          <p className="text-sm font-bold text-stone-900 mb-2">Review not available yet</p>
          <p className="text-xs text-stone-400 mb-5">
            You can leave a review once your order has been completed and delivered.
          </p>
          <Link to={`/order/${orderNumber}/status`}
            className="text-sm text-green-600 font-semibold hover:underline">
            View order status
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center max-w-xs">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={30} className="text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-stone-900 mb-2">Thank you!</h2>
          <p className="text-sm text-stone-500 mb-2">Your review has been published.</p>
          <div className="flex items-center justify-center gap-1 mb-6">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={20} className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-stone-300'} />
            ))}
          </div>
          <Link to="/" className="inline-flex bg-black text-white text-sm font-bold px-6 py-3 rounded-full hover:bg-green-600 transition-colors">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link to={`/order/${orderNumber}/status`}
            className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-stone-600">
            <ArrowLeft size={16} />
          </Link>
          <h1 className="font-extrabold text-stone-900">Leave a Review</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Greeting */}
        <div className="text-center py-4">
          <p className="text-stone-500 text-sm mb-1">Hi <strong className="text-stone-800">{order.customerName.split(' ')[0]}</strong>,</p>
          <p className="text-stone-500 text-sm">How was your order? Your review helps others.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Star rating */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5 text-center">
            <p className="text-sm font-bold text-stone-700 mb-4">Tap to rate</p>
            <div className="flex items-center justify-center gap-3">
              {[1,2,3,4,5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={36}
                    className={`transition-colors ${
                      s <= (hover || rating)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-stone-200'
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs font-semibold text-stone-500 mt-3">
                {['','Poor','Fair','Good','Great','Excellent!'][rating]}
              </p>
            )}
          </div>

          {/* Message */}
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            <label className="text-sm font-bold text-stone-700 block mb-2">
              Your review <span className="text-red-400">*</span>
            </label>
            <textarea
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
              rows={4}
              placeholder="Tell us about your experience — quality, delivery, taste…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-stone-400 mt-1">{message.length} / 1000</p>
          </div>

          <button type="submit" disabled={submitting || rating === 0 || message.trim().length < 5}
            className="w-full py-4 bg-green-500 text-white font-extrabold text-sm rounded-full hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
            <Star size={16} className="fill-white" />
            {submitting ? 'Submitting…' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
