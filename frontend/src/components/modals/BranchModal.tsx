import React, { useState } from 'react';
import { Store, Plus, X, AlertCircle, CheckCircle2, MapPin, Tag, Crown, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { CustomSelect, CustomSelectOption } from '../common/CustomSelect';

const PROFILE_OPTIONS: CustomSelectOption[] = [
  { value: 'epicerie_alimentation', label: 'Épicerie / Supérette', icon: '🏪' },
  { value: 'pret_a_porter', label: 'Prêt-à-porter / Boutique Vêtements', icon: '👗' },
  { value: 'friperie_vetements', label: "Friperie & Ballots d'importation", icon: '📦' },
  { value: 'cosmetiques_beaute', label: 'Cosmétiques & Parfumerie', icon: '💄' },
  { value: 'quincaillerie_materiaux', label: 'Quincaillerie & BTP', icon: '🔨' },
  { value: 'pharmacie_parapharmacie', label: 'Pharmacie & Santé', icon: '💊' },
  { value: 'restauration_fastfood', label: 'Restaurant / Maquis / Fast-food', icon: '🍽️' },
  { value: 'boulangerie_patisserie', label: 'Boulangerie / Pâtisserie', icon: '🥖' },
  { value: 'services_reparation', label: 'Atelier / Réparation / Sav', icon: '🔧' },
  { value: 'vente_en_ligne', label: 'Vente en ligne & E-commerce', icon: '🛍️' },
];

const CURRENCY_OPTIONS: CustomSelectOption[] = [
  { value: 'FCFA', label: 'FCFA (XOF / XAF)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dollar ($)' },
  { value: 'GNF', label: 'Franc Guinéen (GNF)' },
  { value: 'CDF', label: 'Franc Congolais (CDF)' },
];

const TRACKING_OPTIONS: CustomSelectOption[] = [
  { value: 'avec_stock', label: 'Avec gestion des stocks & alertes', icon: '📦' },
  { value: 'complet', label: 'Complet (Stock + Dettes clients)', icon: '💎' },
  { value: 'simple', label: 'Simple (Ventes & Dépenses rapides)', icon: '⚡' },
];

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchCreated?: () => void;
}

export const BranchModal: React.FC<BranchModalProps> = ({ isOpen, onClose, onBranchCreated }) => {
  const navigate = useNavigate();
  const { user, fetchMe, setActiveBusinessId } = useAuthStore();
  const isBusiness = Boolean(user?.isAdmin || (user?.subscription?.planName === 'business' && user?.subscription?.status === 'active'));

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
          overflow: 'visible',
          position: 'relative',
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
            borderTopLeftRadius: '18px',
            borderTopRightRadius: '18px',
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
                Multi-points de vente (Exclusivité Formule Business)
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

        {/* Business Plan Gate */}
        {!isBusiness ? (
          <div style={{ padding: '28px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.35)',
              }}
            >
              <Crown size={32} />
            </div>

            <span
              style={{
                display: 'inline-block',
                background: '#FDF4FF',
                color: '#C026D3',
                border: '1px solid #F0ABFC',
                padding: '3px 12px',
                borderRadius: '999px',
                fontSize: '0.74rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                marginBottom: '10px',
                textTransform: 'uppercase',
              }}
            >
              Formule Business Requise
            </span>

            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Multi-Boutiques & Succursales Illimitées
            </h4>

            <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.55, maxWidth: '440px', margin: '0 auto 20px' }}>
              La gestion simultanée de plusieurs points de vente, annexes ou dépôts avec stocks séparés et bascule instantanée en 1 clic est <strong>exclusivement réservée à la Formule BUSINESS</strong>.
            </p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                Ce que débloque la Formule Business :
              </div>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.7 }}>
                <li><strong>Points de vente illimités</strong> (Boutiques, Dépôts, Annexes, Stands).</li>
                <li><strong>Isolation étanche des caisses</strong> et des stocks par succursale.</li>
                <li><strong>Comptes caissiers illimités</strong> avec codes PIN dédiés.</li>
                <li><strong>Copilote IA & Analyses consolidées</strong> de tout votre réseau.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '11px 18px',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/subscription');
                }}
                style={{
                  padding: '11px 22px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
                }}
              >
                <span>Passer à la Formule Business</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Form Body */
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
              <CustomSelect
                value={profileId}
                onChange={setProfileId}
                options={PROFILE_OPTIONS}
              />
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
              <CustomSelect
                value={currency}
                onChange={setCurrency}
                options={CURRENCY_OPTIONS}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Suivi du Stock
              </label>
              <CustomSelect
                value={trackingMode}
                onChange={setTrackingMode}
                options={TRACKING_OPTIONS}
              />
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
        )}
      </div>
    </div>
  );
};
