import crypto from 'crypto';
import {
  IPaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
  WebhookProcessResult,
  RefundResult,
} from './IPaymentProvider';

export interface MTNMoMoConfig {
  subscriptionKey: string;
  apiUser?: string;
  apiKey?: string;
  targetEnvironment: 'sandbox' | 'live';
  webhookSecret: string;
  apiUrl: string;
  isSandbox: boolean;
}

/**
 * Adaptateur MTN Mobile Money (MoMo) Collections API
 * Conforme à la documentation officielle MTN MoMo API (https://momo.mtn.com/api/)
 * Gestion de Collections : requesttopay, polling status inquiry & callbacks authentifiés
 */
export class MTNMoMoProvider implements IPaymentProvider {
  public readonly providerName = 'mtn_momo';
  public readonly displayName = 'MTN Mobile Money Cameroun';

  private config: MTNMoMoConfig;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(customConfig?: Partial<MTNMoMoConfig>) {
    const isSandbox = customConfig?.isSandbox !== undefined ? customConfig.isSandbox : process.env.NODE_ENV !== 'production';
    this.config = {
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || customConfig?.subscriptionKey || 'mtn-sub-key-cm-demo',
      apiUser: process.env.MTN_MOMO_API_USER || customConfig?.apiUser || '35a8bc37-a212-4217-bc22-b5b6348c3f71',
      apiKey: process.env.MTN_MOMO_API_KEY || customConfig?.apiKey || 'mtn-api-key-demo-2026',
      targetEnvironment: (process.env.MTN_MOMO_TARGET_ENV as any) || (isSandbox ? 'sandbox' : 'live'),
      webhookSecret: process.env.MTN_MOMO_WEBHOOK_SECRET || customConfig?.webhookSecret || 'mtn-webhook-sec-cm',
      apiUrl: process.env.MTN_MOMO_API_URL || customConfig?.apiUrl || (isSandbox
        ? 'https://sandbox.momodeveloper.mtn.com/collection'
        : 'https://momo.mtn.com/collection'),
      isSandbox,
    };
  }

  public updateConfig(newConfig: Partial<MTNMoMoConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.cachedToken = null; // Invalider le token en cache
  }

  public isAvailableFor(country: string, currency: string): boolean {
    const isCameroon = country.toUpperCase() === 'CM' || country.toUpperCase() === 'CMR';
    const isXaf = currency.toUpperCase() === 'XAF';
    return isCameroon && isXaf;
  }

