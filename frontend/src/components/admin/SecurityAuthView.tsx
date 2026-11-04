import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Clock,
  AlertTriangle,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  Laptop,
  Server,
  Globe,
  Users,
  Settings,
  Activity,
  History,
} from 'lucide-react';
import { api } from '../../services/api';

interface SecurityOverview {
  config: {
    authorizedGoogleEmail: string;
    otpValidityMinutes: number;
    maxOtpAttempts: number;
    sessionDurationMinutes: number;
    requireMfaForSensitive: boolean;
    emailNotificationOnNewIp: boolean;
  };
  adminUser: {
    id: string;
    email: string;
    adminGoogleEmail?: string;
    googleId?: string;
    firstName?: string;
    lastName?: string;
  };
  emailService: {
    isConfigured: boolean;
    transport: string;
    lastSentCode?: { email: string; sentAt: string } | null;
  };
  activeSessions: Array<{
    id: string;
    ipAddress?: string;
    userAgent?: string;
    createdAt: string;
    expiresAt: string;
    isActive: boolean;
  }>;
  recentLogs: Array<{
    id: string;
    timestamp: string;
    email: string;
    authMethod: string;
    step: string;
    status: string;
    ipAddress?: string;
    failureReason?: string;
  }>;
  alerts: Array<{
    type: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    timestamp: string;
  }>;
}

