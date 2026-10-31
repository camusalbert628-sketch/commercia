import React, { useState } from 'react';
import { Store, Plus, X, AlertCircle, CheckCircle2, MapPin, Tag } from 'lucide-react';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchCreated?: () => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({ isOpen, onClose, onBranchCreated }) => {
  const { fetchMe, setActiveBusinessId } = useAuthStore();
  const [name, setName] = useState('');
  const [sector, setSector] = useState('commerce');
  const [profileId, setProfileId] = useState('epicerie_alimentation');
  const [city, setCity] = useState('');
  const [currency, setCurrency] = useState('FCFA');
  const [trackingMode, setTrackingMode] = useState('avec_stock');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const res = await api.post<any>('/business/branches', {
        name,
        sector,
        profileId,
        city,
        currency,
        trackingMode,
      });

      setSuccess(res.message || 'Nouvelle boutique créée avec succès ! 🎉');
      await fetchMe();

      if (res.business?.id) {
        setActiveBusinessId(res.business.id);
      }

      setTimeout(() => {
        onClose();
        if (onBranchCreated) onBranchCreated();
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Impossible de créer la boutique. Vérifiez votre abonnement.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: '#0062FF',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Store size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                Nouvelle Boutique / Succursale
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                Multi-points de vente (Forfait Business & Pro)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '10px',
                color: '#991B1B',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '12px 16px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '10px',
                color: '#065F46',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Nom de la boutique ou succursale *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Boutique Centre-ville, Dépôt Plateau, Annexe 2..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Profil / Métier
              </label>
              <select
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#FFFFFF' }}
              >
                <option value="epicerie_alimentation">🏪 Épicerie / Supérette</option>
                <option value="pret_a_porter">👗 Prêt-à-porter / Boutique Vêtements</option>
                <option value="friperie_vetements">📦 Friperie & Ballots d'importation</option>
                <option value="cosmetiques_beaute">💄 Cosmétiques & Parfumerie</option>
                <option value="quincaillerie_materiaux">🔨 Quincaillerie & BTP</option>
                <option value="pharmacie_parapharmacie">💊 Pharmacie & Santé</option>
                <option value="restauration_fastfood">🍽️ Restaurant / Maquis / Fast-food</option>
                <option value="boulangerie_patisserie">🥖 Boulangerie / Pâtisserie</option>
                <option value="services_reparation">🔧 Atelier / Réparation / Sav</option>
                <option value="vente_en_ligne">🛍️ Vente en ligne & E-commerce</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Ville / Emplacement
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Dakar, Abidjan, Douala..."
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Devise Monétaire
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#FFFFFF' }}
              >
                <option value="FCFA">FCFA (XOF / XAF)</option>
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar ($)</option>
                <option value="GNF">Franc Guinéen (GNF)</option>
                <option value="CDF">Franc Congolais (CDF)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Suivi du Stock
              </label>
              <select
                value={trackingMode}
                onChange={(e) => setTrackingMode(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '0.85rem', background: '#FFFFFF' }}
              >
                <option value="avec_stock">📦 Avec gestion des stocks & alertes</option>
                <option value="complet">💎 Complet (Stock + Dettes clients)</option>
                <option value="simple">⚡ Simple (Ventes & Dépenses rapides)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                background: 'white',
                color: '#475569',
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: '#0062FF',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Création en cours...' : 'Créer la boutique'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
