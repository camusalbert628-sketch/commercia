import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Lightbulb,
  Sparkles,
  Send,
  ThumbsUp,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { api } from '../../services/api';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultUserName?: string;
  defaultBusinessName?: string;
}

interface CommunityIdea {
  id: string;
  title: string;
  module: string;
  votes: number;
  status: 'en_cours' | 'prevu' | 'a_l_etude';
  statusLabel: string;
  hasVoted?: boolean;
}

const INITIAL_COMMUNITY_IDEAS: CommunityIdea[] = [
  {
    id: 'idea-1',
    title: 'Scanner les codes-barres avec l\'appareil photo du smartphone',
    module: 'Ventes & Stock',
    votes: 84,
    status: 'en_cours',
    statusLabel: '🚀 En cours de test',
  },
  {
    id: 'idea-2',
    title: 'Rapprochement et encaissement direct Wave & Orange Money sans saisie manuelle',
    module: 'Caisse & Paiements',
    votes: 67,
    status: 'prevu',
    statusLabel: '🗓️ Prévu prochaine mise à jour',
  },
  {
    id: 'idea-3',
    title: 'Génération automatique de catalogue PDF avec photos pour WhatsApp Business',
    module: 'Catalogue & Partage',
    votes: 52,
    status: 'a_l_etude',
    statusLabel: '🔍 À l\'étude technique',
  },
];

