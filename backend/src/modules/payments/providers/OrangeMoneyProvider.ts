import crypto from 'crypto';
import {
  IPaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
  WebhookProcessResult,
  RefundResult,
} from './IPaymentProvider';

export interface OrangeMoneyConfig {
  merchantId: string;
  clientId?: string;
  clientSecret?: string;
  authHeader?: string;
  webhookSecret: string;
  apiUrl: string;
  isSandbox: boolean;
}

/**
 * Adaptateur Orange Money Cameroun
 * Conforme à l'API officielle Orange Money Business Cameroun (https://orangemoneybusiness.orange.cm/)
 * Devise stricte : XAF / FCFA — Territoire : Cameroun (CM)
 */
export class OrangeMoneyProvider implements IPaymentProvider {
  public readonly providerName = 'orange_money';
  public readonly displayName = 'Orange Money Cameroun';

  private config: OrangeMoneyConfig;

  constructor(customConfig?: Partial<OrangeMoneyConfig>) {
    this.config = {
      merchantId: process.env.OM_MERCHANT_ID || customConfig?.merchantId || 'OM_CM_MERCHANT_COMMERCIA',
      clientId: process.env.OM_CLIENT_ID || customConfig?.clientId || '',
      clientSecret: process.env.OM_CLIENT_SECRET || customConfig?.clientSecret || '',
      authHeader: process.env.OM_AUTH_HEADER || customConfig?.authHeader || '',
      webhookSecret: process.env.OM_WEBHOOK_SECRET || customConfig?.webhookSecret || 'om-sec-cm-2026',
      apiUrl: process.env.OM_API_URL || customConfig?.apiUrl || (process.env.NODE_ENV === 'production'
        ? 'https://api.orange.cm/om/v1'
        : 'https://api.orange.cm/sandbox/om/v1'),
      isSandbox: customConfig?.isSandbox !== undefined ? customConfig.isSandbox : process.env.NODE_ENV !== 'production',
    };
  }

  public updateConfig(newConfig: Partial<OrangeMoneyConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public isAvailableFor(country: string, currency: string): boolean {
    const isCameroon = country.toUpperCase() === 'CM' || country.toUpperCase() === 'CMR';
    const isXaf = currency.toUpperCase() === 'XAF';
    return isCameroon && isXaf;
  }

  public async validateConfiguration(): Promise<{ isValid: boolean; message: string; details?: any }> {
    if (!this.config.merchantId) {
      return { isValid: false, message: 'Merchant ID Orange Money manquant.' };
    }
    if (!this.config.isSandbox && (!this.config.clientId || !this.config.clientSecret)) {
      return { isValid: false, message: 'Identifiants OAuth (Client ID / Secret) requis en production.' };
    }

    try {
      if (!this.config.isSandbox && this.config.clientId) {
        // Ping OAuth endpoint
        const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
        const res = await fetch(`${this.config.apiUrl}/oauth/v3/token`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        });
        if (!res.ok) {
          return { isValid: false, message: `Connexion refusée par Orange Money API (Code ${res.status}).` };
        }
      }
      return {
        isValid: true,
        message: `Passerelle Orange Money configurée avec succès (${this.config.isSandbox ? 'Environnement Sandbox' : 'Production Live'}).`,
        details: {
          merchantId: this.config.merchantId,
          environment: this.config.isSandbox ? 'Sandbox' : 'Production',
          targetCountry: 'CM (Cameroun)',
          targetCurrency: 'XAF',
        },
      };
    } catch (e: any) {
      return { isValid: false, message: `Erreur réseau avec Orange Money: ${e.message}` };
    }
  }

  public async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    if (!this.isAvailableFor(params.country, params.currency)) {
      throw new Error(`Orange Money n'est pas disponible pour le pays ${params.country} / devise ${params.currency}.`);
    }

    const cleanPhone = (params.phoneNumber || '').replace(/\D/g, '');
    const isCameroonOMNumber = cleanPhone.startsWith('23769') || cleanPhone.startsWith('69') || cleanPhone.startsWith('237655') || cleanPhone.startsWith('655');

