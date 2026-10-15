import { format, formatDistanceToNow } from 'date-fns';
import { OrderStatus, PaymentStatus, DropStatus } from '../types';

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `R${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatDate(dateString: string): string {
  return format(new Date(dateString), 'dd MMM yyyy');
}

export function formatDateTime(dateString: string): string {
  return format(new Date(dateString), 'dd MMM yyyy, HH:mm');
}

export function formatTime(dateString: string): string {
  return format(new Date(dateString), 'HH:mm');
}

export function formatRelative(dateString: string): string {
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function orderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    PENDING:   'Pending',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}

export function paymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    AWAITING_PAYMENT: 'Awaiting Payment',
    POP_SUBMITTED: 'POP Submitted',
    PAYMENT_VERIFIED: 'Payment Verified',
    PAYMENT_REJECTED: 'Payment Rejected',
    CASH_PENDING: 'Cash Pending',
    CASH_RECEIVED: 'Cash Received',
  };
  return labels[status] || status;
}

export function dropStatusLabel(status: DropStatus): string {
  const labels: Record<DropStatus, string> = {
    DRAFT: 'Draft',
    SCHEDULED: 'Scheduled',
    OPEN: 'Open',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled',
  };
  return labels[status] || status;
}
