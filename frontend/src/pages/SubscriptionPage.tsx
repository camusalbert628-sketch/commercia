import React, { useState, useEffect } from 'react';
import {
  Crown,
  CheckCircle,
  AlertTriangle,
  Printer,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  CreditCard,
  Phone,
  ShieldCheck,
  RefreshCw,
  Clock,
  ArrowRight,
  Download,
  AlertCircle,
  HelpCircle,
  Layers,
  ChevronRight,
  Lock,
  QrCode,
  Smartphone,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface PaymentItem {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  provider: string;
  phoneNumber?: string;
  createdAt: string;
  verifiedAt?: string;
  plan?: {
    name: string;
    displayName: string;
  };
}

export const SubscriptionPage: React.FC = () => {
  const { user, fetchMe } = useAuthStore();
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentItem | null>(null);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'business'>('pro');
  const [periodicite, setPeriodicite] = useState<'mensuel' | 'annuel'>('mensuel');
  const [moyenPaiement, setMoyenPaiement] = useState<'mtn' | 'orange' | 'wave' | 'card'>('orange');
  const [momoPhone, setMomoPhone] = useState(user?.phone || '');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');

  // Card specific states (Visa / Mastercard)
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Wave specific states
  const [waveAction, setWaveAction] = useState<'phone' | 'qr'>('phone');

  // Payment Execution State
  const [paymentStep, setPaymentStep] = useState<'form' | 'waiting' | 'success'>('form');
  const [currentPaymentRef, setCurrentPaymentRef] = useState<string | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedPayment, setVerifiedPayment] = useState<PaymentItem | null>(null);

  const sub = user?.subscription;
  const isPro = !!(user?.isAdmin || sub?.isPro);
  const isExpired = sub?.status === 'expired' || (sub?.endDate && new Date(sub.endDate) < new Date());
  const isFree = !isPro && !isExpired;

  const [testActivating, setTestActivating] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const handleTestActivate = async (plan: 'free' | 'pro' | 'business') => {
    try {
      setTestActivating(true);
      const isProPlan = plan !== 'free';
      const newSub = {
        plan,
        planName: plan,
        displayName: plan === 'business' ? 'Plan Business' : plan === 'pro' ? 'Plan Pro' : 'Gratuit',
        planDisplayName: plan === 'business' ? 'Plan Business' : plan === 'pro' ? 'Plan Pro' : 'Gratuit',
        status: isProPlan ? 'active' : 'free',
        isPro: isProPlan,
        endDate: isProPlan ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
        daysRemaining: isProPlan ? 30 : 0,
        limits: {
          salesPerDay: -1,
          aiQueries: -1,
          stockEnabled: true,
          creditEnabled: true,
          multiShop: plan === 'business',
        },
      };

      if (plan === 'free') {
        localStorage.removeItem('commercia_test_subscription');
      } else {
        localStorage.setItem('commercia_test_subscription', JSON.stringify(newSub));
      }

      useAuthStore.getState().updateUser({ subscription: newSub as any });

      try {
        await api.post('/plans/test-activate', { planName: plan });
      } catch (backendErr) {
        console.warn('Backend test-activate notice:', backendErr);
      }

      await fetchMe();
      await loadHistory();
      setTestNotice(`Formule ${plan === 'business' ? 'Business' : plan === 'pro' ? 'Pro' : 'Gratuite'} activée avec succès en mode test !`);
      setTimeout(() => setTestNotice(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de l\'activation du test');
    } finally {
      setTestActivating(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      await api.delete(`/payments/${paymentId}`);
    } catch (e) {
      console.warn('Could not delete payment on backend:', e);
    }
  };

  const loadHistory = async () => {
    try {
      const history = await api.get<PaymentItem[]>('/payments/history');
      setPayments(history || []);
    } catch (e) {
      console.warn('Could not load payments history:', e);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Compute pricing
  const basePrice = selectedPlan === 'business'
    ? (periodicite === 'annuel' ? 120000 : 12000)
    : (periodicite === 'annuel' ? 45000 : 4500);

  let finalPrice = basePrice;
  if (promoCode.trim().toUpperCase() === 'COMMERCIA20') {
    finalPrice = Math.round(basePrice * 0.8);
  } else if (promoCode.trim().toUpperCase() === 'BIENVENUE5000') {
    finalPrice = Math.max(0, basePrice - 5000);
  }

  // Formatters for credit card
  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2, 4)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Handle initiate payment with tailored checks for each provider
  const handleInitiatePayment = async () => {
    if (moyenPaiement === 'card') {
      const cleanCard = cardNumber.replace(/\s/g, '');
      if (cleanCard.length < 16) {
        alert('Veuillez saisir un numéro de carte bancaire valide à 16 chiffres.');
        return;
      }
      if (!cardHolder.trim()) {
        alert('Veuillez renseigner le nom du titulaire de la carte.');
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
      const res = await api.post<{ payment: PaymentItem; message: string }>('/payments/initiate', {
        planName: selectedPlan,
        billingCycle: periodicite,
        provider: moyenPaiement,
        phoneNumber: moyenPaiement === 'card' ? `CARD-****${cardNumber.slice(-4)}` : momoPhone,
        metadata: moyenPaiement === 'card' ? {
          cardLast4: cardNumber.slice(-4),
          cardHolder,
          cardBrand: cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
        } : {
          waveAction: waveAction,
        },
      });

      setCurrentPaymentRef(res.payment.reference);
      setPaymentStep('waiting');
      setIsInitiating(false);

      // Start automatic polling every 3.5s
      const pollTimer = setInterval(async () => {
        try {
          const check = await api.get<{ status: string; payment: PaymentItem }>(`/payments/verify/${res.payment.reference}`);
          if (check.status === 'completed') {
            clearInterval(pollTimer);
            setVerifiedPayment(check.payment);
            setPaymentStep('success');
            await fetchMe();
            await loadHistory();
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

  // Sandbox simulation trigger for instant test / demo validation
  const handleSandboxConfirm = async () => {
    if (!currentPaymentRef) return;
    try {
      setIsVerifying(true);
      const res = await api.post<{ message: string; payment: PaymentItem }>('/payments/confirm-sandbox', {
        reference: currentPaymentRef,
      });
      setVerifiedPayment(res.payment);
      setPaymentStep('success');
      await fetchMe();
      await loadHistory();
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erreur confirmation');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
      {/* 0. NOTIFICATION MESSAGE TEST */}
      {testNotice && (
        <div
          style={{
            background: '#ECFDF5',
            border: '1.5px solid #10B981',
            color: '#065F46',
            padding: '14px 20px',
            borderRadius: '12px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '0.92rem',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <CheckCircle size={20} color="#10B981" />
          <span>{testNotice}</span>
        </div>
      )}

      {/* 0B. BANC D'ESSAI & TEST IMMÉDIAT PRO / BUSINESS */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #312E81 100%)',
          borderRadius: '18px',
          padding: '22px 26px',
          marginBottom: '28px',
          color: '#FFFFFF',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.28)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '640px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF8A00 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 6px 16px rgba(255, 107, 0, 0.4)',
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFFFFF' }}>
                Banc d'Essai : Testez Pro et Business en 1 Clic
              </span>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#FFFFFF',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  textTransform: 'uppercase',
                }}
              >
                Accès Immédiat
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#CBD5E1', lineHeight: 1.45 }}>
              Basculez librement pour tester toutes les fonctionnalités (ventes illimitées, stock, dettes, copilote IA, multi-caisses) sans carte ni débit.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={testActivating || (isPro && sub?.planName === 'pro')}
            onClick={() => handleTestActivate('pro')}
            style={{
              background: isPro && sub?.planName === 'pro' ? '#10B981' : '#0062FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 18px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: isPro && sub?.planName === 'pro' ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(0, 98, 255, 0.35)',
              opacity: testActivating ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <Crown size={16} />
            <span>{isPro && sub?.planName === 'pro' ? '✓ Pro Actif (Test)' : '⚡ Tester Pro'}</span>
          </button>

          <button
            type="button"
            disabled={testActivating || (isPro && sub?.planName === 'business')}
            onClick={() => handleTestActivate('business')}
            style={{
              background: isPro && sub?.planName === 'business' ? '#10B981' : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 18px',
              fontSize: '0.86rem',
              fontWeight: 700,
              cursor: isPro && sub?.planName === 'business' ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              opacity: testActivating ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={16} />
            <span>{isPro && sub?.planName === 'business' ? '✓ Business Actif (Test)' : '💼 Tester Business'}</span>
          </button>

          {!isFree && (
            <button
              type="button"
              disabled={testActivating}
              onClick={() => handleTestActivate('free')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <RefreshCw size={13} />
              <span>Remettre en Gratuit</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. STATUS BANNER */}
      {isFree && (
        <div style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          border: '1.5px solid #BFDBFE',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: '0 4px 16px rgba(0, 98, 255, 0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', maxWidth: '750px' }}>
            <div style={{
              background: '#0062FF',
              color: '#FFFFFF',
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, color: '#0F172A' }}>
                  Version Gratuite Active
                </h2>
                <span style={{
                  background: '#E2E8F0',
                  color: '#475569',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  Compte Standard
                </span>
              </div>
              <p style={{ color: '#475569', fontSize: '0.92rem', margin: '0 0 8px 0', lineHeight: 1.5 }}>
                Vous bénéficiez des fonctionnalités de base : enregistrement des ventes au comptant (limite de 15 ventes par jour), gestion des dépenses simples et aperçu du tableau de bord.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.82rem', color: '#64748B' }}>
                <span>🔒 Ventes limitées à 15/j</span>
                <span>🔒 Gestion de stock désactivée</span>
                <span>🔒 Ventes à crédit désactivées</span>
                <span>🔒 Copilote IA réservé aux membres Pro</span>
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              setSelectedPlan('pro');
              setPaymentStep('form');
              setShowPayModal(true);
            }}
            style={{
              boxShadow: '0 8px 20px rgba(0, 98, 255, 0.3)',
              padding: '14px 28px',
              fontSize: '0.96rem',
              fontWeight: 700,
            }}
          >
            <Crown size={20} />
            <span>Passer à la formule Pro</span>
          </button>
        </div>
      )}

      {isPro && (
        <div style={{
          background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
          border: '1.5px solid #10B981',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '28px',
          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 6px 18px rgba(16, 185, 129, 0.35)',
              }}>
                <Crown size={30} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800, color: '#064E3B' }}>
                    Compte Pro Actif : {sub?.planDisplayName || 'Formule Pro'}
                  </h2>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    background: '#059669',
                    color: '#FFFFFF',
                  }}>
                    ● ACTIF
                  </span>
                </div>
                <p style={{ color: '#047857', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                  Accès débloqué en illimité : Gestion des stocks, Crédits clients, Copilote IA et Trésorerie prédictive.
                </p>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedPlan('pro');
                setPaymentStep('form');
                setShowPayModal(true);
              }}
              style={{ background: '#059669', borderColor: '#059669' }}
            >
              Prolonger mon abonnement
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderTop: '1px solid rgba(16, 185, 129, 0.25)', paddingTop: '18px' }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#065F46', textTransform: 'uppercase', fontWeight: 600 }}>Formule</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#064E3B' }}>
                {sub?.planDisplayName || 'Plan Pro'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#065F46', textTransform: 'uppercase', fontWeight: 600 }}>Date d'échéance</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#064E3B' }}>
                {sub?.endDate ? new Date(sub.endDate).toLocaleDateString('fr-FR') : 'Illimité (Admin)'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#065F46', textTransform: 'uppercase', fontWeight: 600 }}>Jours restants</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: (sub?.daysRemaining || 0) < 5 ? '#DC2626' : '#059669' }}>
                {user?.isAdmin ? 'Permanent' : `${sub?.daysRemaining || 0} jour(s)`}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: '#065F46', textTransform: 'uppercase', fontWeight: 600 }}>Paiement vérifié</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#047857' }}>
                Confirmé via Mobile Money / Carte
              </div>
            </div>
          </div>
        </div>
      )}

      {isExpired && (
        <div style={{
          background: '#FEF2F2',
          border: '2px solid #EF4444',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <AlertTriangle size={32} color="#DC2626" />
            <div>
              <strong style={{ color: '#991B1B', fontSize: '1.1rem' }}>
                Abonnement Pro Expiré
              </strong>
              <div style={{ color: '#B91C1C', fontSize: '0.88rem', marginTop: '2px' }}>
                Votre abonnement a expiré le {sub?.endDate ? new Date(sub.endDate).toLocaleDateString('fr-FR') : 'récemment'}. Vos fonctionnalités Pro sont temporairement suspendues et votre compte est repassé en version gratuite.
              </div>
            </div>
          </div>
          <button
            className="btn btn-danger"
            onClick={() => {
              setSelectedPlan('pro');
              setPaymentStep('form');
              setShowPayModal(true);
            }}
          >
            Réactiver maintenant par Mobile Money
          </button>
        </div>
      )}

      {/* 2. PLANS COMPARISON GRID */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 32px auto' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: '0 0 10px 0', color: '#0F172A' }}>
            Choisissez la formule adaptée à votre commerce
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.96rem' }}>
            Tarification transparente en Francs CFA, sans frais cachés. Paiement instantané via Orange Money, MTN MoMo ou Carte Bancaire.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
          {/* PLAN 1 : GRATUIT */}
          <div className="card" style={{
            padding: '30px 24px',
            border: isFree ? '2px solid #94A3B8' : '1px solid #E2E8F0',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {isFree && (
              <span style={{
                position: 'absolute',
                top: '-12px',
                right: '20px',
                background: '#64748B',
                color: '#FFFFFF',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '0.74rem',
                fontWeight: 700,
              }}>
                VOTRE VERSION ACTUELLE
              </span>
            )}
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0', color: '#1E293B' }}>
              Version Gratuite
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem', minHeight: '38px', margin: 0 }}>
              Pour démarrer votre activité sans engagement financier.
            </p>
            <div style={{ margin: '20px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: '20px' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0F172A' }}>
                0 <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748B' }}>FCFA / à vie</span>
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', flex: 1, fontSize: '0.88rem', lineHeight: 2.1, color: '#334155' }}>
              <li>✅ 15 ventes par jour maximum</li>
              <li>✅ Enregistrement des dépenses simples</li>
              <li>✅ Synthèse de caisse quotidienne</li>
              <li>❌ Gestion de stock & alertes ruptures</li>
              <li>❌ Crédits clients & relances impayés</li>
              <li>❌ Copilote IA & Trésorerie prédictive</li>
            </ul>
            <button
              className="btn btn-secondary"
              disabled={isFree || testActivating}
              onClick={() => handleTestActivate('free')}
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              {isFree ? 'Version actuellement active' : 'Repasser en gratuit (Test)'}
            </button>
          </div>

          {/* PLAN 2 : PRO (RECOMMANDÉ) */}
          <div className="card" style={{
            padding: '30px 24px',
            border: '2px solid #0062FF',
            boxShadow: '0 12px 30px rgba(0, 98, 255, 0.12)',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <span style={{
              position: 'absolute',
              top: '-13px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #0062FF 0%, #0047BA 100%)',
              color: '#FFFFFF',
              padding: '4px 16px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 12px rgba(0, 98, 255, 0.35)',
              zIndex: 2,
            }}>
              ⭐ LE CHOIX DES COMMERÇANTS
            </span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0062FF' }}>
              Formule Pro
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem', minHeight: '38px', margin: 0 }}>
              Indispensable pour gérer votre stock, vos crédits et booster vos ventes.
            </p>
            <div style={{ margin: '20px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: '20px' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0F172A' }}>
                4 500 <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748B' }}>FCFA / mois</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                ou 45 000 FCFA / an (2 mois offerts)
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', flex: 1, fontSize: '0.88rem', lineHeight: 2.1, color: '#1E293B' }}>
              <li><strong>✅ Ventes illimitées chaque jour</strong></li>
              <li><strong>✅ Alertes stocks faibles & inventaires</strong></li>
              <li><strong>✅ Suivi des dettes clients & rappels WhatsApp</strong></li>
              <li><strong>✅ Livraisons & Expéditions colis (COD)</strong></li>
              <li><strong>✅ Trésorerie prédictive à 30 jours</strong></li>
              <li><strong>✅ Copilote IA COMMERCIA illimité</strong></li>
              <li>✅ Reçus thermiques & factures normalisées</li>
            </ul>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setSelectedPlan('pro');
                  setPaymentStep('form');
                  setShowPayModal(true);
                }}
                style={{ width: '100%', padding: '12px', fontWeight: 700 }}
              >
                {isPro && sub?.planName === 'pro' ? 'Prolonger Pro (Paiement)' : 'S\'abonner à Pro (Mobile Money)'}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                disabled={testActivating || (isPro && sub?.planName === 'pro')}
                onClick={() => handleTestActivate('pro')}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  borderColor: '#93C5FD',
                  color: '#0062FF',
                  background: isPro && sub?.planName === 'pro' ? '#EFF6FF' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Crown size={15} />
                <span>{isPro && sub?.planName === 'pro' ? '✓ Formule Pro Actuelle' : '⚡ Tester la Formule Pro (1 clic)'}</span>
              </button>
            </div>
          </div>

          {/* PLAN 3 : BUSINESS */}
          <div className="card" style={{
            padding: '30px 24px',
            border: '1px solid #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 6px 0', color: '#0F172A' }}>
              Formule Business
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem', minHeight: '38px', margin: 0 }}>
              Pour réseaux de boutiques, grossistes et équipes de plusieurs caissiers.
            </p>
            <div style={{ margin: '20px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: '20px' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0F172A' }}>
                12 000 <span style={{ fontSize: '1rem', fontWeight: 600, color: '#64748B' }}>FCFA / mois</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                ou 120 000 FCFA / an (2 mois offerts)
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', flex: 1, fontSize: '0.88rem', lineHeight: 2.1, color: '#334155' }}>
              <li><strong>✅ Toutes les fonctionnalités Pro</strong></li>
              <li><strong>✅ Multi-points de vente (jusqu'à 5 boutiques)</strong></li>
              <li><strong>✅ Gestion multi-caissiers & permissions</strong></li>
              <li><strong>✅ Rapprochement bancaire & transferts multi-comptes</strong></li>
              <li><strong>✅ Export comptable certifié OHADA</strong></li>
              <li>✅ Support technique prioritaire 7j/7</li>
            </ul>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedPlan('business');
                  setPaymentStep('form');
                  setShowPayModal(true);
                }}
                style={{ width: '100%', padding: '12px', fontWeight: 700 }}
              >
                {isPro && sub?.planName === 'business' ? 'Prolonger Business (Paiement)' : 'S\'abonner à Business (Mobile Money)'}
              </button>

              <button
                type="button"
                className="btn btn-outline"
                disabled={testActivating || (isPro && sub?.planName === 'business')}
                onClick={() => handleTestActivate('business')}
                style={{
                  width: '100%',
                  padding: '10px',
                  fontWeight: 700,
                  fontSize: '0.84rem',
                  borderColor: '#C4B5FD',
                  color: '#7C3AED',
                  background: isPro && sub?.planName === 'business' ? '#F5F3FF' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={15} />
                <span>{isPro && sub?.planName === 'business' ? '✓ Formule Business Actuelle' : '💼 Tester la Formule Business (1 clic)'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. HISTORIQUE DES TRANSACTIONS & REÇUS OFFICIELS */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Historique des Paiements & Reçus Officiels</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Reçus numérotés avec signature numérique et traçabilité bancaire conforme
            </p>
          </div>
          <button className="btn btn-secondary" onClick={loadHistory} style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
            <RefreshCw size={14} />
            <span>Actualiser</span>
          </button>
        </div>

        {payments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', background: '#F8FAFC', borderRadius: '12px' }}>
            <Clock size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 600, color: '#475569' }}>Aucune transaction enregistrée pour ce compte</div>
            <div style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '4px' }}>
              Vos paiements Mobile Money et reçus officiels apparaîtront ici dès confirmation.
            </div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Référence Unique</th>
                  <th>Formule</th>
                  <th>Opérateur</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => {
                  const itemDate = p.createdAt || (p as any).date;
                  const isValidDate = itemDate && !isNaN(new Date(itemDate).getTime());
                  const formattedDate = isValidDate
                    ? new Date(itemDate).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Récemment';

                  return (
                    <tr key={p.id}>
                      <td style={{ fontSize: '0.85rem', color: '#64748B' }}>
                        {formattedDate}
                      </td>
                      <td style={{ fontWeight: 700, color: '#0062FF', fontSize: '0.88rem' }}>
                        {p.reference}
                      </td>
                      <td style={{ fontWeight: 600 }}>{p.plan?.displayName || (p as any).planName || 'Plan Pro'}</td>
                      <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                        {p.provider === 'orange' ? 'Orange Money' : p.provider === 'mtn' ? 'MTN MoMo' : (p as any).method || p.provider || 'Mobile Money'}
                      </td>
                      <td style={{ fontWeight: 800 }}>
                        {p.amount.toLocaleString('fr-FR')} {p.currency}
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '16px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: p.status === 'completed' ? '#ECFDF5' : p.status === 'pending' ? '#FEF3C7' : '#FEF2F2',
                          color: p.status === 'completed' ? '#059669' : p.status === 'pending' ? '#D97706' : '#DC2626',
                        }}>
                          {p.status === 'completed' ? '● Validé' : p.status === 'pending' ? '● En attente' : '● Échoué'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {p.status === 'completed' && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => setSelectedReceipt(p)}
                              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                            >
                              <Printer size={14} />
                              <span>Voir reçu</span>
                            </button>
                          )}
                          {p.status !== 'completed' && (
                            <button
                              className="btn btn-secondary"
                              onClick={() => handleDeletePayment(p.id)}
                              title="Supprimer cette tentative de paiement"
                              style={{ padding: '6px 10px', fontSize: '0.8rem', color: '#EF4444', borderColor: '#FECACA' }}
                            >
                              <Trash2 size={14} />
                              <span>Supprimer</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PAIEMENT RÉEL & PASSERELLE */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#EFF6FF', color: '#0062FF', padding: '8px', borderRadius: '10px' }}>
                  <Crown size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
                    {paymentStep === 'form' && 'Souscrire à l\'offre Pro'}
                    {paymentStep === 'waiting' && 'Validation en cours'}
                    {paymentStep === 'success' && 'Paiement confirmé !'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    Passerelle sécurisée Mobile Money & Carte Bancaire
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>

            {/* STEP 1: FORM */}
            {paymentStep === 'form' && (
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Choix Formule */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px' }}>
                    Formule choisie
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('pro')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: `2px solid ${selectedPlan === 'pro' ? '#0062FF' : '#E2E8F0'}`,
                        background: selectedPlan === 'pro' ? '#EFF6FF' : '#FFFFFF',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>Plan Pro</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>1 boutique illimitée</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('business')}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: `2px solid ${selectedPlan === 'business' ? '#0062FF' : '#E2E8F0'}`,
                        background: selectedPlan === 'business' ? '#EFF6FF' : '#FFFFFF',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: '#0F172A' }}>Plan Business</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Multi-boutiques & caissiers</div>
                    </button>
                  </div>
                </div>

                {/* Choix Périodicité */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px' }}>
                    Périodicité
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setPeriodicite('mensuel')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${periodicite === 'mensuel' ? '#0062FF' : '#E2E8F0'}`,
                        background: periodicite === 'mensuel' ? '#EFF6FF' : '#FFFFFF',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Mensuel ({selectedPlan === 'business' ? '12 000 F' : '4 500 F'})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodicite('annuel')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: `2px solid ${periodicite === 'annuel' ? '#0062FF' : '#E2E8F0'}`,
                        background: periodicite === 'annuel' ? '#EFF6FF' : '#FFFFFF',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Annuel ({selectedPlan === 'business' ? '120 000 F' : '45 000 F'})
                      <div style={{ fontSize: '0.72rem', color: '#10B981' }}>2 mois offerts !</div>
                    </button>
                  </div>
                </div>

                {/* Mode de Paiement */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px' }}>
                    Moyen de paiement
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setMoyenPaiement('orange')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: moyenPaiement === 'orange' ? '2px solid #FF7900' : '1px solid #CBD5E1',
                        background: moyenPaiement === 'orange' ? '#FFF7ED' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '52px',
                        boxShadow: moyenPaiement === 'orange' ? '0 2px 8px rgba(255, 121, 0, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src="/logos/orange-money.png"
                        alt="Orange Money"
                        style={{ maxHeight: '28px', maxWidth: '135px', objectFit: 'contain' }}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoyenPaiement('mtn')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: moyenPaiement === 'mtn' ? '2px solid #EAB308' : '1px solid #CBD5E1',
                        background: moyenPaiement === 'mtn' ? '#FEFCE8' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '52px',
                        boxShadow: moyenPaiement === 'mtn' ? '0 2px 8px rgba(234, 179, 8, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src="/logos/mtn-momo.png"
                        alt="MTN MoMo"
                        style={{ maxHeight: '28px', maxWidth: '130px', objectFit: 'contain' }}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoyenPaiement('wave')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: moyenPaiement === 'wave' ? '2px solid #0099FF' : '1px solid #CBD5E1',
                        background: moyenPaiement === 'wave' ? '#F0F9FF' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '52px',
                        boxShadow: moyenPaiement === 'wave' ? '0 2px 8px rgba(0, 153, 255, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src="/logos/wave.png"
                        alt="Wave"
                        style={{ maxHeight: '28px', maxWidth: '120px', objectFit: 'contain' }}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoyenPaiement('card')}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: moyenPaiement === 'card' ? '2px solid #0062FF' : '1px solid #CBD5E1',
                        background: moyenPaiement === 'card' ? '#EFF6FF' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        minHeight: '52px',
                        boxShadow: moyenPaiement === 'card' ? '0 2px 8px rgba(0, 98, 255, 0.2)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src="/logos/visa-mastercard.png"
                        alt="Visa / Mastercard"
                        style={{ maxHeight: '28px', maxWidth: '125px', objectFit: 'contain' }}
                      />
                    </button>
                  </div>
                </div>

                {/* METHOD SPECIFIC FIELDS */}
                {moyenPaiement === 'orange' && (
                  <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#9A3412', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Smartphone size={16} color="#FF7900" />
                        Numéro de compte Orange Money *
                      </label>
                      <span style={{ fontSize: '0.72rem', background: '#FF7900', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        Orange Money CI / CM / SN
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="tel"
                        value={momoPhone}
                        onChange={e => setMomoPhone(e.target.value)}
                        placeholder="Ex: 690 12 34 56"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #FDBA74', fontSize: '0.95rem', fontWeight: 600 }}
                        required
                        autoFocus
                      />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#C2410C', marginTop: '8px', lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span>📲</span>
                      <span>
                        Un prompt USSD de paiement sécurisé <strong>#150*50#</strong> ou une notification push apparaîtra instantanément sur votre téléphone pour valider le débit avec votre code PIN Orange Money.
                      </span>
                    </div>
                  </div>
                )}

                {moyenPaiement === 'mtn' && (
                  <div style={{ background: '#FEFCE8', border: '1px solid #FEF08A', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#854D0E', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Smartphone size={16} color="#CA8A04" />
                        Numéro MTN Mobile Money *
                      </label>
                      <span style={{ fontSize: '0.72rem', background: '#EAB308', color: '#000000', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        MTN MoMo Push
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="tel"
                        value={momoPhone}
                        onChange={e => setMomoPhone(e.target.value)}
                        placeholder="Ex: 670 12 34 56 ou 650 00 11 22"
                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #FACC15', fontSize: '0.95rem', fontWeight: 600 }}
                        required
                        autoFocus
                      />
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#A16207', marginTop: '8px', lineHeight: 1.4, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span>🟡</span>
                      <span>
                        Vous allez recevoir une demande de débit <strong>MTN MoMo (*126#)</strong> sur votre mobile. Tapez votre code PIN à 4 ou 5 chiffres pour confirmer l'activation de votre abonnement.
                      </span>
                    </div>
                  </div>
                )}

                {moyenPaiement === 'wave' && (
                  <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0369A1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <QrCode size={16} color="#0099FF" />
                        Règlement Direct Wave
                      </span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setWaveAction('phone')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.74rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: waveAction === 'phone' ? '#0099FF' : '#E0F2FE',
                            color: waveAction === 'phone' ? '#FFFFFF' : '#0369A1',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Par Numéro
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaveAction('qr')}
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.74rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: waveAction === 'qr' ? '#0099FF' : '#E0F2FE',
                            color: waveAction === 'qr' ? '#FFFFFF' : '#0369A1',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Scanner QR Code
                        </button>
                      </div>
                    </div>

                    {waveAction === 'phone' ? (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#0369A1', marginBottom: '4px' }}>
                          Numéro de compte Wave *
                        </label>
                        <input
                          type="tel"
                          value={momoPhone}
                          onChange={e => setMomoPhone(e.target.value)}
                          placeholder="Ex: 690 12 34 56"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #7DD3FC', fontSize: '0.95rem', fontWeight: 600 }}
                          required
                          autoFocus
                        />
                        <div style={{ fontSize: '0.76rem', color: '#0284C7', marginTop: '8px' }}>
                          🌊 Débit instantané sans frais supplémentaires via le réseau Wave.
                        </div>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '12px 8px', background: '#FFFFFF', borderRadius: '8px', border: '1px dashed #7DD3FC' }}>
                        <div style={{ width: '120px', height: '120px', margin: '0 auto 8px auto', background: '#F8FAFC', border: '2px solid #0099FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <QrCode size={90} color="#0099FF" />
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                          Scannez avec votre application Wave
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                          Ouvrez Wave sur votre smartphone et scannez ce code pour payer {finalPrice.toLocaleString('fr-FR')} FCFA
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {moyenPaiement === 'card' && (
                  <div style={{ background: '#F8FAFC', border: '1.5px solid #CBD5E1', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CreditCard size={18} color="#0062FF" />
                        Paiement Sécurisé par Carte Bancaire
                      </span>
                      <span style={{ fontSize: '0.72rem', background: '#EFF6FF', color: '#0062FF', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Lock size={11} /> 3D-Secure 2.0
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Card Number */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Numéro de carte bancaire (16 chiffres) *
                        </label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={e => handleCardNumberChange(e.target.value)}
                            placeholder="4000 1234 5678 9010"
                            maxLength={19}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              paddingRight: '60px',
                              borderRadius: '8px',
                              border: '1.5px solid #CBD5E1',
                              fontSize: '0.96rem',
                              fontWeight: 600,
                              letterSpacing: '1px',
                            }}
                            required
                            autoFocus
                          />
                          <div style={{ position: 'absolute', right: '10px', top: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <img src="/logos/visa-mastercard.png" alt="Visa/Mastercard" style={{ height: '20px', objectFit: 'contain' }} />
                          </div>
                        </div>
                      </div>

                      {/* Card Holder */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                          Nom du titulaire (tel qu'écrit sur la carte) *
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={e => setCardHolder(e.target.value.toUpperCase())}
                          placeholder="EX: ALBERT CAMUS"
                          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase' }}
                          required
                        />
                      </div>

                      {/* Expiry & CVV */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            Expiration (MM/AA) *
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={e => handleExpiryChange(e.target.value)}
                            placeholder="MM/AA"
                            maxLength={5}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}
                            required
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                            CVV (au dos) *
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="password"
                              value={cardCvv}
                              onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                              placeholder="123"
                              maxLength={3}
                              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}
                              required
                            />
                            <Lock size={14} style={{ position: 'absolute', right: '10px', top: '13px', color: '#94A3B8' }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Lock size={12} color="#059669" />
                      <span>Cryptage SSL 256-bit certifié PCI-DSS. Vos données bancaires sont traitées de façon ultra-sécurisée.</span>
                    </div>
                  </div>
                )}

                {/* Code promo */}
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: '4px' }}>
                    Code promotionnel (optionnel : essayez <code>COMMERCIA20</code>)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={e => setPromoCode(e.target.value)}
                      placeholder="Ex: COMMERCIA20"
                      style={{ flex: 1, padding: '8px' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (promoCode.trim().toUpperCase() === 'COMMERCIA20') setPromoMessage('Code validé : -20% appliqués ! 🎉');
                        else setPromoMessage('Code non reconnu.');
                      }}
                    >
                      Appliquer
                    </button>
                  </div>
                  {promoMessage && (
                    <div style={{ fontSize: '0.78rem', color: promoMessage.includes('validé') ? '#059669' : '#DC2626', marginTop: '4px' }}>
                      {promoMessage}
                    </div>
                  )}
                </div>

                {/* Montant Net */}
                <div style={{ background: '#F8FAFC', padding: '14px 18px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>Total net à débiter :</span>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0062FF' }}>
                    {finalPrice.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
            )}

            {/* STEP 2: TAILORED WAITING SCREEN PER PAYMENT METHOD */}
            {paymentStep === 'waiting' && (
              <div className="modal-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#EFF6FF',
                  color: '#0062FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  animation: 'pulse 2s infinite',
                }}>
                  <RefreshCw size={32} className="spin" />
                </div>

                {/* 1. Orange Money Waiting */}
                {moyenPaiement === 'orange' && (
                  <>
                    <img src="/logos/orange-money.png" alt="Orange Money" style={{ maxHeight: '36px', maxWidth: '160px', margin: '0 auto 12px auto', objectFit: 'contain' }} />
                    <h4 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', fontWeight: 800, color: '#EA580C' }}>
                      Validation Orange Money requise
                    </h4>
                    <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '16px' }}>
                      Une demande de débit de <strong>{finalPrice.toLocaleString('fr-FR')} FCFA</strong> a été transmise à votre numéro <strong>{momoPhone}</strong>.
                    </p>
                    <div style={{ background: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '12px', padding: '14px', textAlign: 'left', fontSize: '0.84rem', marginBottom: '18px' }}>
                      <div style={{ fontWeight: 700, color: '#9A3412', marginBottom: '6px' }}>Instructions sur votre mobile :</div>
                      <div style={{ marginBottom: '4px' }}>1. Un prompt va s'afficher à l'écran de votre téléphone.</div>
                      <div style={{ marginBottom: '4px' }}>2. Si rien n'apparaît, tapez <strong>#150*50#</strong> pour autoriser la transaction.</div>
                      <div>3. Saisissez votre <strong>code PIN secret Orange Money</strong>.</div>
                    </div>
                  </>
                )}

                {/* 2. MTN MoMo Waiting */}
                {moyenPaiement === 'mtn' && (
                  <>
                    <img src="/logos/mtn-momo.png" alt="MTN MoMo" style={{ maxHeight: '36px', maxWidth: '150px', margin: '0 auto 12px auto', objectFit: 'contain' }} />
                    <h4 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', fontWeight: 800, color: '#CA8A04' }}>
                      Validation MTN MoMo en attente
                    </h4>
                    <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '16px' }}>
                      Une notification de débit de <strong>{finalPrice.toLocaleString('fr-FR')} FCFA</strong> a été envoyée au <strong>{momoPhone}</strong>.
                    </p>
                    <div style={{ background: '#FEFCE8', border: '1px solid #FEF08A', borderRadius: '12px', padding: '14px', textAlign: 'left', fontSize: '0.84rem', marginBottom: '18px' }}>
                      <div style={{ fontWeight: 700, color: '#854D0E', marginBottom: '6px' }}>Instructions sur votre mobile :</div>
                      <div style={{ marginBottom: '4px' }}>1. Déverrouillez votre téléphone pour voir l'invite push MTN.</div>
                      <div style={{ marginBottom: '4px' }}>2. Entrez votre <strong>code PIN MoMo</strong> à 4 ou 5 chiffres.</div>
                      <div>3. Alternative manuelle : composez <strong>*126#</strong> &gt; Mes autorisations.</div>
                    </div>
                  </>
                )}

                {/* 3. Wave Waiting */}
                {moyenPaiement === 'wave' && (
                  <>
                    <img src="/logos/wave.png" alt="Wave" style={{ maxHeight: '36px', maxWidth: '140px', margin: '0 auto 12px auto', objectFit: 'contain' }} />
                    <h4 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', fontWeight: 800, color: '#0284C7' }}>
                      Paiement instantané Wave
                    </h4>
                    <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '16px' }}>
                      Débit de <strong>{finalPrice.toLocaleString('fr-FR')} FCFA</strong> via Wave.
                    </p>
                    <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '12px', padding: '14px', textAlign: 'center', fontSize: '0.84rem', marginBottom: '18px' }}>
                      <div style={{ width: '130px', height: '130px', margin: '0 auto 10px auto', background: '#FFFFFF', border: '2px solid #0099FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <QrCode size={100} color="#0099FF" />
                      </div>
                      <div style={{ fontWeight: 700, color: '#0369A1', marginBottom: '4px' }}>Ouvrez Wave &gt; Scannez le code QR</div>
                      <div style={{ fontSize: '0.76rem', color: '#64748B' }}>Le compte commerçant sera instantanément activé dès validation dans votre appli.</div>
                    </div>
                  </>
                )}

                {/* 4. Visa / Mastercard Waiting */}
                {moyenPaiement === 'card' && (
                  <>
                    <img src="/logos/visa-mastercard.png" alt="Visa/Mastercard" style={{ maxHeight: '36px', maxWidth: '150px', margin: '0 auto 12px auto', objectFit: 'contain' }} />
                    <h4 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', fontWeight: 800, color: '#0062FF' }}>
                      Vérification Bancaire 3D-Secure 2.0
                    </h4>
                    <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '16px' }}>
                      Carte se terminant par <strong>•••• {cardNumber.slice(-4) || '4242'}</strong> — Montant : <strong>{finalPrice.toLocaleString('fr-FR')} FCFA</strong>.
                    </p>
                    <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '14px', textAlign: 'left', fontSize: '0.84rem', marginBottom: '18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: '#1E40AF', marginBottom: '6px' }}>
                        <Lock size={16} />
                        <span>Authentification sécurisée émetteur bancaire</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.4 }}>
                        Votre établissement bancaire procède à la vérification de la transaction (SMS OTP ou confirmation sur l'application mobile de votre banque).
                      </div>
                    </div>
                  </>
                )}

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px', textAlign: 'left', fontSize: '0.82rem', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '4px' }}><strong>Référence :</strong> {currentPaymentRef}</div>
                  <div style={{ marginBottom: '4px' }}><strong>Moyen :</strong> {moyenPaiement.toUpperCase()}</div>
                  <div style={{ color: '#059669', fontWeight: 600 }}>● Connexion passerelle de paiement active</div>
                </div>

                <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '16px' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '10px' }}>
                    🛠️ Environnement de test / Démonstration :
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSandboxConfirm}
                    disabled={isVerifying}
                    style={{ background: '#059669', borderColor: '#059669', width: '100%' }}
                  >
                    {isVerifying ? 'Confirmation serveur en cours...' : 'Simuler la confirmation serveur (Sandbox)'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SUCCESS */}
            {paymentStep === 'success' && (
              <div className="modal-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                  <CheckCircle size={38} />
                </div>
                <h4 style={{ fontSize: '1.3rem', margin: '0 0 8px 0', fontWeight: 800, color: '#064E3B' }}>
                  Paiement Validé avec Succès ! 🎉
                </h4>
                <p style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '20px' }}>
                  Votre compte a été surclassé en <strong>Formule Pro</strong>. Toutes les fonctionnalités de gestion, alertes stocks et crédits sont immédiatement débloquées.
                </p>

                {verifiedPayment && (
                  <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', textAlign: 'left', fontSize: '0.86rem', marginBottom: '20px' }}>
                    <div><strong>Reçu N° :</strong> {verifiedPayment.reference}</div>
                    <div><strong>Montant débité :</strong> {verifiedPayment.amount.toLocaleString('fr-FR')} {verifiedPayment.currency}</div>
                    <div><strong>Formule :</strong> {verifiedPayment.plan?.displayName || 'Plan Pro'}</div>
                    <div><strong>Date d'effet :</strong> {new Date().toLocaleDateString('fr-FR')}</div>
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '12px' }}
                  onClick={() => setShowPayModal(false)}
                >
                  Accéder à mes fonctionnalités Pro
                </button>
              </div>
            )}

            {paymentStep === 'form' && (
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleInitiatePayment}
                  disabled={
                    isInitiating ||
                    (moyenPaiement === 'card'
                      ? cardNumber.replace(/\s/g, '').length < 16 || !cardExpiry.trim() || cardCvv.length < 3
                      : (waveAction === 'phone' || moyenPaiement !== 'wave') && !momoPhone.trim())
                  }
                  style={{ minWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Lock size={15} />
                  <span>{isInitiating ? 'Initialisation...' : `Payer ${finalPrice.toLocaleString('fr-FR')} FCFA`}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL REÇU DE PAIEMENT NUMÉROTÉ */}
      {selectedReceipt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0, fontWeight: 700 }}>Reçu Officiel de Paiement</h3>
              <button onClick={() => setSelectedReceipt(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px dashed #E2E8F0', paddingBottom: '16px', marginBottom: '16px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0062FF' }}>COMMERCIA</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Plateforme SaaS de Gestion Commerciale</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '8px' }}>REÇU ÉLECTRONIQUE VALIDE</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.86rem', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>N° de Référence :</span>
                  <strong>{selectedReceipt.reference}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Date & Heure :</span>
                  <span>{new Date(selectedReceipt.createdAt).toLocaleString('fr-FR')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Client :</span>
                  <span>{user?.firstName} {user?.lastName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Email :</span>
                  <span>{user?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Formule souscrite :</span>
                  <strong>{selectedReceipt.plan?.displayName || 'Plan Pro'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Canal de paiement :</span>
                  <span style={{ textTransform: 'capitalize' }}>{selectedReceipt.provider}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>Montant total acquitté :</span>
                  <span style={{ fontWeight: 900, fontSize: '1.15rem', color: '#059669' }}>
                    {selectedReceipt.amount.toLocaleString('fr-FR')} {selectedReceipt.currency}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: '20px', background: '#F8FAFC', padding: '10px', borderRadius: '8px', fontSize: '0.74rem', color: '#64748B', textAlign: 'center' }}>
                Ce reçu fait office de justificatif de paiement d'abonnement logiciel conforme au droit commercial OHADA.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedReceipt(null)}>
                Fermer
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  window.print();
                }}
              >
                <Download size={16} />
                <span>Imprimer / Sauvegarder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
