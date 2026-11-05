import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Crown,
  Sparkles,
  ArrowRight,
  X,
  ShieldCheck,
  Calendar,
  CreditCard,
  Building2,
  Hash,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

export interface SubscriptionCelebrationData {
  paymentId?: string;
  customerName?: string;
  businessName?: string | null;
  planName: string;
  amount: number;
  currency: string;
  confirmedAt: string | Date;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  reference: string;
  isRenewal?: boolean;
}

interface SubscriptionCongratulationsModalProps {
  isOpen: boolean;
  data: SubscriptionCelebrationData | null;
  onClose: () => void;
  onNavigateToWorkspace?: () => void;
}

export const SubscriptionCongratulationsModal: React.FC<SubscriptionCongratulationsModalProps> = ({
  isOpen,
  data,
  onClose,
  onNavigateToWorkspace,
}) => {
  const navigate = useNavigate();
  const { fetchMe } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Confetti effect on mount
  useEffect(() => {
    if (!isOpen || !data) return;

    // Marquer immédiatement cette transaction comme célébrée dans le localStorage
    // pour garantir une stricte idempotence (ne réapparaît jamais au rafraîchissement)
    try {
      const stored = localStorage.getItem('commercia_celebrated_payment_refs');
      const list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(data.reference)) {
        list.push(data.reference);
        localStorage.setItem('commercia_celebrated_payment_refs', JSON.stringify(list));
      }
    } catch (_) {}

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Festive COMMERCIA palette (Royal Blue, Emerald Green, Gold, Vibrant Coral, Violet)
    const colors = ['#0062FF', '#10B981', '#F59E0B', '#FF385C', '#8B5CF6', '#06B6D4'];
    const particleCount = 75;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
      shape: 'rect' | 'circle';
      opacity: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 3 + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 12,
        vy: -(Math.random() * 8 + 4),
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
        opacity: 1,
      });
    }

    let animationId: number;
    let startTime = Date.now();
    const duration = 4000; // 4 seconds total animation duration

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gentle gravity
        p.rotation += p.vRot;

        if (elapsed > 2500) {
          p.opacity = Math.max(0, 1 - (elapsed - 2500) / 1500);
        }

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (elapsed < duration) {
        animationId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [isOpen, data]);

  if (!isOpen || !data) return null;

  const isRenewal = Boolean(data.isRenewal);

  const formatDate = (val?: string | Date | null) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOnly = (val?: string | Date | null) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const confirmedDateStr = formatDate(data.confirmedAt);
  const startDateStr = formatDateOnly(data.startDate);
  const endDateStr = formatDateOnly(data.endDate);

  const displayName = data.businessName || data.customerName;

  const handleActionClick = async () => {
    try {
      await fetchMe();
    } catch (_) {}
    onClose();
    if (onNavigateToWorkspace) {
      onNavigateToWorkspace();
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      {/* Canvas for celebration confettis */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1000000,
        }}
      />

      {/* Main Congratulations Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 1000001,
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 98, 255, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.9)',
          padding: '0',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Top Header Banner with radiant gradient */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #0062FF 0%, #0047B3 60%, #10B981 100%)',
            padding: '36px 32px 28px 32px',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            color: '#FFFFFF',
            textAlign: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Subtle decorative background glow circles */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              left: '-40px',
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.12)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-30px',
              right: '-30px',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.25)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.18)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
          >
            <X size={18} />
          </button>

          {/* Celebration Trophy / Crown Badge with animated glow */}
          <div
            style={{
              width: '76px',
              height: '76px',
              borderRadius: '50%',
              background: '#FFFFFF',
              color: '#0062FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 0 0 6px rgba(255, 255, 255, 0.25)',
              position: 'relative',
            }}
          >
            <Crown size={38} color="#F59E0B" />
            <div
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#10B981',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              <CheckCircle size={16} />
            </div>
          </div>

          {/* Status Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              padding: '4px 14px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#34D399',
                display: 'inline-block',
                boxShadow: '0 0 8px #34D399',
              }}
            />
            {isRenewal ? 'Renouvellement Confirmé & Validé' : 'Paiement Confirmé & Actif'}
          </div>

          {/* Valued Main Title */}
          <h2
            style={{
              fontSize: '1.55rem',
              fontWeight: 900,
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            {isRenewal
              ? 'FÉLICITATIONS ! 🎉 VOTRE ABONNEMENT EST RENOUVELÉ !'
              : 'FÉLICITATIONS ! 🎉 VOTRE ABONNEMENT EST ACTIVÉ !'}
          </h2>

          <p
            style={{
              fontSize: '0.96rem',
              margin: 0,
              opacity: 0.95,
              fontWeight: 500,
              maxWidth: '540px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Bienvenue dans une nouvelle expérience de gestion commerciale avec COMMERCIA !
          </p>
        </div>

        {/* Content Body */}
        <div style={{ padding: '28px 32px 32px 32px' }}>
          {/* Heartwarming and motivating message (Section 3) */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
              fontSize: '0.92rem',
              lineHeight: 1.6,
              color: '#334155',
            }}
          >
            {isRenewal ? (
              <>
                <p style={{ margin: '0 0 12px 0' }}>
                  Nous sommes ravis de renouveler votre confiance. Votre paiement a été validé et la prolongation de votre formule <strong>{data.planName}</strong> est désormais effective.
                </p>
                <p style={{ margin: '0 0 12px 0' }}>
                  Votre activité continue de bénéficier sans aucune interruption de l'ensemble de vos modules professionnels : suivi des ventes, maîtrise des stocks, relances de crédits et indicateurs de rentabilité.
                </p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0062FF' }}>
                  Merci de nous faire confiance pour accompagner votre croissance. L'aventure COMMERCIA continue avec vous !
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 12px 0' }}>
                  Nous sommes ravis de vous compter parmi nos abonnés. Votre paiement a été confirmé et votre abonnement est désormais actif.
                </p>
                <p style={{ margin: '0 0 12px 0' }}>
                  Vous venez de franchir une nouvelle étape vers une gestion plus intelligente, plus structurée et plus performante de votre activité.
                </p>
                <p style={{ margin: '0 0 12px 0' }}>
                  Grâce à COMMERCIA, vous disposez désormais des outils nécessaires pour mieux piloter votre commerce, suivre vos ventes, maîtriser vos dépenses, gérer vos stocks et prendre des décisions éclairées à partir de vos véritables données.
                </p>
                <p style={{ margin: 0, fontWeight: 700, color: '#0062FF' }}>
                  Merci de nous faire confiance pour accompagner votre croissance. L'aventure COMMERCIA commence maintenant !
                </p>
              </>
            )}
          </div>

          {/* Database Real Data Summary Card (Section 4) */}
          <div
            style={{
              border: '1.5px solid #DBEAFE',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '18px 20px',
              marginBottom: '28px',
              boxShadow: '0 4px 16px rgba(0, 98, 255, 0.05)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid #EFF6FF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#0062FF" />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Récapitulatif Officiel Vérifié
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#059669',
                  background: '#ECFDF5',
                  padding: '2px 10px',
                  borderRadius: '12px',
                }}
              >
                ● Données Enregistrées en Base
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px 20px',
                fontSize: '0.86rem',
              }}
            >
              {/* Nom Client ou Entreprise */}
              {displayName && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={13} />
                    Commerçant / Établissement
                  </span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{displayName}</span>
                </div>
              )}

              {/* Formule souscrite */}
              {data.planName && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Crown size={13} />
                    Formule Souscrite
                  </span>
                  <span style={{ fontWeight: 800, color: '#0062FF' }}>{data.planName}</span>
                </div>
              )}

              {/* Montant Payé */}
              {typeof data.amount === 'number' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CreditCard size={13} />
                    Montant Réellement Réglé
                  </span>
                  <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.98rem' }}>
                    {data.amount.toLocaleString('fr-FR')} {data.currency}
                  </span>
                </div>
              )}

              {/* Date de confirmation */}
              {confirmedDateStr && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    Confirmation Bancaire / Opérateur
                  </span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{confirmedDateStr}</span>
                </div>
              )}

              {/* Date de début */}
              {startDateStr && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Date d'effet (Début)</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{startDateStr}</span>
                </div>
              )}

              {/* Date d'expiration / Renouvellement */}
              {endDateStr && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Échéance / Renouvellement</span>
                  <span style={{ fontWeight: 700, color: '#0F172A' }}>{endDateStr}</span>
                </div>
              )}

              {/* Référence de Transaction */}
              {data.reference && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', gridColumn: '1 / -1' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Hash size={13} />
                    N° Référence Unique
                  </span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: '#475569',
                      background: '#F1F5F9',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.82rem',
                      display: 'inline-block',
                      width: 'fit-content',
                    }}
                  >
                    {data.reference}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons (Section 5) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={handleActionClick}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: '14px',
                border: 'none',
                background: 'linear-gradient(135deg, #0062FF 0%, #0047B3 100%)',
                color: '#FFFFFF',
                fontSize: '1.02rem',
                fontWeight: 800,
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0, 98, 255, 0.35)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 98, 255, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 98, 255, 0.35)';
              }}
            >
              <span>Accéder à mon espace COMMERCIA →</span>
              <ArrowRight size={20} />
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: 'transparent',
                color: '#64748B',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
            >
              Fermer cette fenêtre
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

