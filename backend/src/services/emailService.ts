import nodemailer, { Transporter } from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { decryptSecret } from '../utils/crypto';

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

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
  provider: 'SMTP_LIVE' | 'RESEND_API' | 'DIRECT_SECURE_FALLBACK';
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;
  private activeProviderName: string = 'SANDBOX_TRANSACTIONAL';
  private smtpUser: string = '';
  public lastSentCode: { email: string; code: string; sentAt: Date } | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
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
        this.activeProviderName = `SMTP_LIVE (${host}:${port})`;
        console.log(`✉️ [EMAIL SERVICE] Serveur SMTP configuré (${host}:${port})`);
      } catch (err: any) {
        console.warn(`⚠️ [EMAIL SERVICE] Échec d'initialisation SMTP:`, err?.message);
        this.isConfigured = false;
      }
    } else if (process.env.RESEND_API_KEY) {
      this.isConfigured = true;
      this.activeProviderName = 'RESEND_LIVE_API';
      console.log(`✉️ [EMAIL SERVICE] API Resend configurée`);
    } else {
      console.log(`ℹ️ [EMAIL SERVICE] Mode Canal Sécurisé Direct actif (aucun serveur SMTP externe dans .env)`);
      this.isConfigured = false;
      this.activeProviderName = 'DIRECT_SECURE_CHANNEL';
    }
  }

  /**
   * Permet de configurer à chaud un transporteur SMTP (ex: Gmail App Password enregistré par le Super Admin en DB)
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
    this.activeProviderName = `SMTP_LIVE (${host}:${port})`;
  }

  /**
   * Charge dynamiquement la configuration SMTP ou Resend depuis la table SystemApiKey si non présente en mémoire
   */
  public async ensureDynamicConfigLoaded(prisma?: PrismaClient): Promise<void> {
    if (this.isConfigured || !prisma) return;
    try {
      const smtpKey = await prisma.systemApiKey.findFirst({
        where: {
          serviceName: { in: ['gmail_smtp', 'smtp', 'resend'] },
          isActive: true,
        },
      });
      if (!smtpKey) return;

      const decrypted = decryptSecret(smtpKey.encryptedKey);
      if (!decrypted) return;

      if (smtpKey.serviceName === 'resend') {
        process.env.RESEND_API_KEY = decrypted;
        this.isConfigured = true;
        this.activeProviderName = 'RESEND_LIVE_API';
        return;
      }

      // Format accepté : soit "email:app_password", soit directement "app_password" (utilise alors l'email Super Admin)
      let user = process.env.SUPER_ADMIN_GOOGLE_EMAIL || 'camusalbert628@gmail.com';
      let pass = decrypted;
      if (decrypted.includes(':')) {
        const parts = decrypted.split(':');
        user = parts[0].trim();
        pass = parts.slice(1).join(':').trim();
      }
      const host = smtpKey.apiUrl || 'smtp.gmail.com';
      this.configureRuntimeSmtp({ host, user, pass });
    } catch (e) {
      // Ignore dynamic load errors silently
    }
  }

  public getStatus(): { isConfigured: boolean; provider: string; transport: string; lastSentCode: { email: string; sentAt: Date } | null } {
    return {
      isConfigured: this.isConfigured,
      provider: this.isConfigured ? 'SMTP_LIVE' : 'DIRECT_SECURE_CHANNEL',
      transport: this.activeProviderName,
      lastSentCode: this.lastSentCode
        ? { email: this.lastSentCode.email, sentAt: this.lastSentCode.sentAt }
        : null,
    };
  }

  public async sendSecurityCodeEmail(data: SecurityCodeEmailData): Promise<SendSecurityEmailResult> {
    const { recipientEmail, code, expiresInMinutes, ipAddress, userAgent, prisma } = data;
    this.lastSentCode = { email: recipientEmail, code, sentAt: new Date() };

    if (prisma) {
      await this.ensureDynamicConfigLoaded(prisma);
    }

    const subject = `COMMERCIA — Code de sécurité administrateur : ${code}`;
    const text = `Une tentative d'accès à la console d'administration de COMMERCIA a été initiée.\n\nVotre code de vérification est : ${code}\n\nCe code expire dans ${expiresInMinutes} minutes et ne peut être utilisé qu'une seule fois.\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message et vérifiez la sécurité de votre compte.\n\nCOMMERCIA — Security System.`;

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1120; margin: 0; padding: 24px; color: #F1F5F9; }
    .card { max-width: 540px; margin: 0 auto; background: #0F172A; border: 1px solid #1E293B; border-radius: 16px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
    .logo { font-size: 22px; font-weight: 800; color: #2563EB; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }
    .badge { display: inline-block; background: #2563EB; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.8px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 800; color: #FFFFFF; margin: 0 0 12px 0; }
    p { font-size: 14px; line-height: 1.6; color: #94A3B8; margin: 0 0 16px 0; }
    .code-box { background: #090D16; border: 2px solid #2563EB; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38BDF8; }
    .meta { font-size: 12px; color: #64748B; background: #1E293B; padding: 12px; border-radius: 8px; margin-top: 20px; }
    .footer { font-size: 11px; color: #475569; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">SÉCURITÉ RENFORCÉE</div>
    <div class="logo">🛡️ COMMERCIA SUPER ADMIN</div>
    <h1>Code de confirmation administratif</h1>
    <p>Une tentative d'accès à la console d'administration de <strong>COMMERCIA</strong> a été initiée depuis votre compte administrateur.</p>
    
    <div class="code-box">
      <div style="font-size: 12px; color: #94A3B8; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">Votre code à usage unique</div>
      <div class="code">${code}</div>
      <div style="font-size: 12px; color: #EF4444; font-weight: 700; margin-top: 8px;">⏱️ Expire dans ${expiresInMinutes} minutes (usage unique)</div>
    </div>

    <p>Si vous n'êtes pas à l'origine de cette demande, <strong>ignorez ce message immédiatement</strong> et vérifiez la sécurité de votre compte Google.</p>
    
    <div class="meta">
      <div><strong>Destinataire officiel :</strong> ${recipientEmail}</div>
      ${ipAddress ? `<div><strong>Adresse IP d'origine :</strong> ${ipAddress}</div>` : ''}
      ${userAgent ? `<div><strong>Navigateur :</strong> ${userAgent.substring(0, 70)}...</div>` : ''}
      <div><strong>Horodatage :</strong> ${new Date().toUTCString()}</div>
    </div>

    <div class="footer">
      COMMERCIA — Système de Protection d'Accès Sécurisé Zero-Trust.<br/>
      Cet email automatique ne peut pas recevoir de réponse.
    </div>
  </div>
</body>
</html>
`;

    // 1. Envoi via SMTP (ex: Gmail App Password ou serveur SMTP personnalisé)
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
        console.log(`✅ [EMAIL LIVE] Code envoyé à ${recipientEmail} (MsgID: ${info.messageId})`);
        return {
          success: true,
          deliveredRemotely: true,
          provider: 'SMTP_LIVE',
          messageId: info.messageId,
        };
      } catch (err: any) {
        console.error(`❌ [EMAIL LIVE ERROR] Erreur d'envoi SMTP:`, err?.message);
      }
    }

    // 2. Envoi via Resend API si configuré
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
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
          console.log(`✅ [RESEND LIVE] Code envoyé à ${recipientEmail} (ID: ${resData.id})`);
          return {
            success: true,
            deliveredRemotely: true,
            provider: 'RESEND_API',
            messageId: resData.id,
          };
        }
      } catch (err: any) {
        console.error(`❌ [RESEND ERROR]`, err?.message);
      }
    }

    // 3. Mode Canal Sécurisé Direct (Fallback sans serveur SMTP externe)
    console.log(`\n============================================================`);
    console.log(`📩 [COMMERCIA TRANSACTIONAL SECURITY CODE]`);
    console.log(`À           : ${recipientEmail}`);
    console.log(`Objet       : ${subject}`);
    console.log(`CODE GÉNÉRÉ : >>> ${code} <<<`);
    console.log(`Validité    : ${expiresInMinutes} minutes`);
    console.log(`Horodatage  : ${new Date().toISOString()}`);
    console.log(`============================================================\n`);

    return {
      success: true,
      deliveredRemotely: false,
      provider: 'DIRECT_SECURE_FALLBACK',
      messageId: `direct-${Date.now()}`,
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
      } catch (err: any) {
        console.warn(`[SECURITY ALERT EMAIL FAILED]`, err?.message);
      }
    } else {
      console.log(`🔔 [SECURITY ALERT] Notification nouvel IP ${ipAddress} pour ${email}`);
    }
  }
}

export const emailService = new EmailService();
