import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight, ArrowLeft, Check, Sparkles, Shield, Rocket } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const SECTORS = [
  { id: 'commerce', label: 'Boutique / Épicerie / Commerce', icon: '🏬' },
  { id: 'restaurant', label: 'Restaurant / Fast-food / Bar', icon: '🍲' },
  { id: 'beaute', label: 'Salon de Coiffure / Beauté / Cosmétique', icon: '✂️' },
  { id: 'artisanat', label: 'Artisanat / Menuiserie / Couture', icon: '🔨' },
  { id: 'services', label: 'Prestations de Services / Agence', icon: '💼' },
  { id: 'autre', label: 'Autre Activité', icon: '📦' },
];

const TRACKING_MODES = [
  {
    id: 'simple',
    title: 'Mode Simplifié',
    desc: 'Ventes du jour + Dépenses = Bénéfice estimé. Rapide et direct.',
    badge: 'Idéal Débutant',
  },
  {
    id: 'avec_credit',
    title: 'Avec Carnet de Crédits',
    desc: 'Suivez précisément qui vous doit de l\'argent et relancez vos clients.',
    badge: 'Recommandé',
  },
  {
    id: 'avec_stock',
    title: 'Avec Gestion de Stock',
    desc: 'Articles, prix d\'achat, alertes avant rupture de stock.',
    badge: 'Boutique & Épicerie',
  },
  {
    id: 'complet',
    title: 'Mode Complet (Tout-en-un)',
    desc: 'Ventes + Dépenses + Stock + Carnet de Crédits + Copilote IA.',
    badge: 'Entrepreneurs Ambitieux',
  },
];

