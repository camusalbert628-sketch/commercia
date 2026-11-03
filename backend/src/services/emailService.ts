import nodemailer, { Transporter } from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { decryptSecret } from '../utils/crypto';

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
  provider: 'GMAIL_OAUTH2' | 'SMTP_TLS' | 'RESEND_API' | 'BREVO_API' | 'TEST_ISOLATED' | 'UNCONFIGURED';
  messageId?: string;
  error?: string;
}

export const FAIL_CLOSED_EMAIL_ERROR_MESSAGE =
  "Service de vérification indisponible. L'envoi du code de sécurité n'a pas pu être effectué. Veuillez contacter l'administrateur système ou vérifier la configuration du service de messagerie.";

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;
  private activeProviderName: string = 'UNCONFIGURED';
  private smtpUser: string = '';

  // Métadonnées d'audit SANS JAMAIS stocker le code OTP
  public lastDispatchAudit: { email: string; sentAt: Date; provider: string; delivered: boolean } | null = null;

  // Intercepteur strictement isolé pour les tests automatisés (uniquement si NODE_ENV === 'test')
  private testMailSink: ((payload: { to: string; code: string; subject: string }) => void) | null = null;
  private forceUnavailableInTest: boolean = false;

  constructor() {
    this.initTransporterFromEnv();
  }

  public initTransporterFromEnv() {
    this.transporter = null;
    this.isConfigured = false;
    this.activeProviderName = 'UNCONFIGURED';

    // 1. Priorité 1 : Gmail API OAuth2
    const oauthClientId = process.env.GMAIL_CLIENT_ID;
    const oauthClientSecret = process.env.GMAIL_CLIENT_SECRET;
    const oauthRefreshToken = process.env.GMAIL_REFRESH_TOKEN;
    const oauthUser = process.env.GMAIL_USER || process.env.SUPER_ADMIN_GOOGLE_EMAIL || 'camusalbert628@gmail.com';

    if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
      try {
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: oauthUser,
            clientId: oauthClientId,
            clientSecret: oauthClientSecret,
            refreshToken: oauthRefreshToken,
          },
        });
        this.isConfigured = true;
        this.smtpUser = oauthUser;
        this.activeProviderName = 'GMAIL_OAUTH2';
        return;
      } catch {
        this.isConfigured = false;
      }
    }

    // 2. Priorité 2 : Serveur SMTP sécurisé TLS/SSL (Gmail App Password ou SMTP dédié)
    const host = process.env.SMTP_HOST || (process.env.GMAIL_APP_PASSWORD ? 'smtp.gmail.com' : '');
    const port = Number(process.env.SMTP_PORT) || (host === 'smtp.gmail.com' ? 465 : 587);
    const user = process.env.SMTP_USER || process.env.SUPER_ADMIN_GOOGLE_EMAIL || 'camusalbert628@gmail.com';
    const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.isConfigured = true;
        this.smtpUser = user;
        this.activeProviderName = `SMTP_TLS (${host}:${port})`;
        return;
      } catch {
        this.isConfigured = false;
      }
    }

    // 3. Priorité 3 : Prestataire transactionnel Resend ou Brevo
    if (process.env.RESEND_API_KEY) {
      this.isConfigured = true;
      this.activeProviderName = 'RESEND_API';
      return;
    }

    if (process.env.BREVO_API_KEY) {
      this.isConfigured = true;
      this.activeProviderName = 'BREVO_API';
      return;
    }
  }

  /**
   * Uniquement utilisable par la suite de tests automatisés lorsque NODE_ENV === 'test'
   * et jamais en production.
   */
  public setIsolatedTestSink(
    sink: ((payload: { to: string; code: string; subject: string }) => void) | null,
    options?: { forceUnavailable?: boolean }
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Interdit en production : le sink de test est strictement réservé à NODE_ENV=test.');
    }
    this.testMailSink = sink;
    this.forceUnavailableInTest = Boolean(options?.forceUnavailable);
  }

  /**
   * Configure un transporteur SMTP sécurisé et vérifie la connexion réelle si demandé
   */
  public configureRuntimeSmtp(params: { host?: string; port?: number; user: string; pass: string }) {
    const host = params.host || 'smtp.gmail.com';
    const port = params.port || (host === 'smtp.gmail.com' ? 465 : 587);
    const cleanPass = params.pass.replace(/\s+/g, '');
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user: params.user.trim(), pass: cleanPass },
    });
    this.isConfigured = true;
    this.smtpUser = params.user.trim();
    this.activeProviderName = `SMTP_TLS (${host}:${port})`;
  }

  public async verifySmtpConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.transporter) {
      return { ok: false, error: 'Aucun transporteur SMTP initialisé.' };
    }
    try {
      await this.transporter.verify();
      return { ok: true };
    } catch (err: any) {
      this.isConfigured = false;
      this.transporter = null;
      this.activeProviderName = 'UNCONFIGURED';
      return { ok: false, error: err?.message || 'Échec de vérification SMTP.' };
    }
  }

  /**
   * Charge dynamiquement la configuration chiffrée AES-256-GCM depuis SystemApiKey
   */
  public async ensureDynamicConfigLoaded(prisma?: PrismaClient): Promise<void> {
    if (this.isConfigured || !prisma) return;
    try {
      const mailKey = await prisma.systemApiKey.findFirst({
        where: {
          serviceName: { in: ['gmail_oauth', 'gmail_smtp', 'smtp', 'resend', 'brevo'] },
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
      if (!mailKey || !mailKey.encryptedKey) return;

      const decrypted = decryptSecret(mailKey.encryptedKey);
      if (!decrypted) return;

      if (mailKey.serviceName === 'resend') {
        process.env.RESEND_API_KEY = decrypted;
        this.isConfigured = true;
        this.activeProviderName = 'RESEND_API';
        return;
      }

      if (mailKey.serviceName === 'brevo') {
        process.env.BREVO_API_KEY = decrypted;
        this.isConfigured = true;
        this.activeProviderName = 'BREVO_API';
        return;
      }

      if (mailKey.serviceName === 'gmail_oauth') {
        const parsed = JSON.parse(decrypted);
        if (parsed.clientId && parsed.clientSecret && parsed.refreshToken) {
          const user = parsed.user || process.env.SUPER_ADMIN_GOOGLE_EMAIL || 'camusalbert628@gmail.com';
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              type: 'OAuth2',
              user,
              clientId: parsed.clientId,
              clientSecret: parsed.clientSecret,
              refreshToken: parsed.refreshToken,
            },
          });
          this.isConfigured = true;
          this.smtpUser = user;
          this.activeProviderName = 'GMAIL_OAUTH2';
          return;
        }
      }

      let user = process.env.SUPER_ADMIN_GOOGLE_EMAIL || 'camusalbert628@gmail.com';
      let pass = decrypted;
      if (decrypted.includes(':')) {
        const parts = decrypted.split(':');
        user = parts[0].trim();
        pass = parts.slice(1).join(':').trim();
      }
      const host = mailKey.apiUrl || 'smtp.gmail.com';
      this.configureRuntimeSmtp({ host, user, pass });
    } catch {
      // Fail closed silently if DB key cannot be decrypted
    }
  }

  public getStatus(): {
    isConfigured: boolean;
    provider: string;
    transport: string;
    lastSentCode: { email: string; sentAt: Date } | null;
  } {
    return {
      isConfigured: this.isConfigured,
      provider: this.isConfigured ? this.activeProviderName : 'UNCONFIGURED',
      transport: this.isConfigured ? this.activeProviderName : 'NON CONFIGURÉ (FAIL-CLOSED)',
      lastSentCode: this.lastDispatchAudit
        ? { email: this.lastDispatchAudit.email, sentAt: this.lastDispatchAudit.sentAt }
        : null,
    };
  }

  /**
   * Envoie le code OTP par email transactionnel réel.
   * POLITIQUE FAIL CLOSED :
   * - Ne journalise JAMAIS le code OTP dans la console ni dans les logs.
   * - Si aucun service d'envoi réel n'est configuré ou si l'envoi échoue, retourne success: false.
   */
  public async sendSecurityCodeEmail(data: SecurityCodeEmailData): Promise<SendSecurityEmailResult> {
    const { recipientEmail, code, expiresInMinutes, ipAddress, userAgent, prisma } = data;

    if (this.forceUnavailableInTest) {
      return {
        success: false,
        deliveredRemotely: false,
        provider: 'UNCONFIGURED',
        error: FAIL_CLOSED_EMAIL_ERROR_MESSAGE,
      };
    }

    if (prisma) {
      await this.ensureDynamicConfigLoaded(prisma);
    }

    const subject = 'COMMERCIA — Code de sécurité administrateur à usage unique';
    const text = [
      "Une tentative d'accès à la console d'administration de COMMERCIA a été initiée.",
      '',
      `Votre code de sécurité à 8 chiffres est : ${code}`,
      '',
      `Ce code est strictement personnel, à usage unique, et expire dans ${expiresInMinutes} minutes.`,
      "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message et vérifiez la sécurité de votre compte.",
      '',
      'COMMERCIA — Système de Sécurité Zero-Trust.',
    ].join('\n');

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1120; margin: 0; padding: 24px; color: #F1F5F9; }
    .card { max-width: 540px; margin: 0 auto; background: #0F172A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .logo { font-size: 22px; font-weight: 800; color: #10B981; letter-spacing: -0.02em; margin-bottom: 20px; }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; color: #34D399; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.8px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px 0; }
    p { font-size: 14px; line-height: 1.6; color: #94A3B8; margin: 0 0 16px 0; }
    .code-box { background: #090D16; border: 2px solid #10B981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code { font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #10B981; }
    .meta { font-size: 12px; color: #64748B; background: #1E293B; padding: 12px; border-radius: 8px; margin-top: 20px; }
    .footer { font-size: 11px; color: #475569; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">PROTECTION ZERO-TRUST — MFA</div>
    <div class="logo">COMMERCIA SUPER ADMIN</div>
    <h1>Code de sécurité à usage unique</h1>
    <p>Une demande d'accès à la console d'administration de <strong>COMMERCIA</strong> a été initiée depuis votre compte Super Administrateur.</p>
    <div class="code-box">
      <div style="font-size: 12px; color: #94A3B8; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Code de vérification (8 chiffres)</div>
      <div class="code">${code}</div>
      <div style="font-size: 12px; color: #EF4444; font-weight: 700; margin-top: 8px;">Expire dans ${expiresInMinutes} minutes — Usage unique strict</div>
    </div>
    <p>Ne partagez jamais ce code. Le support ou l'interface COMMERCIA n'affichera jamais ce code à l'écran.</p>
    <div class="meta">
      <div><strong>Destinataire autorisé :</strong> ${recipientEmail}</div>
      ${ipAddress ? `<div><strong>Adresse IP :</strong> ${ipAddress}</div>` : ''}
      ${userAgent ? `<div><strong>Agent :</strong> ${userAgent.substring(0, 70)}</div>` : ''}
      <div><strong>Horodatage UTC :</strong> ${new Date().toUTCString()}</div>
    </div>
    <div class="footer">
      COMMERCIA — Système d'Authentification Renforcée.<br/>
      Message transactionnel automatique.
    </div>
  </div>
</body>
</html>`;

    // 1. Envoi via Transporteur Nodemailer (Gmail OAuth2 ou SMTP TLS/SSL)
    if (this.isConfigured && this.transporter) {
      try {
        const from = process.env.SMTP_FROM || `"COMMERCIA Security" <${this.smtpUser || 'security@commercia.com'}>`;
        const info = await this.transporter.sendMail({
          from,
          to: recipientEmail,
          subject,
          text,
          html,
        });
        const providerType = this.activeProviderName === 'GMAIL_OAUTH2' ? 'GMAIL_OAUTH2' : 'SMTP_TLS';
        this.lastDispatchAudit = {
          email: recipientEmail,
          sentAt: new Date(),
          provider: providerType,
          delivered: true,
        };
        return {
          success: true,
          deliveredRemotely: true,
          provider: providerType,
          messageId: info.messageId,
        };
      } catch {
        this.lastDispatchAudit = {
          email: recipientEmail,
          sentAt: new Date(),
          provider: this.activeProviderName,
          delivered: false,
        };
        return {
          success: false,
          deliveredRemotely: false,
          provider: 'UNCONFIGURED',
          error: FAIL_CLOSED_EMAIL_ERROR_MESSAGE,
        };
      }
    }

    // 2. Envoi via Resend API Transactionnelle
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.SMTP_FROM || 'COMMERCIA Security <onboarding@resend.dev>',
            to: [recipientEmail],
            subject,
            html,
            text,
          }),
        });
        if (res.ok) {
          const resData: any = await res.json();
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
            messageId: resData.id,
          };
        }
      } catch {
        // Fall through to fail-closed error
      }
      return {
        success: false,
        deliveredRemotely: false,
        provider: 'UNCONFIGURED',
        error: FAIL_CLOSED_EMAIL_ERROR_MESSAGE,
      };
    }

    // 3. Envoi via Brevo (Sendinblue) API Transactionnelle
    const brevoKey = process.env.BREVO_API_KEY;
    if (brevoKey) {
      try {
        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: 'COMMERCIA Security', email: process.env.SMTP_USER || 'security@commercia.com' },
            to: [{ email: recipientEmail }],
            subject,
            htmlContent: html,
            textContent: text,
          }),
        });
        if (res.ok) {
          const resData: any = await res.json();
          this.lastDispatchAudit = {
            email: recipientEmail,
            sentAt: new Date(),
            provider: 'BREVO_API',
            delivered: true,
          };
          return {
            success: true,
            deliveredRemotely: true,
            provider: 'BREVO_API',
            messageId: resData.messageId,
          };
        }
      } catch {
        // Fall through to fail-closed error
      }
      return {
        success: false,
        deliveredRemotely: false,
        provider: 'UNCONFIGURED',
        error: FAIL_CLOSED_EMAIL_ERROR_MESSAGE,
      };
    }

    // 4. Environnement de test isolé uniquement (NODE_ENV === 'test' avec testMailSink explicite)
    if (process.env.NODE_ENV === 'test' && this.testMailSink) {
      this.testMailSink({ to: recipientEmail, code, subject });
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

    // 5. POLITIQUE FAIL CLOSED STRICTE EN PRODUCTION / DÉFAUT :
    // Aucun faux succès, aucun log du code, aucun fallback exposant le code.
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
      error: FAIL_CLOSED_EMAIL_ERROR_MESSAGE,
    };
  }

  public async sendNewEnvironmentAlert(data: { email: string; ipAddress: string; userAgent: string }): Promise<void> {
    const { email, ipAddress, userAgent } = data;
    const subject = 'COMMERCIA — Alerte de sécurité : Nouvelle session Super Admin';
    const text = `Une session Super Admin a été ouverte sur COMMERCIA depuis une nouvelle adresse IP (${ipAddress}) ou un nouvel environnement.\nNavigateur: ${userAgent}\nSi c'était vous, aucune action n'est requise. Sinon, révoquez immédiatement la session.\nCOMMERCIA Security.`;

    if (this.isConfigured && this.transporter) {
      try {
        const from = process.env.SMTP_FROM || `"COMMERCIA Security" <${this.smtpUser || 'security@commercia.com'}>`;
        await this.transporter.sendMail({ from, to: email, subject, text });
      } catch {
        // Ignore alert send error
      }
    }
  }
}

export const emailService = new EmailService();
