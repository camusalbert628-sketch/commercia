import { PrismaClient } from '@prisma/client';

export interface SecurityCodeEmailData {
  recipientEmail: string;
  code: string;
  expiresInMinutes: number;
  ipAddress?: string;
  userAgent?: string;
  prisma?: PrismaClient;
}

export interface SendSecurityEmailResult {
  success: boolean;
  deliveredRemotely: boolean;
  provider: 'RESEND_API' | 'TEST_ISOLATED' | 'UNCONFIGURED';
  messageId?: string;
  errorCode?: 'EMAIL_NOT_CONFIGURED' | 'EMAIL_SEND_FAILED';
  error?: string;
}

export const EMAIL_NOT_CONFIGURED_MESSAGE =
  "Le service de vérification e-mail n'est pas configuré. L'accès administrateur est temporairement indisponible.";

export const EMAIL_SEND_SUCCESS_MESSAGE =
  'Votre code de sécurité a été envoyé à votre adresse e-mail administrateur autorisée.';

export const EMAIL_SEND_FAILED_MESSAGE =
  "L'envoi du code de sécurité a échoué. Aucun accès administrateur n'a été accordé. Veuillez réessayer ultérieurement ou contacter le responsable technique.";

export const FAIL_CLOSED_EMAIL_ERROR_MESSAGE = EMAIL_NOT_CONFIGURED_MESSAGE;

export const ADMIN_OTP_EMAIL_SUBJECT = 'COMMERCIA — Votre code de vérification administrateur';

export function buildAdminOtpPlainText(code: string): string {
  return [
    `Votre code de sécurité est : ${code}`,
    '',
    "Une tentative d'accès à la console d'administration de COMMERCIA a été initiée.",
    '',
    "Ce code est valable pendant 5 minutes et ne peut être utilisé qu'une seule fois.",
    '',
    'Ne communiquez jamais ce code à une autre personne.',
    '',
    "Si vous n'êtes pas à l'origine de cette tentative, ignorez ce message et vérifiez la sécurité de votre compte.",
    '',
    "COMMERCIA — Protection de l'administration SaaS.",
  ].join('\n');
}

class EmailService {
  // Métadonnées d'audit SANS JAMAIS stocker le code OTP ni aucun secret
  public lastDispatchAudit: { email: string; sentAt: Date; provider: string; delivered: boolean } | null = null;

  // Intercepteur strictement isolé pour les tests automatisés (uniquement si NODE_ENV === 'test')
  private testMailSink: ((payload: { to: string; code: string; subject: string; text: string }) => void) | null = null;
  private forceUnavailableInTest: boolean = false;
  private forceSendFailureInTest: boolean = false;

  public initTransporterFromEnv(): void {
    // La configuration est désormais évaluée dynamiquement depuis les variables d'environnement serveur (RESEND_API_KEY, ADMIN_OTP_FROM_EMAIL)
  }

  /**
   * Vérifie si la configuration Resend côté serveur est complète et valide.
   * Exige :
   * - RESEND_API_KEY (clé valide côté serveur commençant par re_)
   * - ADMIN_OTP_FROM_EMAIL (adresse expéditrice vérifiée dans Resend)
   */
  public isOperational(): boolean {
    if (this.forceUnavailableInTest) return false;
    if (process.env.NODE_ENV === 'test' && this.testMailSink) return true;

    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    const fromEmail = (process.env.ADMIN_OTP_FROM_EMAIL || '').trim();

    if (!resendKey || !resendKey.startsWith('re_') || resendKey.length < 12) {
      return false;
    }

    if (!fromEmail || !fromEmail.includes('@')) {
      return false;
    }

    return true;
  }

  public getFromAddress(): string {
    const raw = (process.env.ADMIN_OTP_FROM_EMAIL || '').trim();
    if (raw.includes('<') && raw.includes('>')) {
      return raw;
    }
    if (raw.toLowerCase().includes('onboarding@resend.dev')) {
      return 'onboarding@resend.dev';
    }
    return `COMMERCIA Security <${raw}>`;
  }

