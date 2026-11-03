import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, ArrowRight, RefreshCw, AlertTriangle, Lock, KeyRound, CheckCircle2, X, Settings } from 'lucide-react';
import { api, setAdminSessionCredentials } from '../../services/api';

const OTP_LENGTH = 8;
const EMPTY_DIGITS = Array(OTP_LENGTH).fill('');

interface AdminMfaChallengeModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (token: string) => void;
}

export const AdminMfaChallengeModal: React.FC<AdminMfaChallengeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'prompt' | 'input' | 'success'>('prompt');
  const [maskedEmail, setMaskedEmail] = useState<string>('c*************@gmail.com');
  const [challengeId, setChallengeId] = useState<string>('');
  const [codeDigits, setCodeDigits] = useState<string[]>([...EMPTY_DIGITS]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [statusConfirmation, setStatusConfirmation] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(300); // 5 min
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // Configuration initiale du service de messagerie si non configuré (Fail-Closed)
  const [emailServiceConfigured, setEmailServiceConfigured] = useState<boolean>(true);
  const [showMailerSetup, setShowMailerSetup] = useState<boolean>(false);
  const [mailerProvider, setMailerProvider] = useState<'gmail_smtp' | 'resend'>('gmail_smtp');
  const [mailerSecret, setMailerSecret] = useState<string>('');
  const [isConfiguringMailer, setIsConfiguringMailer] = useState<boolean>(false);
  const [mailerSetupSuccess, setMailerSetupSuccess] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setStep('prompt');
    setError(null);
    setStatusConfirmation(null);
    setChallengeId('');
    setCodeDigits([...EMPTY_DIGITS]);
    setShowMailerSetup(false);
    setMailerSetupSuccess(null);

    api
      .get<{
        maskedEmail: string;
        isVerified: boolean;
        emailService?: { isConfigured: boolean; provider: string };
      }>('/admin-auth/status')
      .then((data) => {
        if (data.maskedEmail) {
          setMaskedEmail(data.maskedEmail);
        }
        if (data.emailService) {
          setEmailServiceConfigured(Boolean(data.emailService.isConfigured));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (step !== 'input') return;
    const interval = setInterval(() => {
      setExpiresInSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleRequestOtp = async () => {
    setIsLoading(true);
    setError(null);
    setStatusConfirmation(null);
    setMailerSetupSuccess(null);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        challengeId: string;
        maskedEmail: string;
        expiresInMinutes: number;
        attemptsRemaining: number;
      }>('/admin-auth/request-otp');

      if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
      setChallengeId(res.challengeId);
      setStatusConfirmation(
        res.message || "Un code de sécurité vient d'être envoyé à votre adresse Gmail administrateur."
      );
      setAttemptsRemaining(res.attemptsRemaining ?? 5);
      setExpiresInSeconds((res.expiresInMinutes || 5) * 60);
      setCodeDigits([...EMPTY_DIGITS]);
      setResendCooldown(30);
      setStep('input');
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setError(
        err?.message ||
          "Service de vérification indisponible. L'envoi du code de sécurité n'a pas pu être effectué. Veuillez contacter l'administrateur système ou vérifier la configuration du service de messagerie."
      );
      if (err?.statusCode === 503) {
        setEmailServiceConfigured(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigureMailer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailerSecret.trim()) return;
    setIsConfiguringMailer(true);
    setError(null);
    setMailerSetupSuccess(null);
    try {
      const res = await api.post<{ success: boolean; message: string }>('/admin-auth/configure-mailer', {
        provider: mailerProvider,
        smtpUser: 'camusalbert628@gmail.com',
        secretOrAppPassword: mailerSecret.trim(),
      });
      setEmailServiceConfigured(true);
      setShowMailerSetup(false);
      setMailerSecret('');
      setMailerSetupSuccess(res.message);
    } catch (err: any) {
      setError(err?.message || 'Échec de la configuration du service de messagerie.');
    } finally {
      setIsConfiguringMailer(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (pasted.length > 0) {
        const nextDigits = [...codeDigits];
        for (let i = 0; i < OTP_LENGTH; i++) {
          nextDigits[i] = pasted[i] || '';
        }
        setCodeDigits(nextDigits);
        const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
        inputRefs.current[focusIdx]?.focus();
        if (pasted.length === OTP_LENGTH) {
          submitCode(pasted);
        }
        return;
      }
    }

    const cleanChar = value.replace(/\D/g, '');
    const nextDigits = [...codeDigits];
    nextDigits[index] = cleanChar;
    setCodeDigits(nextDigits);

    if (cleanChar && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const full = nextDigits.join('');
    if (full.length === OTP_LENGTH && nextDigits.every((d) => d !== '')) {
      submitCode(full);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitCode = async (fullCode: string) => {
    if (!challengeId) {
      setError('Session de vérification invalide. Veuillez demander un nouveau code.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        success: boolean;
        adminSessionToken: string;
        csrfToken?: string;
        expiresAt: string;
      }>('/admin-auth/verify-otp', {
        challengeId,
        code: fullCode.trim(),
      });

      if (res.adminSessionToken) {
        setAdminSessionCredentials(res.adminSessionToken, res.csrfToken);
        setStep('success');
        setTimeout(() => {
          onSuccess(res.adminSessionToken);
        }, 600);
      } else {
        throw new Error('Validation refusée par le serveur.');
      }
    } catch (err: any) {
      setError(err?.message || 'Code de vérification invalide ou expiré.');
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
      setCodeDigits([...EMPTY_DIGITS]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(5, 10, 24, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'linear-gradient(180deg, #0F172A 0%, #090D1A 100%)',
          borderRadius: '24px',
          border: '1px solid #1E293B',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(16, 185, 129, 0.1)',
          padding: '36px 32px',
          position: 'relative',
          color: '#F8FAFC',
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: '#94A3B8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        )}

        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '2px solid rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto',
              color: '#10B981',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)',
            }}
          >
            {step === 'success' ? <CheckCircle2 size={36} color="#10B981" /> : <ShieldCheck size={36} />}
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 12px',
              borderRadius: '20px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34D399',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            <Lock size={12} />
            <span>PROTECTION RENFORCÉE — COMMERCIA ADMIN</span>
          </div>

          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 8px 0', color: '#FFFFFF' }}>
            {step === 'prompt' && 'Vérification de Sécurité Administrateur'}
            {step === 'input' && 'Code de Sécurité Envoyé'}
            {step === 'success' && 'Accès Administrateur Déverrouillé'}
          </h2>

          <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
            {step === 'prompt' && (
              <>
                Votre identité administrateur a été reconnue. Pour accéder à la console d’administration, une vérification de sécurité supplémentaire est obligatoire. Un code à 8 chiffres à usage unique sera envoyé à votre adresse Gmail administrateur.
              </>
            )}
            {step === 'input' && (
              <>
                {statusConfirmation ||
                  "Un code de sécurité vient d'être envoyé à votre adresse Gmail administrateur."}{' '}
                Saisissez les 8 chiffres reçus par email (valide 5 minutes).
              </>
            )}
            {step === 'success' && 'Session administrative renforcée créée avec succès. Redirection...'}
          </p>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(51, 65, 85, 0.7)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
              }}
            >
              <Mail size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
                Gmail Administrateur Autorisé
              </div>
              <div style={{ fontSize: '0.92rem', color: '#E2E8F0', fontWeight: 700, letterSpacing: '0.02em' }}>
                {maskedEmail}
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34D399',
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: 700,
            }}
          >
            OpenID Google
          </div>
        </div>

        {mailerSetupSuccess && (
          <div
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#34D399',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '18px',
            }}
          >
            {mailerSetupSuccess}
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#F87171',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Vérification impossible</div>
              <div style={{ fontSize: '0.78rem', marginTop: '2px', lineHeight: 1.45 }}>{error}</div>
              {step === 'input' && attemptsRemaining > 0 && attemptsRemaining < 5 && (
                <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#FECACA' }}>
                  Tentatives restantes : {attemptsRemaining}/5
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'prompt' && (
          <>
            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                fontSize: '0.96rem',
                fontWeight: 800,
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Envoi sécurisé en cours...</span>
                </>
              ) : (
                <>
                  <span>Envoyer le code de sécurité</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {!emailServiceConfigured && (
              <div style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowMailerSetup((prev) => !prev)}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    color: '#94A3B8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Settings size={14} />
                  <span>Configurer le service de messagerie SMTP Gmail / API Transactionnelle</span>
                </button>

                {showMailerSetup && (
                  <form
                    onSubmit={handleConfigureMailer}
                    style={{
                      marginTop: '12px',
                      background: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid #334155',
                      borderRadius: '12px',
                      padding: '14px',
                    }}
                  >
                    <div style={{ fontSize: '0.76rem', color: '#CBD5E1', marginBottom: '10px', lineHeight: 1.45 }}>
                      Enregistrez un <strong>Mot de passe d'application Google</strong> (16 caractères) ou une clé API <strong>Resend</strong>. Le serveur vérifiera la connexion SMTP avant de vous permettre d'envoyer le code sur Gmail.
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setMailerProvider('gmail_smtp')}
                        style={{
                          flex: 1,
                          padding: '7px',
                          borderRadius: '8px',
                          border: mailerProvider === 'gmail_smtp' ? '1px solid #10B981' : '1px solid #334155',
                          background: mailerProvider === 'gmail_smtp' ? 'rgba(16, 185, 129, 0.15)' : '#1E293B',
                          color: '#F8FAFC',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Gmail SMTP (App Password)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMailerProvider('resend')}
                        style={{
                          flex: 1,
                          padding: '7px',
                          borderRadius: '8px',
                          border: mailerProvider === 'resend' ? '1px solid #10B981' : '1px solid #334155',
                          background: mailerProvider === 'resend' ? 'rgba(16, 185, 129, 0.15)' : '#1E293B',
                          color: '#F8FAFC',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Resend API
                      </button>
                    </div>
                    <input
                      type="password"
                      value={mailerSecret}
                      onChange={(e) => setMailerSecret(e.target.value)}
                      placeholder={
                        mailerProvider === 'gmail_smtp'
                          ? 'Mot de passe d’application Google (16 caractères)'
                          : 'Clé API Resend (re_...)'
                      }
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #475569',
                        background: '#0F172A',
                        color: '#FFFFFF',
                        fontSize: '0.84rem',
                        marginBottom: '10px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={isConfiguringMailer || !mailerSecret.trim()}
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        background: '#0284C7',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: isConfiguringMailer || !mailerSecret.trim() ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isConfiguringMailer ? 'Vérification SMTP en cours...' : 'Enregistrer et vérifier le service email'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </>
        )}

        {step === 'input' && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              {codeDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={OTP_LENGTH}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isLoading || expiresInSeconds === 0}
                  style={{
                    width: '48px',
                    height: '58px',
                    borderRadius: '12px',
                    border: digit ? '2px solid #10B981' : '2px solid #334155',
                    background: '#1E293B',
                    color: '#FFFFFF',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                  }}
                />
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                color: '#94A3B8',
                marginBottom: '22px',
                padding: '0 4px',
              }}
            >
              <div>
                Expire dans :{' '}
                <strong style={{ color: expiresInSeconds < 60 ? '#EF4444' : '#34D399' }}>
                  {formatTimer(expiresInSeconds)}
                </strong>
              </div>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={resendCooldown > 0 || isLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#64748B' : '#38BDF8',
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: 0,
                }}
              >
                <RefreshCw size={13} />
                {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer un nouveau code'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => submitCode(codeDigits.join(''))}
              disabled={isLoading || expiresInSeconds === 0 || codeDigits.some((d) => !d)}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '14px',
                background:
                  codeDigits.every((d) => d) && !isLoading && expiresInSeconds > 0
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : '#334155',
                color: '#FFFFFF',
                fontSize: '0.96rem',
                fontWeight: 800,
                border: 'none',
                cursor:
                  codeDigits.every((d) => d) && !isLoading && expiresInSeconds > 0
                    ? 'pointer'
                    : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: codeDigits.every((d) => d)
                  ? '0 8px 25px rgba(16, 185, 129, 0.35)'
                  : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Vérification serveur en cours...</span>
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>Valider et Accéder à la Console</span>
                </>
              )}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '0.92rem', color: '#34D399', fontWeight: 700 }}>
              Session administrative renforcée vérifiée côté serveur.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
