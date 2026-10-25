import React, { useState, useEffect } from 'react';
import { Crown, Check, Zap, Smartphone, ShieldCheck, X, Sparkles, RefreshCw, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { Plan } from '../types';
import { useAuthStore } from '../store/authStore';

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mySub, setMySub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  const [testActivating, setTestActivating] = useState(false);
  const [testNotice, setTestNotice] = useState<string | null>(null);

  // Mobile Money modal state
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'orange' | 'mtn'>('orange');
  const [processing, setProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const { fetchMe } = useAuthStore();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [plansRes, subRes] = await Promise.all([
        api.get<Plan[]>('/plans'),
        api.get<any>('/plans/my-subscription'),
      ]);
      setPlans(plansRes || []);
      setMySub(subRes || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    try {
      setProcessing(true);
      const res = await api.post<any>('/plans/subscribe', {
        planName: selectedPlan.name,
        paymentMethod: 'mobile_money',
        phoneNumber: phone || undefined,
      });

      setSuccessMsg(res.message);
      await fetchMe();
      await fetchData();

      setTimeout(() => {
        setSelectedPlan(null);
        setSuccessMsg('');
        setProcessing(false);
      }, 2000);
    } catch (err: any) {
      alert(err.message || 'Erreur de paiement.');
      setProcessing(false);
    }
  };

  const handleTestActivate = async (pName: 'free' | 'pro' | 'business') => {
    try {
      setTestActivating(true);
      const res = await api.post<{ success: boolean; message: string }>('/plans/test-activate', {
        planName: pName,
      });
      await fetchMe();
      await fetchData();
      setTestNotice(res.message || `Formule ${pName.toUpperCase()} activée avec succès en mode test !`);
      setTimeout(() => setTestNotice(null), 5000);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erreur lors de l\'activation du test');
    } finally {
      setTestActivating(false);
    }
  };

  const currentPlanName = mySub?.plan || mySub?.planName || 'free';

  return (
    <div className="page-wrapper">
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

      {/* BANC D'ESSAI / TEST DES FORMULES */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 60%, #312E81 100%)',
          borderRadius: '18px',
          padding: '20px 24px',
          marginBottom: '32px',
          color: '#FFFFFF',
          boxShadow: '0 12px 30px rgba(15, 23, 42, 0.28)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '640px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
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
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#FFFFFF' }}>
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
                Évaluation Libre
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#CBD5E1', lineHeight: 1.45 }}>
              Activez immédiatement la <strong>Formule Pro</strong> ou la <strong>Formule Business</strong> pour évaluer toutes les fonctionnalités en conditions réelles sans carte ni débit.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={testActivating || currentPlanName === 'pro'}
            onClick={() => handleTestActivate('pro')}
            style={{
              background: currentPlanName === 'pro' ? '#10B981' : '#0062FF',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: currentPlanName === 'pro' ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(0, 98, 255, 0.35)',
              opacity: testActivating ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <Crown size={15} />
            <span>{currentPlanName === 'pro' ? '✓ Pro Actif (Test)' : '⚡ Tester Pro'}</span>
          </button>

          <button
            type="button"
            disabled={testActivating || currentPlanName === 'business'}
            onClick={() => handleTestActivate('business')}
            style={{
              background: currentPlanName === 'business' ? '#10B981' : 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: currentPlanName === 'business' ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              opacity: testActivating ? 0.7 : 1,
              transition: 'all 0.15s ease',
            }}
          >
            <Sparkles size={15} />
            <span>{currentPlanName === 'business' ? '✓ Business Actif (Test)' : '💼 Tester Business'}</span>
          </button>

          {currentPlanName !== 'free' && (
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

      <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 40px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#EFF6FF',
            color: '#0062FF',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '12px',
            border: '1px solid #BFDBFE',
          }}
        >
          <Crown size={16} />
          <span>Tarifs Adaptés aux Réalités d'Afrique</span>
        </div>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '8px', fontWeight: 800 }}>Passez à la Vitesse Supérieure</h1>
        <p style={{ color: '#64748B', fontSize: '1.05rem' }}>
          Aucune carte bancaire requise. Réglez simplement par <strong style={{ color: '#FF7900' }}>Orange Money</strong> ou <strong style={{ color: '#EAB308' }}>MTN Mobile Money</strong>.
        </p>
      </div>

      {/* Pricing Cards */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p>Chargement des offres...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
          {plans.map(p => {
            const currentPlanName = mySub?.plan || mySub?.planName;
            const isCurrent = currentPlanName === p.name;
            const isPro = p.name === 'pro';
            const featuresList = Array.isArray(p.features)
              ? p.features
              : typeof p.features === 'string'
              ? (() => {
                  try {
                    const parsed = JSON.parse(p.features);
                    return Array.isArray(parsed) ? parsed : [p.features];
                  } catch {
                    return [p.features];
                  }
                })()
              : [];

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  border: isPro ? '2px solid #0062FF' : isCurrent ? '2px solid #FF6B00' : '1px solid #E2E8F0',
                  boxShadow: isPro ? '0 12px 28px -5px rgba(0, 98, 255, 0.22)' : 'var(--shadow-sm)',
                }}
              >
                {isPro && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #FF6B00 0%, #FF8A00 100%)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxShadow: '0 4px 10px rgba(255, 107, 0, 0.35)',
                    }}
                  >
                    Le plus populaire 🔥
                  </div>
                )}

                {isCurrent && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-14px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#0062FF',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 10px rgba(0, 98, 255, 0.35)',
                    }}
                  >
                    Votre Plan Actuel ✓
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '1.4rem', margin: '0 0 6px 0' }}>{p.displayName}</h3>
                  <p style={{ color: '#64748B', fontSize: '0.85rem', minHeight: '36px' }}>{p.description}</p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 800, fontFamily: 'Space Grotesk, sans-serif', color: '#08162B' }}>
                      {(p.priceMonthly || 0).toLocaleString('fr-FR')}
                    </span>
                    <span style={{ fontWeight: 700, color: '#64748B', fontSize: '1rem' }}>FCFA</span>
                    <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>/ mois</span>
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
                  {featuresList.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.9rem' }}>
                      <div
                        style={{
                          background: '#EFF6FF',
                          color: '#0062FF',
                          borderRadius: '50%',
                          padding: '2px',
                          display: 'flex',
                          marginTop: '2px',
                        }}
                      >
                        <Check size={14} />
                      </div>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    className={`btn ${isPro ? 'btn-accent' : isCurrent ? 'btn-outline' : 'btn-primary'} btn-lg`}
                    disabled={isCurrent}
                    onClick={() => setSelectedPlan(p)}
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    {isCurrent ? 'Plan Actif' : p.priceMonthly === 0 ? 'Choisir ce plan' : `S'abonner (${(p.priceMonthly || 0).toLocaleString('fr-FR')} FCFA)`}
                  </button>

                  <button
                    type="button"
                    disabled={isCurrent || testActivating}
                    onClick={() => handleTestActivate(p.name as any)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      background: isCurrent ? '#F1F5F9' : '#FFFFFF',
                      color: isCurrent ? '#64748B' : '#0F172A',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: isCurrent ? 'default' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Sparkles size={14} color={isCurrent ? '#94A3B8' : '#FF6B00'} />
                    <span>{isCurrent ? '✓ Plan Actuel' : `⚡ Tester ${p.displayName} (1 clic)`}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Money Payment Modal */}
      {selectedPlan && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: '1.2rem' }}>Paiement Sécurisé Mobile Money</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Abonnement {selectedPlan.displayName}</p>
              </div>
              <button onClick={() => setSelectedPlan(null)} style={{ background: 'transparent', color: '#94A3B8' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubscribe}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {successMsg && (
                  <div style={{ padding: '14px', background: '#DCFCE7', color: '#16A34A', borderRadius: '10px', fontWeight: 700 }}>
                    {successMsg}
                  </div>
                )}

                <div
                  style={{
                    background: '#F8FAFC',
                    padding: '16px',
                    borderRadius: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#64748B' }}>Montant débité :</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
                    {selectedPlan.priceMonthly.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>

                {selectedPlan.priceMonthly > 0 && (
                  <>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                        Opérateur Mobile Money
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setProvider('orange')}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            border: provider === 'orange' ? '2px solid #FF7900' : '1px solid #CBD5E1',
                            background: provider === 'orange' ? '#FFF5EB' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '50px',
                            cursor: 'pointer',
                          }}
                        >
                          <img
                            src="/logos/orange-money.png"
                            alt="Orange Money"
                            style={{ maxHeight: '26px', maxWidth: '130px', objectFit: 'contain' }}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => setProvider('mtn')}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            fontWeight: 700,
                            border: provider === 'mtn' ? '2px solid #EAB308' : '1px solid #CBD5E1',
                            background: provider === 'mtn' ? '#FFFDEB' : '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '50px',
                            cursor: 'pointer',
                          }}
                        >
                          <img
                            src="/logos/mtn-momo.png"
                            alt="MTN MoMo"
                            style={{ maxHeight: '26px', maxWidth: '125px', objectFit: 'contain' }}
                          />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                        Numéro de téléphone de débit
                      </label>
                      <input
                        type="tel"
                        placeholder="Ex: 699 00 11 22 ou 677 00 11 22"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                        autoFocus
                      />
                      <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                        Un prompt USSD de confirmation sera simulé sur votre écran.
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedPlan(null)} disabled={processing}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={processing}>
                  {processing ? 'Validation du paiement...' : 'Confirmer et Activer 🚀'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