  /**
   * Uniquement utilisable par la suite de tests automatisés lorsque NODE_ENV === 'test'
   * et strictement interdit en production.
   */
  public setIsolatedTestSink(
    sink: ((payload: { to: string; code: string; subject: string; text: string }) => void) | null,
    options?: { forceUnavailable?: boolean; forceSendFailure?: boolean }
  ) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      throw new Error('Interdit en production : le sink de test est strictement réservé à NODE_ENV=test.');
    }
    this.testMailSink = sink;
    this.forceUnavailableInTest = Boolean(options?.forceUnavailable);
    this.forceSendFailureInTest = Boolean(options?.forceSendFailure);
  }

  public getStatus(): {
    isConfigured: boolean;
    provider: string;
    transport: string;
    fromEmailConfigured: boolean;
    resendKeyConfigured: boolean;
    lastSentCode: { email: string; sentAt: Date } | null;
  } {
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    const fromEmail = (process.env.ADMIN_OTP_FROM_EMAIL || '').trim();
    const resendKeyConfigured = Boolean(resendKey && resendKey.startsWith('re_') && resendKey.length >= 12);
    const fromEmailConfigured = Boolean(fromEmail && fromEmail.includes('@'));
    const configured = this.isOperational();

    return {
      isConfigured: configured,
      provider: configured ? 'RESEND_API' : 'UNCONFIGURED',
      transport: configured ? 'RESEND_API (TLS/HTTPS)' : 'NON CONFIGURÉ (FAIL-CLOSED)',
      fromEmailConfigured,
      resendKeyConfigured,
      lastSentCode: this.lastDispatchAudit
        ? { email: this.lastDispatchAudit.email, sentAt: this.lastDispatchAudit.sentAt }
        : null,
    };
  }

  /**
   * Envoie le code OTP par Resend API exclusivement depuis le backend.
   * POLITIQUE FAIL CLOSED :
   * - Ne journalise JAMAIS le code OTP ni la clé API.
   * - Ne simule jamais un envoi réussi.
   */
  public async sendSecurityCodeEmail(data: SecurityCodeEmailData): Promise<SendSecurityEmailResult> {
    const { recipientEmail, code, expiresInMinutes, ipAddress, userAgent } = data;

    if (!this.isOperational()) {
      this.lastDispatchAudit = {
        email: recipientEmail,
        sentAt: new Date(),
        provider: 'UNCONFIGURED',
        delivered: false,
      };
      return {
        success: false,
        deliveredRemotely: false,
        provider: 'UNCONFIGURED',
        errorCode: 'EMAIL_NOT_CONFIGURED',
        error: EMAIL_NOT_CONFIGURED_MESSAGE,
      };
    }

    if (this.forceSendFailureInTest) {
      this.lastDispatchAudit = {
        email: recipientEmail,
        sentAt: new Date(),
        provider: 'RESEND_API',
        delivered: false,
      };
      return {
        success: false,
        deliveredRemotely: false,
        provider: 'RESEND_API',
        errorCode: 'EMAIL_SEND_FAILED',
        error: EMAIL_SEND_FAILED_MESSAGE,
      };
    }

    const subject = ADMIN_OTP_EMAIL_SUBJECT;
    const text = buildAdminOtpPlainText(code);

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1120; margin: 0; padding: 24px; color: #F1F5F9;">
  <div style="max-width: 540px; margin: 0 auto; background: #0F172A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); color: #F1F5F9;">
    <div style="display: inline-block; background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; color: #34D399; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.8px; margin-bottom: 16px;">PROTECTION DE L'ADMINISTRATION SAAS</div>
    <div style="font-size: 22px; font-weight: 800; color: #10B981; letter-spacing: -0.02em; margin-bottom: 20px;">COMMERCIA</div>
    <h1 style="font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px 0;">Votre code de vérification administrateur</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 16px 0;">Une tentative d'accès à la console d'administration de COMMERCIA a été initiée.</p>
    <div style="background: #090D16; border: 2px solid #10B981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; color: #94A3B8; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Votre code de sécurité est :</div>
      <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #10B981; margin: 10px 0;">${code}</div>
      <div style="font-size: 12px; color: #EF4444; font-weight: 700; margin-top: 8px;">Valable pendant ${expiresInMinutes} minutes — Usage unique</div>
    </div>
    <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 16px 0;">Ce code est valable pendant 5 minutes et ne peut être utilisé qu'une seule fois.</p>
    <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 16px 0;"><strong style="color: #FFFFFF;">Ne communiquez jamais ce code à une autre personne.</strong></p>
    <p style="font-size: 14px; line-height: 1.6; color: #CBD5E1; margin: 0 0 16px 0;">Si vous n'êtes pas à l'origine de cette tentative, ignorez ce message et vérifiez la sécurité de votre compte.</p>
    <div style="font-size: 12px; color: #64748B; background: #1E293B; padding: 12px; border-radius: 8px; margin-top: 20px;">
      ${ipAddress ? `<div><strong>Adresse IP :</strong> ${ipAddress}</div>` : ''}
      ${userAgent ? `<div><strong>Environnement :</strong> ${userAgent.substring(0, 70)}</div>` : ''}
      <div><strong>Horodatage UTC :</strong> ${new Date().toUTCString()}</div>
    </div>
    <div style="font-size: 12px; color: #94A3B8; text-align: center; margin-top: 24px; font-weight: 600;">
      COMMERCIA — Protection de l'administration SaaS.
    </div>
  </div>
</body>
</html>`;

    // Environnement de test isolé uniquement (NODE_ENV === 'test' avec testMailSink explicite)
    if (process.env.NODE_ENV === 'test' && this.testMailSink) {
      this.testMailSink({ to: recipientEmail, code, subject, text });
      this.lastDispatchAudit = {
        email: recipientEmail,
        sentAt: new Date(),
        provider: 'TEST_ISOLATED',
        delivered: true,
      };
      return {
        success: true,
        deliveredRemotely: true,
        provider: 'TEST_ISOLATED',
        messageId: `test-isolated-${Date.now()}`,
      };
    }

    // Appel exclusif à Resend API depuis le backend
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    const fromAddress = this.getFromAddress();

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipientEmail],
          subject,
          html,
          text,
        }),
      });

      if (res.ok) {
        const resData: any = await res.json().catch(() => ({}));
        if (resData && resData.id) {
          this.lastDispatchAudit = {
            email: recipientEmail,
            sentAt: new Date(),
            provider: 'RESEND_API',
            delivered: true,
          };
          return {
            success: true,
            deliveredRemotely: true,
            provider: 'RESEND_API',
            messageId: String(resData.id),
          };
        }
      }
    } catch {
      // Ne jamais exposer la clé API ou les détails sensibles dans les journaux
    }

    this.lastDispatchAudit = {
      email: recipientEmail,
      sentAt: new Date(),
      provider: 'RESEND_API',
      delivered: false,
    };

    return {
      success: false,
      deliveredRemotely: false,
      provider: 'RESEND_API',
      errorCode: 'EMAIL_SEND_FAILED',
      error: EMAIL_SEND_FAILED_MESSAGE,
    };
  }

  public async sendNewEnvironmentAlert(data: { email: string; ipAddress: string; userAgent: string }): Promise<void> {
    if (!this.isOperational() || (process.env.NODE_ENV === 'test' && this.testMailSink)) return;
    const { email, ipAddress, userAgent } = data;
    const resendKey = (process.env.RESEND_API_KEY || '').trim();
    if (!resendKey) return;

    const subject = 'COMMERCIA — Alerte de sécurité : Nouvelle session Super Admin';
    const text = `Une session Super Admin a été ouverte sur COMMERCIA depuis une nouvelle adresse IP (${ipAddress}) ou un nouvel environnement.\nNavigateur: ${userAgent}\nSi c'était vous, aucune action n'est requise. Sinon, révoquez immédiatement la session.\nCOMMERCIA — Protection de l'administration SaaS.`;

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.getFromAddress(),
          to: [email],
          subject,
          text,
        }),
      });
    } catch {
      // Ignorer silencieusement
    }
  }
}

export const emailService = new EmailService();
