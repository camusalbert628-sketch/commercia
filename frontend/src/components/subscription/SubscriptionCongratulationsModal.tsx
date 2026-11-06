import React, { useEffect, useRef, useState } from 'react';
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
  Copy,
  Printer,
  TrendingUp,
  Package,
  MessageCircle,
  Bot,
  Zap,
  Award,
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
  const [copiedRef, setCopiedRef] = useState(false);

  // Confetti effect on mount
  useEffect(() => {
    if (!isOpen || !data) return;

    // Idempotence stricte : marquer immédiatement cette transaction comme célébrée
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

    // Palette festive COMMERCIA
    const colors = ['#0062FF', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EAB308'];
    const particleCount = 85;
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
        x: width / 2 + (Math.random() - 0.5) * 240,
        y: height / 3 + (Math.random() - 0.5) * 90,
        vx: (Math.random() - 0.5) * 14,
        vy: -(Math.random() * 9 + 4),
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.35 ? 'rect' : 'circle',
        opacity: 1,
      });
    }

    let animationId: number;
    const startTime = Date.now();
    const duration = 4500;

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.rotation += p.vRot;

        if (elapsed > 2800) {
          p.opacity = Math.max(0, 1 - (elapsed - 2800) / 1700);
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

  const handleCopyReference = () => {
    if (!data.reference) return;
    navigator.clipboard.writeText(data.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

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
        background: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'fadeIn 0.25s ease-out',
      }}
    >
      {/* Canvas Confettis */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1000000,
        }}
      />

      {/* Carte Centrale de Félicitations */}
      <div
        style={{
          position: 'relative',
          zIndex: 1000001,
          width: '100%',
          maxWidth: '680px',
          maxHeight: '94vh',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -10px rgba(0, 98, 255, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* BANNIÈRE SUPÉRIEURE FIXE (NE DÉFILE JAMAIS) */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, #0A2540 0%, #004BD6 50%, #10B981 100%)',
            padding: '28px 24px 20px 24px',
            color: '#FFFFFF',
            textAlign: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          {/* Lueur d'ambiance */}
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              left: '-30px',
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.15)',
              filter: 'blur(28px)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-25px',
              right: '-25px',
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.25)',
              filter: 'blur(28px)',
              pointerEvents: 'none',
            }}
          />

          {/* Bouton Fermer */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              width: '34px',
              height: '34px',
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
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.32)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)')}
          >
            <X size={17} />
          </button>

          {/* Badge Couronne d'Honneur */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
              color: '#0062FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), 0 0 0 5px rgba(255, 255, 255, 0.22)',
              position: 'relative',
            }}
          >
            <Crown size={36} color="#F59E0B" />
            <div
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#10B981',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              }}
            >
              <CheckCircle size={15} />
            </div>
          </div>

          {/* Pilule de Statut Officiel */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              padding: '3px 12px',
              borderRadius: '999px',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: '#34D399',
                display: 'inline-block',
                boxShadow: '0 0 8px #34D399',
              }}
            />
            {isRenewal ? '✨ RENOUVELLEMENT CONFIRMÉ & ENREGISTRÉ' : '✨ PAIEMENT CONFIRMÉ & ABONNEMENT ACTIVÉ'}
          </div>

          {/* Titre Majestueux & Valorisé */}
          <h2
            style={{
              fontSize: '1.45rem',
              fontWeight: 900,
              margin: '0 0 6px 0',
              letterSpacing: '-0.02em',
              lineHeight: 1.25,
            }}
          >
            {isRenewal
              ? '🎉 FÉLICITATIONS ! VOTRE ABONNEMENT EST RENOUVELÉ ! 🚀'
              : '🎉 FÉLICITATIONS ! VOTRE ABONNEMENT EST ACTIVÉ ! 🚀'}
          </h2>

          <p
            style={{
              fontSize: '0.92rem',
              margin: 0,
              color: '#E0E7FF',
              fontWeight: 600,
              maxWidth: '520px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Bienvenue dans l'univers de gestion commerciale d'excellence COMMERCIA ! 💼⭐
          </p>
        </div>

        {/* CORPS DU PANNEAU (SCROLLABLE SI NÉCESSAIRE) */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            flex: 1,
            background: '#F8FAFC',
          }}
        >
          {/* CARTE 1 : MESSAGE CHALEUREUX & MOTIVANT */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #E2E8F0',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
            }}
          >
            {/* Salutation Personnalisée */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.25rem' }}>👋</span>
              <strong style={{ fontSize: '1.02rem', color: '#0F172A', letterSpacing: '-0.01em' }}>
                Bonjour {displayName || 'Cher Partenaire'} !
              </strong>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', lineHeight: 1.55, color: '#334155' }}>
              Nous sommes ravis et fiers de vous compter parmi nos abonnés officiels. Votre paiement a été <strong>confirmé avec succès</strong> et votre abonnement est désormais pleinement actif en base de données.
            </p>

            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', lineHeight: 1.55, color: '#334155' }}>
              Vous venez de franchir une étape décisive vers un commerce <strong>plus intelligent, mieux structuré et nettement plus rentable</strong>.
            </p>

            {/* Grille des Super-Pouvoirs Commerciaux Débloqués */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0062FF', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={14} color="#0062FF" />
                Vos fonctionnalités professionnelles activées en direct :
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '1.15rem' }}>📈</span>
                  <div style={{ fontSize: '0.84rem' }}>
                    <strong style={{ color: '#0F172A', display: 'block' }}>Ventes & Marges Nettes</strong>
                    <span style={{ color: '#64748B' }}>Calcul automatique de la rentabilité réelle à chaque transaction.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '1.15rem' }}>📦</span>
                  <div style={{ fontSize: '0.84rem' }}>
                    <strong style={{ color: '#0F172A', display: 'block' }}>Stocks & Lots Commerciaux</strong>
                    <span style={{ color: '#64748B' }}>Point mort, décomposition de ballots et alertes anti-rupture.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '1.15rem' }}>💬</span>
                  <div style={{ fontSize: '0.84rem' }}>
                    <strong style={{ color: '#0F172A', display: 'block' }}>Créances & Relances WhatsApp</strong>
                    <span style={{ color: '#64748B' }}>Recouvrement rapide des dettes avec messages préformatés.</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '1.15rem' }}>🤖</span>
                  <div style={{ fontSize: '0.84rem' }}>
                    <strong style={{ color: '#0F172A', display: 'block' }}>Copilote IA Omniscient</strong>
                    <span style={{ color: '#64748B' }}>Analyses stratégiques et recommandations financières éclairées.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Engagement Partenarial */}
            <div
              style={{
                padding: '12px 14px',
                background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
                borderRadius: '10px',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>🤝</span>
              <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#1E3A8A', lineHeight: 1.4 }}>
                Merci de nous faire confiance pour accompagner votre croissance. L'aventure COMMERCIA commence maintenant ! 🌟
              </p>
            </div>
          </div>

          {/* CARTE 2 : RÉCAPITULATIF FINANCIER & TRANSACTIONNEL (STYLE FINTECH) */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1.5px solid #DBEAFE',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
              boxShadow: '0 4px 16px rgba(0, 98, 255, 0.05)',
            }}
          >
            {/* Titre du reçu */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '14px',
                borderBottom: '1px solid #EFF6FF',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#0062FF" />
                <span style={{ fontSize: '0.84rem', fontWeight: 900, color: '#1E3A8A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  🛡️ Récapitulatif Officiel Vérifié
                </span>
              </div>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  color: '#059669',
                  background: '#ECFDF5',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  border: '1px solid #A7F3D0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ● Données Enregistrées en Base
              </span>
            </div>

            {/* Données réelles extraites de la base de données */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '14px 20px',
                fontSize: '0.86rem',
              }}
            >
              {/* Commerçant ou Entreprise */}
              {displayName && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 size={13} color="#0062FF" />
                    🏢 Commerçant / Établissement
                  </span>
                  <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.94rem' }}>{displayName}</span>
                </div>
              )}

              {/* Formule souscrite */}
              {data.planName && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Crown size={13} color="#F59E0B" />
                    👑 Formule Souscrite
                  </span>
                  <span
                    style={{
                      fontWeight: 900,
                      color: '#0062FF',
                      fontSize: '0.94rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    Formule {data.planName.toUpperCase()} ⭐
                  </span>
                </div>
              )}

              {/* Montant Payé Réellement */}
              {typeof data.amount === 'number' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CreditCard size={13} color="#10B981" />
                    💳 Montant Réellement Réglé
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.15rem' }}>
                      {data.amount.toLocaleString('fr-FR')} {data.currency}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#059669', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                      ACQUITTÉ ✔️
                    </span>
                  </div>
                </div>
              )}

              {/* Date de confirmation bancaire */}
              {confirmedDateStr && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Calendar size={13} color="#64748B" />
                    📅 Confirmation Opérateur
                  </span>
                  <span style={{ fontWeight: 700, color: '#334155' }}>{confirmedDateStr}</span>
                </div>
              )}

              {/* Date de début */}
              {startDateStr && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>🚀 Date d'effet (Début)</span>
                  <span style={{ fontWeight: 700, color: '#334155' }}>{startDateStr}</span>
                </div>
              )}

              {/* Date d'expiration / Renouvellement */}
              {endDateStr && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem' }}>⏳ Échéance / Renouvellement</span>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>{endDateStr}</span>
                </div>
              )}

              {/* Référence Unique avec bouton Copier */}
              {data.reference && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', gridColumn: '1 / -1', marginTop: '4px' }}>
                  <span style={{ color: '#64748B', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Hash size={13} color="#0062FF" />
                    🧾 N° Référence Unique de Transaction
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        color: '#1E3A8A',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {data.reference}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyReference}
                      title="Copier la référence"
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Copy size={13} />
                      {copiedRef ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ACTIONS PRINCIPALES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Bouton Majeur */}
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
                fontSize: '1.05rem',
                fontWeight: 900,
                letterSpacing: '-0.01em',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 8px 24px rgba(0, 98, 255, 0.4)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 98, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 98, 255, 0.4)';
              }}
            >
              <span>Accéder à mon espace COMMERCIA →</span>
              <ArrowRight size={20} />
            </button>

            {/* Boutons secondaires */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', marginTop: '2px' }}>
              <button
                type="button"
                onClick={handlePrintReceipt}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
              >
                <Printer size={14} />
                <span>Imprimer le reçu officiel</span>
              </button>
              <span style={{ color: '#CBD5E1', alignSelf: 'center' }}>•</span>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: '6px 10px',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#0F172A')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
