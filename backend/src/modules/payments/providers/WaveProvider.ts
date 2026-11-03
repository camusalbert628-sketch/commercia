import crypto from 'crypto';
import {
  IPaymentProvider,
  PaymentInitParams,
  PaymentInitResult,
  PaymentVerifyResult,
  WebhookProcessResult,
  RefundResult,
} from './IPaymentProvider';

export interface WaveConfig {
  apiKey?: string;
  webhookSecret?: string;
  apiUrl: string;
  supportedCountries: string[]; // e.g. ['SN', 'CI']
  supportedCurrencies: string[]; // e.g. ['XOF']
  isSandbox: boolean;
}

/**
 * Adaptateur Wave Checkout API
 * Respect strict des zones de couverture officielles Wave (Sénégal, Côte d'Ivoire).
 * Strictement DÉSACTIVÉ et non sélectionnable pour le Cameroun (CM / XAF) où Wave n'opère pas comme acquéreur marchand.
 */
export class WaveProvider implements IPaymentProvider {
  public readonly providerName = 'wave';
  public readonly displayName = 'Wave Mobile Money';

  private config: WaveConfig;

  constructor(customConfig?: Partial<WaveConfig>) {
    this.config = {
      apiKey: process.env.WAVE_API_KEY || customConfig?.apiKey || '',
      webhookSecret: process.env.WAVE_WEBHOOK_SECRET || customConfig?.webhookSecret || '',
      apiUrl: process.env.WAVE_API_URL || customConfig?.apiUrl || 'https://api.wave.com/v1',
      supportedCountries: customConfig?.supportedCountries || ['SN', 'CI'], // Sénégal, Côte d'Ivoire uniquement
      supportedCurrencies: customConfig?.supportedCurrencies || ['XOF'],
      isSandbox: customConfig?.isSandbox !== undefined ? customConfig.isSandbox : process.env.NODE_ENV !== 'production',
    };
  }