export const SecurityAuthView: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme = 'dark' }) => {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Formulaire de configuration
  const [sessionDuration, setSessionDuration] = useState<number>(60);
  const [otpValidity, setOtpValidity] = useState<number>(5);
  const [maxAttempts, setMaxAttempts] = useState<number>(5);
  const [requireMfaSensitive, setRequireMfaSensitive] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get<SecurityOverview>('/admin/security/overview');
      setData(res);
      if (res.config) {
        setSessionDuration(res.config.sessionDurationMinutes || 60);
        setOtpValidity(res.config.otpValidityMinutes || 5);
        setMaxAttempts(res.config.maxOtpAttempts || 5);
        setRequireMfaSensitive(res.config.requireMfaForSensitive !== false);
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors du chargement des données de sécurité.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.put('/admin/security/config', {
        sessionDurationMinutes: Number(sessionDuration),
        otpValidityMinutes: Number(otpValidity),
        maxOtpAttempts: Number(maxAttempts),
        requireMfaForSensitive: requireMfaSensitive,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la mise à jour des paramètres.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm('Voulez-vous révoquer immédiatement cette session administrative ?')) return;
    try {
      await api.post(`/admin/security/sessions/${sessionId}/revoke`);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Échec de la révocation.');
    }
  };

  const emailInfo = data?.emailService || (data as any)?.emailServiceStatus || { isConfigured: false, transport: 'NON CONFIGURÉ (FAIL-CLOSED)' };

  const isLight = theme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderColor = isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)';
  const textColor = isLight ? '#0F172A' : '#F8FAFC';
  const subTextColor = isLight ? '#64748B' : '#94A3B8';

  if (isLoading && !data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: subTextColor }}>
        <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
        <div>Chargement du module de sécurité administrative Zero-Trust...</div>
      </div>
    );
  }

  return (
    <div style={{ color: textColor }}>
      {/* En-tête */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={24} color="#10B981" />
            <span>Sécurité & Authentification Administrateur</span>
          </h2>
          <p style={{ color: subTextColor, fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Protection renforcée IAM, conformité Google OpenID Connect et MFA Gmail transactionnel.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '8px',
            background: isLight ? '#F1F5F9' : 'rgba(255, 255, 255, 0.06)',
            border: `1px solid ${borderColor}`,
            color: textColor,
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', borderRadius: '10px', color: '#F87171', marginBottom: '20px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Cartes d'état principal */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Identité Google */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(66, 133, 244, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4285F4' }}>
              <Globe size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Identité Google Super Admin</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>{data?.config.authorizedGoogleEmail || 'c*************@gmail.com'}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>
            <CheckCircle2 size={14} />
            <span>Compte officiel vérifié côté serveur (sub immuable)</span>
          </div>
        </div>

        {/* Service Email Resend Transactionnel */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
              <Mail size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Service d'Envoi Email OTP</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: emailInfo.isConfigured ? '#10B981' : '#EF4444' }}>
                {emailInfo.isConfigured ? 'API Resend Active' : 'Non Configuré (Fail-Closed)'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: emailInfo.isConfigured ? '#38BDF8' : '#EF4444', fontWeight: 600 }}>
            <ShieldCheck size={14} />
            <span>Transport: {emailInfo.transport || 'NON CONFIGURÉ (FAIL-CLOSED)'}</span>
          </div>
        </div>

        {/* Sessions Actives */}
        <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
              <KeyRound size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: subTextColor, fontWeight: 700, textTransform: 'uppercase' }}>Sessions Renforcées</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800 }}>
                {data?.activeSessions.length || 0} session(s) active(s)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>
            <Activity size={14} />
            <span>Cookie HttpOnly + HMAC-SHA-256</span>
          </div>
        </div>
      </div>

      {/* Statut Serveur Resend Transactionnel (Lecture seule côté serveur) */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Server size={18} color="#10B981" />
          <span>Service d'Envoi Transactionnel Resend (Configuration Serveur Exclusive)</span>
        </h3>
        <p style={{ fontSize: '0.82rem', color: subTextColor, margin: '0 0 12px 0', lineHeight: 1.5 }}>
          Politique de sécurité <strong>FAIL-CLOSED</strong> : aucun secret e-mail ni mot de passe Google n'est jamais demandé ou stocké dans l'interface utilisateur. L'envoi des codes OTP à 8 chiffres vers l'adresse administrateur masquée <strong>{data?.config.authorizedGoogleEmail || 'c*************@gmail.com'}</strong> s'effectue exclusivement côté serveur via les variables d'environnement sécurisées Vercel (<code>RESEND_API_KEY</code>, <code>ADMIN_OTP_FROM_EMAIL</code>, <code>ADMIN_OTP_HASH_SECRET</code>).
        </p>
      </div>

      {/* Formulaire de configuration de sécurité */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} color="#0062FF" />
          <span>Paramètres des Politiques d'Accès</span>
        </h3>

        <form onSubmit={handleSaveConfig}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: subTextColor, marginBottom: '6px' }}>
                Durée Validité OTP (minutes)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={otpValidity}
                onChange={(e) => setOtpValidity(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${borderColor}`,
                  background: isLight ? '#FFFFFF' : '#1E293B',
                  color: textColor,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: subTextColor, marginBottom: '6px' }}>
                Nombre Max de Tentatives
              </label>
              <input
                type="number"
                min={3}
                max={10}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${borderColor}`,
                  background: isLight ? '#FFFFFF' : '#1E293B',
                  color: textColor,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: subTextColor, marginBottom: '6px' }}>
                Durée Session Admin (minutes)
              </label>
              <input
                type="number"
                min={30}
                max={1440}
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: `1px solid ${borderColor}`,
                  background: isLight ? '#FFFFFF' : '#1E293B',
                  color: textColor,
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={requireMfaSensitive}
                onChange={(e) => setRequireMfaSensitive(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <span>Exiger une réauthentification pour les opérations particulièrement sensibles</span>
            </label>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#0062FF',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(0, 98, 255, 0.3)',
              }}
            >
              {isSaving ? 'Enregistrement...' : saveSuccess ? '✓ Enregistré !' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>
      </div>

      {/* Sessions Administratives Actives */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Laptop size={18} color="#10B981" />
          <span>Sessions Administratives Actives</span>
        </h3>

        {(!data?.activeSessions || data.activeSessions.length === 0) ? (
          <div style={{ padding: '20px', textAlign: 'center', color: subTextColor, fontSize: '0.85rem' }}>
            Aucune session administrative active pour le moment.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}`, textAlign: 'left', color: subTextColor }}>
                  <th style={{ padding: '10px' }}>IP / Navigateur</th>
                  <th style={{ padding: '10px' }}>Date Création</th>
                  <th style={{ padding: '10px' }}>Expire le</th>
                  <th style={{ padding: '10px' }}>Statut</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.activeSessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                    <td style={{ padding: '12px 10px' }}>
                      <div style={{ fontWeight: 700 }}>{s.ipAddress || '127.0.0.1'}</div>
                      <div style={{ fontSize: '0.72rem', color: subTextColor, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.userAgent || 'Navigateur sécurisé'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 10px' }}>{new Date(s.createdAt).toLocaleString()}</td>
                    <td style={{ padding: '12px 10px' }}>{new Date(s.expiresAt).toLocaleString()}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', fontWeight: 700, fontSize: '0.72rem' }}>
                        ACTIVE
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: 'none',
                          color: '#EF4444',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Révoquer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Access Logs */}
      <div style={{ background: cardBg, border: `1px solid ${borderColor}`, borderRadius: '16px', padding: '24px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#38BDF8" />
          <span>Security Access Logs (Journaux d'accès immuables)</span>
        </h3>

        {(!data?.recentLogs || data.recentLogs.length === 0) ? (
          <div style={{ padding: '20px', textAlign: 'center', color: subTextColor, fontSize: '0.85rem' }}>
            Aucun journal d'accès récent.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${borderColor}`, textAlign: 'left', color: subTextColor }}>
                  <th style={{ padding: '10px' }}>Horodatage</th>
                  <th style={{ padding: '10px' }}>Identité / Email</th>
                  <th style={{ padding: '10px' }}>Étape</th>
                  <th style={{ padding: '10px' }}>Méthode</th>
                  <th style={{ padding: '10px' }}>Statut</th>
                  <th style={{ padding: '10px' }}>Détails / Motif</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  return (
                    <tr key={log.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                      <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})
                      </td>
                      <td style={{ padding: '10px', fontWeight: 600 }}>{log.email}</td>
                      <td style={{ padding: '10px' }}>
                        <code style={{ fontSize: '0.75rem', background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px' }}>
                          {log.step}
                        </code>
                      </td>
                      <td style={{ padding: '10px' }}>{log.authMethod}</td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: isSuccess ? '#34D399' : '#EF4444',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px', color: log.failureReason ? '#F87171' : subTextColor, fontSize: '0.75rem' }}>
                        {log.failureReason || 'Authentifié avec succès'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
