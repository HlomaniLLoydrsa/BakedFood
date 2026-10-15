import React from 'react';
import { OrderStatus, PaymentStatus, DropStatus } from '../../types';
import { orderStatusLabel, paymentStatusLabel, dropStatusLabel } from '../../lib/format';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'warm';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ children, variant = 'default', size = 'md', dot = false }: BadgeProps) {
  const base = 'inline-flex items-center gap-1.5 font-semibold rounded-full';

  const variants = {
    default: 'bg-stone-100 text-stone-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger:  'bg-red-50 text-red-700',
    info:    'bg-sky-50 text-sky-700',
    neutral: 'bg-stone-100 text-stone-500',
    warm:    'bg-warm-100 text-warm-700',
  };

  const dotColors = {
    default: 'bg-stone-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger:  'bg-red-500',
    info:    'bg-sky-500',
    neutral: 'bg-stone-400',
    warm:    'bg-warm-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-2xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`} />}
      {children}
    </span>
  );
}

export function OrderStatusBadge({ status, size = 'md' }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  const variantMap: Record<OrderStatus, BadgeProps['variant']> = {
    PENDING:   'warning',
    CONFIRMED: 'info',
    COMPLETED: 'success',
    CANCELLED: 'danger',
  };
  return <Badge variant={variantMap[status]} dot size={size}>{orderStatusLabel(status)}</Badge>;
}

export function PaymentStatusBadge({ status, size = 'md' }: { status: PaymentStatus; size?: 'sm' | 'md' }) {
  const variantMap: Record<PaymentStatus, BadgeProps['variant']> = {
    AWAITING_PAYMENT: 'neutral',
    POP_SUBMITTED:    'warning',
    PAYMENT_VERIFIED: 'success',
    PAYMENT_REJECTED: 'danger',
    CASH_PENDING:     'warning',
    CASH_RECEIVED:    'success',
  };
  return <Badge variant={variantMap[status]} dot size={size}>{paymentStatusLabel(status)}</Badge>;
}

export function DropStatusBadge({ status }: { status: DropStatus }) {
  const variantMap: Record<DropStatus, BadgeProps['variant']> = {
    DRAFT:     'neutral',
    SCHEDULED: 'info',
    OPEN:      'success',
    CLOSED:    'default',
    CANCELLED: 'danger',
  };
  return <Badge variant={variantMap[status]} dot>{dropStatusLabel(status)}</Badge>;
}
