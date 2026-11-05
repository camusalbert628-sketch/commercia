import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gift,
  Tag,
  Copy,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Crown,
  ChevronRight,
  Info,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';

interface UserPromotion {
  id: string;
  code: string;
  name: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  distributionType: 'personal' | 'group' | 'broadcast';
  minOrderAmount?: number;
  maxDiscountCap?: number | null;
  validFrom?: string;
  validUntil?: string | null;
  eligiblePlans?: string[];
  allowNew?: boolean;
  allowRenewal?: boolean;
  isUsed: boolean;
  usedAt?: string | null;
  isExpired: boolean;
  isDepleted: boolean;
  daysRemaining?: number | null;
}

export const MyPromotionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<UserPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'all'>('available');

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; promotions: UserPromotion[] }>('/subscription/my-promotions');
      setPromotions(res.promotions || []);
    } catch (err) {
      console.error('Erreur chargement de mes promotions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const handleApplyPromo = (code: string) => {
    navigate(`/subscription?promo=${encodeURIComponent(code)}`);
  };

  const availablePromos = promotions.filter((p) => !p.isUsed && !p.isExpired && !p.isDepleted);
  const displayedPromos = activeTab === 'available' ? availablePromos : promotions;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Toast Copié */}
      {copiedCode && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '13px',
          }}
        >
          <CheckCircle size={18} />
          Code « {copiedCode} » copié dans le presse-papier !
        </div>
      )}

      {/* Hero Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0A2540 0%, #004BD6 60%, #4F46E5 100%)',
          borderRadius: '20px',
          padding: '32px',
          color: '#FFFFFF',
          marginBottom: '28px',
          boxShadow: '0 12px 32px rgba(0, 75, 214, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ maxWidth: '620px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '12px',
            }}
          >
            <Gift size={14} />
            Privilèges & Remises Commerçants
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: '0 0 10px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Mes Offres Promotionnelles
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#BFDBFE', lineHeight: 1.5 }}>
            Profitez de vos réductions personnalisées et exclusives pour activer ou renouveler votre abonnement COMMERCIA aux meilleures conditions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadPromotions}
            disabled={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              color: '#FFFFFF',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => navigate('/subscription')}
            style={{
              background: '#FFFFFF',
              color: '#004BD6',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            }}
          >
            <Crown size={16} />
            Gérer mon abonnement
          </button>
        </div>
      </div>

      {/* Navigation Onglets */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('available')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'available' ? '#0062FF' : '#F1F5F9',
              color: activeTab === 'available' ? '#FFFFFF' : '#64748B',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Offres disponibles</span>
            <span
              style={{
                background: activeTab === 'available' ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                padding: '2px 7px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 900,
              }}
            >
              {availablePromos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'all' ? '#0062FF' : '#F1F5F9',
              color: activeTab === 'all' ? '#FFFFFF' : '#64748B',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>Historique complet</span>
            <span
              style={{
                background: activeTab === 'all' ? 'rgba(255,255,255,0.25)' : '#E2E8F0',
                padding: '2px 7px',
                borderRadius: '999px',
                fontSize: '11px',
                fontWeight: 900,
              }}
            >
              {promotions.length}
            </span>
          </button>
        </div>

        <div style={{ fontSize: '12.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} color="#10B981" />
          Remises validées en direct par le serveur COMMERCIA
        </div>
      </div>

      {/* Grille des Offres Promotionnelles */}
      {loading ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Chargement de vos offres promotionnelles...
        </div>
      ) : displayedPromos.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '50px 24px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: '#EFF6FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: '#0062FF',
            }}
          >
            <Gift size={32} />
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
            {activeTab === 'available' ? 'Aucune offre promotionnelle disponible actuellement' : 'Aucune offre promotionnelle enregistrée'}
          </h3>
          <p style={{ margin: '0 auto 20px', maxWidth: '480px', fontSize: '13.5px', color: '#64748B', lineHeight: 1.5 }}>
            Vos réductions exclusives accordées par l'équipe COMMERCIA apparaîtront automatiquement ici dès leur attribution.
          </p>
          <button
            onClick={() => navigate('/subscription')}
            style={{
              background: '#0062FF',
              color: '#FFFFFF',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Voir les formules Pro & Business →
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          {displayedPromos.map((promo) => {
            const isUsable = !promo.isUsed && !promo.isExpired && !promo.isDepleted;
            return (
              <div
                key={promo.id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: `1px solid ${isUsable ? '#BFDBFE' : '#E2E8F0'}`,
                  boxShadow: isUsable ? '0 6px 20px rgba(0, 98, 255, 0.08)' : '0 2px 6px rgba(0,0,0,0.02)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  opacity: isUsable ? 1 : 0.7,
                }}
              >
                {/* Header de la carte */}
                <div
                  style={{
                    padding: '20px',
                    background: isUsable
                      ? 'linear-gradient(135deg, #F0F7FF 0%, #EFF6FF 100%)'
                      : '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '3px 9px',
                        borderRadius: '999px',
                        background: promo.distributionType === 'personal' ? '#FEF3C7' : '#EDE9FE',
                        color: promo.distributionType === 'personal' ? '#B45309' : '#6D28D9',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {promo.distributionType === 'personal' ? '★ Offre Personnelle' : '★ Offre Privilège'}
                    </span>

                    {/* Statut */}
                    {promo.isUsed ? (
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#059669', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                        ✔ Déjà utilisée
                      </span>
                    ) : promo.isExpired ? (
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: '6px' }}>
                        Expirée
                      </span>
                    ) : promo.isDepleted ? (
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                        Épuisée
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                        ● Disponible
                      </span>
                    )}
                  </div>

                  {/* Montant Réduction */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 900, color: isUsable ? '#0062FF' : '#64748B', letterSpacing: '-0.02em' }}>
                      {promo.discountType === 'percent' ? `-${promo.discountValue}%` : `-${promo.discountValue.toLocaleString('fr-FR')} FCFA`}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>
                      DE REMISE
                    </span>
                  </div>

                  <h3 style={{ margin: '6px 0 0 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                    {promo.name}
                  </h3>
                </div>

                {/* Corps de la carte */}
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    {/* Code promo à copier */}
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Votre code promotionnel :
                      </span>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: '#F1F5F9',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px dashed #94A3B8',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '14px', color: '#0062FF', letterSpacing: '0.04em' }}>
                          {promo.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          title="Copier le code"
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#0F172A',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Copy size={12} />
                          {copiedCode === promo.code ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    </div>

                    {/* Conditions & Formules */}
                    <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Crown size={14} color="#F59E0B" />
                        <span>Formules éligibles : <strong>{promo.eligiblePlans?.join(', ').toUpperCase() || 'PRO, BUSINESS'}</strong></span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="#64748B" />
                        <span>
                          {promo.validUntil
                            ? `Valable jusqu'au ${new Date(promo.validUntil).toLocaleDateString('fr-FR')}`
                            : 'Offre permanente sans expiration'}
                        </span>
                      </div>

                      {typeof promo.daysRemaining === 'number' && promo.daysRemaining >= 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: promo.daysRemaining <= 3 ? '#DC2626' : '#D97706', fontWeight: 700 }}>
                          <Clock size={14} />
                          <span>Il vous reste {promo.daysRemaining} jour(s) pour en profiter</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bouton d'action principal */}
                  {isUsable ? (
                    <button
                      onClick={() => handleApplyPromo(promo.code)}
                      style={{
                        width: '100%',
                        background: '#0062FF',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '10px',
                        fontWeight: 800,
                        fontSize: '13px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(0, 98, 255, 0.25)',
                      }}
                    >
                      <span>Profiter de cette offre</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <div
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        background: '#F1F5F9',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#64748B',
                      }}
                    >
                      {promo.isUsed ? 'Offre consommée sur votre compte' : 'Offre non disponible'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guide d'utilisation rapide */}
      <div
        style={{
          background: '#F8FAFC',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '24px',
        }}
      >
        <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={18} color="#0062FF" />
          Comment utiliser votre code promotionnel ?
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '13px', color: '#475569' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <strong style={{ background: '#0062FF', color: '#FFFFFF', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>1</strong>
            <span>Cliquez sur « Profiter de cette offre » ou copiez votre code.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <strong style={{ background: '#0062FF', color: '#FFFFFF', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>2</strong>
            <span>Choisissez votre formule (Pro ou Business) et votre fréquence de facturation.</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <strong style={{ background: '#0062FF', color: '#FFFFFF', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', flexShrink: 0 }}>3</strong>
            <span>Le code est pré-appliqué et la remise est immédiatement déduite du montant à régler.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
