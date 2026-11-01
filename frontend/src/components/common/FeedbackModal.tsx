import React, { useState } from 'react';
import {
  X,
  Star,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Heart,
  Send,
  Building,
  User as UserIcon,
  Phone,
  ThumbsUp,
} from 'lucide-react';
import {
  FEEDBACK_CATEGORIES,
  SATISFACTION_TAGS,
  FeedbackCategory,
  submitUserFeedback,
} from '../../services/feedbackService';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUserName?: string;
  defaultBusinessName?: string;
  defaultPhone?: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  defaultUserName = '',
  defaultBusinessName = '',
  defaultPhone = '',
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Gain de temps', 'Interface intuitive']);
  const [userName, setUserName] = useState(defaultUserName);
  const [userPhone, setUserPhone] = useState(defaultPhone);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentRating = hoverRating || rating;

  const getRatingSentiment = (r: number) => {
    switch (r) {
      case 5:
        return { label: '🤩 Exceptionnel & Indispensable !', color: '#059669', bg: '#ECFDF5' };
      case 4:
        return { label: '😀 Très bien, très satisfait !', color: '#0284C7', bg: '#F0F9FF' };
      case 3:
        return { label: '🙂 Bien, quelques détails à ajuster', color: '#D97706', bg: '#FFFBEB' };
      case 2:
        return { label: '😕 Moyen, des améliorations nécessaires', color: '#EA580C', bg: '#FFF7ED' };
      case 1:
        return { label: '😞 Insatisfaisant, besoin d\'évolution', color: '#DC2626', bg: '#FEF2F2' };
      default:
        return { label: 'Notez votre expérience', color: '#64748B', bg: '#F8FAFC' };
    }
  };

  const sentiment = getRatingSentiment(currentRating);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      alert('Veuillez saisir votre remarque ou suggestion.');
      return;
    }

    try {
      setSubmitting(true);
      const catObj = FEEDBACK_CATEGORIES.find((c) => c.id === category);
      await submitUserFeedback({
        rating,
        category,
        categoryLabel: catObj ? catObj.label : 'Suggestion',
        comment: comment.trim(),
        userName: userName.trim() || 'Commerçant COMMERCIA',
        businessName: defaultBusinessName || 'Mon Commerce',
        userPhone: userPhone.trim() || undefined,
        satisfactionTags: selectedTags,
      });

      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      alert('Erreur lors de l\'envoi de votre avis. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setComment('');
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
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
          padding: '28px 30px',
          boxShadow: '0 25px 60px -15px rgba(15, 23, 42, 0.3), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          border: 'none',
          position: 'relative',
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
          <div style={{ textAlign: 'center', padding: '24px 10px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
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
              <Heart size={36} fill="#059669" color="#059669" />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
              Merci infiniment pour votre avis !
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 24px auto' }}>
              Vos suggestions et remarques sont directement transmises à notre équipe technique pour continuer de bâtir l'outil de gestion idéal pour votre commerce.
            </p>

            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#0369A1',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Sparkles size={16} color="#0284C7" />
              <span>Chaque retour commerçant fait grandir la plateforme !</span>
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
                  boxShadow: 'none',
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
                <Star size={24} fill="#D97706" color="#D97706" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                  Évaluation & Boîte à Idées
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748B' }}>
                  Partagez vos remarques et suggestions pour faire évoluer COMMERCIA
                </p>
              </div>
            </div>

            {/* 1. Star Rating */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '18px',
                padding: '16px 20px',
                textAlign: 'center',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '10px' }}>
                Quelle note globale attribuez-vous à COMMERCIA ?
              </div>

              {/* 5 Stars */}
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    onMouseEnter={() => setHoverRating(s)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'transform 0.15s ease',
                      transform: currentRating >= s ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    <Star
                      size={34}
                      fill={currentRating >= s ? '#F59E0B' : '#E2E8F0'}
                      color={currentRating >= s ? '#D97706' : '#CBD5E1'}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>

              {/* Sentiment Badge */}
              <div
                style={{
                  display: 'inline-block',
                  background: sentiment.bg,
                  color: sentiment.color,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  padding: '4px 14px',
                  borderRadius: '12px',
                  border: `1px solid ${sentiment.color}20`,
                }}
              >
                {sentiment.label}
              </div>
            </div>

            {/* 2. Feedback Category */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Type de retour :
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {FEEDBACK_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '9px 12px',
                        borderRadius: '12px',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 700 : 500,
                        background: isSelected ? '#EFF6FF' : '#F8FAFC',
                        border: isSelected ? '1.5px solid #0062FF' : '1px solid #E2E8F0',
                        color: isSelected ? '#0062FF' : '#334155',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Detailed comment */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                Votre remarque, besoin ou suggestion détaillée * :
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                rows={3}
                placeholder="Ex : J'aimerais pouvoir exporter le journal de caisse au format WhatsApp à la fin de journée, ou ajuster les alertes de stock..."
                style={{
                  width: '100%',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  padding: '12px 14px',
                  fontSize: '0.88rem',
                  color: '#0F172A',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 4. Optional satisfaction tags */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#64748B', marginBottom: '6px' }}>
                Ce qui vous plaît particulièrement (facultatif) :
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SATISFACTION_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        background: active ? '#ECFDF5' : '#F1F5F9',
                        color: active ? '#059669' : '#64748B',
                        border: active ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {active ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Author info */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                padding: '12px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                marginBottom: '20px',
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                  Votre prénom / Nom
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Commerçant"
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', color: '#64748B', fontWeight: 600, marginBottom: '4px' }}>
                  Téléphone / WhatsApp
                </label>
                <input
                  type="text"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="Ex : +237 6..."
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
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
                <Send size={16} />
                <span>{submitting ? 'Envoi en cours...' : 'Envoyer mon évaluation'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
