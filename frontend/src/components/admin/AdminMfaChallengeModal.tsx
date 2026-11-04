import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, ArrowRight, RefreshCw, AlertTriangle, Lock, KeyRound, CheckCircle2, X } from 'lucide-react';
import { api, setAdminSessionCredentials } from '../../services/api';

const OTP_LENGTH = 8;
const EMPTY_DIGITS = Array(OTP_LENGTH).fill('');
const DEFAULT_RESEND_COOLDOWN = 60;

const STATE_1_UNCONFIGURED_MSG =
  "Le service de vérification e-mail n'est pas configuré. L'accès administrateur est temporairement indisponible.";

const STATE_2_SENT_MSG =
  'Votre code de sécurité a été envoyé à votre adresse e-mail administrateur autorisée.';

const STATE_3_SEND_ERROR_MSG =
  "L'envoi du code de sécurité a échoué. Aucun accès administrateur n'a été accordé. Veuillez réessayer ultérieurement ou contacter le responsable technique.";

interface AdminMfaChallengeModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess: (token: string) => void;
}

type ModalDisplayState = 'prompt' | 'unconfigured' | 'sent' | 'send_error' | 'success';

export const AdminMfaChallengeModal: React.FC<AdminMfaChallengeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [modalState, setModalState] = useState<ModalDisplayState>('prompt');
  const [maskedEmail, setMaskedEmail] = useState<string>('c*************@gmail.com');
  const [challengeId, setChallengeId] = useState<string>('');
  const [codeDigits, setCodeDigits] = useState<string[]>([...EMPTY_DIGITS]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusConfirmation, setStatusConfirmation] = useState<string>(STATE_2_SENT_MSG);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(300);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setModalState('prompt');
    setValidationError(null);
    setStatusConfirmation(STATE_2_SENT_MSG);
    setChallengeId('');
    setCodeDigits([...EMPTY_DIGITS]);

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
        if (data.emailService && !data.emailService.isConfigured) {
          setModalState('unconfigured');
        }
      })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (modalState !== 'sent') return;
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
  }, [modalState]);

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
    setValidationError(null);
    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        challengeId: string;
        maskedEmail: string;
        expiresInMinutes: number;
        attemptsRemaining: number;
        resendCooldownSeconds?: number;
      }>('/admin-auth/request-otp');

      if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
      setChallengeId(res.challengeId);
      setStatusConfirmation(res.message || STATE_2_SENT_MSG);
      setAttemptsRemaining(res.attemptsRemaining ?? 5);
      setExpiresInSeconds((res.expiresInMinutes || 5) * 60);
      setCodeDigits([...EMPTY_DIGITS]);
      setResendCooldown(res.resendCooldownSeconds || DEFAULT_RESEND_COOLDOWN);
      setModalState('sent');
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      const rawMessage = String(err?.message || '');
      if (rawMessage.includes("n'est pas configuré") || rawMessage.includes('temporairement indisponible')) {
        setModalState('unconfigured');
      } else if (err?.statusCode === 429) {
        setValidationError(rawMessage);
      } else {
        setModalState('send_error');
        setValidationError(rawMessage || STATE_3_SEND_ERROR_MSG);
      }
    } finally {
      setIsLoading(false);
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
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const submitCode = async (fullCode: string) => {
    if (!challengeId) {
      setValidationError('Session de vérification invalide. Veuillez demander un nouveau code.');
      return;
    }
    setIsLoading(true);
    setValidationError(null);
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
        setModalState('success');
        setTimeout(() => {
          onSuccess(res.adminSessionToken);
        }, 500);
      } else {
        throw new Error('Validation refusée par le serveur.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Code de vérification invalide ou expiré.');
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

        {/* 1. Logo et identité visuelle COMMERCIA */}
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
              margin: '0 auto 14px auto',
              color: '#10B981',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.2)',
            }}
          >
            {modalState === 'success' ? <CheckCircle2 size={36} color="#10B981" /> : <ShieldCheck size={36} />}
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

          {/* 2. Titre « Vérification de Sécurité Administrateur » */}
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 8px 0', color: '#FFFFFF' }}>
            Vérification de Sécurité Administrateur
          </h2>

          <p style={{ fontSize: '0.88rem', color: '#94A3B8', margin: 0, lineHeight: 1.55 }}>
            {modalState === 'prompt' && (
              <>
                Votre identité administrateur a été reconnue. Pour accéder à la console d’administration, une vérification de sécurité supplémentaire par code à 8 chiffres à usage unique est obligatoire.
              </>
            )}
            {modalState === 'unconfigured' && STATE_1_UNCONFIGURED_MSG}
            {modalState === 'sent' && statusConfirmation}
            {modalState === 'send_error' && STATE_3_SEND_ERROR_MSG}
            {modalState === 'success' && 'Session administrative privilégiée créée avec succès.'}
          </p>
        </div>

        {/* 3. Adresse Gmail autorisée, masquée */}
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

        {/* ÉTAT 1 — CONFIGURATION ABSENTE */}
        {modalState === 'unconfigured' && (
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: '14px',
              padding: '16px 18px',
              color: '#FBBF24',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ lineHeight: 1.5, fontWeight: 600 }}>
              {STATE_1_UNCONFIGURED_MSG}
            </div>
          </div>
        )}

        {/* ÉTAT 3 — ERREUR D'ENVOI */}
        {modalState === 'send_error' && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '14px',
              padding: '16px 18px',
              color: '#F87171',
              fontSize: '0.86rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ lineHeight: 1.5, fontWeight: 600 }}>
              {STATE_3_SEND_ERROR_MSG}
            </div>
          </div>
        )}

        {/* 9. Message d'erreur si la validation échoue */}
        {validationError && modalState !== 'send_error' && modalState !== 'unconfigured' && (
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
              <div style={{ fontWeight: 700 }}>Vérification refusée</div>
              <div style={{ fontSize: '0.78rem', marginTop: '2px', lineHeight: 1.45 }}>{validationError}</div>
              {modalState === 'sent' && attemptsRemaining > 0 && attemptsRemaining < 5 && (
                <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#FECACA' }}>
                  Tentatives restantes : {attemptsRemaining}/5
                </div>
              )}
            </div>
          </div>
        )}

        {(modalState === 'prompt' || modalState === 'send_error') && (
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
        )}

        {/* ÉTAT 2 — ENVOI RÉUSSI : 8 cases, compte à rebours 5 min, bouton Renvoyer le code, bouton Valider et Accéder à la Console */}
        {modalState === 'sent' && (
          <div>
            {/* 4. Message indiquant qu'un code a été envoyé */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '10px 14px',
                color: '#34D399',
                fontSize: '0.82rem',
                fontWeight: 600,
                textAlign: 'center',
                marginBottom: '18px',
              }}
            >
              {statusConfirmation}
            </div>

            {/* 5. Les huit cases de saisie du code */}
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

            {/* 6. Compte à rebours de 5 minutes & 7. Bouton « Renvoyer le code » */}
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
                {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : 'Renvoyer le code'}
              </button>
            </div>

            {/* 8. Bouton « Valider et Accéder à la Console » */}
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

        {modalState === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '0.92rem', color: '#34D399', fontWeight: 700 }}>
              Session administrative privilégiée vérifiée côté serveur.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