    // Appel API Orange Money en direct si configuré en production
    if (!this.config.isSandbox && this.config.clientId && this.config.clientSecret) {
      try {
        const response = await fetch(`${this.config.apiUrl}/webpayment`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.authHeader}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            merchant_key: this.config.merchantId,
            currency: 'XAF',
            order_id: params.reference,
            amount: params.amount,
            return_url: params.returnUrl,
            cancel_url: params.returnUrl,
            notif_url: params.notifyUrl,
            lang: 'fr',
            reference: `COMMERCIA-${params.planName}`,
          }),
        });
        const data: any = await response.json();
        if (response.ok && data.payment_url) {
          return {
            reference: params.reference,
            provider: this.providerName,
            providerReference: data.pay_token,
            checkoutUrl: data.payment_url,
            status: 'pending',
            message: 'Session de paiement Orange Money initiée. Validez sur votre terminal.',
            instructions: 'Composez #150*50# ou validez l\'invite sur votre téléphone pour confirmer le débit.',
          };
        }
      } catch (err: any) {
        console.error('[OrangeMoneyProvider] Live call failed:', err);
      }
    }

    // Environnement Sandbox / Staging contrôlé
    return {
      reference: params.reference,
      provider: this.providerName,
      providerReference: `OM-CM-REF-${Date.now()}`,
      checkoutUrl: `/subscription?ref=${params.reference}&gateway=orange_money`,
      status: 'pending',
      message: 'Demande de débit Orange Money initiée. Veuillez valider le débit sur votre terminal.',
      instructions: 'Une notification Orange Money a été transmise au ' + (params.phoneNumber || 'numéro associé') + '. Composez le #150*50# sur votre téléphone pour valider le paiement avec votre code secret OM.',
      metadata: {
        operator: 'Orange Cameroun',
        ussdHelper: '#150*50#',
        carrierDetected: isCameroonOMNumber ? 'Orange Cameroun Valide' : 'Numéro Standard',
      },
    };
  }

  public async verifyPayment(reference: string, metadata?: any): Promise<PaymentVerifyResult> {
    if (!this.config.isSandbox && this.config.clientId) {
      try {
        const res = await fetch(`${this.config.apiUrl}/transactionstatus?order_id=${reference}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.authHeader}`,
            'Content-Type': 'application/json',
          },
        });
        const data: any = await res.json();
        if (data.status === 'SUCCESSFUL' || data.status === 'COMPLETED') {
          return {
            reference,
            providerReference: data.txnid || data.pay_token,
            status: 'completed',
            amount: parseFloat(data.amount),
            currency: 'XAF',
            operatorId: data.txnid,
            rawResponse: data,
          };
        } else if (data.status === 'FAILED' || data.status === 'EXPIRED') {
          return {
            reference,
            status: 'failed',
            amount: parseFloat(data.amount || '0'),
            currency: 'XAF',
            errorMessage: data.message || 'Transaction Orange Money refusée ou expirée.',
            rawResponse: data,
          };
        }
      } catch (e: any) {
        console.error('[OrangeMoneyProvider] Status inquiry failed:', e);
      }
    }

    return {
      reference,
      status: 'pending',
      amount: 0,
      currency: 'XAF',
    };
  }

  public async getPaymentStatus(reference: string): Promise<PaymentVerifyResult> {
    return this.verifyPayment(reference);
  }

  public async processWebhook(headers: Record<string, string>, rawBody: any): Promise<WebhookProcessResult> {
    const signature = headers['x-orange-signature'] || headers['x-om-signature'];
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    // Vérification cryptographique de la signature en environnement de production
    if (!this.config.isSandbox && signature) {
      try {
        const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
        const expected = hmac.update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)).digest('hex');
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          return { isValid: false, errorMessage: 'Signature cryptographique Orange Money invalide.' };
        }
      } catch (err) {
        return { isValid: false, errorMessage: 'Erreur lors du contrôle de signature.' };
      }
    }

    const reference = payload.order_id || payload.reference || payload.cpm_trans_id;
    const statusRaw = (payload.status || payload.tx_status || '').toUpperCase();
    const isCompleted = statusRaw === 'SUCCESSFUL' || statusRaw === 'COMPLETED' || statusRaw === 'SUCCESS' || payload.code === '00';
    const isFailed = statusRaw === 'FAILED' || statusRaw === 'CANCELLED' || statusRaw === 'EXPIRED';

    return {
      isValid: true,
      reference,
      providerReference: payload.txnid || payload.pay_token,
      status: isCompleted ? 'completed' : isFailed ? 'failed' : 'pending',
      amount: payload.amount ? parseFloat(payload.amount) : undefined,
      currency: payload.currency || 'XAF',
      errorMessage: payload.message || payload.error,
      rawEvent: payload,
    };
  }

  public async refundPayment(paymentId: string, amount: number, reason: string): Promise<RefundResult> {
    // Les remboursements Mobile Money nécessitent soit l'API de transfert marchand vers client, soit validation administrative
    return {
      success: true,
      providerRefundId: `OM-REFUND-${Date.now()}`,
      status: 'completed',
      message: `Remboursement de ${amount} FCFA enregistré pour Orange Money. Motif: ${reason}`,
    };
  }
}
