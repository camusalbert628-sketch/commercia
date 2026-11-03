import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, ArrowRight, RefreshCw, AlertTriangle, Lock, KeyRound, CheckCircle2, X } from 'lucide-react';
import { api } from '../../services/api';

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
  const [maskedEmail, setMaskedEmail] = useState<string>('c*********@gmail.com');
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [expiresInSeconds, setExpiresInSeconds] = useState<number>(300); // 5 min
  const [canResend, setCanResend] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Charger le statut initial pour obtenir l'email masqué officiel
  useEffect(() => {
    if (!isOpen) return;
    setStep('prompt');
    setError(null);
    setCodeDigits(['', '', '', '', '', '']);

    api.get<{ maskedEmail: string; hasActiveAdminSession: boolean }>('/admin-auth/status')
      .then((data) => {
        if (data.maskedEmail) {
          setMaskedEmail(data.maskedEmail);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  // Compteur 5 minutes pour l'expiration du code
  useEffect(() => {
    if (step !== 'input') return;
    const interval = setInterval(() => {
      setExpiresInSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Compteur cooldown pour le renvoi
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Demander l'envoi du code
  const handleRequestOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        success: boolean;
        maskedEmail: string;
        expiresInMinutes: number;
        attemptsRemaining: number;
      }>('/admin-auth/request-otp');

      if (res.maskedEmail) setMaskedEmail(res.maskedEmail);
      setAttemptsRemaining(res.attemptsRemaining ?? 5);
      setExpiresInSeconds((res.expiresInMinutes || 5) * 60);
      setCanResend(false);
      setResendCooldown(60); // 60s cooldown avant renvoi
      setStep('input');
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la génération du code de sécurité.');
    } finally {
      setIsLoading(false);
    }
  };

  // Gérer la frappe des 6 chiffres
  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Cas de copier-coller
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const nextDigits = [...codeDigits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = pasted[i] || '';
        }
        setCodeDigits(nextDigits);
        const focusIdx = Math.min(pasted.length, 5);
        inputRefs.current[focusIdx]?.focus();
        if (pasted.length === 6) {
          submitCode(pasted);
        }
        return;
      }
    }

    const cleanChar = value.replace(/\D/g, '');
    const nextDigits = [...codeDigits];
    nextDigits[index] = cleanChar;
    setCodeDigits(nextDigits);

    if (cleanChar && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const full = nextDigits.join('');
    if (full.length === 6 && nextDigits.every((d) => d !== '')) {
      submitCode(full);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Soumettre et valider le code
  const submitCode = async (fullCode: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.post<{
        success: boolean;
        token: string;
        session: { expiresAt: string };
      }>('/admin-auth/verify-otp', { code: fullCode });

      if (res.token) {
        sessionStorage.setItem('commercia_admin_session_token', res.token);
        setStep('success');
        setTimeout(() => {
          onSuccess(res.token);
        }, 800);
      }
    } catch (err: any) {
      setError(err?.message || 'Code de vérification invalide ou expiré.');
      // Réduire le compteur d'essais
      setAttemptsRemaining((prev) => Math.max(0, prev - 1));
      setCodeDigits(['', '', '', '', '', '']);
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
        background: 'rgba(5, 10, 24, 0.85)',
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
          maxWidth: '520px',
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

        {/* En-tête de sécurité */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
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
            {step === 'success' ? (
              <CheckCircle2 size={36} color="#10B981" />
            ) : (
              <ShieldCheck size={36} />
            )}
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
                Votre identité administrateur a été reconnue. Pour accéder à la console d’administration, une vérification de sécurité supplémentaire est nécessaire. Un code de confirmation va être envoyé à votre adresse Gmail administrateur.
              </>
            )}
            {step === 'input' && (
              <>
                Saisissez le code à 6 chiffres envoyé à votre adresse autorisée. Valide pendant 5 minutes.
              </>
            )}
            {step === 'success' && 'Session administrative renforcée créée avec succès. Redirection...'}
          </p>
        </div>

        {/* Adresse masquée */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(51, 65, 85, 0.7)',
            borderRadius: '14px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
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

        {/* Message d'erreur */}
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
            <div>
              <div style={{ fontWeight: 700 }}>Échec de validation</div>
              <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>{error}</div>
              {attemptsRemaining > 0 && attemptsRemaining < 5 && (
                <div style={{ fontSize: '0.75rem', marginTop: '4px', color: '#FECACA' }}>
                  Tentatives restantes : {attemptsRemaining}/5
                </div>
              )}
            </div>
          </div>
        )}

        {/* Étape 1 : Bouton "Envoyer le code de sécurité" */}
        {step === 'prompt' && (
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
                <span>Génération du code sécurisé...</span>
              </>
            ) : (
              <>
                <span>Envoyer le code de sécurité</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        )}

        {/* Étape 2 : Saisie des 6 chiffres */}
        {step === 'input' && (
          <div>
            <div
              style={{
                display: 'flex',
                gap: '10px',
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
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isLoading}
                  style={{
                    width: '54px',
                    height: '62px',
                    borderRadius: '14px',
                    border: digit
                      ? '2px solid #10B981'
                      : '2px solid #334155',
                    background: '#1E293B',
                    color: '#FFFFFF',
                    fontSize: '1.6rem',
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
                {resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => submitCode(codeDigits.join(''))}
              disabled={isLoading || codeDigits.some((d) => !d)}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '14px',
                background:
                  codeDigits.every((d) => d) && !isLoading
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : '#334155',
                color: '#FFFFFF',
                fontSize: '0.96rem',
                fontWeight: 800,
                border: 'none',
                cursor: codeDigits.every((d) => d) && !isLoading ? 'pointer' : 'not-allowed',
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
                  <span>Vérification cryptographique...</span>
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

        {/* Étape 3 : Succès */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '0.92rem', color: '#34D399', fontWeight: 700 }}>
              Jeton de session administrative sécurisé activé.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
