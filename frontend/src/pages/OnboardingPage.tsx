import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Shield,
  Rocket,
  CheckCircle2,
  Building2,
  ShoppingBag,
  Sliders,
  DollarSign,
  TrendingUp,
  Boxes,
  Users,
  CreditCard,
  Bot,
  Zap,
  Globe,
  MapPin,
  Lock,
  ChevronRight,
  HelpCircle,
  Clock,
  Smartphone,
  Info
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

const SECTORS = [
  { id: 'commerce', label: 'Boutique / Épicerie / Supérette', icon: '🏬', desc: 'Articles au détail, gestion des stocks et ravitaillement régulier' },
  { id: 'commerce_en_ligne', label: 'E-commerce & Vente WhatsApp', icon: '🌐', desc: 'Commandes en ligne, livraisons et paiements Mobile Money' },
  { id: 'vente_vetements', label: 'Mode, Prêt-à-porter & Chaussures', icon: '👗', desc: 'Tailles, modèles, arrivages fréquents et gestion des marges' },
  { id: 'restaurant', label: 'Restaurant, Fast-food & Bar', icon: '🍲', desc: 'Gestion des consommations, ingrédients et caisse par service' },
  { id: 'beaute', label: 'Salon de Coiffure & Cosmétique', icon: '✂️', desc: 'Prestations de coiffure/soins combinées à la vente de produits' },
  { id: 'artisanat', label: 'Artisanat, Atelier & Quincaillerie', icon: '🔨', desc: 'Matériaux, fabrication sur mesure et commandes par tranches' },
  { id: 'services', label: 'Prestations de Services & Agence', icon: '💼', desc: 'Devis, honoraires, factures de service et règlements étalés' },
  { id: 'autre', label: 'Autre Activité Spécifique', icon: '✨', desc: 'Configurez vos propres critères adaptés à votre modèle d\'affaires' },
];

const TRACKING_MODES = [
  {
    id: 'simple',
    title: 'Mode Simplifié',
    badge: 'Démarrage rapide',
    desc: 'Ventes du jour + Dépenses = Bénéfice net estimé en temps réel.',
    features: ['Encaissement express', 'Suivi des dépenses opérationnelles', 'Calcul automatique de marge'],
    icon: Zap,
    recommendedFor: 'Commerce sans stock lourd ou débutants',
  },
  {
    id: 'avec_stock',
    title: 'Gestion de Stock & Alertes',
    badge: 'Le plus populaire',
    desc: 'Catalogue complet d\'articles, prix d\'achat/vente et alertes avant rupture.',
    features: ['Inventaire automatique', 'Alertes ruptures de stocks', 'Calcul des marges réelles par article'],
    icon: Boxes,
    recommendedFor: 'Boutiques, magasins et épiceries',
  },
  {
    id: 'avec_credit',
    title: 'Carnet de Crédits Clients',
    badge: 'Sécurité de caisse',
    desc: 'Suivez qui vous doit de l\'argent, les dates d\'échéance et relances.',
    features: ['Fiches clients débiteurs', 'Historique des remboursements', 'Relances WhatsApp en 1 clic'],
    icon: Users,
    recommendedFor: 'Activités avec facilités de paiement',
  },
  {
    id: 'complet',
    title: 'Mode Intégral Tout-en-Un',
    badge: 'SaaS Professionnel',
    desc: 'Ventes + Dépenses + Stocks & Alertes + Crédits + Clôture de Caisse + Copilote IA.',
    features: ['Module complet de caisse', 'Copilote IA financier interactif', 'Rapports hebdomadaires automatiques', 'Multi-utilisateurs & rôles'],
    icon: Rocket,
    recommendedFor: 'Entrepreneurs exigeants et PME',
  },
];

const REVENUE_ESTIMATES = [
  { id: 'micro', label: 'Moins de 25 000 FCFA / jour', sub: 'Micro-commerce ou démarrage d\'activité' },
  { id: 'medium', label: '25 000 à 100 000 FCFA / jour', sub: 'Commerce de quartier régulier en croissance' },
  { id: 'advanced', label: '100 000 à 500 000 FCFA / jour', sub: 'Boutique active ou moyenne structure' },
  { id: 'scale', label: 'Plus de 500 000 FCFA / jour', sub: 'Entreprise établie ou gros volume de transactions' },
];

