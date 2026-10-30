import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Check,
  Store,
  Layers,
  Coins,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { BUSINESS_PROFILES, getBusinessProfile } from '../../config/businessProfiles';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';

interface TradeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TradeConfigModal: React.FC<TradeConfigModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, activeBusinessId, updateUser } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];

  const [selectedProfileId, setSelectedProfileId] = useState<string>(activeBusiness?.profileId || 'epicerie_alimentation');
  const [selectedCurrency, setSelectedCurrency] = useState<string>(activeBusiness?.currency || 'FCFA');
  const [selectedTrackingMode, setSelectedTrackingMode] = useState<string>(activeBusiness?.trackingMode || 'complet');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentProfile = getBusinessProfile(selectedProfileId);
  const isPro = Boolean(user?.isAdmin || (user?.subscription?.isPro && user?.subscription?.status === 'active'));

  const handleSave = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await api.put(
        '/business/profile',
        {
          profileId: selectedProfileId,
          currency: selectedCurrency,
          trackingMode: selectedTrackingMode,
          activeModules: currentProfile.recommendedModules,
        }
      );

      // Mettre à jour l'état local dans authStore
      if (user) {
        const updatedBusinesses = (user.businesses || []).map((b: any) => {
          if (b.id === activeBusiness?.id) {
            return {
              ...b,
              profileId: selectedProfileId,
              currency: selectedCurrency,
              trackingMode: selectedTrackingMode,
              activeModules: currentProfile.recommendedModules,
            };
          }
          return b;
        });
        updateUser({ businesses: updatedBusinesses });
      }

      setMessage('Profil et interface métier appliqués avec succès !');
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
        window.location.reload(); // Recharger pour rafraîchir toutes les terminologies
      }, 700);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Erreur lors de la mise à jour du profil métier.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
            color: '#FFFFFF',
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
                background: 'linear-gradient(135deg, #FF6B00 0%, #FFA500 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
              }}
            >
              {currentProfile.emoji}
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#FFFFFF' }}>
                Configuration & Métier COMMERCIA
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                Personnalisez instantanément votre navigation, vos libellés et vos indicateurs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {message && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: message.includes('succès') ? '#ECFDF5' : '#FEF2F2',
                color: message.includes('succès') ? '#065F46' : '#991B1B',
                fontSize: '0.86rem',
                fontWeight: 600,
              }}
            >
              {message}
            </div>
          )}

          {/* 1. Sélection du profil métier */}
          <div>
            <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
              1. Choisissez votre secteur d'activité (20 Métiers Configurés)
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '10px',
                maxHeight: '260px',
                overflowY: 'auto',
                padding: '4px',
              }}
            >
              {Object.values(BUSINESS_PROFILES).map((p: any) => {
                const isSelected = p.id === selectedProfileId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    style={{
                      border: isSelected ? '2px solid #0062FF' : '1.5px solid #E2E8F0',
                      background: isSelected ? '#EFF6FF' : '#FFFFFF',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{p.emoji}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: isSelected ? '#1E40AF' : '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.family || p.name}
                      </div>
                    </div>
                    {isSelected && <Check size={16} color="#0062FF" style={{ flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Aperçu de la personnalisation appliquée */}
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.1rem' }}>{currentProfile.emoji}</span>
              <strong style={{ fontSize: '0.88rem', color: '#0F172A' }}>
                Vocabulaire & Modules pour « {currentProfile.name} » :
              </strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', fontSize: '0.78rem' }}>
              <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B' }}>Menu Ventes : </span>
                <strong style={{ color: '#0F172A' }}>{currentProfile.terminology.salesNav}</strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B' }}>Menu Stock : </span>
                <strong style={{ color: '#0F172A' }}>{currentProfile.terminology.inventoryNav}</strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B' }}>Menu Dépenses : </span>
                <strong style={{ color: '#0F172A' }}>{currentProfile.terminology.expenseNav}</strong>
              </div>
              <div style={{ background: '#FFFFFF', padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                <span style={{ color: '#64748B' }}>Bouton Action : </span>
                <strong style={{ color: '#0F172A' }}>{currentProfile.terminology.quickActionSale}</strong>
              </div>
            </div>
          </div>

          {/* 2. Devise & Mode de Pilotage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                2. Devise monétaire
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="FCFA">FCFA (XOF / XAF)</option>
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar ($)</option>
                <option value="GNF">Franc Guinéen (GNF)</option>
                <option value="CDF">Franc Congolais (CDF)</option>
                <option value="MGA">Ariary Malgache (MGA)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', marginBottom: '6px' }}>
                3. Mode de pilotage
              </label>
              <select
                value={selectedTrackingMode}
                onChange={(e) => setSelectedTrackingMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  background: '#FFFFFF',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              >
                <option value="complet">🚀 Mode Intégral (Stock + Crédits + Caisse)</option>
                <option value="avec_stock">📦 Mode Stock & Alertes (Sans crédit)</option>
                <option value="simple">⚡ Mode Simplifié (Ventes express sans stock)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #E2E8F0',
            background: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Plan actuel : <strong>{isPro ? 'COMMERCIA PRO' : 'VERSION GRATUITE'}</strong>
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#475569',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                padding: '9px 22px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #0062FF 0%, #004ecc 100%)',
                color: '#FFFFFF',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 98, 255, 0.3)',
              }}
            >
              {loading ? 'Application...' : 'Appliquer à mon espace'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
