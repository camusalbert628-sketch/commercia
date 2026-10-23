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
} from 'lucide-react';
import {
  getSubscriptionData,
  startFreeTrial,
  simulatePayment,
  cancelSubscription,
  reactivateSubscription,
  getPaymentReceipts,
} from '../services/premiumService';
import { SubscriptionData, PaymentReceipt } from '../types/premium';

export const SubscriptionPage: React.FC = () => {
  const [sub, setSub] = useState<SubscriptionData>(getSubscriptionData());
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(getPaymentReceipts());
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  // Payment Modal State
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'plan-pro' | 'plan-business'>('plan-pro');
  const [periodicite, setPeriodicite] = useState<'mensuel' | 'annuel'>('mensuel');
  const [moyenPaiement, setMoyenPaiement] = useState<'mobile_money' | 'carte'>('mobile_money');
  const [momoPhone, setMomoPhone] = useState('+237 670 123 456');
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState<PaymentReceipt | null>(null);

  // Cancellation Modal State
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelStep, setCancelStep] = useState<1 | 2>(1);
  const [cancelReason, setCancelReason] = useState('Trop cher');

  useEffect(() => {
    setSub(getSubscriptionData());
    setReceipts(getPaymentReceipts());
  }, []);

  const handleStartTrial = () => {
    const updated = startFreeTrial();
    setSub({ ...updated });
    alert('🎉 Votre essai gratuit de 14 jours a été activé avec succès ! Profitez de tous les modules Premium sans engagement.');
  };

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const { sub: updatedSub, receipt } = simulatePayment({
        planId: selectedPlan,
        periodicite,
        moyenPaiement,
        numeroMobile: momoPhone,
        codePromo: promoCode,
      });
      setSub({ ...updatedSub });
      setReceipts(getPaymentReceipts());
      setIsProcessing(false);
      setShowPayModal(false);
      setPaymentSuccessReceipt(receipt);
    }, 1200);
  };

  const handleCancel = () => {
    const updated = cancelSubscription(cancelReason);
    setSub({ ...updated });
    setShowCancelModal(false);
    setCancelStep(1);
    alert(`Votre demande d'arrêt du renouvellement a été enregistrée. Votre accès reste pleinement actif jusqu'au ${new Date(updated.dateFinPeriode).toLocaleDateString('fr-FR')}.`);
  };

  const handleReactivate = () => {
    const updated = reactivateSubscription();
    setSub({ ...updated });
    alert('🎉 Votre abonnement a été réactivé avec succès !');
  };

  const basePrice = selectedPlan === 'plan-business' ? (periodicite === 'annuel' ? 120000 : 12000) : (periodicite === 'annuel' ? 45000 : 4500);
  let finalPrice = basePrice;
  if (promoCode.trim().toUpperCase() === 'COMMERCIA20') finalPrice = Math.round(basePrice * 0.8);
  if (promoCode.trim().toUpperCase() === 'BIENVENUE5000') finalPrice = Math.max(0, basePrice - 5000);

  return (
    <div className="page-wrapper">
      {/* 1. STATUS ALERT BANNER (If Trial ending, Grace, or Expired) */}
      {sub.etat === 'ESSAI' && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles size={24} color="#0062FF" />
            <div>
              <strong style={{ color: '#1E40AF', fontSize: '0.96rem' }}>Essai Gratuit Premium en cours ({sub.joursRestants} jour(s) restants)</strong>
              <div style={{ color: '#3B82F6', fontSize: '0.85rem' }}>Votre essai prendra fin le {new Date(sub.dateFinPeriode).toLocaleDateString('fr-FR')}. Passez à l'abonnement pour continuer sans interruption.</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowPayModal(true)}>
            Activer l'abonnement
          </button>
        </div>
      )}

      {sub.etat === 'GRACE' && (
        <div style={{ background: '#FFFBEB', border: '2px solid #F59E0B', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#D97706" />
            <div>
              <strong style={{ color: '#92400E', fontSize: '0.96rem' }}>Période de Grâce en cours : {sub.joursGraceRestants || 7} jours restants pour régulariser</strong>
              <div style={{ color: '#B45309', fontSize: '0.85rem' }}>Votre abonnement est arrivé à échéance. Vos modules restent accessibles. Régularisez votre paiement pour éviter le passage en lecture seule.</div>
            </div>
          </div>
          <button className="btn btn-primary" style={{ background: '#D97706' }} onClick={() => setShowPayModal(true)}>
            Régulariser par Mobile Money
          </button>
        </div>
      )}

      {sub.etat === 'EXPIRE' && (
        <div style={{ background: '#FEF2F2', border: '2px solid #EF4444', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#DC2626" />
            <div>
              <strong style={{ color: '#991B1B', fontSize: '0.96rem' }}>Abonnement Expiré • Modules Premium en lecture seule ({sub.lectureSeuleJoursRestants || 90} jours)</strong>
              <div style={{ color: '#B91C1C', fontSize: '0.85rem' }}>Vos données sont conservées en toute sécurité. Réactivez votre formule pour reprendre la saisie complète.</div>
            </div>
          </div>
          <button className="btn btn-danger" onClick={() => setShowPayModal(true)}>
            Réactiver mon abonnement
          </button>
        </div>
      )}

      {/* 2. SECTION 6.1 : MON ABONNEMENT ACTUEL */}
      <div className="card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #0062FF 0%, #0045B5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', boxShadow: '0 6px 18px rgba(0, 98, 255, 0.35)' }}>
              <Crown size={28} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
                  {sub.planId === 'plan-business' ? 'Plan Business' : 'Plan Pro (Croissance)'}
                </h2>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  background: sub.etat === 'ACTIF' ? '#ECFDF5' : sub.etat === 'ESSAI' ? '#EFF6FF' : sub.etat === 'GRACE' ? '#FEF3C7' : '#F1F5F9',
                  color: sub.etat === 'ACTIF' ? '#059669' : sub.etat === 'ESSAI' ? '#2563EB' : sub.etat === 'GRACE' ? '#D97706' : '#64748B',
                }}>
                  ● {sub.etat}
                </span>
              </div>
              <p style={{ color: '#64748B', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                Accès complet aux modules <strong>Croissance Clients</strong>, <strong>Trésorerie & Scénarios</strong> et <strong>Copilote IA</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={() => setShowPayModal(true)}>
              Payer / Prolonger l'accès
            </button>
            {sub.etat === 'RESILIE' ? (
              <button className="btn btn-secondary" onClick={handleReactivate}>
                Reprendre mon abonnement
              </button>
            ) : (
              <button className="btn btn-secondary" onClick={() => setShowCancelModal(true)}>
                Résilier
              </button>
            )}
          </div>
        </div>

        {/* Subscription Key Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Périodicité</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A', textTransform: 'capitalize' }}>
              {sub.periodicite} ({sub.periodicite === 'annuel' ? '45 000 FCFA / an' : '4 500 FCFA / mois'})
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Date de fin d'accès</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0062FF' }}>
              {new Date(sub.dateFinPeriode).toLocaleDateString('fr-FR')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Jours restants</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: sub.joursRestants < 5 ? '#DC2626' : '#059669' }}>
              {sub.joursRestants} jour(s)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Numéro Mobile Money préféré</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#475569' }}>
              {momoPhone}
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECTION 6.2 : PRÉSENTATION « PASSER EN PREMIUM » (Ce que gagne le commerçant) */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 24px auto' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 8px 0' }}>
            Ce que vous gagnez avec la suite <span style={{ color: '#0062FF' }}>COMMERCIA</span> <span style={{ color: '#FF6B00' }}>PREMIUM</span>
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.95rem' }}>
            Des outils conçus pour les commerçants africains pour stopper les fuites de trésorerie et rentabiliser chaque franc dépensé.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Card Module A */}
          <div className="card" style={{ padding: '24px', borderLeft: '4px solid #0062FF' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#EFF6FF', color: '#0062FF', padding: '10px', borderRadius: '10px' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Module Croissance Clients & CAC</h3>
                <span style={{ fontSize: '0.78rem', color: '#0062FF', fontWeight: 700 }}>PARTIE A DU CAHIER DES CHARGES</span>
              </div>
            </div>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '16px' }}>
              « Sachez exactement combien vous coûte l'acquisition d'un client (CAC) et quels canaux (WhatsApp, Facebook, Bouche-à-oreille) vous rapportent vraiment de l'argent. »
            </p>
            <ul style={{ fontSize: '0.85rem', color: '#334155', paddingLeft: '18px', lineHeight: 1.6, margin: 0 }}>
              <li>Calcul automatique du CAC vs seuil maximal acceptable (30% de marge brute)</li>
              <li>Gestion des campagnes illimitées et import CSV Facebook Ads Manager</li>
              <li>Traçabilité de l'origine de chaque client à la création de sa fiche</li>
            </ul>
          </div>

          {/* Card Module B */}
          <div className="card" style={{ padding: '24px', borderLeft: '4px solid #10B981' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{ background: '#ECFDF5', color: '#10B981', padding: '10px', borderRadius: '10px' }}>
                <Wallet size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Module Trésorerie Avancée & Scénarios</h3>
                <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 700 }}>PARTIE B DU CAHIER DES CHARGES</span>
              </div>
            </div>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '16px' }}>
              « Sachez combien de jours votre trésorerie tient (Autonomie en jours) et prévoyez vos soldes sur 30 jours sans risque de cessation de paiement. »
            </p>
            <ul style={{ fontSize: '0.85rem', color: '#334155', paddingLeft: '18px', lineHeight: 1.6, margin: 0 }}>
              <li>Multi-comptes financiers (Caisse physique, Banque, Orange Money, MTN MoMo)</li>
              <li>Règle stricte : les apports ne sont jamais du CA, les prélèvements jamais des charges</li>
              <li>Échéancier à 30 jours et détection du premier jour de solde négatif</li>
            </ul>
          </div>
        </div>

        {!sub.essaiUtilise && sub.etat === 'AUCUN' && (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button className="btn btn-primary btn-lg" onClick={handleStartTrial} style={{ fontSize: '1rem', padding: '12px 28px' }}>
              <Sparkles size={20} />
              <span>Essayer gratuitement pendant 14 jours (Sans carte bancaire)</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. HISTORIQUE DES REÇUS DE PAIEMENT NUMÉROTÉS */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Historique des Reçus de Paiement</h3>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Reçus numérotés uniques, immuables et téléchargeables au format PDF pour votre comptabilité
            </p>
          </div>
        </div>

        <div className="table-container" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Numéro de Reçu</th>
                <th>Date d'émission</th>
                <th>Plan souscrit</th>
                <th>Période couverte</th>
                <th>Moyen de paiement</th>
                <th>Montant</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map(rcpt => (
                <tr key={rcpt.id}>
                  <td style={{ fontWeight: 700, color: '#0062FF' }}>{rcpt.numero}</td>
                  <td style={{ fontSize: '0.85rem', color: '#64748B' }}>
                    {new Date(rcpt.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ fontWeight: 600 }}>{rcpt.planNom}</td>
                  <td style={{ fontSize: '0.85rem' }}>{rcpt.periodeCouverte}</td>
                  <td style={{ fontSize: '0.85rem' }}>{rcpt.moyenPaiement}</td>
                  <td style={{ fontWeight: 800 }}>{rcpt.montant.toLocaleString('fr-FR')} {rcpt.devise}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedReceipt(rcpt)}
                      style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                    >
                      <Printer size={14} />
                      <span>Voir reçu</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1 : PAIEMENT MOBILE MONEY / CARTE */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#EFF6FF', color: '#0062FF', padding: '8px', borderRadius: '10px' }}>
                  <Crown size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Renouvellement d'Abonnement</h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                    Paiement direct sécurisé par Mobile Money (Orange Money, MTN, Wave)
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Choix du plan */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px' }}>
                  Formule choisie
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('plan-pro')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${selectedPlan === 'plan-pro' ? '#0062FF' : '#E2E8F0'}`,
                      background: selectedPlan === 'plan-pro' ? '#EFF6FF' : '#FFFFFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>Plan Pro</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Idéal 1 boutique</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPlan('plan-business')}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      border: `2px solid ${selectedPlan === 'plan-business' ? '#0062FF' : '#E2E8F0'}`,
                      background: selectedPlan === 'plan-business' ? '#EFF6FF' : '#FFFFFF',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 800, color: '#0F172A' }}>Plan Business</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>Multi-boutiques & caissiers</div>
                  </button>
                </div>
              </div>

              {/* Choix périodicité */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '8px' }}>
                  Période
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
                    Mensuel ({selectedPlan === 'plan-business' ? '12 000 F' : '4 500 F'})
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
                    Annuel ({selectedPlan === 'plan-business' ? '120 000 F' : '45 000 F'})
                    <div style={{ fontSize: '0.7rem', color: '#10B981' }}>2 mois offerts !</div>
                  </button>
                </div>
              </div>

              {/* Choix du mode de paiement */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px' }}>
                  Mode de paiement
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setMoyenPaiement('mobile_money')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: moyenPaiement === 'mobile_money' ? '2px solid #0062FF' : '1px solid #CBD5E1',
                      background: moyenPaiement === 'mobile_money' ? '#EFF6FF' : '#FFFFFF',
                      color: moyenPaiement === 'mobile_money' ? '#0062FF' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    📱 Mobile Money
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoyenPaiement('carte')}
                    style={{
                      padding: '8px',
                      borderRadius: '8px',
                      border: moyenPaiement === 'carte' ? '2px solid #0062FF' : '1px solid #CBD5E1',
                      background: moyenPaiement === 'carte' ? '#EFF6FF' : '#FFFFFF',
                      color: moyenPaiement === 'carte' ? '#0062FF' : '#334155',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                    }}
                  >
                    💳 Carte bancaire
                  </button>
                </div>
              </div>

              {/* Numéro Mobile Money / Coordonnées */}
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.88rem', marginBottom: '6px' }}>
                  {moyenPaiement === 'mobile_money' ? 'Numéro Mobile Money (OM / MoMo / Wave)' : 'Téléphone associé à la carte'}
                </label>
                <input
                  type="text"
                  value={momoPhone}
                  onChange={e => setMomoPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px' }}
                />
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
                      else setPromoMessage('Code non reconnu ou expiré.');
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

              {/* Total à payer */}
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Total net à débiter :</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0062FF' }}>
                  {finalPrice.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handlePay}
                disabled={isProcessing}
                style={{ minWidth: '160px' }}
              >
                {isProcessing ? 'Validation sur le téléphone...' : 'Valider & Déclencher le paiement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2 : CONFIRMATION SUCCÈS PAIEMENT AVEC REÇU */}
      {paymentSuccessReceipt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
              <CheckCircle size={36} />
            </div>
            <h3 style={{ fontSize: '1.3rem', margin: '0 0 8px 0' }}>Paiement Confirmé ! 🎉</h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '16px' }}>
              Votre accès a été prolongé jusqu'au <strong>{new Date(sub.dateFinPeriode).toLocaleDateString('fr-FR')}</strong>.
              Un reçu numéroté officiel a été généré.
            </p>
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px', textAlign: 'left', fontSize: '0.88rem', marginBottom: '20px' }}>
              <div><strong>Numéro :</strong> {paymentSuccessReceipt.numero}</div>
              <div><strong>Montant :</strong> {paymentSuccessReceipt.montant.toLocaleString('fr-FR')} FCFA</div>
              <div><strong>Réf :</strong> {paymentSuccessReceipt.reference}</div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setPaymentSuccessReceipt(null)}>
              Continuer vers l'application
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3 : RÉSILIATION EN 2 ÉTAPES (SECTION 6.3) */}
      {showCancelModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Résilier mon abonnement</h3>
              <button onClick={() => setShowCancelModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {cancelStep === 1 ? (
                <>
                  <div style={{ background: '#EFF6FF', padding: '12px', borderRadius: '8px', color: '#1E40AF', fontSize: '0.88rem' }}>
                    ℹ️ Si vous résiliez, <strong>votre accès reste 100% actif jusqu'au {new Date(sub.dateFinPeriode).toLocaleDateString('fr-FR')}</strong>. Aucun prélèvement futur n'aura lieu.
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.88rem', marginBottom: '6px' }}>
                      Pour quelle raison souhaitez-vous arrêter ? (facultatif)
                    </label>
                    <select
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      style={{ width: '100%', padding: '10px' }}
                    >
                      <option value="Trop cher">Tarif trop élevé pour mon activité</option>
                      <option value="Pas assez de temps">Pas le temps d'enregistrer mes ventes</option>
                      <option value="Fermeture boutique">Fermeture temporaire de la boutique</option>
                      <option value="Autre">Autre raison</option>
                    </select>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <AlertTriangle size={36} color="#DC2626" style={{ margin: '0 auto 12px auto' }} />
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>Êtes-vous sûr de vouloir confirmer ?</h4>
                  <p style={{ color: '#64748B', fontSize: '0.88rem', margin: 0 }}>
                    Après le {new Date(sub.dateFinPeriode).toLocaleDateString('fr-FR')}, vos modules passeront en lecture seule. Vous pourrez reprendre votre abonnement à tout moment sans rien perdre.
                  </p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>
                Garder mon abonnement
              </button>
              {cancelStep === 1 ? (
                <button className="btn btn-danger" onClick={() => setCancelStep(2)}>
                  Continuer la résiliation
                </button>
              ) : (
                <button className="btn btn-danger" onClick={handleCancel}>
                  Confirmer l'arrêt
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4 : VISUALISATION DU REÇU IMPRIMABLE */}
      {selectedReceipt && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Reçu Officiel COMMERCIA</h3>
              <button onClick={() => setSelectedReceipt(null)} style={{ background: 'transparent', border: 'none', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div style={{ textAlign: 'center', paddingBottom: '12px', borderBottom: '1px dashed #CBD5E1' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0062FF' }}>COMMERCIA SaaS</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>METANOVA Technologies Ltd</div>
                <div style={{ fontWeight: 700, marginTop: '6px' }}>Reçu N° {selectedReceipt.numero}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Date d'émission :</span>
                <strong>{new Date(selectedReceipt.date).toLocaleDateString('fr-FR')}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Commerce :</span>
                <strong>{selectedReceipt.commerceNom}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Formule souscrite :</span>
                <strong>{selectedReceipt.planNom}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Période couverte :</span>
                <strong>{selectedReceipt.periodeCouverte}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Moyen de paiement :</span>
                <strong>{selectedReceipt.moyenPaiement}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #E2E8F0', paddingTop: '8px', fontWeight: 800 }}>
                <span>Montant réglé :</span>
                <span style={{ color: '#059669', fontSize: '1.1rem' }}>
                  {selectedReceipt.montant.toLocaleString('fr-FR')} {selectedReceipt.devise}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedReceipt(null)}>
                Fermer
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} />
                <span>Imprimer le reçu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