const CURRENCIES = [
  { code: 'XAF', label: 'FCFA (Afrique Centrale - CEMAC)' },
  { code: 'XOF', label: 'FCFA (Afrique de l\'Ouest - UEMOA)' },
  { code: 'GNF', label: 'Franc Guinéen (GNF)' },
  { code: 'CDF', label: 'Franc Congolais (CDF)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'Dollar US ($)' },
];

export const OnboardingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [sector, setSector] = useState('commerce');
  const [city, setCity] = useState('');
  const [currency, setCurrency] = useState('XAF');

  // Custom Sector Details (Opened when "Autre Activité" is clicked)
  const [isCustomSectorPage, setIsCustomSectorPage] = useState(false);
  const [customSectorTitle, setCustomSectorTitle] = useState('');
  const [customProducts, setCustomProducts] = useState('');
  const [customSalesChannel, setCustomSalesChannel] = useState('physique_et_enligne');
  const [customHasStock, setCustomHasStock] = useState<boolean>(true);
  const [customPaymentMode, setCustomPaymentMode] = useState('cash_et_momo');
  const [customNotes, setCustomNotes] = useState('');

  const [trackingMode, setTrackingMode] = useState('avec_stock');
  const [dailySalesEstimate, setDailySalesEstimate] = useState(REVENUE_ESTIMATES[1].label);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'business'>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { fetchMe, user } = useAuthStore();
  const navigate = useNavigate();

  const STEPS_NAV = [
    { num: 1, title: 'Identité', desc: 'Nom & localisation' },
    { num: 2, title: 'Secteur', desc: 'Métier & catalogue' },
    { num: 3, title: 'Gestion', desc: 'Mode de suivi' },
    { num: 4, title: 'Volume', desc: 'Chiffre d\'affaires' },
    { num: 5, title: 'Formule', desc: 'Offre & activation' },
  ];

  const handleFinish = async () => {
    const businessName = name.trim() || 'Mon Commerce';

    try {
      setLoading(true);
      setError('');

      const finalSector = sector === 'autre' && customSectorTitle.trim()
        ? `autre_${customSectorTitle.trim().toLowerCase().replace(/[^a-z0-9]/gi, '_').slice(0, 30)}`
        : sector;

      const res: any = await api.post('/auth/business', {
        name: businessName,
        sector: finalSector || 'commerce',
        city: city.trim() || undefined,
        currency,
        customSector: customSectorTitle.trim() || undefined,
        businessDescription: customProducts.trim() || undefined,
        salesChannels: [customSalesChannel],
        hasStock: customHasStock,
        trackingMode: trackingMode || 'avec_stock',
        dailySalesEstimate: dailySalesEstimate || REVENUE_ESTIMATES[1].label,
        plan: selectedPlan,
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
        background: 'linear-gradient(180deg, #F0F4FA 0%, #FFFFFF 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 16px 48px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
    >
      {/* SaaS Header with Trust Badge */}
      <header style={{ width: '100%', maxWidth: '980px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img
            src="/commercia-logo.png"
            alt="COMMERCIA"
            style={{
              width: '46px',
              height: '46px',
              objectFit: 'contain',
              borderRadius: '12px',
              background: '#FFFFFF',
              padding: '3px',
              boxShadow: '0 4px 14px rgba(0, 98, 255, 0.22)',
              border: '1px solid #E2E8F0',
            }}
          />
          <div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#08162B', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              COMMERC<span style={{ color: '#FF7A00' }}>IA</span>
              <span style={{ fontSize: '0.65rem', background: '#0062FF', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, marginLeft: '6px' }}>SAAS</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Assistant de déploiement & configuration de votre commerce
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FFFFFF', padding: '6px 14px', borderRadius: '24px', border: '1px solid #E2E8F0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <Shield size={16} color="#10B981" />
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
            Compte sécurisé • Multi-Tenant Neon Cloud
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          width: '100%',
          maxWidth: '980px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 40px -12px rgba(8, 22, 43, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '280px 1fr',
        }}
      >
        {/* Left Sidebar — Stepper Navigation & Context */}
        <aside
          style={{
            background: 'linear-gradient(180deg, #08162B 0%, #0F2342 100%)',
            color: '#FFFFFF',
            padding: '36px 24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            borderRight: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38BDF8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              GUIDE D'INITIALISATION
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '24px', lineHeight: 1.3 }}>
              Configurez votre espace en quelques clics
            </h3>

            {/* Stepper items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {STEPS_NAV.map((s) => {
                const isActive = step === s.num;
                const isDone = step > s.num;

                return (
                  <div
                    key={s.num}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      opacity: isActive ? 1 : isDone ? 0.9 : 0.45,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: isDone ? '#10B981' : isActive ? '#0062FF' : 'rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        flexShrink: 0,
                        boxShadow: isActive ? '0 0 12px rgba(0, 98, 255, 0.6)' : 'none',
                        border: isActive ? '2px solid #93C5FD' : 'none',
                      }}
                    >
                      {isDone ? <Check size={14} strokeWidth={3} /> : s.num}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: isActive ? 800 : 600, color: isActive ? '#FFFFFF' : '#CBD5E1' }}>
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Box: Isolation reminder */}
          <div
            style={{
              marginTop: '32px',
              padding: '16px',
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Lock size={14} color="#38BDF8" />
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Données 100% Vierge & Isolées</span>
            </div>
            <p style={{ fontSize: '0.73rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
              Votre compte démarre à zéro : aucun chiffre fictif ni article par défaut. Vos futures données sont synchronisées sur le Cloud.
            </p>
          </div>
        </aside>

        {/* Right Content Area */}
        <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Top Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0062FF', background: '#EFF6FF', padding: '4px 10px', borderRadius: '14px' }}>
                  {isCustomSectorPage ? 'Personnalisation Sur-Mesure' : `Étape ${step} sur 5`}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>•</span>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 500 }}>
                  {STEPS_NAV[step - 1]?.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#64748B' }}>
                <Clock size={13} />
                <span>Environ 1 minute</span>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  fontSize: '0.88rem',
                  border: '1px solid #FCA5A5',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Info size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 1: IDENTITÉ & LOCALISATION                          */}
            {/* ======================================================== */}
            {step === 1 && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '22px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Comment s'appelle votre activité ?
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.92rem', lineHeight: 1.5 }}>
                    Ce nom officiel s'affichera sur vos reçus de vente, vos factures et votre tableau de bord financier.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                      Nom commercial de votre boutique ou entreprise <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Boutique Élégance, Quincaillerie Moderne, Fast-Food Le Gourmet..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        borderRadius: '12px',
                        border: '1px solid #CBD5E1',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                      autoFocus
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                        Ville ou Marché d'implantation
                      </label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={16} color="#94A3B8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Ex: Douala (Akwa), Yaoundé, Abidjan..."
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px 14px 12px 38px',
                            fontSize: '0.9rem',
                            borderRadius: '12px',
                            border: '1px solid #CBD5E1',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                        Devise principale de caisse
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          borderRadius: '12px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ padding: '14px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Sparkles size={18} color="#0062FF" />
                    <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                      Vous pourrez ajouter d'autres points de vente ou caisses secondaires ultérieurement.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: SECTEUR D'ACTIVITÉ                               */}
            {/* ======================================================== */}
            {step === 2 && !isCustomSectorPage && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Quel est votre secteur principal ?
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
                    COMMERCIA adaptera automatiquement la nomenclature de vos stocks, vos catégories de charges et votre Copilote IA.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {SECTORS.map((s) => {
                    const isSelected = sector === s.id;
                    const isAutre = s.id === 'autre';

                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSector(s.id);
                          setError('');
                          if (isAutre) {
                            setIsCustomSectorPage(true);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '14px 16px',
                          borderRadius: '14px',
                          border: isSelected ? '2px solid #0062FF' : '1px solid #E2E8F0',
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 14px rgba(0, 98, 255, 0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{s.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#0062FF' : '#1E293B', marginBottom: '2px' }}>
                            {s.label}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.3 }}>
                            {s.desc}
                          </div>
                        </div>
                        {isAutre ? (
                          <span style={{ fontSize: '0.7rem', color: '#0062FF', background: '#DBEAFE', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                            Personnaliser ✍️
                          </span>
                        ) : isSelected ? (
                          <Check size={16} color="#0062FF" strokeWidth={3} />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* DEDICATED SUB-PAGE: AUTRE ACTIVITÉ PERSONNALISÉE */}
            {step === 2 && isCustomSectorPage && (
              <div style={{ animation: 'fadeIn 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '1.3rem' }}>✨</span>
                  <h2 style={{ fontSize: '1.35rem', margin: 0, color: '#0F172A', fontWeight: 800 }}>
                    Décrivez votre activité personnalisée
                  </h2>
                </div>
                <p style={{ color: '#64748B', fontSize: '0.88rem', marginBottom: '20px' }}>
                  Renseignez ces détails pour que votre Copilote IA et vos rapports s'ajustent sur-mesure à vos opérations.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Intitulé exact de l'activité <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Élevage avicole, Quincaillerie & pièces auto, Agence immobilière..."
                      value={customSectorTitle}
                      onChange={(e) => setCustomSectorTitle(e.target.value)}
                      autoFocus
                      style={{ width: '100%', fontSize: '0.92rem', padding: '12px 14px', borderRadius: '10px', border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Articles ou prestations proposées
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Alvéoles d'œufs & poulets au détail, pièces neuves/occasion, devis..."
                      value={customProducts}
                      onChange={(e) => setCustomProducts(e.target.value)}
                      style={{ width: '100%', fontSize: '0.92rem', padding: '12px 14px', borderRadius: '10px', border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Canal de vente principal
                      </label>
                      <select
                        value={customSalesChannel}
                        onChange={(e) => setCustomSalesChannel(e.target.value)}
                        style={{ width: '100%', padding: '11px 12px', fontSize: '0.85rem', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                      >
                        <option value="physique">Local / Boutique physique</option>
                        <option value="enligne">En ligne / WhatsApp / Social</option>
                        <option value="physique_et_enligne">Physique & En ligne</option>
                        <option value="sur_commande">Sur devis / Commande</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Gestion des stocks physiques
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setCustomHasStock(true)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '10px',
                            border: customHasStock ? '2px solid #0062FF' : '1px solid #CBD5E1',
                            background: customHasStock ? '#EFF6FF' : '#FFFFFF',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: customHasStock ? '#0062FF' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          📦 Oui (Avec stock)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomHasStock(false)}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '10px',
                            border: !customHasStock ? '2px solid #0062FF' : '1px solid #CBD5E1',
                            background: !customHasStock ? '#EFF6FF' : '#FFFFFF',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: !customHasStock ? '#0062FF' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          ⚙️ Non (Prestations)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setIsCustomSectorPage(false);
                    }}
                    style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ← Revenir aux secteurs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!customSectorTitle.trim()) {
                        setError('Veuillez préciser la nature ou le nom de votre activité personnalisée.');
                        return;
                      }
                      setError('');
                      setIsCustomSectorPage(false);
                      setStep(3);
                    }}
                    style={{ padding: '10px 22px', borderRadius: '10px', background: '#0062FF', color: '#FFFFFF', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  >
                    Valider & Continuer →
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 3: MODE DE GESTION & PROFONDEUR DU SUIVI           */}
            {/* ======================================================== */}
            {step === 3 && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Comment souhaitez-vous piloter votre commerce ?
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
                    Choisissez le niveau de précision souhaité. Vous pourrez l'ajuster à tout moment dans vos paramètres.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {TRACKING_MODES.map((m) => {
                    const isSelected = trackingMode === m.id;
                    const IconComp = m.icon;

                    return (
                      <div
                        key={m.id}
                        onClick={() => setTrackingMode(m.id)}
                        style={{
                          padding: '18px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid #0062FF' : '1px solid #E2E8F0',
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 6px 18px rgba(0, 98, 255, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: isSelected ? '#0062FF' : '#F1F5F9',
                                  color: isSelected ? '#FFFFFF' : '#0062FF',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <IconComp size={18} />
                              </div>
                              <span style={{ fontWeight: 800, fontSize: '0.98rem', color: isSelected ? '#0062FF' : '#0F172A' }}>
                                {m.title}
                              </span>
                            </div>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: isSelected ? '#0062FF' : '#F1F5F9',
                                color: isSelected ? '#FFFFFF' : '#64748B',
                              }}
                            >
                              {m.badge}
                            </span>
                          </div>

                          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: '12px', lineHeight: 1.4 }}>
                            {m.desc}
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {m.features.map((feat, fIdx) => (
                              <div key={fIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569' }}>
                                <CheckCircle2 size={12} color={isSelected ? '#0062FF' : '#10B981'} />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div style={{ marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #E2E8F0', fontSize: '0.72rem', color: '#94A3B8' }}>
                          Recommandé pour : <strong>{m.recommendedFor}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 4: VOLUME & CHIFFRE D'AFFAIRES ESTIMÉ               */}
            {/* ======================================================== */}
            {step === 4 && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Quel est votre volume d'activité journalier ?
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
                    Ces repères permettent au Copilote COMMERCIA de détecter les variations inhabituelles et de calibrer vos seuils d'alerte de trésorerie.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {REVENUE_ESTIMATES.map((rev) => {
                    const isSelected = dailySalesEstimate === rev.label;

                    return (
                      <div
                        key={rev.id}
                        onClick={() => setDailySalesEstimate(rev.label)}
                        style={{
                          padding: '16px 20px',
                          borderRadius: '14px',
                          border: isSelected ? '2px solid #0062FF' : '1px solid #E2E8F0',
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: isSelected ? '0 4px 14px rgba(0, 98, 255, 0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: isSelected ? '#0062FF' : '#F1F5F9',
                              color: isSelected ? '#FFFFFF' : '#0062FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <TrendingUp size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.98rem', color: isSelected ? '#0062FF' : '#0F172A' }}>
                              {rev.label}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                              {rev.sub}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#0062FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 5: FORMULE & ACTIVATION SAAS                        */}
            {/* ======================================================== */}
            {step === 5 && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Rocket size={22} color="#0062FF" />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Sélectionnez votre formule COMMERCIA
                    </h2>
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.92rem' }}>
                    Activez votre espace. Vous démarrez immédiatement sur un compte propre prêt à enregistrer vos flux réels.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {/* PLAN GRATUIT */}
                  <div
                    onClick={() => setSelectedPlan('free')}
                    style={{
                      padding: '20px 18px',
                      borderRadius: '16px',
                      border: selectedPlan === 'free' ? '2px solid #0062FF' : '1px solid #E2E8F0',
                      background: selectedPlan === 'free' ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedPlan === 'free' ? '0 8px 20px rgba(0, 98, 255, 0.12)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>Plan Gratuit</span>
                        {selectedPlan === 'free' && <Check size={18} color="#0062FF" strokeWidth={3} />}
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
                        0 FCFA <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>/ à vie</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4, marginBottom: '14px' }}>
                        Pour démarrer et tester la saisie simple des ventes au comptoir.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#475569' }}>
                        <div>• 15 ventes / jour max</div>
                        <div>• Calcul de marge de base</div>
                        <div>• Support standard</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', padding: '6px 10px', background: '#F1F5F9', borderRadius: '8px', fontSize: '0.7rem', color: '#64748B', textAlign: 'center' }}>
                      Idéal pour découvrir l'interface
                    </div>
                  </div>

                  {/* PLAN PRO (RECOMMANDÉ) */}
                  <div
                    onClick={() => setSelectedPlan('pro')}
                    style={{
                      padding: '20px 18px',
                      borderRadius: '16px',
                      border: selectedPlan === 'pro' ? '2px solid #0062FF' : '2px solid #BFDBFE',
                      background: selectedPlan === 'pro' ? '#EFF6FF' : '#FFFFFF',
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedPlan === 'pro' ? '0 10px 24px rgba(0, 98, 255, 0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #0062FF 0%, #0045B5 100%)',
                        color: '#FFFFFF',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        padding: '3px 12px',
                        borderRadius: '20px',
                        letterSpacing: '0.04em',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ⭐ RECOMMANDÉ (COMMERCES)
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0062FF' }}>Plan Pro</span>
                        {selectedPlan === 'pro' && <Check size={18} color="#0062FF" strokeWidth={3} />}
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0062FF', marginBottom: '8px' }}>
                        4 500 FCFA <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>/ mois</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.4, marginBottom: '14px', fontWeight: 500 }}>
                        Tous les outils nécessaires pour sécuriser vos recettes et éliminer les fuites de caisse.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#1E293B' }}>
                        <div><strong>• Ventes illimitées</strong></div>
                        <div>• Stocks & Alertes ruptures</div>
                        <div>• Carnet de crédits & Relance WhatsApp</div>
                        <div><strong>• Copilote IA interactif</strong></div>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', padding: '6px 10px', background: '#DBEAFE', color: '#0062FF', borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center' }}>
                      Essai 30 jours inclus
                    </div>
                  </div>

                  {/* PLAN BUSINESS */}
                  <div
                    onClick={() => setSelectedPlan('business')}
                    style={{
                      padding: '20px 18px',
                      borderRadius: '16px',
                      border: selectedPlan === 'business' ? '2px solid #FF6B00' : '1px solid #E2E8F0',
                      background: selectedPlan === 'business' ? '#FFF7ED' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s ease',
                      boxShadow: selectedPlan === 'business' ? '0 8px 20px rgba(255, 107, 0, 0.14)' : 'none',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0F172A' }}>Plan Business</span>
                        {selectedPlan === 'business' && <Check size={18} color="#FF6B00" strokeWidth={3} />}
                      </div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#C2410C', marginBottom: '8px' }}>
                        12 000 FCFA <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B' }}>/ mois</span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#64748B', lineHeight: 1.4, marginBottom: '14px' }}>
                        Pour multi-boutiques et gestion d'équipe de caissiers avec caisses isolées.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem', color: '#475569' }}>
                        <div>• Multi-boutiques isolées</div>
                        <div>• Rôles gérants & caissiers</div>
                        <div>• Rapports PDF consolidés</div>
                        <div>• Support WhatsApp VIP 24/7</div>
                      </div>
                    </div>

                    <div style={{ marginTop: '16px', padding: '6px 10px', background: '#FFEDD5', color: '#C2410C', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, textAlign: 'center' }}>
                      Pour moyennes structures
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer Navigation Buttons */}
          {!isCustomSectorPage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '36px',
                paddingTop: '20px',
                borderTop: '1px solid #F1F5F9',
              }}
            >
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep(step - 1);
                  }}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <ArrowLeft size={16} /> Précédent
                </button>
              ) : (
                <div />
              )}

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && !name.trim()) {
                      setError('Veuillez renseigner le nom de votre commerce ou activité.');
                      return;
                    }
                    if (step === 2 && sector === 'autre') {
                      setIsCustomSectorPage(true);
                      return;
                    }
                    setError('');
                    setStep(step + 1);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 26px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)',
                    color: '#FFFFFF',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0, 98, 255, 0.3)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Continuer <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    padding: '14px 32px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #0062FF 0%, #FF6B00 100%)',
                    color: '#FFFFFF',
                    fontSize: '1rem',
                    fontWeight: 800,
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 20px rgba(0, 98, 255, 0.35)',
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? (
                    'Initialisation de votre espace vierge...'
                  ) : (
                    <>
                      <span>Activer mon Commerce & Lancer le Tableau de Bord</span>
                      <Rocket size={18} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer style={{ marginTop: '24px', fontSize: '0.78rem', color: '#94A3B8', textAlign: 'center' }}>
        COMMERCIA SaaS • Conçu pour les commerçants, boutiques et PME • Données chiffrées & isolées
      </footer>
    </div>
  );
};