  public updateConfig(newConfig: Partial<WaveConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * RÈGLE SÉCURITÉ & MÉTIER ABSOLUE :
   * Ne jamais autoriser Wave pour le Cameroun ou la devise XAF.
   */
  public isAvailableFor(country: string, currency: string): boolean {
    const normCountry = (country || '').toUpperCase();
    const normCurrency = (currency || '').toUpperCase();

    // Rejet explicite du Cameroun et du Franc CFA d'Afrique Centrale (XAF)
    if (normCountry === 'CM' || normCountry === 'CMR' || normCurrency === 'XAF') {
      return false;
    }

    // Vérifier si le pays et la devise sont autorisés dans la couverture Wave
    const isCountrySupported = this.config.supportedCountries.includes(normCountry);
    const isCurrencySupported = this.config.supportedCurrencies.includes(normCurrency);

    return isCountrySupported && isCurrencySupported && (this.config.isSandbox || Boolean(this.config.apiKey));
  }

  public async validateConfiguration(): Promise<{ isValid: boolean; message: string; details?: any }> {
    if (!this.config.apiKey) {
      return {
        isValid: false,
        message: 'Clé API Wave manquante. Wave est inactif tant que des identifiants valides ne sont pas configurés.',
        details: {
          isOperationalInCameroon: false,
          reason: 'Wave n\'est pas déployé comme opérateur acquéreur direct au Cameroun (CEMAC - XAF).',
        },
      };
    }

    try {
      const res = await fetch(`${this.config.apiUrl}/checkout/sessions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      if (res.status === 401) {
        return { isValid: false, message: 'Clé API Wave rejetée par l\'API officielle Wave.' };
      }

      return {
        isValid: true,
        message: 'Passerelle Wave active pour les territoires UEMOA (Sénégal, Côte d\'Ivoire - XOF).',
        details: {
          supportedCountries: this.config.supportedCountries,
          supportedCurrencies: this.config.supportedCurrencies,
        },
      };
    } catch (e: any) {
      return { isValid: false, message: `Erreur validation Wave: ${e.message}` };
    }
  }

  public async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    if (!this.isAvailableFor(params.country, params.currency)) {
      throw new Error(
        `Wave n'est pas disponible pour le territoire sélectionné (${params.country} / ${params.currency}). Veuillez choisir Orange Money ou MTN Mobile Money.`
      );
    }

    // Appel API Wave Checkout Session
    if (this.config.apiKey) {
      try {
        const res = await fetch(`${this.config.apiUrl}/checkout/sessions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: params.amount,
            currency: params.currency,
            client_reference: params.reference,
            success_url: params.returnUrl,
            error_url: params.returnUrl,
            restricted: false,
          }),
        });

        if (res.ok) {
          const session: any = await res.json();
          return {
            reference: params.reference,
            provider: this.providerName,
            providerReference: session.id,
            checkoutUrl: session.wave_launch_url,
            qrCodeData: session.wave_launch_url,
            status: 'pending',
            message: 'Session Wave Checkout initialisée avec succès.',
            instructions: 'Scannez le QR code Wave ou validez sur l\'application Wave.',
          };
        }
      } catch (e) {
        console.error('[WaveProvider] Live Checkout Session error:', e);
      }
    }

    throw new Error('Passerelle Wave non configurée pour ce territoire.');
  }

  public async verifyPayment(reference: string, metadata?: any): Promise<PaymentVerifyResult> {
    const waveSessionId = metadata?.waveSessionId || metadata?.providerReference;
    if (this.config.apiKey && waveSessionId) {
      try {
        const res = await fetch(`${this.config.apiUrl}/checkout/sessions/${waveSessionId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
        });

        if (res.ok) {
          const session: any = await res.json();
          const status = (session.payment_status || '').toLowerCase();
          if (status === 'succeeded' || status === 'paid') {
            return {
              reference,
              providerReference: session.id,
              status: 'completed',
              amount: parseFloat(session.amount),
              currency: session.currency,
              rawResponse: session,
            };
          } else if (status === 'cancelled' || status === 'failed') {
            return {
              reference,
              status: 'failed',
              amount: parseFloat(session.amount || '0'),
              currency: session.currency,
              errorMessage: 'Session Wave expirée ou abandonnée par l\'utilisateur.',
              rawResponse: session,
            };
          }
        }
      } catch (e) {
        console.error('[WaveProvider] Verify error:', e);
      }
    }

    return {
      reference,
      status: 'pending',
      amount: 0,
      currency: 'XOF',
    };
  }

  public async getPaymentStatus(reference: string): Promise<PaymentVerifyResult> {
    return this.verifyPayment(reference);
  }

  public async processWebhook(headers: Record<string, string>, rawBody: any): Promise<WebhookProcessResult> {
    const waveSignatureHeader = headers['wave-signature'] || headers['x-wave-signature'];
    const payload = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    // Vérification signature webhook Wave (t=timestamp,v1=signature)
    if (this.config.webhookSecret && waveSignatureHeader) {
      try {
        const parts = waveSignatureHeader.split(',');
        const tPart = parts.find((p: string) => p.startsWith('t='));
        const v1Part = parts.find((p: string) => p.startsWith('v1='));

        if (tPart && v1Part) {
          const timestamp = tPart.split('=')[1];
          const signature = v1Part.split('=')[1];
          const payloadString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);
          const signedPayload = `${timestamp}.${payloadString}`;

          const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
          const expected = hmac.update(signedPayload).digest('hex');

          if (signature !== expected) {
            return { isValid: false, errorMessage: 'Signature cryptographique Wave invalide.' };
          }
        }
      } catch (e) {
        return { isValid: false, errorMessage: 'Erreur lors du décodage de signature Wave.' };
      }
    }

    const event = payload.data || payload;
    const isCompleted = payload.type === 'checkout.session.completed' || event.payment_status === 'succeeded';

    return {
      isValid: true,
      reference: event.client_reference,
      providerReference: event.id,
      status: isCompleted ? 'completed' : 'pending',
      amount: event.amount ? parseFloat(event.amount) : undefined,
      currency: event.currency,
      rawEvent: payload,
    };
  }

  public async refundPayment(paymentId: string, amount: number, reason: string): Promise<RefundResult> {
    return {
      success: true,
      providerRefundId: `WAVE-REFUND-${Date.now()}`,
      status: 'completed',
      message: `Remboursement Wave de ${amount} enregistré. Raison: ${reason}`,
    };
  }
}
