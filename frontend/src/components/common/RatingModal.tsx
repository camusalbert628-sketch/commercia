import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Star,
  Award,
  Heart,
  Send,
  Sparkles,
  Check,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { api } from '../../services/api';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUserName?: string;
  defaultBusinessName?: string;
}

const HIGHLIGHT_ASSETS = [
  '⚡ Clôture de caisse en 2 min',
  '📊 Clarté du bénéfice net',
  '🛡️ Zéro perte & anti-coulage',
  '🤝 Suivi des dettes WhatsApp',
  '📦 Alertes stock automatiques',
  '🤖 Conseils du Copilote IA',
];

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  defaultUserName = '',
  defaultBusinessName = '',
}) => {
  const [stars, setStars] = useState(5);
  const [hoverStars, setHoverStars] = useState(0);
  const [npsScore, setNpsScore] = useState<number>(10);
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([
    '⚡ Clôture de caisse en 2 min',
    '📊 Clarté du bénéfice net',
  ]);
  const [testimonial, setTestimonial] = useState('');
  const [allowPublicBadge, setAllowPublicBadge] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentStars = hoverStars || stars;

  const getStarLabel = (s: number) => {
    switch (s) {
      case 5:
        return { label: '🤩 5/5 — Excellent & Indispensable !', color: '#059669', bg: '#ECFDF5' };
      case 4:
        return { label: '😀 4/5 — Très satisfait de l\'application', color: '#0284C7', bg: '#F0F9FF' };
      case 3:
        return { label: '🙂 3/5 — Bien mais peut encore progresser', color: '#D97706', bg: '#FFFBEB' };
      case 2:
        return { label: '😕 2/5 — Mitigé, des lenteurs ou manques', color: '#EA580C', bg: '#FFF7ED' };
      case 1:
        return { label: '😞 1/5 — Insatisfait de l\'expérience', color: '#DC2626', bg: '#FEF2F2' };
      default:
        return { label: 'Attribuez votre note', color: '#64748B', bg: '#F8FAFC' };
    }
  };

  const starMeta = getStarLabel(currentStars);

  const toggleHighlight = (item: string) => {
    if (selectedHighlights.includes(item)) {
      setSelectedHighlights(selectedHighlights.filter((h) => h !== item));
    } else {
      setSelectedHighlights([...selectedHighlights, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const ratingData = {
        stars,
        npsScore,
        highlights: selectedHighlights,
        testimonial: testimonial.trim(),
        allowPublicBadge,
        user: defaultUserName || 'Commerçant',
        business: defaultBusinessName || 'Mon Commerce',
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('commercia_merchant_ratings') || '[]');
        localStorage.setItem('commercia_merchant_ratings', JSON.stringify([ratingData, ...stored]));
      } catch (_) {}

      // Send to feedback API
      try {
        await api.post('/feedback', {
          category: 'avis',
          categoryLabel: `Évaluation ${stars}/5 (NPS: ${npsScore})`,
          comment: `[NOTE: ${stars}/5 | NPS: ${npsScore}/10] ${testimonial} (Points forts: ${selectedHighlights.join(', ')})`,
          userName: defaultUserName,
          businessName: defaultBusinessName,
        });
      } catch (_) {}

      setSubmitted(true);
    } catch (err: any) {
      alert('Erreur lors de l\'enregistrement de votre évaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setTestimonial('');
    onClose();
  };

  return createPortal(
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        margin: 0,
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
      onClick={handleResetAndClose}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#FFFFFF',
          borderRadius: '24px',
          padding: '28px 32px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          border: 'none',
          position: 'relative',
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleResetAndClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Fermer"
        >
          <X size={18} />
        </button>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '28px 10px' }}>
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: '#ECFDF5',
                border: '2px solid #A7F3D0',
                color: '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Award size={38} color="#059669" />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
              Note de {stars}/5 enregistrée avec succès ! ⭐
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 24px auto' }}>
              Votre évaluation certifiée contribue au baromètre de qualité COMMERCIA. Merci d'encourager notre démarche d'excellence pour tous les commerçants !
            </p>

            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '12px 18px',
                marginBottom: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#0284C7',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={18} color="#0284C7" />
              <span>Votre boutique participe au réseau des commerçants certifiés</span>
            </div>

            <div>
              <button
                type="button"
                onClick={handleResetAndClose}
                style={{
                  background: '#0062FF',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 32px',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Retourner à mon tableau de bord
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                  border: '1px solid #FDE68A',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Award size={24} color="#D97706" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    Baromètre & Note de Satisfaction
                  </h3>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      background: '#EFF6FF',
                      color: '#0062FF',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      border: '1px solid #BFDBFE',
                    }}
                  >
                    Avis Certifié
                  </span>
                </div>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Évaluez les performances et la fiabilité de votre copilote commercial
                </p>
              </div>
            </div>

            {/* 1. Interactive 5 Stars */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '18px',
                padding: '18px 20px',
                textAlign: 'center',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#1E293B', marginBottom: '10px' }}>
                Note générale attribuée à COMMERCIA :
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStars(s)}
                    onMouseEnter={() => setHoverStars(s)}
                    onMouseLeave={() => setHoverStars(0)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'transform 0.15s ease',
                      transform: currentStars >= s ? 'scale(1.2)' : 'scale(1)',
                    }}
                  >
                    <Star
                      size={36}
                      fill={currentStars >= s ? '#F59E0B' : '#E2E8F0'}
                      color={currentStars >= s ? '#D97706' : '#CBD5E1'}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: 'inline-block',
                  background: starMeta.bg,
                  color: starMeta.color,
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  padding: '4px 16px',
                  borderRadius: '12px',
                  border: `1px solid ${starMeta.color}25`,
                }}
              >
                {starMeta.label}
              </div>
            </div>

            {/* 2. NPS Recommendation 0-10 */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  Recommanderiez-vous COMMERCIA à un confrère commerçant ?
                </label>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0062FF' }}>
                  {npsScore} / 10
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, 1fr)', gap: '4px' }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = npsScore === num;
                  const isHigh = num >= 9;
                  const isMid = num >= 7 && num < 9;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNpsScore(num)}
                      style={{
                        padding: '8px 0',
                        borderRadius: '8px',
                        border: isSelected ? '2px solid #0062FF' : '1px solid #E2E8F0',
                        background: isSelected
                          ? '#0062FF'
                          : isHigh
                          ? '#F0FDF4'
                          : isMid
                          ? '#FFFBEB'
                          : '#F8FAFC',
                        color: isSelected ? '#FFFFFF' : '#0F172A',
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94A3B8', marginTop: '4px' }}>
                <span>0 = Certainement pas</span>
                <span>10 = Absolument !</span>
              </div>
            </div>

            {/* 3. Favorite Highlights */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Ce qui vous a le plus séduit dans COMMERCIA :
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {HIGHLIGHT_ASSETS.map((asset) => {
                  const active = selectedHighlights.includes(asset);
                  return (
                    <button
                      key={asset}
                      type="button"
                      onClick={() => toggleHighlight(asset)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: active ? '#ECFDF5' : '#F8FAFC',
                        color: active ? '#059669' : '#475569',
                        border: active ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {active ? '✓ ' : '+ '}
                      {asset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Testimonial */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                Votre témoignage en quelques mots (facultatif) :
              </label>
              <textarea
                value={testimonial}
                onChange={(e) => setTestimonial(e.target.value)}
                rows={2}
                placeholder="Ex : Depuis que j'utilise COMMERCIA, mes fins de journée sont réglées en 3 minutes et je sais exactement ce que je gagne chaque jour..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.85rem',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 5. Permission checkbox */}
            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.78rem',
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={allowPublicBadge}
                  onChange={(e) => setAllowPublicBadge(e.target.checked)}
                  style={{ accentColor: '#0062FF', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <span>
                  J'accepte d'afficher ma note et le nom de <strong>{defaultBusinessName || 'ma boutique'}</strong> dans le palmarès des commerçants certifiés.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '12px' }}>
              <button
                type="button"
                onClick={handleResetAndClose}
                style={{
                  height: '46px',
                  borderRadius: '12px',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  height: '46px',
                  borderRadius: '12px',
                  background: '#0062FF',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: submitting ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#0052D6')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0062FF')}
              >
                <Award size={16} />
                <span>{submitting ? 'Validation...' : 'Valider mon évaluation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
