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
  const [momoPhone, setMomoPhone] = useState(user?.phone || '690123456');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');

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

  // Handle initiate payment
  const handleInitiatePayment = async () => {
    try {
      setIsInitiating(true);
      const res = await api.post<{ payment: PaymentItem; message: string }>('/payments/initiate', {
        planName: selectedPlan,
        billingCycle: periodicite,
        provider: moyenPaiement,
        phoneNumber: momoPhone,
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
              disabled={isFree}
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              {isFree ? 'Version actuellement active' : 'Repasser en gratuit'}
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
              <li><strong>✅ Trésorerie prédictive à 30 jours</strong></li>
              <li><strong>✅ Copilote IA COMMERCIA illimité</strong></li>
              <li>✅ Reçus thermiques & factures normalisées</li>
            </ul>
            <button
              className="btn btn-primary"
              onClick={() => {
                setSelectedPlan('pro');
                setPaymentStep('form');
                setShowPayModal(true);
              }}
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              {isPro && sub?.planName === 'pro' ? 'Prolonger Pro' : 'Passer à la formule Pro'}
            </button>
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
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSelectedPlan('business');
                setPaymentStep('form');
                setShowPayModal(true);
              }}
              style={{ width: '100%', padding: '12px', fontWeight: 700 }}
            >
              {isPro && sub?.planName === 'business' ? 'Prolonger Business' : 'Choisir Business'}
            </button>
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
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontSize: '0.85rem', color: '#64748B' }}>
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ fontWeight: 700, color: '#0062FF', fontSize: '0.88rem' }}>
                      {p.reference}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.plan?.displayName || 'Plan Pro'}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                      {p.provider === 'orange' ? 'Orange Money' : p.provider === 'mtn' ? 'MTN MoMo' : p.provider}
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PAIEMENT RÉEL & PASSERELLE */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setMoyenPaiement('orange')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: moyenPaiement === 'orange' ? '2px solid #FF7900' : '1px solid #CBD5E1',
                        background: moyenPaiement === 'orange' ? '#FFF7ED' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🍊 Orange Money</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoyenPaiement('mtn')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: moyenPaiement === 'mtn' ? '2px solid #FFCC00' : '1px solid #CBD5E1',
                        background: moyenPaiement === 'mtn' ? '#FEFCE8' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🟡 MTN MoMo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoyenPaiement('wave')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: moyenPaiement === 'wave' ? '2px solid #1DC3FF' : '1px solid #CBD5E1',
                        background: moyenPaiement === 'wave' ? '#F0F9FF' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>🌊 Wave</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMoyenPaiement('card')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: moyenPaiement === 'card' ? '2px solid #0062FF' : '1px solid #CBD5E1',
                        background: moyenPaiement === 'card' ? '#EFF6FF' : '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>💳 Visa / Mastercard</span>
                    </button>
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px' }}>
                    Numéro de compte pour le prélèvement *
                  </label>
                  <input
                    type="text"
                    value={momoPhone}
                    onChange={e => setMomoPhone(e.target.value)}
                    placeholder="Ex: 690123456 ou 670123456"
                    style={{ width: '100%', padding: '10px' }}
                    required
                  />
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '4px' }}>
                    Un message USSD avec demande de validation du code secret apparaîtra sur ce numéro.
                  </div>
                </div>

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

            {/* STEP 2: WAITING FOR USER CONFIRMATION ON PHONE */}
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
                <h4 style={{ fontSize: '1.2rem', margin: '0 0 8px 0', fontWeight: 800 }}>
                  Validation requise sur votre téléphone
                </h4>
                <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.5, marginBottom: '20px' }}>
                  Une demande de débit de <strong>{finalPrice.toLocaleString('fr-FR')} FCFA</strong> a été transmise à votre numéro <strong>{momoPhone}</strong>. Veuillez saisir votre code secret sur le prompt de votre opérateur.
                </p>

                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '14px', textAlign: 'left', fontSize: '0.84rem', marginBottom: '20px' }}>
                  <div style={{ marginBottom: '4px' }}><strong>Référence :</strong> {currentPaymentRef}</div>
                  <div style={{ marginBottom: '4px' }}><strong>Opérateur :</strong> {moyenPaiement.toUpperCase()}</div>
                  <div><strong>Statut serveur :</strong> En attente du webhook de confirmation...</div>
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
                  disabled={isInitiating || !momoPhone.trim()}
                  style={{ minWidth: '170px' }}
                >
                  {isInitiating ? 'Initialisation...' : 'Valider & Payer'}
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