export const SuggestionModal: React.FC<SuggestionModalProps> = ({
  isOpen,
  onClose,
  defaultUserName = '',
  defaultBusinessName = '',
}) => {
  const [activeTab, setActiveTab] = useState<'submit' | 'roadmap'>('submit');
  const [selectedModule, setSelectedModule] = useState('Ventes & Comptoir');
  const [ideaTitle, setIdeaTitle] = useState('');
  const [ideaGoal, setIdeaGoal] = useState<'time' | 'money' | 'control'>('time');
  const [ideaDescription, setIdeaDescription] = useState('');
  const [communityIdeas, setCommunityIdeas] = useState<CommunityIdea[]>(INITIAL_COMMUNITY_IDEAS);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const MODULES_LIST = [
    'Ventes & Comptoir',
    'Caisse Journalière',
    'Stock & Réappro',
    'Clients & Dettes',
    'Dépenses & Factures',
    'Copilote IA & Analyses',
  ];

  const handleVote = (id: string) => {
    setCommunityIdeas((prev) =>
      prev.map((idea) => {
        if (idea.id === id) {
          const hasVoted = !idea.hasVoted;
          return {
            ...idea,
            votes: hasVoted ? idea.votes + 1 : idea.votes - 1,
            hasVoted,
          };
        }
        return idea;
      })
    );
  };

  const handleSubmitIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaTitle.trim() || !ideaDescription.trim()) {
      alert('Veuillez renseigner le titre et les détails de votre idée.');
      return;
    }

    try {
      setSubmitting(true);
      const newIdea = {
        title: ideaTitle.trim(),
        module: selectedModule,
        goal: ideaGoal,
        description: ideaDescription.trim(),
        user: defaultUserName || 'Commerçant',
        business: defaultBusinessName || 'Commerce',
        createdAt: new Date().toISOString(),
      };

      // Store in localStorage
      try {
        const stored = JSON.parse(localStorage.getItem('commercia_community_suggestions') || '[]');
        localStorage.setItem('commercia_community_suggestions', JSON.stringify([newIdea, ...stored]));
      } catch (_) {}

      // Notify backend if available
      try {
        await api.post('/feedback', {
          category: 'suggestion',
          categoryLabel: `Idée : ${selectedModule}`,
          comment: `[IDÉE: ${ideaTitle}] ${ideaDescription}`,
          userName: defaultUserName,
          businessName: defaultBusinessName,
        });
      } catch (_) {}

      setSubmitted(true);
    } catch (err: any) {
      alert('Erreur lors de l\'enregistrement de votre suggestion.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setIdeaTitle('');
    setIdeaDescription('');
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
          maxWidth: '580px',
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
                background: '#EFF6FF',
                border: '2px solid #BFDBFE',
                color: '#0062FF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
              }}
            >
              <Lightbulb size={38} color="#0062FF" />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
              Idée enregistrée sur la feuille de route ! 💡
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.6, maxWidth: '440px', margin: '0 auto 24px auto' }}>
              Merci pour cette suggestion ! Nos ingénieurs produit étudient chaque proposition pour enrichir le quotidien des commerçants africains.
            </p>

            <div
              style={{
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '14px',
                padding: '14px',
                marginBottom: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#15803D',
                fontSize: '0.85rem',
                fontWeight: 600,
              }}
            >
              <Sparkles size={16} color="#16A34A" />
              <span>Votre idée a été transmise au laboratoire produit COMMERCIA</span>
            </div>

            <div>
              <button
                type="button"
                onClick={handleResetAndClose}
                style={{
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 32px',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Fermer et retourner au tableau de bord
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '20px', paddingRight: '52px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                  border: '1px solid #BFDBFE',
                  color: '#0062FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Lightbulb size={24} color="#0062FF" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
                    Boîte à Idées & Suggestions
                  </h3>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: '#ECFDF5',
                      color: '#059669',
                      padding: '3px 9px',
                      borderRadius: '8px',
                      border: '1px solid #A7F3D0',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    💡 Innovation
                  </span>
                </div>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748B', lineHeight: 1.4 }}>
                  Proposez une fonctionnalité ou votez pour celles en cours de développement
                </p>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: '#F1F5F9',
                borderRadius: '12px',
                padding: '4px',
                marginBottom: '20px',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('submit')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTab === 'submit' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'submit' ? '#0F172A' : '#64748B',
                  boxShadow: activeTab === 'submit' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} color={activeTab === 'submit' ? '#0062FF' : '#64748B'} />
                <span>Proposer une Idée</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('roadmap')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: activeTab === 'roadmap' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'roadmap' ? '#0F172A' : '#64748B',
                  boxShadow: activeTab === 'roadmap' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <ThumbsUp size={14} color={activeTab === 'roadmap' ? '#0062FF' : '#64748B'} />
                <span>Idées de la Communauté ({communityIdeas.length})</span>
              </button>
            </div>

            {activeTab === 'submit' ? (
              <form onSubmit={handleSubmitIdea}>
                {/* 1. Module Selector */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                    1. Quel module concerne votre suggestion ?
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {MODULES_LIST.map((mod) => {
                      const isSelected = selectedModule === mod;
                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => setSelectedModule(mod)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 700 : 500,
                            background: isSelected ? '#0062FF' : '#F8FAFC',
                            color: isSelected ? '#FFFFFF' : '#334155',
                            border: isSelected ? '1px solid #0062FF' : '1px solid #E2E8F0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {mod}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Idea Title */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    2. Titre de votre idée en une phrase * :
                  </label>
                  <input
                    type="text"
                    value={ideaTitle}
                    onChange={(e) => setIdeaTitle(e.target.value)}
                    required
                    placeholder="Ex: Alerte sonore sur le téléphone en cas de rupture de stock critique"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.88rem',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* 3. Objective / Impact */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                    3. Quel est l'impact principal pour votre commerce ?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setIdeaGoal('time')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: ideaGoal === 'time' ? '1.5px solid #0062FF' : '1px solid #E2E8F0',
                        background: ideaGoal === 'time' ? '#EFF6FF' : '#F8FAFC',
                        color: ideaGoal === 'time' ? '#0062FF' : '#334155',
                        fontWeight: ideaGoal === 'time' ? 700 : 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>⏳</div>
                      <span>Gain de temps</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIdeaGoal('money')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: ideaGoal === 'money' ? '1.5px solid #059669' : '1px solid #E2E8F0',
                        background: ideaGoal === 'money' ? '#ECFDF5' : '#F8FAFC',
                        color: ideaGoal === 'money' ? '#059669' : '#334155',
                        fontWeight: ideaGoal === 'money' ? 700 : 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>💰</div>
                      <span>Plus de ventes</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIdeaGoal('control')}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '12px',
                        border: ideaGoal === 'control' ? '1.5px solid #7C3AED' : '1px solid #E2E8F0',
                        background: ideaGoal === 'control' ? '#FAF5FF' : '#F8FAFC',
                        color: ideaGoal === 'control' ? '#7C3AED' : '#334155',
                        fontWeight: ideaGoal === 'control' ? 700 : 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '1.1rem', marginBottom: '2px' }}>🔒</div>
                      <span>Anti-coulage / Contrôle</span>
                    </button>
                  </div>
                </div>

                {/* 4. Description */}
                <div style={{ marginBottom: '22px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                    4. Expliquez comment vous imaginez la solution * :
                  </label>
                  <textarea
                    value={ideaDescription}
                    onChange={(e) => setIdeaDescription(e.target.value)}
                    required
                    rows={3}
                    placeholder="Ex: Quand un employé fait une vente, l'application devrait émettre un son distinct ou proposer un bouton rapide pour partager le reçu immédiatement sur WhatsApp sans devoir télécharger le PDF..."
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.86rem',
                      color: '#0F172A',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Footer Buttons */}
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
                      background: '#0F172A',
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
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#0062FF')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#0F172A')}
                  >
                    <Send size={16} />
                    <span>{submitting ? 'Transmission...' : 'Soumettre mon idée'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <p style={{ fontSize: '0.84rem', color: '#64748B', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                  Découvrez les fonctionnalités les plus demandées par les gérants de boutique et soutenez celles qui vous intéressent pour accélérer leur sortie :
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
                  {communityIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              background: '#EFF6FF',
                              color: '#0062FF',
                              padding: '2px 8px',
                              borderRadius: '6px',
                            }}
                          >
                            {idea.module}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
                            {idea.statusLabel}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>
                          {idea.title}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVote(idea.id)}
                        style={{
                          background: idea.hasVoted ? '#0062FF' : '#FFFFFF',
                          color: idea.hasVoted ? '#FFFFFF' : '#0F172A',
                          border: idea.hasVoted ? '1px solid #0062FF' : '1px solid #CBD5E1',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <ThumbsUp size={14} color={idea.hasVoted ? '#FFFFFF' : '#0062FF'} />
                        <span>{idea.votes}</span>
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  style={{
                    width: '100%',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#EFF6FF',
                    border: '1px dashed #93C5FD',
                    color: '#0062FF',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={16} />
                  <span>J'ai une autre idée à proposer</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
