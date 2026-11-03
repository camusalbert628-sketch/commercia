export interface PaymentInitParams {
  userId: string;
  customerName: string;
  customerEmail: string;
  phoneNumber?: string;
  planName: 'pro' | 'business';
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  country: string; // e.g. "CM"
  reference: string;
  returnUrl: string;
  notifyUrl: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitResult {
  reference: string;
  provider: string;
  providerReference?: string;
  checkoutUrl?: string;
  qrCodeData?: string;
  ussdCode?: string;
  deepLink?: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
  instructions?: string;
  metadata?: Record<string, any>;
}

export interface PaymentVerifyResult {
  reference: string;
  providerReference?: string;
  status: 'completed' | 'failed' | 'pending';
  amount: number;
  currency: string;
  operatorId?: string;
  rawResponse?: any;
  errorMessage?: string;
}

export interface WebhookProcessResult {
  isValid: boolean;
  reference?: string;
  providerReference?: string;
  status?: 'completed' | 'failed' | 'pending' | 'ignored';
  amount?: number;
  currency?: string;
  errorMessage?: string;
  rawEvent?: any;
}

export interface RefundResult {
  success: boolean;
  providerRefundId?: string;
  status: 'completed' | 'failed' | 'pending';
  message: string;
  rawResponse?: any;
}

export interface IPaymentProvider {
  readonly providerName: string;
  readonly displayName: string;

  isAvailableFor(country: string, currency: string): boolean;
  validateConfiguration(): Promise<{ isValid: boolean; message: string; details?: any }>;
  initializePayment(params: PaymentInitParams): Promise<PaymentInitResult>;
  verifyPayment(reference: string, metadata?: any): Promise<PaymentVerifyResult>;
  getPaymentStatus(reference: string): Promise<PaymentVerifyResult>;
  processWebhook(headers: Record<string, string>, rawBody: any): Promise<WebhookProcessResult>;
  refundPayment(paymentId: string, amount: number, reason: string): Promise<RefundResult>;
}
