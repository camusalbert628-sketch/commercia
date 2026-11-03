import nodemailer, { Transporter } from 'nodemailer';

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
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;
  public lastSentCode: { email: string; code: string; sentAt: Date } | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.isConfigured = true;
        console.log(`✉️ [EMAIL SERVICE] Serveur SMTP configuré (${host}:${port})`);
      } catch (err: any) {
        console.warn(`⚠️ [EMAIL SERVICE] Échec d'initialisation SMTP:`, err?.message);
        this.isConfigured = false;
      }
    } else {
      console.log(`ℹ️ [EMAIL SERVICE] Mode Sandbox/Simulation actif (SMTP non configuré dans .env)`);
      this.isConfigured = false;
    }
  }

  public getStatus(): { isConfigured: boolean; provider: string } {
    return {
      isConfigured: this.isConfigured,
      provider: this.isConfigured ? 'SMTP_LIVE' : 'SANDBOX_TRANSACTIONAL',
    };
  }

  public async sendSecurityCodeEmail(data: SecurityCodeEmailData): Promise<{ success: boolean; messageId?: string }> {
    const { recipientEmail, code, expiresInMinutes, ipAddress, userAgent } = data;
    this.lastSentCode = { email: recipientEmail, code, sentAt: new Date() };

    const subject = 'COMMERCIA — Code de sécurité administrateur';
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

    if (this.isConfigured && this.transporter) {
      try {
        const from = process.env.SMTP_FROM || '"COMMERCIA Security" <security@commercia.com>';
        const info = await this.transporter.sendMail({
          from,
          to: recipientEmail,
          subject,
          text,
          html,
        });
        console.log(`✅ [EMAIL LIVE] Code envoyé à ${recipientEmail} (MsgID: ${info.messageId})`);
        return { success: true, messageId: info.messageId };
      } catch (err: any) {
        console.error(`❌ [EMAIL LIVE ERROR] Erreur d'envoi SMTP:`, err?.message);
      }
    }

    // Mode simulation / Sandbox sécurisé (log clair en console pour développement et tests)
    console.log(`\n============================================================`);
    console.log(`📩 [COMMERCIA TRANSACTIONAL EMAIL SANDBOX]`);
    console.log(`À           : ${recipientEmail}`);
    console.log(`Objet       : ${subject}`);
    console.log(`CODE GÉNÉRÉ : >>> ${code} <<<`);
    console.log(`Validité    : ${expiresInMinutes} minutes`);
    console.log(`Horodatage  : ${new Date().toISOString()}`);
    console.log(`============================================================\n`);

    return { success: true, messageId: `sandbox-${Date.now()}` };
  }

  public async sendNewEnvironmentAlert(data: { email: string; ipAddress: string; userAgent: string }): Promise<void> {
    const { email, ipAddress, userAgent } = data;
    const subject = 'COMMERCIA — Alerte de sécurité : Nouvelle session Super Admin';
    const text = `Une session Super Admin a été ouverte sur COMMERCIA depuis une nouvelle adresse IP (${ipAddress}) ou un nouvel environnement.\nNavigateur: ${userAgent}\nSi c'était vous, aucune action n'est requise. Sinon, révoquez immédiatement la session.\nCOMMERCIA Security.`;

    if (this.isConfigured && this.transporter) {
      try {
        const from = process.env.SMTP_FROM || '"COMMERCIA Security" <security@commercia.com>';
        await this.transporter.sendMail({ from, to: email, subject, text });
      } catch (err: any) {
        console.warn(`[SECURITY ALERT EMAIL FAILED]`, err?.message);
      }
    } else {
      console.log(`🔔 [SECURITY ALERT SANDBOX] Notification nouvel IP ${ipAddress} pour ${email}`);
    }
  }
}

export const emailService = new EmailService();