const REVENUE_ESTIMATES = [
  'Moins de 25 000 FCFA / jour',
  '25 000 à 100 000 FCFA / jour',
  '100 000 à 500 000 FCFA / jour',
  'Plus de 500 000 FCFA / jour',
];

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('commerce');
  const [trackingMode, setTrackingMode] = useState('complet');
  const [dailySalesEstimate, setDailySalesEstimate] = useState(REVENUE_ESTIMATES[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { fetchMe } = useAuthStore();
  const navigate = useNavigate();

  const handleFinish = async () => {
    const businessName = name.trim() || 'Mon Commerce';

    try {
      setLoading(true);
      setError('');
      const res: any = await api.post('/auth/business', {
        name: businessName,
        sector: sector || 'commerce',
        trackingMode: trackingMode || 'complet',
        dailySalesEstimate: dailySalesEstimate || REVENUE_ESTIMATES[1],
      });

      if (res?.business?.id) {
        localStorage.setItem('activeBusinessId', res.business.id);
      }
      if (res?.user) {
        localStorage.setItem('commercia_user', JSON.stringify(res.user));
      }

      await fetchMe();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Error creating business:', err);
      setError(err.message || 'Erreur lors de la configuration de votre activité.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div style={{ marginBottom: '20px', textAlign: 'center' }}>
        <img
          src="/commercia-logo.png"
          alt="COMMERCIA"
          style={{
            width: '60px',
            height: '60px',
            objectFit: 'contain',
            borderRadius: '16px',
            background: '#FFFFFF',
            padding: '4px',
            margin: '0 auto 8px',
            display: 'block',
            boxShadow: '0 8px 20px rgba(0, 98, 255, 0.25)',
          }}
        />
        <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#08162B', margin: 0 }}>
          COMMERC<span style={{ color: '#FF7A00' }}>IA</span>
        </h2>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '620px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Progress Bar */}
        <div style={{ background: '#F1F5F9', height: '6px', width: '100%' }}>
          <div
            style={{
              height: '100%',
              width: `${(step / 4) * 100}%`,
              background: 'linear-gradient(90deg, #0062FF 0%, #FF6B00 100%)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ padding: '36px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0062FF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {`Étape ${step} sur 4`}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Configuration en 1 minute</span>
          </div>

          {error && (
            <div style={{ padding: '12px 16px', background: '#FEE2E2', color: '#DC2626', borderRadius: '10px', marginBottom: '20px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          {/* STEP 1: NOM DE L'ACTIVITÉ */}
          {step === 1 && (
            <div key="step-1">
              <h2 style={{ fontSize: '1.45rem', marginBottom: '8px' }}>Comment s'appelle votre activité ?</h2>
              <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '24px' }}>
                C'est le nom qui figurera sur vos reçus et votre tableau de bord.
              </p>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  Nom de votre commerce ou service *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Boutique Moussa & Frères, Salon Reine d'Afrique..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ fontSize: '1.1rem', padding: '14px' }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* STEP 2: SECTEUR */}
          {step === 2 && (
            <div key="step-2">
              <h2 style={{ fontSize: '1.45rem', marginBottom: '8px' }}>Quel est votre secteur d'activité ?</h2>
              <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '20px' }}>
                Cela permet d'adapter vos catégories de dépenses et les conseils du copilote.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {SECTORS.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSector(s.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '12px',
                      border: sector === s.id ? '2px solid #0062FF' : '1px solid #E2E8F0',
                      background: sector === s.id ? '#EFF6FF' : '#FFFFFF',
                      textAlign: 'left',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: sector === s.id ? '#0062FF' : '#1E293B',
                      boxShadow: sector === s.id ? '0 4px 12px rgba(0, 98, 255, 0.12)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '1.3rem' }}>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: MODE DE SUIVI */}
          {step === 3 && (
            <div key="step-3">
              <h2 style={{ fontSize: '1.45rem', marginBottom: '8px' }}>Comment souhaitez-vous gérer ?</h2>
              <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '20px' }}>
                Vous pourrez activer ou désactiver ces options à tout moment.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {TRACKING_MODES.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setTrackingMode(m.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: trackingMode === m.id ? '2px solid #0062FF' : '1px solid #E2E8F0',
                      background: trackingMode === m.id ? '#EFF6FF' : '#FFFFFF',
                      textAlign: 'left',
                      boxShadow: trackingMode === m.id ? '0 4px 12px rgba(0, 98, 255, 0.12)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: trackingMode === m.id ? '#0062FF' : '#0F172A' }}>
                        {m.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '20px',
                          background: trackingMode === m.id ? '#0062FF' : '#F1F5F9',
                          color: trackingMode === m.id ? '#FFFFFF' : '#64748B',
                        }}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: CHIFFRE D'AFFAIRES ESTIMÉ */}
          {step === 4 && (
            <div key="step-4">
              <h2 style={{ fontSize: '1.45rem', marginBottom: '8px' }}>Chiffre d'affaires moyen estimé</h2>
              <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '20px' }}>
                Une estimation nous aide à paramétrer vos alertes et vos ratios de rentabilité.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {REVENUE_ESTIMATES.map((rev, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setDailySalesEstimate(rev)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: dailySalesEstimate === rev ? '2px solid #0062FF' : '1px solid #E2E8F0',
                      background: dailySalesEstimate === rev ? '#EFF6FF' : '#FFFFFF',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: dailySalesEstimate === rev ? '#0062FF' : '#1E293B',
                      boxShadow: dailySalesEstimate === rev ? '0 4px 12px rgba(0, 98, 255, 0.12)' : 'none',
                    }}
                  >
                    {rev}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px' }}>
            {step > 1 ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                <ArrowLeft size={16} /> Retour
              </button>
            ) : <div />}

            {step < 4 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (step === 1 && !name.trim()) {
                    setError('Veuillez renseigner le nom de votre activité.');
                    return;
                  }
                  setError('');
                  setStep(step + 1);
                }}
              >
                Suivant <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleFinish}
                disabled={loading}
                style={{ flex: 1, marginLeft: '12px' }}
              >
                {loading ? 'Création de votre espace...' : 'Accéder au Tableau de Bord 🚀'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
