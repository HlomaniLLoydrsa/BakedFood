export type DropStatus = 'DRAFT' | 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus =
  | 'AWAITING_PAYMENT'
  | 'POP_SUBMITTED'
  | 'PAYMENT_VERIFIED'
  | 'PAYMENT_REJECTED'
  | 'CASH_PENDING'
  | 'CASH_RECEIVED';
export type PaymentMethod = 'EFT' | 'CASH';
export type FulfilmentMethod = 'DELIVERY' | 'COLLECTION';

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  categoryId?: string;
  category?: Category;
  price: number;
  sellingUnit: string;
  maxQuantity?: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DropProduct {
  id: string;
  dropId: string;
  productId: string;
  product: Product;
  price: number;
  maxQuantity?: number;
  orderedQty?: number;
  remaining?: number | null;
  isSoldOut?: boolean;
}

export interface Drop {
  id: string;
  name: string;
  slug: string;
  description?: string;
  status: DropStatus;
  computedStatus?: DropStatus;
  opensAt: string;
  closesAt: string;
  allowDelivery: boolean;
  allowCollection: boolean;
  allowEft: boolean;
  allowCash: boolean;
  dropProducts: DropProduct[];
  _count?: { orders: number };
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameSnapshot: string;
  sellingUnitSnapshot: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  amount: number;
  proofUrl?: string;
  status: PaymentStatus;
  rejectionReason?: string;
  verifiedById?: string;
  verifiedAt?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  dropId: string;
  drop?: { id: string; name: string; slug: string };
  customerName: string;
  phone: string;
  email?: string;
  fulfilmentMethod: FulfilmentMethod;  deliveryAddress?: string;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  cancelReason?: string;
  orderItems: OrderItem[];
  payment?: Payment;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface CartItem {
  productId: string;
  productName: string;
  sellingUnit: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Settings {
  businessName?: string;
  businessLogo?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
  businessEmail?: string;
  businessAddress?: string;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  bankBranchCode?: string;
  bankAccountType?: string;
  eftInstructions?: string;
  deliveryEnabled?: string;
  collectionEnabled?: string;
  deliveryInstructions?: string;
  collectionInstructions?: string;
}