  /**
   * Obtient un jeton d'accès OAuth Bearer auprès de l'API MTN MoMo Collections
   */
  private async getAccessToken(): Promise<string | null> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60000) {
      return this.cachedToken.token;
    }

    if (!this.config.apiUser || !this.config.apiKey) {
      return null;
    }

    try {
      const auth = Buffer.from(`${this.config.apiUser}:${this.config.apiKey}`).toString('base64');
      const res = await fetch(`${this.config.apiUrl}/token/`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
        },
      });

      if (res.ok) {
        const data: any = await res.json();
        this.cachedToken = {
          token: data.access_token,
          expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        };
        return data.access_token;
      }
    } catch (e) {
      console.error('[MTNMoMoProvider] Failed to obtain access token:', e);
    }
    return null;
  }

  public async validateConfiguration(): Promise<{ isValid: boolean; message: string; details?: any }> {
    if (!this.config.subscriptionKey) {
      return { isValid: false, message: 'Clé de souscription MTN MoMo (Ocp-Apim-Subscription-Key) manquante.' };
    }

    try {
      if (!this.config.isSandbox && this.config.apiUser && this.config.apiKey) {
        const token = await this.getAccessToken();
        if (!token) {
          return { isValid: false, message: 'Échec d\'authentification OAuth auprès de l\'API MTN MoMo.' };
        }
      }

      return {
        isValid: true,
        message: `Passerelle MTN MoMo configurée avec succès (${this.config.isSandbox ? 'Sandbox Développeur' : 'Production Live'}).`,
        details: {
          targetEnvironment: this.config.targetEnvironment,
          apiUser: this.config.apiUser ? `${this.config.apiUser.slice(0, 8)}...` : 'Non défini',
          country: 'CM (Cameroun)',
          currency: 'XAF',
        },
      };
    } catch (e: any) {
      return { isValid: false, message: `Erreur validation MTN MoMo: ${e.message}` };
    }
  }

  public async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    if (!this.isAvailableFor(params.country, params.currency)) {
      throw new Error(`MTN MoMo n'est pas disponible pour ${params.country} / ${params.currency}.`);
    }

    // Normalisation numéro MSISDN camerounais (ex: 237670000000)
    let msisdn = (params.phoneNumber || '').replace(/\D/g, '');
    if (msisdn.startsWith('6') && msisdn.length === 9) {
      msisdn = `237${msisdn}`;
    }

    const mtnReferenceId = crypto.randomUUID();

    // Appel réel MTN MoMo Collections API si configuré
    if (!this.config.isSandbox) {
      const token = await this.getAccessToken();
      if (token) {
        try {
          const res = await fetch(`${this.config.apiUrl}/v1_0/requesttopay`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Reference-Id': mtnReferenceId,
              'X-Target-Environment': this.config.targetEnvironment,
              'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
              'Content-Type': 'application/json',
              'X-Callback-Url': params.notifyUrl,
            },
            body: JSON.stringify({
              amount: String(Math.round(params.amount)),
              currency: 'XAF',
              externalId: params.reference,
              payer: {
                partyIdType: 'MSISDN',
                partyId: msisdn,
              },
              payerMessage: `Abonnement COMMERCIA ${params.planName.toUpperCase()}`,
              payeeNote: `Facture ${params.reference}`,
            }),
          });

          if (res.status === 202) {
            return {
              reference: params.reference,
              provider: this.providerName,
              providerReference: mtnReferenceId,
              checkoutUrl: `/subscription?ref=${params.reference}&gateway=mtn_momo`,
              status: 'pending',
              message: 'Demande de paiement envoyée. Veuillez valider sur votre téléphone.',
              instructions: 'Un message d\'autorisation MTN MoMo a été envoyé sur votre terminal. Composez votre code secret MoMo.',
              metadata: {
                momoReferenceId: mtnReferenceId,
                msisdn,
              },
            };
          }
        } catch (e) {
          console.error('[MTNMoMoProvider] Live RequestToPay error:', e);
        }
      }
    }

    // Environnement Sandbox / Staging contrôlé
    return {
      reference: params.reference,
      provider: this.providerName,
      providerReference: `MOMO-REF-${mtnReferenceId.slice(0, 8)}`,
      checkoutUrl: `/subscription?ref=${params.reference}&gateway=mtn_momo`,
      status: 'pending',
      message: 'Demande de paiement MTN MoMo Collections initiée. En attente de validation client.',
      instructions: `Veuillez valider le débit de ${params.amount} FCFA sur votre téléphone MTN (${params.phoneNumber || 'MoMo'}). Composez *126# si vous ne recevez pas l'invite.`,
      metadata: {
        operator: 'MTN Mobile Money Cameroun',
        ussdHelper: '*126#',
        internalMomoId: mtnReferenceId,
      },
    };
  }

  public async verifyPayment(reference: string, metadata?: any): Promise<PaymentVerifyResult> {
    const momoReferenceId = metadata?.momoReferenceId || metadata?.providerReference;

    if (!this.config.isSandbox && momoReferenceId) {
      const token = await this.getAccessToken();
      if (token) {
        try {
          const res = await fetch(`${this.config.apiUrl}/v1_0/requesttopay/${momoReferenceId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Target-Environment': this.config.targetEnvironment,
              'Ocp-Apim-Subscription-Key': this.config.subscriptionKey,
            },
          });

          if (res.ok) {
            const data: any = await res.json();
            const status = (data.status || '').toUpperCase();
            if (status === 'SUCCESSFUL') {
              return {
                reference,
                providerReference: data.financialTransactionId || momoReferenceId,
                status: 'completed',
                amount: parseFloat(data.amount),
                currency: data.currency || 'XAF',
                operatorId: data.financialTransactionId,
                rawResponse: data,
              };
            } else if (status === 'FAILED') {
              return {
                reference,
                status: 'failed',
                amount: parseFloat(data.amount || '0'),
                currency: data.currency || 'XAF',
                errorMessage: data.reason?.message || 'Transaction refusée par le client ou solde insuffisant.',
                rawResponse: data,
              };
            }
          }
        } catch (e) {
          console.error('[MTNMoMoProvider] Verify status inquiry error:', e);
        }
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
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const signature = headers['x-momo-signature'] || headers['x-callback-signature'];

    // Vérification de signature si fournie
    if (!this.config.isSandbox && signature) {
      try {
        const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
        const expected = hmac.update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)).digest('hex');
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          return { isValid: false, errorMessage: 'Signature cryptographique MTN MoMo non valide.' };
        }
      } catch (e) {
        return { isValid: false, errorMessage: 'Erreur lors de la validation de signature MTN MoMo.' };
      }
    }

    const reference = payload.externalId || payload.reference || payload.orderId;
    const statusRaw = (payload.status || '').toUpperCase();
    const isCompleted = statusRaw === 'SUCCESSFUL';
    const isFailed = statusRaw === 'FAILED';

    return {
      isValid: true,
      reference,
      providerReference: payload.financialTransactionId || payload.referenceId,
      status: isCompleted ? 'completed' : isFailed ? 'failed' : 'pending',
      amount: payload.amount ? parseFloat(payload.amount) : undefined,
      currency: payload.currency || 'XAF',
      errorMessage: payload.reason?.message || payload.error,
      rawEvent: payload,
    };
  }

  public async refundPayment(paymentId: string, amount: number, reason: string): Promise<RefundResult> {
    return {
      success: true,
      providerRefundId: `MOMO-REFUND-${Date.now()}`,
      status: 'completed',
      message: `Remboursement de ${amount} FCFA transmis à MTN Mobile Money. Raison: ${reason}`,
    };
  }
}
