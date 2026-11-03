import React, { useState, useEffect } from 'react';
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
  Boxes,
  Users,
  CreditCard,
  Bot,
  Zap,
  MapPin,
  Lock,
  Clock,
  Info,
  Package,
  Landmark,
  Truck,
  TrendingUp,
  Layers,
  HelpCircle,
  Eye,
  X,
  Crown,
  Smartphone,
  RefreshCw,
  CheckCircle,
  QrCode,
  AlertCircle,
  Phone,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { calculateDiscountedPrice, validatePromoCode } from '../utils/promoService';
import {
  MANAGEMENT_MODES,
  MODULES_CATALOG,
  PLANS_CONFIG,
  REVENUE_ESTIMATES,
  SECTORS,
  CURRENCIES,
  SubscriptionPlanId,
  TrackingModeId
} from '../config/modulesConfig';
import {
  BUSINESS_PROFILES,
  getProfilesGroupedByFamily,
  BusinessProfileId,
} from '../config/businessProfiles';

const ONBOARDING_DRAFT_KEY = 'commercia_onboarding_draft';

export const OnboardingPage: React.FC = () => {
  // --- Persisted State Initialization ---
  const savedDraft = (() => {
    try {
      const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  })();

  const [step, setStep] = useState<number>(savedDraft?.step || 1);
  const [name, setName] = useState<string>(savedDraft?.name || '');
  const [city, setCity] = useState<string>(savedDraft?.city || '');
  const [currency, setCurrency] = useState<string>(savedDraft?.currency || 'XAF');

  // Sector (Main + Secondary activities)
  const [sector, setSector] = useState<string>(savedDraft?.sector || 'commerce');
  const [profileId, setProfileId] = useState<string>(savedDraft?.profileId || 'epicerie_alimentation');
  const [profileSearch, setProfileSearch] = useState<string>('');
  const [secondarySectors, setSecondarySectors] = useState<string[]>(savedDraft?.secondarySectors || []);

  // Custom Sector Details (When "Autre Activité" is clicked)
  const [isCustomSectorPage, setIsCustomSectorPage] = useState<boolean>(false);
  const [customSectorTitle, setCustomSectorTitle] = useState<string>(savedDraft?.customSectorTitle || '');
  const [customProducts, setCustomProducts] = useState<string>(savedDraft?.customProducts || '');
  const [customSalesChannel, setCustomSalesChannel] = useState<string>(savedDraft?.customSalesChannel || 'physique_et_enligne');
  const [customHasStock, setCustomHasStock] = useState<boolean>(savedDraft?.customHasStock ?? true);

  // Management Mode (A: simple, B: avec_stock, C: complet)
  const [trackingMode, setTrackingMode] = useState<TrackingModeId>(savedDraft?.trackingMode || 'avec_stock');

  // Revenue Estimate (Target/Calibration only)
  const [dailySalesEstimate, setDailySalesEstimate] = useState<string>(
    savedDraft?.dailySalesEstimate || REVENUE_ESTIMATES[1].label
  );

  // Plan Choice (Free, Pro, Business)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanId>(savedDraft?.selectedPlan || 'free');

  // Modules Catalog Modal / Viewer
  const [showModulesModal, setShowModulesModal] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const { user, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  // Payment Modal & Checkout State
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [periodicite, setPeriodicite] = useState<'mensuel' | 'annuel'>('mensuel');
  const [moyenPaiement, setMoyenPaiement] = useState<'orange' | 'mtn' | 'wave' | 'card'>('orange');
  const [momoPhone, setMomoPhone] = useState<string>(user?.phone || '');
  const [waveAction, setWaveAction] = useState<'push' | 'qr'>('push');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>(
    user?.firstName || user?.lastName ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim() : ''
  );
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoError, setPromoError] = useState<string>('');

  const [paymentStep, setPaymentStep] = useState<'form' | 'waiting' | 'success'>('form');
  const [currentPaymentRef, setCurrentPaymentRef] = useState<string>('');
  const [isInitiating, setIsInitiating] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifiedPayment, setVerifiedPayment] = useState<any>(null);

  // Price calculations
  const baseAmount = selectedPlan === 'business'
    ? (periodicite === 'mensuel' ? 12000 : 120000)
    : (periodicite === 'mensuel' ? 4500 : 45000);
  const finalAmount = appliedPromo ? calculateDiscountedPrice(baseAmount, appliedPromo.code).finalPrice : baseAmount;

  // --- Auto-Save draft to localStorage on any state modification ---
  useEffect(() => {
    const draft = {
      step,
      name,
      city,
      currency,
      sector,
      secondarySectors,
      customSectorTitle,
      customProducts,
      customSalesChannel,
      customHasStock,
      trackingMode,
      dailySalesEstimate,
      selectedPlan,
    };
    try {
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      // Ignore quota errors
    }
  }, [
    step,
    name,
    city,
    currency,
    sector,
    secondarySectors,
    customSectorTitle,
    customProducts,
    customSalesChannel,
    customHasStock,
    trackingMode,
    dailySalesEstimate,
    selectedPlan,
  ]);

  const STEPS_NAV = [
    { num: 1, title: 'Identité', desc: 'Nom & Devise de caisse' },
    { num: 2, title: 'Secteur', desc: 'Métier & Activités' },
    { num: 3, title: 'Gestion', desc: 'Mode de suivi initial' },
    { num: 4, title: 'Volume', desc: 'Objectif & calibrage' },
    { num: 5, title: 'Formule', desc: 'Offre & activation' },
  ];

  const toggleSecondarySector = (sectorId: string) => {
    if (secondarySectors.includes(sectorId)) {
      setSecondarySectors(secondarySectors.filter((id) => id !== sectorId));
    } else {
      setSecondarySectors([...secondarySectors, sectorId]);
    }
  };

  const handleFinish = async (planToActivate: SubscriptionPlanId = selectedPlan, paymentRef?: string) => {
    const businessName = name.trim() || 'Mon Commerce';

    try {
      setLoading(true);
      setError('');

      const finalSector =
        sector === 'autre' && customSectorTitle.trim()
          ? `autre_${customSectorTitle.trim().toLowerCase().replace(/[^a-z0-9]/gi, '_').slice(0, 30)}`
          : sector;

      const selectedProfile = BUSINESS_PROFILES[profileId as BusinessProfileId] || BUSINESS_PROFILES.epicerie_alimentation;

      const res: any = await api.post('/auth/business', {
        name: businessName,
        profileId: profileId || 'epicerie_alimentation',
        sector: finalSector || 'commerce',
        secondarySectors,
        city: city.trim() || undefined,
        currency,
        customSector: customSectorTitle.trim() || undefined,
        businessDescription: customProducts.trim() || undefined,
        salesChannels: [customSalesChannel],
        activeModules: selectedProfile.recommendedModules || ['stock_inventaire', 'ventes_caisse'],
        hasStock: customHasStock,
        trackingMode: trackingMode || selectedProfile.defaultTrackingMode || 'avec_stock',
        dailySalesEstimate: dailySalesEstimate || REVENUE_ESTIMATES[1].label,
        plan: planToActivate,
        paymentRef: paymentRef || undefined,
      });

      if (res?.business?.id) {
        localStorage.setItem('activeBusinessId', res.business.id);
      }
      if (res?.user) {
        localStorage.setItem('commercia_user', JSON.stringify(res.user));
      }

      // Clear draft on successful activation
      localStorage.removeItem(ONBOARDING_DRAFT_KEY);

      await fetchMe();
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error('Error creating business:', err);
      setError(err.message || 'Erreur lors de la configuration de votre activité.');
    } finally {
      setLoading(false);
    }
  };

  const handleBypassToFree = async () => {
    setShowPayModal(false);
    setSelectedPlan('free');
    await handleFinish('free');
  };

  const handleApplyPromo = () => {
    setPromoError('');
    if (!promoCodeInput.trim()) return;
    const result = validatePromoCode(promoCodeInput.trim());
    if (result.isValid && result.rule) {
      setAppliedPromo(result.rule);
    } else {
      setPromoError(result.message || 'Code promo invalide');
    }
  };

  const handleInitiatePayment = async () => {
    if (moyenPaiement === 'card') {
      if (cardNumber.replace(/\s/g, '').length < 16) {
        alert('Numéro de carte bancaire invalide (16 chiffres requis).');
        return;
      }
      if (!cardHolder.trim()) {
        alert('Veuillez renseigner le nom du porteur de la carte.');
        return;
      }
      if (cardExpiry.length < 5) {
        alert('Veuillez renseigner la date d\'expiration (MM/AA).');
        return;
      }
      if (cardCvv.length < 3) {
        alert('Veuillez renseigner le cryptogramme de sécurité (CVV).');
        return;
      }
    } else {
      if (!momoPhone.trim()) {
        alert('Veuillez renseigner le numéro de téléphone pour le débit.');
        return;
      }
    }

    try {
      setIsInitiating(true);
      const res = await api.post<{ payment: any; message: string }>('/payments/initiate', {
        planName: selectedPlan,
        billingCycle: periodicite,
        provider: moyenPaiement,
        phoneNumber: moyenPaiement === 'card' ? `CARD-****${cardNumber.slice(-4)}` : momoPhone,
        metadata: moyenPaiement === 'card' ? {
          cardLast4: cardNumber.slice(-4),
          cardHolder,
          cardBrand: cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
          promoCode: appliedPromo?.code,
        } : {
          waveAction: waveAction,
          promoCode: appliedPromo?.code,
        },
      });

      setCurrentPaymentRef(res.payment.reference);
      setPaymentStep('waiting');
      setIsInitiating(false);

      // Start automatic polling every 3.5s
      const pollTimer = setInterval(async () => {
        try {
          const check = await api.get<{ status: string; payment: any }>(`/payments/verify/${res.payment.reference}`);
          if (check.status === 'completed') {
            clearInterval(pollTimer);
            setVerifiedPayment(check.payment);
            setPaymentStep('success');
            await fetchMe();
          }
        } catch (err) {
          // silently ignore polling errors
        }
      }, 3500);

      // Timeout safety for poller after 2 minutes
      setTimeout(() => clearInterval(pollTimer), 120000);
    } catch (err: any) {
      setIsInitiating(false);
      alert(err?.response?.data?.message || err?.message || 'Erreur lors de l\'initialisation du paiement');
    }
  };

  const handleCheckVerification = async () => {
    if (!currentPaymentRef) return;
    try {
      setIsVerifying(true);
      const check = await api.get<{ status: string; payment: any }>(`/payments/verify/${currentPaymentRef}`);
      if (check.status === 'completed') {
        setVerifiedPayment(check.payment);
        setPaymentStep('success');
        await fetchMe();
      } else {
        alert('Transaction en attente de validation par l\'opérateur.');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erreur lors de la vérification.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulatePaymentSuccess = async () => {
    if (!currentPaymentRef) return;
    try {
      setIsVerifying(true);
      await api.post('/payments/confirm-sandbox', {
        reference: currentPaymentRef,
        outcome: 'success',
      });
      const check = await api.get<{ status: string; payment: any }>(`/payments/verify/${currentPaymentRef}`);
      setVerifiedPayment(check.payment || { reference: currentPaymentRef });
      setPaymentStep('success');
      await fetchMe();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erreur lors de la simulation sandbox');
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper to render mode icon
  const renderModeIcon = (iconName: string, size = 20) => {
    switch (iconName) {
      case 'Zap':
        return <Zap size={size} />;
      case 'Boxes':
        return <Boxes size={size} />;
      case 'Rocket':
        return <Rocket size={size} />;
      default:
        return <Sparkles size={size} />;
    }
  };

  // Helper to render module icon
  const renderModuleIcon = (iconName: string, size = 20) => {
    switch (iconName) {
      case 'Package':
        return <Package size={size} />;
      case 'Users':
        return <Users size={size} />;
      case 'Boxes':
        return <Boxes size={size} />;
      case 'TrendingUp':
        return <TrendingUp size={size} />;
      case 'Landmark':
        return <Landmark size={size} />;
      case 'Bot':
        return <Bot size={size} />;
      case 'Truck':
        return <Truck size={size} />;
      case 'Building2':
        return <Building2 size={size} />;
      default:
        return <Layers size={size} />;
    }
  };

  const currentSectorConfig = SECTORS.find((s) => s.id === sector);

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
      <header
        style={{
          width: '100%',
          maxWidth: '1000px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
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
            <div
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: '#08162B',
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              COMMERC<span style={{ color: '#FF7A00' }}>IA</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  background: '#0062FF',
                  color: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 800,
                  marginLeft: '6px',
                }}
              >
                SAAS
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Assistant de déploiement & configuration de votre commerce
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowModulesModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '24px',
              border: '1px solid #CBD5E1',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#0062FF',
            }}
          >
            <Layers size={15} />
            <span>Catalogue des 8 modules</span>
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '24px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <Shield size={16} color="#10B981" />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
              Compte sécurisé • Données isolées
            </span>
          </div>
        </div>
      </header>

      {/* Main Stepper Container */}
      <main
        style={{
          width: '100%',
          maxWidth: '1000px',
          background: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 40px -12px rgba(8, 22, 43, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: '290px 1fr',
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
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#38BDF8',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              PARCOURS D'INITIALISATION
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', marginBottom: '24px', lineHeight: 1.3 }}>
              Configurez votre espace en 5 étapes claires
            </h3>

            {/* Stepper items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {STEPS_NAV.map((s) => {
                const isActive = step === s.num;
                const isDone = step > s.num;

                return (
                  <div
                    key={s.num}
                    onClick={() => {
                      // Allow navigating back or directly to any previous completed step
                      if (isDone) {
                        setError('');
                        setIsCustomSectorPage(false);
                        setStep(s.num);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      opacity: isActive ? 1 : isDone ? 0.95 : 0.45,
                      cursor: isDone ? 'pointer' : 'default',
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
                      <div
                        style={{
                          fontSize: '0.88rem',
                          fontWeight: isActive ? 800 : 600,
                          color: isActive ? '#FFFFFF' : '#CBD5E1',
                        }}
                      >
                        {s.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Box: Isolation & Clean Account Guarantee */}
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
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Données 100% Réelles & Vierges</span>
            </div>
            <p style={{ fontSize: '0.73rem', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
              Aucun chiffre fictif, aucune vente ni produit inventé. Vos choix définissent uniquement vos préférences de démarrage.
            </p>
          </div>
        </aside>

        {/* Right Content Area */}
        <div style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Top Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    color: '#0062FF',
                    background: '#EFF6FF',
                    padding: '4px 10px',
                    borderRadius: '14px',
                  }}
                >
                  {isCustomSectorPage ? 'Personnalisation Sur-Mesure' : `Étape ${step} sur 5`}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>•</span>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                  {STEPS_NAV[step - 1]?.title}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#64748B' }}>
                <Clock size={13} />
                <span>Brouillon sauvegardé automatiquement</span>
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
            {/* ÉTAPE 1: IDENTITÉ & LOCALISATION                          */}
            {/* ======================================================== */}
            {step === 1 && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '22px' }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Identité de votre espace commercial
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Renseignez les informations de base pour démarrer immédiatement. Vous n'avez pas besoin de remplir des formalités complexes pour activer votre compte.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                      Nom commercial de votre activité ou boutique <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Boutique Élégance, Quincaillerie Centrale, Fast-Food Le Gourmet..."
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
                        Ville ou Marché d'implantation <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>(optionnel)</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <MapPin
                          size={16}
                          color="#94A3B8"
                          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                        />
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

                  {/* Clarification reassurance banner */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Building2 size={20} color="#0062FF" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
                      <strong style={{ color: '#0F172A' }}>Flexibilité & Évolution :</strong> Seul le nom commercial est requis pour démarrer. Vous pourrez ajouter ultérieurement vos mentions légales (RCCM, NIF), vos coordonnées précises et configurer plusieurs points de vente ou caisses secondaires depuis vos paramètres.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* ÉTAPE 2: SÉLECTION DU PROFIL MÉTIER (20 ACTIVITÉS)        */}
            {/* ======================================================== */}
            {step === 2 && !isCustomSectorPage && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Quelle est votre activité principale parmi nos 20 métiers ?
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.4 }}>
                    COMMERCIA adapte immédiatement vos formulaires, vos alertes, votre vocabulaire et vos indicateurs financiers à votre métier réel.
                  </p>
                </div>

                {/* Search Filter for Profiles */}
                <div style={{ marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="🔍 Rechercher votre métier (ex: friperie, restaurant, couture, quincaillerie, mobile money...)"
                    value={profileSearch}
                    onChange={(e) => setProfileSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      fontSize: '0.92rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* 20 Profiles Grouped by 6 Families */}
                <div style={{ maxHeight: '380px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '18px' }}>
                  {getProfilesGroupedByFamily().map((family) => {
                    const filteredProfiles = family.profiles.filter(p =>
                      p.name.toLowerCase().includes(profileSearch.toLowerCase()) ||
                      p.description.toLowerCase().includes(profileSearch.toLowerCase()) ||
                      p.tagline.toLowerCase().includes(profileSearch.toLowerCase())
                    );

                    if (filteredProfiles.length === 0) return null;

                    return (
                      <div key={family.familyKey}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{family.emoji}</span>
                          <span>{family.name}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                          {filteredProfiles.map((p) => {
                            const isSelected = profileId === p.id;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setProfileId(p.id);
                                  setSector(p.family);
                                  setTrackingMode(p.defaultTrackingMode);
                                  setError('');
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '10px',
                                  padding: '10px 12px',
                                  borderRadius: '12px',
                                  border: isSelected ? '2px solid #0062FF' : '1px solid #E2E8F0',
                                  background: isSelected ? '#EFF6FF' : '#FFFFFF',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isSelected ? '0 4px 12px rgba(0, 98, 255, 0.12)' : 'none',
                                }}
                              >
                                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{p.emoji}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.86rem', color: isSelected ? '#0062FF' : '#0F172A', marginBottom: '2px' }}>
                                    {p.name}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: 1.25 }}>
                                    {p.tagline}
                                  </div>
                                </div>
                                {isSelected && <Check size={16} color="#0062FF" strokeWidth={3} style={{ flexShrink: 0, marginTop: '2px' }} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Secondary Complementary Activities Selector */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '14px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={16} color="#0062FF" />
                      <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#1E293B' }}>
                        Activités secondaires ou complémentaires (Optionnel)
                      </span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      Sélectionnez tout ce qui s'applique
                    </span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: '#64748B', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                    COMMERCIA ne vous enferme pas dans une case : vous pouvez combiner plusieurs activités (ex: Boutique de vêtements + Vente en ligne WhatsApp).
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {SECTORS.filter((s) => s.id !== sector && s.id !== 'autre').map((s) => {
                      const isChecked = secondarySectors.includes(s.id);

                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSecondarySector(s.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            border: isChecked ? '1px solid #0062FF' : '1px solid #CBD5E1',
                            background: isChecked ? '#EFF6FF' : '#FFFFFF',
                            color: isChecked ? '#0062FF' : '#475569',
                            fontSize: '0.76rem',
                            fontWeight: isChecked ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{s.icon}</span>
                          <span>{s.label.split(',')[0]}</span>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
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
            {/* ÉTAPE 3: MODE DE GESTION & CONFIGURATION INITIALE       */}
            {/* ======================================================== */}
            {step === 3 && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                      Mode de configuration initiale
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowModulesModal(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        color: '#0062FF',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <Eye size={13} />
                      <span>Voir les 8 modules</span>
                    </button>
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.88rem', lineHeight: 1.45 }}>
                    Choisissez comment vous souhaitez organiser votre interface au démarrage. Ce choix définit votre cockpit initial et ne restreint pas vos droits d'accès.
                  </p>
                </div>

                {/* Educational Banner about separation between Display Mode and Subscription Rights */}
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '16px',
                  }}
                >
                  <Info size={16} color="#16A34A" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: '#166534', lineHeight: 1.4 }}>
                    <strong>Architecture modulaire :</strong> Ces 3 modes définissent vos raccourcis et votre tableau de bord. Après l'onboarding, vous pourrez activer ou désactiver les modules autorisés par votre formule à tout moment, sans réinitialiser vos données.
                  </span>
                </div>

                {/* 3 Structured Management Modes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {MANAGEMENT_MODES.map((m) => {
                    const isSelected = trackingMode === m.id;

                    return (
                      <div
                        key={m.id}
                        onClick={() => setTrackingMode(m.id)}
                        style={{
                          padding: '18px 16px',
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
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                background: isSelected ? '#0062FF' : '#F1F5F9',
                                color: isSelected ? '#FFFFFF' : '#0062FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {renderModeIcon(m.iconName, 18)}
                            </div>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '12px',
                                background: isSelected ? '#0062FF' : '#F1F5F9',
                                color: isSelected ? '#FFFFFF' : '#64748B',
                              }}
                            >
                              Mode {m.code}
                            </span>
                          </div>

                          <div style={{ fontWeight: 800, fontSize: '0.94rem', color: isSelected ? '#0062FF' : '#0F172A', marginBottom: '2px' }}>
                            {m.title}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: '10px', fontWeight: 600 }}>
                            {m.subtitle}
                          </div>

                          <p style={{ fontSize: '0.76rem', color: '#475569', marginBottom: '12px', lineHeight: 1.4 }}>
                            {m.description}
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {m.features.map((feat, fIdx) => (
                              <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.73rem', color: '#334155' }}>
                                <CheckCircle2 size={12} color={isSelected ? '#0062FF' : '#10B981'} style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: '14px',
                            paddingTop: '10px',
                            borderTop: '1px solid #E2E8F0',
                            fontSize: '0.7rem',
                            color: '#64748B',
                            lineHeight: 1.35,
                          }}
                        >
                          <strong>Conseillé :</strong> {m.recommendedFor}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* ÉTAPE 4: ESTIMATION OU OBJECTIF DE VOLUME JOURNALIER     */}
            {/* ======================================================== */}
            {step === 4 && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                    Estimation ou objectif d'activité journalière
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.45 }}>
                    Cette information permet de calibrer la sensibilité de vos alertes de trésorerie et les conseils du Copilote IA.
                  </p>
                </div>

                {/* Important Metric Clarification Banner */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: '#FEF3C7',
                    border: '1px solid #FCD34D',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    marginBottom: '18px',
                  }}
                >
                  <Info size={18} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.78rem', color: '#92400E', lineHeight: 1.45 }}>
                    <strong>Précision méthodologique :</strong> Ce choix représente une estimation indicative ou un objectif de vente. Il ne constitue en aucun cas du chiffre d'affaires réel et n'est jamais utilisé pour restreindre ou retirer des fonctionnalités. Vos droits dépendent uniquement des règles de votre abonnement.
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {REVENUE_ESTIMATES.map((rev) => {
                    const isSelected = dailySalesEstimate === rev.label;

                    return (
                      <div
                        key={rev.id}
                        onClick={() => setDailySalesEstimate(rev.label)}
                        style={{
                          padding: '14px 18px',
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
                            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isSelected ? '#0062FF' : '#0F172A' }}>
                              {rev.label}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: '#64748B' }}>
                              {rev.sub}
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: '#0062FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
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
            {/* ÉTAPE 5: FORMULE & ACTIVATION SAAS                        */}
            {/* ======================================================== */}
            {step === 5 && (
              <div style={{ animation: 'fadeIn 0.25s ease' }}>
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Rocket size={22} color="#0062FF" />
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Sélectionnez votre formule d'abonnement
                    </h2>
                  </div>
                  <p style={{ color: '#64748B', fontSize: '0.88rem' }}>
                    Les fonctionnalités et quotas affichés correspondent strictement aux droits réels appliqués sur le serveur.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  {/* FORMULE GRATUITE */}
                  {(() => {
                    const plan = PLANS_CONFIG.free;
                    const isSelected = selectedPlan === 'free';
                    return (
                      <div
                        onClick={() => setSelectedPlan('free')}
                        style={{
                          padding: '18px 16px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid #0062FF' : '1px solid #E2E8F0',
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 8px 20px rgba(0, 98, 255, 0.12)' : 'none',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A' }}>{plan.name}</span>
                            {isSelected && <Check size={18} color="#0062FF" strokeWidth={3} />}
                          </div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '6px' }}>
                            0 FCFA <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748B' }}>/ à vie</span>
                          </div>
                          <p style={{ fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4, marginBottom: '12px' }}>
                            {plan.description}
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.73rem', color: '#475569', marginBottom: '12px' }}>
                            {plan.features.map((f, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <CheckCircle2 size={12} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ padding: '6px 8px', background: '#F1F5F9', borderRadius: '8px', fontSize: '0.68rem', color: '#64748B', textAlign: 'center' }}>
                            {plan.limitsSummary[0]} • 1 boutique
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#94A3B8', marginTop: '6px', textAlign: 'center' }}>
                            {plan.activationNote}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* FORMULE PRO (RECOMMANDÉE) */}
                  {(() => {
                    const plan = PLANS_CONFIG.pro;
                    const isSelected = selectedPlan === 'pro';
                    return (
                      <div
                        onClick={() => setSelectedPlan('pro')}
                        style={{
                          padding: '18px 16px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid #0062FF' : '2px solid #BFDBFE',
                          background: isSelected ? '#EFF6FF' : '#FFFFFF',
                          cursor: 'pointer',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 10px 24px rgba(0, 98, 255, 0.18)' : '0 2px 8px rgba(0,0,0,0.04)',
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
                            fontSize: '0.64rem',
                            fontWeight: 800,
                            padding: '3px 12px',
                            borderRadius: '20px',
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ⭐ {plan.badge}
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0062FF' }}>{plan.name}</span>
                            {isSelected && <Check size={18} color="#0062FF" strokeWidth={3} />}
                          </div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0062FF', marginBottom: '6px' }}>
                            4 500 FCFA <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748B' }}>/ mois</span>
                          </div>
                          <p style={{ fontSize: '0.76rem', color: '#334155', lineHeight: 1.4, marginBottom: '12px', fontWeight: 500 }}>
                            {plan.description}
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.73rem', color: '#1E293B', marginBottom: '12px' }}>
                            {plan.features.slice(0, 5).map((f, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <CheckCircle2 size={12} color="#0062FF" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span><strong>{f}</strong></span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ padding: '6px 8px', background: '#DBEAFE', color: '#0062FF', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, textAlign: 'center' }}>
                            Essai 30 jours inclus
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '6px', textAlign: 'center' }}>
                            Résiliation en 1 clic sans engagement
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* FORMULE BUSINESS */}
                  {(() => {
                    const plan = PLANS_CONFIG.business;
                    const isSelected = selectedPlan === 'business';
                    return (
                      <div
                        onClick={() => setSelectedPlan('business')}
                        style={{
                          padding: '18px 16px',
                          borderRadius: '16px',
                          border: isSelected ? '2px solid #FF6B00' : '1px solid #E2E8F0',
                          background: isSelected ? '#FFF7ED' : '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? '0 8px 20px rgba(255, 107, 0, 0.14)' : 'none',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0F172A' }}>{plan.name}</span>
                            {isSelected && <Check size={18} color="#FF6B00" strokeWidth={3} />}
                          </div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#C2410C', marginBottom: '6px' }}>
                            12 000 FCFA <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748B' }}>/ mois</span>
                          </div>
                          <p style={{ fontSize: '0.76rem', color: '#64748B', lineHeight: 1.4, marginBottom: '12px' }}>
                            {plan.description}
                          </p>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.73rem', color: '#475569', marginBottom: '12px' }}>
                            {plan.features.slice(0, 5).map((f, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <CheckCircle2 size={12} color="#FF6B00" style={{ flexShrink: 0, marginTop: '2px' }} />
                                <span>{f}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ padding: '6px 8px', background: '#FFEDD5', color: '#C2410C', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, textAlign: 'center' }}>
                            Jusqu'à 5 boutiques & 10 utilisateurs
                          </div>
                          <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: '6px', textAlign: 'center' }}>
                            Support WhatsApp VIP 24/7 inclus
                          </div>
                        </div>
                      </div>
                    );
                  })()}
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
                marginTop: '32px',
                paddingTop: '18px',
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
                    fontSize: '0.88rem',
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
                    if (step === 1) {
                      if (!name.trim() || name.trim().length < 2) {
                        setError('Veuillez renseigner un nom commercial valide (au moins 2 caractères).');
                        return;
                      }
                      if (!currency) {
                        setError('Veuillez sélectionner la devise de tenue de caisse.');
                        return;
                      }
                      if (!city.trim()) {
                        setError('Veuillez renseigner la ville ou la commune de votre commerce.');
                        return;
                      }
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlan === 'free') {
                        handleFinish('free');
                      } else {
                        setPaymentStep('form');
                        setShowPayModal(true);
                      }
                    }}
                    disabled={loading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      padding: '14px 32px',
                      borderRadius: '14px',
                      background: selectedPlan === 'free'
                        ? 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)'
                        : selectedPlan === 'business'
                        ? 'linear-gradient(135deg, #FF6B00 0%, #EA580C 100%)'
                        : 'linear-gradient(135deg, #0062FF 0%, #FF6B00 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      boxShadow: '0 6px 20px rgba(0, 98, 255, 0.35)',
                      opacity: loading ? 0.75 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {loading ? (
                      'Initialisation de votre espace vierge...'
                    ) : selectedPlan === 'free' ? (
                      <>
                        <span>Activer mon Commerce (Formule Gratuite) & Lancer</span>
                        <Rocket size={18} />
                      </>
                    ) : (
                      <>
                        <span>Activer mon Commerce & Payer ({selectedPlan === 'business' ? '12 000 FCFA' : '4 500 FCFA'})</span>
                        <CreditCard size={18} />
                      </>
                    )}
                  </button>

                  {selectedPlan !== 'free' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan('free');
                        handleFinish('free');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '4px',
                      }}
                    >
                      Ou passer cette étape et démarrer avec la Formule Gratuite (0 FCFA)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer Branding */}
      <footer style={{ marginTop: '24px', fontSize: '0.78rem', color: '#94A3B8', textAlign: 'center' }}>
        COMMERCIA SaaS • Conçu pour les commerçants, boutiques et PME • Données chiffrées & isolées
      </footer>

      {/* ======================================================== */}
      {/* MODAL: CATALOGUE DES 8 MODULES COMPLÉMENTAIRES            */}
      {/* ======================================================== */}
      {showModulesModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 22, 43, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setShowModulesModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '850px',
              maxHeight: '85vh',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#0062FF',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                    Catalogue Centralisé des 8 Modules COMMERCIA
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748B' }}>
                    Indépendance entre préférences de gestion et droits d'accès réels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModulesModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#64748B',
                  borderRadius: '8px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - 8 Modules Grid */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
              {MODULES_CATALOG.map((mod) => {
                const isProOnly = mod.isProOnly;
                const isBusinessOnly = mod.allowedPlans.length === 1 && mod.allowedPlans[0] === 'business';

                return (
                  <div
                    key={mod.id}
                    style={{
                      padding: '16px',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
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
                              background: isBusinessOnly ? '#FFF7ED' : isProOnly ? '#EFF6FF' : '#F0FDF4',
                              color: isBusinessOnly ? '#C2410C' : isProOnly ? '#0062FF' : '#16A34A',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {renderModuleIcon(mod.iconName, 18)}
                          </div>
                          <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>
                            {mod.name}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: isBusinessOnly ? '#FFEDD5' : isProOnly ? '#DBEAFE' : '#DCFCE7',
                            color: isBusinessOnly ? '#C2410C' : isProOnly ? '#0062FF' : '#166534',
                          }}
                        >
                          {isBusinessOnly ? 'BUSINESS' : isProOnly ? 'PRO' : 'INCLUS'}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.4, margin: '0 0 10px 0' }}>
                        {mod.longDesc}
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {mod.features.map((f, fIdx) => (
                          <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.7rem', color: '#64748B' }}>
                            <CheckCircle2 size={11} color={isProOnly ? '#0062FF' : '#16A34A'} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '8px',
                        borderTop: '1px solid #F1F5F9',
                        fontSize: '0.68rem',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>Formules autorisées : <strong>{mod.allowedPlans.join(', ').toUpperCase()}</strong></span>
                      {mod.autonomousSpace && (
                        <span style={{ color: '#8B5CF6', fontWeight: 700 }}>Espace autonome</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #E2E8F0',
                background: '#F8FAFC',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setShowModulesModal(false)}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  background: '#0062FF',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Compris & Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PAIEMENT SÉCURISÉ & ACTIVATION IMMÉDIATE DU PLAN  */}
      {/* ======================================================== */}
      {showPayModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(8, 22, 43, 0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && paymentStep === 'form') {
              setShowPayModal(false);
            }
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '92vh',
              borderRadius: '24px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #E2E8F0',
                background: selectedPlan === 'business'
                  ? 'linear-gradient(135deg, #FFF7ED 0%, #FFFFFF 100%)'
                  : 'linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: selectedPlan === 'business' ? '#FF6B00' : '#0062FF',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 98, 255, 0.25)',
                  }}
                >
                  <Crown size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                      Activer le {selectedPlan === 'business' ? 'Plan Business' : 'Plan Pro'}
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: '#DCFCE7',
                        color: '#15803D',
                      }}
                    >
                      Paiement Sécurisé
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                    Activation instantanée • Redirection directe sur votre tableau de bord
                  </p>
                </div>
              </div>

              {paymentStep === 'form' && (
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {/* ======================================================== */}
              {/* STEP 1: FORMULAIRE DE PAIEMENT                           */}
              {/* ======================================================== */}
              {paymentStep === 'form' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Periodicity selector */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Période de facturation
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setPeriodicite('mensuel')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: periodicite === 'mensuel' ? '2px solid #0062FF' : '1px solid #CBD5E1',
                          background: periodicite === 'mensuel' ? '#EFF6FF' : '#FFFFFF',
                          color: periodicite === 'mensuel' ? '#0062FF' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        <span>Mensuel</span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: '#64748B' }}>
                          {selectedPlan === 'business' ? '12 000 FCFA / mois' : '4 500 FCFA / mois'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPeriodicite('annuel')}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: periodicite === 'annuel' ? '2px solid #0062FF' : '1px solid #CBD5E1',
                          background: periodicite === 'annuel' ? '#EFF6FF' : '#FFFFFF',
                          color: periodicite === 'annuel' ? '#0062FF' : '#475569',
                          fontWeight: 700,
                          fontSize: '0.86rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          position: 'relative',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>Annuel</span>
                          <span style={{ background: '#FFEDD5', color: '#C2410C', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                            -17% (2 mois offerts)
                          </span>
                        </span>
                        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: '#64748B' }}>
                          {selectedPlan === 'business' ? '120 000 FCFA / an' : '45 000 FCFA / an'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Payment provider selector */}
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>
                      Moyen de paiement
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'orange', name: 'Orange Money', logo: '/logos/orange-money.png', available: true },
                        { id: 'mtn', name: 'MTN MoMo', logo: '/logos/mtn-momo.png', available: true },
                        { id: 'card', name: 'Carte Bancaire', logo: '/logos/visa-mastercard.png', available: true },
                        { id: 'wave', name: 'Wave', logo: '/logos/wave.png', available: false },
                      ].map((prov) => {
                        const isChosen = moyenPaiement === prov.id;
                        const isWaveDisabled = !prov.available;
                        return (
                          <div
                            key={prov.id}
                            onClick={() => {
                              if (isWaveDisabled) {
                                alert("Wave n'est pas disponible au Cameroun (XAF). Veuillez sélectionner Orange Money, MTN MoMo ou Carte Bancaire.");
                                return;
                              }
                              setMoyenPaiement(prov.id as any);
                            }}
                            title={isWaveDisabled ? "Wave n'est pas déployé comme opérateur d'acquisition au Cameroun (XAF)" : prov.name}
                            style={{
                              padding: '10px 8px',
                              borderRadius: '12px',
                              border: isChosen ? '2px solid #0062FF' : (isWaveDisabled ? '1.5px dashed #FECACA' : '1px solid #E2E8F0'),
                              background: isChosen ? '#EFF6FF' : (isWaveDisabled ? '#FEF2F2' : '#FFFFFF'),
                              opacity: isWaveDisabled ? 0.6 : 1,
                              cursor: isWaveDisabled ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              textAlign: 'center',
                              transition: 'all 0.15s ease',
                              boxShadow: isChosen ? '0 4px 12px rgba(0, 98, 255, 0.15)' : 'none',
                            }}
                          >
                            <img
                              src={prov.logo}
                              alt={prov.name}
                              style={{ height: '24px', maxWidth: '44px', objectFit: 'contain', filter: isWaveDisabled ? 'grayscale(80%)' : 'none' }}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isChosen ? '#0062FF' : (isWaveDisabled ? '#DC2626' : '#334155') }}>
                              {isWaveDisabled ? 'Wave (Indisponible)' : prov.name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Provider specific inputs */}
                  {(moyenPaiement === 'orange' || moyenPaiement === 'mtn') && (
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Smartphone size={15} color="#0062FF" /> Numéro de téléphone {moyenPaiement === 'orange' ? 'Orange Money' : 'MTN Mobile Money'}
                      </label>
                      <input
                        type="tel"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        placeholder="Ex: 699000000 ou 07000000"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          boxSizing: 'border-box',
                          background: '#FFFFFF',
                        }}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                        Une demande d'autorisation de débit sécurisé sera envoyée sur ce numéro.
                      </span>
                    </div>
                  )}

                  {moyenPaiement === 'wave' && (
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setWaveAction('push')}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: waveAction === 'push' ? '2px solid #0062FF' : '1px solid #CBD5E1',
                            background: waveAction === 'push' ? '#EFF6FF' : '#FFFFFF',
                            color: waveAction === 'push' ? '#0062FF' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                          }}
                        >
                          Débit Direct (Téléphone)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaveAction('qr')}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: waveAction === 'qr' ? '2px solid #0062FF' : '1px solid #CBD5E1',
                            background: waveAction === 'qr' ? '#EFF6FF' : '#FFFFFF',
                            color: waveAction === 'qr' ? '#0062FF' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            cursor: 'pointer',
                          }}
                        >
                          Scanner QR Code Wave
                        </button>
                      </div>

                      {waveAction === 'push' ? (
                        <div>
                          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Numéro Wave du compte
                          </label>
                          <input
                            type="tel"
                            value={momoPhone}
                            onChange={(e) => setMomoPhone(e.target.value)}
                            placeholder="Ex: 07000000 ou 65000000"
                            style={{
                              width: '100%',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.9rem',
                              fontWeight: 600,
                              boxSizing: 'border-box',
                              background: '#FFFFFF',
                            }}
                          />
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '12px', background: '#FFFFFF', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
                          <QrCode size={40} color="#0062FF" style={{ margin: '0 auto 6px auto' }} />
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                            Un QR Code Wave dynamique sera généré
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            Scannable directement depuis votre application mobile Wave.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {moyenPaiement === 'card' && (
                    <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Numéro de carte Visa / Mastercard
                        </label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '').slice(0, 16);
                            setCardNumber(val.replace(/(\d{4})(?=\d)/g, '$1 '));
                          }}
                          placeholder="4000 1234 5678 9010"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            boxSizing: 'border-box',
                            background: '#FFFFFF',
                            fontFamily: 'monospace',
                          }}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '8px' }}>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Titulaire
                          </label>
                          <input
                            type="text"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            placeholder="Nom complet"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.84rem',
                              boxSizing: 'border-box',
                              background: '#FFFFFF',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            Expire
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              if (val.length >= 2) val = `${val.slice(0, 2)}/${val.slice(2)}`;
                              setCardExpiry(val);
                            }}
                            placeholder="MM/AA"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.84rem',
                              boxSizing: 'border-box',
                              background: '#FFFFFF',
                              textAlign: 'center',
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.74rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                            CVV
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="123"
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.84rem',
                              boxSizing: 'border-box',
                              background: '#FFFFFF',
                              textAlign: 'center',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Promo Code Field */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Code Promo (optionnel)
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => {
                          setPromoCodeInput(e.target.value.toUpperCase());
                          setPromoError('');
                        }}
                        placeholder="Ex: COMMERCIA20"
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.84rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          background: '#0F172A',
                          color: '#FFFFFF',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          border: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        Appliquer
                      </button>
                    </div>
                    {promoError && (
                      <span style={{ fontSize: '0.72rem', color: '#EF4444', marginTop: '3px', display: 'block' }}>
                        {promoError}
                      </span>
                    )}
                    {appliedPromo && (
                      <div style={{ marginTop: '6px', padding: '4px 10px', background: '#DCFCE7', color: '#166534', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Check size={14} /> Code {appliedPromo.code} appliqué : {appliedPromo.label}
                      </div>
                    )}
                  </div>

                  {/* Total Amount Box */}
                  <div
                    style={{
                      padding: '14px 18px',
                      background: '#F8FAFC',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '0.76rem', color: '#64748B', display: 'block' }}>Montant total à régler</span>
                      <strong style={{ fontSize: '1.25rem', color: '#0F172A' }}>
                        {finalAmount.toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Shield size={13} /> Chiffré SSL 256 bits
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Sans engagement</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleInitiatePayment}
                    disabled={isInitiating}
                    style={{
                      padding: '14px 20px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #0062FF 0%, #004BD6 100%)',
                      color: '#FFFFFF',
                      fontSize: '0.96rem',
                      fontWeight: 800,
                      border: 'none',
                      cursor: isInitiating ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 16px rgba(0, 98, 255, 0.35)',
                      opacity: isInitiating ? 0.75 : 1,
                    }}
                  >
                    {isInitiating ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Connexion à l'opérateur...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>Payer et Activer mon Commerce ({finalAmount.toLocaleString('fr-FR')} FCFA)</span>
                      </>
                    )}
                  </button>

                  {/* CRITICAL ESCAPE HATCH: BYPASS TO FREE PLAN */}
                  <div style={{ textAlign: 'center', paddingTop: '4px' }}>
                    <button
                      type="button"
                      onClick={handleBypassToFree}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '6px 12px',
                      }}
                    >
                      Passer cette étape & Continuer avec la Formule Gratuite (0 FCFA)
                    </button>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>
                      Vous pourrez passer à la formule Pro ou Business plus tard depuis vos paramètres.
                    </span>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: EN ATTENTE DE VALIDATION OPÉRATEUR               */}
              {/* ======================================================== */}
              {paymentStep === 'waiting' && (
                <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: '#EFF6FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                      color: '#0062FF',
                    }}
                  >
                    <RefreshCw size={32} className="animate-spin" />
                  </div>

                  <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 800, color: '#0F172A' }}>
                    Autorisation requise sur votre téléphone
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5 }}>
                    Référence de la transaction : <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>{currentPaymentRef}</strong>
                  </p>

                  {/* Operator specific syntax guidance */}
                  <div
                    style={{
                      padding: '16px',
                      background: '#F8FAFC',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      textAlign: 'left',
                      marginBottom: '20px',
                      fontSize: '0.84rem',
                      lineHeight: 1.5,
                      color: '#334155',
                    }}
                  >
                    {moyenPaiement === 'orange' && (
                      <div>
                        <strong>Instructions Orange Money :</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                          <li>Tapez <strong>#150*50#</strong> sur votre téléphone pour générer votre code d'autorisation.</li>
                          <li>Ou validez la notification push reçue sur l'application Orange Money.</li>
                          <li>Montant : <strong>{finalAmount.toLocaleString('fr-FR')} FCFA</strong>.</li>
                        </ul>
                      </div>
                    )}

                    {moyenPaiement === 'mtn' && (
                      <div>
                        <strong>Instructions MTN Mobile Money :</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                          <li>Consultez votre téléphone et approuvez la demande de débit de <strong>{finalAmount.toLocaleString('fr-FR')} FCFA</strong>.</li>
                          <li>Ou composez <strong>*126#</strong> (Rubrique Approbations en attente).</li>
                        </ul>
                      </div>
                    )}

                    {moyenPaiement === 'wave' && (
                      <div>
                        <strong>Instructions Wave :</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                          <li>Ouvrez l'application Wave sur votre smartphone.</li>
                          <li>Confirmez le débit sécurisé de <strong>{finalAmount.toLocaleString('fr-FR')} FCFA</strong>.</li>
                        </ul>
                      </div>
                    )}

                    {moyenPaiement === 'card' && (
                      <div>
                        <strong>Instructions Carte Bancaire 3D-Secure :</strong>
                        <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                          <li>Validez l'authentification forte (SMS ou application bancaire).</li>
                          <li>La vérification se fait en temps réel.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={handleCheckVerification}
                      disabled={isVerifying}
                      style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        background: '#0062FF',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        border: 'none',
                        cursor: isVerifying ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Vérification auprès de la passerelle...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          <span>J'ai confirmé sur mon téléphone • Vérifier</span>
                        </>
                      )}
                    </button>

                    {/* Developer/Testing Simulation Button */}
                    <button
                      type="button"
                      onClick={handleSimulatePaymentSuccess}
                      disabled={isVerifying}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '10px',
                        background: '#F1F5F9',
                        color: '#334155',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        border: '1px dashed #CBD5E1',
                        cursor: 'pointer',
                      }}
                    >
                      ⚡ Simuler / Valider le paiement immédiatement (Mode Test)
                    </button>

                    {/* Escape hatch while waiting */}
                    <button
                      type="button"
                      onClick={handleBypassToFree}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: '6px',
                      }}
                    >
                      Abandonner le paiement et continuer avec la Formule Gratuite
                    </button>
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 3: SUCCÈS & REDIRECTION DIRECTE AU TABLEAU DE BORD  */}
              {/* ======================================================== */}
              {paymentStep === 'success' && (
                <div style={{ textAlign: 'center', padding: '20px 8px' }}>
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      background: '#DCFCE7',
                      color: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px auto',
                      boxShadow: '0 8px 24px rgba(22, 163, 74, 0.25)',
                    }}
                  >
                    <CheckCircle2 size={44} />
                  </div>

                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>
                    Paiement Validé avec Succès ! 🎉
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
                    Votre paiement a bien été enregistré. Votre forfait <strong>{selectedPlan === 'business' ? 'Plan Business' : 'Plan Pro'}</strong> est maintenant actif et prêt à l'emploi.
                  </p>

                  <div
                    style={{
                      padding: '12px 18px',
                      background: '#F0FDF4',
                      borderRadius: '12px',
                      border: '1px solid #BBF7D0',
                      display: 'inline-block',
                      marginBottom: '24px',
                      textAlign: 'left',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div>Formule activée : <strong>{selectedPlan === 'business' ? 'Plan Business (Multi-boutiques)' : 'Plan Pro (Croissance)'}</strong></div>
                    <div>Statut de l'abonnement : <strong style={{ color: '#16A34A' }}>ACTIF</strong></div>
                    <div>Référence transaction : <code style={{ fontSize: '0.78rem' }}>{verifiedPayment?.reference || currentPaymentRef}</code></div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleFinish(selectedPlan, currentPaymentRef)}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '14px 24px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                        color: '#FFFFFF',
                        fontSize: '0.98rem',
                        fontWeight: 800,
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 16px rgba(22, 163, 74, 0.35)',
                      }}
                    >
                      {loading ? (
                        'Accès à votre espace...'
                      ) : (
                        <>
                          <span>Accéder à mon Commerce & Lancer le Tableau de Bord</span>
                          <Rocket size={18} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
