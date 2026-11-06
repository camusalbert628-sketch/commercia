import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Tag,
  Percent,
  Coins,
  Users,
  User,
  Globe,
  Calendar,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Gift,
  Layers,
  Eye,
  X,
  Copy,
  PauseCircle,
  PlayCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  CheckSquare,
  Square,
  DollarSign,
} from 'lucide-react';
import { api } from '../../services/api';

interface PromosViewProps {
  adminTheme: 'light' | 'dark';
}

interface MerchantUser {
  id: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  businessName: string;
  plan: string;
  accountStatus?: string;
  isSuspended?: boolean;
  createdAt: string;
}

interface PromoCampaign {
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
  maxUses?: number;
  maxUsesPerUser?: number;
  eligiblePlans?: string[];
  allowNew?: boolean;
  allowRenewal?: boolean;
  isActive: boolean;
  status: 'active' | 'expired' | 'depleted' | 'disabled';
  createdAt: string;
  beneficiariesCount: number;
  beneficiaries?: Array<{
    id: string;
    userId: string;
    usedAt: string | null;
    createdAt: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      companyName?: string;
    };
  }>;
  redemptionsCount: number;
  remainingUses: number | null;
  totalDiscountGiven: number;
  redemptions?: Array<{
    id: string;
    userId: string;
    discountAmount: number;
    finalAmount: number;
    createdAt: string;
    user?: {
      email: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

export const PromosView: React.FC<PromosViewProps> = ({ adminTheme }) => {
  const isLight = adminTheme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderCol = isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#0F172A' : '#FFFFFF';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';

  // Liste des campagnes & chargement
  const [promos, setPromos] = useState<PromoCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'personal' | 'group' | 'broadcast'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'disabled'>('all');

  // Modale de création
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [distributionMode, setDistributionMode] = useState<'personal' | 'group' | 'broadcast'>('personal');

  // Formulaire de création
  const [campaignName, setCampaignName] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
  const [maxDiscountCap, setMaxDiscountCap] = useState<number | ''>('');
  const [validFrom, setValidFrom] = useState(new Date().toISOString().split('T')[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [maxUses, setMaxUses] = useState<number>(100);
  const [maxUsesPerUser, setMaxUsesPerUser] = useState<number>(1);
  const [eligiblePlans, setEligiblePlans] = useState<string[]>(['pro', 'business']);
  const [allowNew, setAllowNew] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);

  // Destinataires réels pour ciblage personnel / groupé
  const [merchants, setMerchants] = useState<MerchantUser[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [merchantSearch, setMerchantSearch] = useState('');
  const [merchantPlanFilter, setMerchantPlanFilter] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Confirmation mode broadcast
  const [showBroadcastWarning, setShowBroadcastWarning] = useState(false);

  // Modale de détails / audit de campagne
  const [inspectPromo, setInspectPromo] = useState<PromoCampaign | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Charger les campagnes promo
  const loadPromos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success?: boolean; promos?: any[] }>('/admin/promos');
      const list = Array.isArray(res) ? res : res?.promos || [];
      const normalized: PromoCampaign[] = list.map((p: any) => ({
        id: p.id || '',
        code: p.code || '',
        name: p.name || `Campagne ${p.code || ''}`,
        discountType: p.discountType || 'percent',
        discountValue: Number(p.discountValue || 0),
        distributionType: p.distributionType || 'broadcast',
        minOrderAmount: Number(p.minOrderAmount || 0),
        maxDiscountCap: p.maxDiscountCap ? Number(p.maxDiscountCap) : (p.maxDiscount ? Number(p.maxDiscount) : null),
        validFrom: p.validFrom || null,
        validUntil: p.validUntil || null,
        maxUses: p.maxUses !== undefined ? Number(p.maxUses) : 100,
        maxUsesPerUser: p.maxUsesPerUser ? Number(p.maxUsesPerUser) : 1,
        eligiblePlans: p.eligiblePlans || p.applicablePlans || ['pro', 'business'],
        allowNew: p.allowNew !== false,
        allowRenewal: p.allowRenewal !== false,
        isActive: Boolean(p.isActive),
        status: p.status || (p.statusText === 'Actif' ? 'active' : p.statusText === 'Expiré' ? 'expired' : 'active'),
        createdAt: p.createdAt || new Date().toISOString(),
        beneficiariesCount: Number(p.beneficiariesCount ?? (p.beneficiaries?.length || p.beneficiariesList?.length || 0)),
        beneficiaries: p.beneficiaries || p.beneficiariesList || [],
        redemptionsCount: Number(p.redemptionsCount ?? (p.currentUses || p.redemptions?.length || p.redemptionsList?.length || 0)),
        remainingUses: p.remainingUses !== undefined ? Number(p.remainingUses) : null,
        totalDiscountGiven: Number(p.totalDiscountGiven ?? p.stats?.totalDiscountsGiven ?? 0),
        redemptions: (p.redemptions || p.redemptionsList || []).map((r: any) => ({
          ...r,
          discountAmount: Number(r.discountAmount || 0),
          finalAmount: Number(r.finalAmount || 0),
        })),
      }));
      setPromos(normalized);
    } catch (err: any) {
      console.error('Erreur chargement promos:', err);
      setPromos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Charger les marchands réels en base
  const loadMerchants = useCallback(async () => {
    setLoadingMerchants(true);
    try {
      const res = await api.get<{ users?: MerchantUser[] }>('/admin/communication/users');
      const list = Array.isArray(res) ? res : res?.users || [];
      setMerchants(list);
    } catch (err: any) {
      console.error('Erreur chargement marchands:', err);
      setMerchants([]);
    } finally {
      setLoadingMerchants(false);
    }
  }, []);

  useEffect(() => {
    loadPromos();
    loadMerchants();
  }, [loadPromos, loadMerchants]);

  // Filtrage local des marchands
  const filteredMerchants = useMemo(() => {
    if (!Array.isArray(merchants)) return [];
    return merchants.filter((u) => {
      if (!u) return false;
      const planStr = (u.plan || '').toLowerCase();
      if (merchantPlanFilter !== 'all' && planStr !== merchantPlanFilter.toLowerCase()) {
        return false;
      }
      if (!merchantSearch.trim()) return true;
      const q = merchantSearch.toLowerCase();
      return (
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.businessName || '').toLowerCase().includes(q) ||
        (u.id || '').toLowerCase().includes(q) ||
        Boolean(u.phone && u.phone.includes(q))
      );
    });
  }, [merchants, merchantSearch, merchantPlanFilter]);

  // Générateur automatique de code promo
  const handleGenerateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const prefix = discountType === 'percent' ? `COMMERCIA-${discountValue}P` : `COMMERCIA-${discountValue}`;
    setPromoCodeInput(`${prefix}-${rand}`);
  };

  // Réinitialiser le formulaire de création
  const resetCreateForm = () => {
    setCampaignName('');
    setPromoCodeInput('');
    setDiscountType('percent');
    setDiscountValue(20);
    setMinOrderAmount(0);
    setMaxDiscountCap('');
    setValidFrom(new Date().toISOString().split('T')[0]);
    setValidUntil(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setMaxUses(100);
    setMaxUsesPerUser(1);
    setEligiblePlans(['pro', 'business']);
    setAllowNew(true);
    setAllowRenewal(true);
    setSelectedUserIds([]);
    setDistributionMode('personal');
    setShowBroadcastWarning(false);
  };

  // Soumission de création
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!campaignName.trim()) {
      alert('Veuillez donner un nom à la campagne promotionnelle.');
      return;
    }

    const finalCode = promoCodeInput.trim().toUpperCase();
    if (!finalCode) {
      alert('Veuillez renseigner ou générer un code promotionnel.');
      return;
    }

    if (discountValue <= 0) {
      alert('La valeur de la réduction doit être strictement supérieure à 0.');
      return;
    }

    if (discountType === 'percent' && discountValue > 100) {
      alert('Un pourcentage de réduction ne peut pas excéder 100%.');
      return;
    }

    if (distributionMode === 'personal' && selectedUserIds.length !== 1) {
      alert('Pour le Mode A (Personnel), veuillez sélectionner exactement 1 commerçant bénéficiaire.');
      return;
    }

    if (distributionMode === 'group' && selectedUserIds.length === 0) {
      alert('Pour le Mode B (Groupé), veuillez cocher au moins un commerçant bénéficiaire.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        code: finalCode,
        name: campaignName.trim(),
        discountType,
        discountValue: Number(discountValue),
        distributionType: distributionMode,
        userIds: distributionMode === 'broadcast' ? [] : selectedUserIds,
        minOrderAmount: Number(minOrderAmount) || 0,
        maxDiscountCap: maxDiscountCap ? Number(maxDiscountCap) : null,
        validFrom: validFrom ? new Date(validFrom).toISOString() : undefined,
        validUntil: validUntil ? new Date(validUntil + 'T23:59:59.999Z').toISOString() : null,
        maxUses: distributionMode === 'personal' ? 1 : Number(maxUses),
        maxUsesPerUser: Number(maxUsesPerUser),
        eligiblePlans,
        allowNew,
        allowRenewal,
      };

      const res = await api.post<{ success: boolean; promo: PromoCampaign; message: string }>('/admin/promos', payload);
      showToast(res.message || 'Campagne promotionnelle créée avec succès !');
      setShowCreateModal(false);
      resetCreateForm();
      loadPromos();
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la création de la campagne.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Activer / Désactiver une campagne
  const handleToggleActive = async (promo: PromoCampaign) => {
    try {
      await api.put(`/admin/promos/${promo.id}`, {
        isActive: !promo.isActive,
      });
      showToast(`Campagne ${!promo.isActive ? 'réactivée' : 'désactivée'} avec succès.`);
      loadPromos();
    } catch (err: any) {
      alert(err.message || 'Erreur modification statut');
    }
  };

  // Supprimer une campagne
  const handleDeletePromo = async (promo: PromoCampaign) => {
    const confirmMsg = promo.redemptionsCount > 0
      ? `Cette campagne a déjà ${promo.redemptionsCount} utilisation(s) réelle(s). Elle sera archivée et désactivée pour préserver l'historique comptable. Confirmer ?`
      : `Êtes-vous sûr de vouloir supprimer définitivement le code "${promo.code}" ?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/admin/promos/${promo.id}`);
      showToast('Campagne promotionnelle supprimée / archivée.');
      loadPromos();
      if (inspectPromo?.id === promo.id) setInspectPromo(null);
    } catch (err: any) {
      alert(err.message || 'Erreur suppression campagne');
    }
  };

  // Statistiques agrégées
  const stats = useMemo(() => {
    const list = Array.isArray(promos) ? promos : [];
    const totalCampagnes = list.length;
    const actives = list.filter((p) => p && (p.status === 'active' || (p as any).statusText === 'Actif') && p.isActive).length;
    const totalRedemptions = list.reduce((acc, p) => acc + Number(p?.redemptionsCount || 0), 0);
    const totalEconomies = list.reduce((acc, p) => acc + Number(p?.totalDiscountGiven || 0), 0);
    return { totalCampagnes, actives, totalRedemptions, totalEconomies };
  }, [promos]);

  // Filtrage des campagnes affichées
  const filteredPromos = useMemo(() => {
    if (!Array.isArray(promos)) return [];
    return promos.filter((p) => {
      if (!p) return false;
      if (filterType !== 'all' && p.distributionType !== filterType) return false;
      if (filterStatus !== 'all') {
        const isActiveState = (p.status === 'active' || (p as any).statusText === 'Actif') && p.isActive;
        if (filterStatus === 'active' && !isActiveState) return false;
        if (filterStatus === 'expired' && p.status !== 'expired' && (p as any).statusText !== 'Expiré') return false;
        if (filterStatus === 'disabled' && p.isActive) return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        Boolean(p.name && p.name.toLowerCase().includes(q)) ||
        Boolean(p.code && p.code.toLowerCase().includes(q)) ||
        Boolean(p.distributionType && p.distributionType.toLowerCase().includes(q))
      );
    });
  }, [promos, filterType, filterStatus, searchQuery]);

  return (
    <div>
      {/* Toast de notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '13px',
          }}
        >
          <CheckCircle size={18} />
          {toastMessage}
        </div>
      )}

      {/* En-tête du module */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: textPrimary, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tag size={22} color="#0062FF" />
            Codes Promo & Offres Promotionnelles
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Orchestration des remises, ciblage chirurgical (Personnel, Groupé, Général) et audit en temps réel des redemptions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              loadPromos();
              loadMerchants();
            }}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 15px',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              background: isLight ? '#FFFFFF' : '#1E293B',
              color: textPrimary,
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            style={{
              background: '#0062FF',
              color: '#FFFFFF',
              border: 'none',
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0, 98, 255, 0.3)',
            }}
          >
            <Plus size={16} />
            Créer une Offre Promotionnelle
          </button>
        </div>
      </div>

      {/* Cartes KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: textSecondary, textTransform: 'uppercase' }}>
              CAMPAGNES ACTIVES
            </span>
            <Sparkles size={16} color="#0062FF" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textPrimary }}>
            {stats.actives} <span style={{ fontSize: '14px', fontWeight: 600, color: textSecondary }}>/ {stats.totalCampagnes} total</span>
          </div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: textSecondary, textTransform: 'uppercase' }}>
              RÉDUCTIONS CONSENTIES
            </span>
            <DollarSign size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981' }}>
            {Number(stats.totalEconomies || 0).toLocaleString('fr-FR')} <span style={{ fontSize: '14px', fontWeight: 700 }}>FCFA</span>
          </div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: textSecondary, textTransform: 'uppercase' }}>
              UTILISATIONS RÉELLES
            </span>
            <CheckCircle size={16} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textPrimary }}>
            {Number(stats.totalRedemptions || 0)} <span style={{ fontSize: '13px', fontWeight: 600, color: textSecondary }}>abonnements débloqués</span>
          </div>
        </div>

        <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: textSecondary, textTransform: 'uppercase' }}>
              MARCHANDS EN BASE
            </span>
            <Users size={16} color="#F59E0B" />
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: textPrimary }}>
            {merchants.length} <span style={{ fontSize: '13px', fontWeight: 600, color: textSecondary }}>comptes réels</span>
          </div>
        </div>
      </div>

      {/* Barre d'outils et filtres */}
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', width: '100%', maxWidth: '340px' }}>
            <Search size={15} color="#94A3B8" />
            <input
              type="text"
              placeholder="Rechercher par nom de campagne, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12.5px', width: '100%', color: textPrimary }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'personal', label: 'Mode A : Personnel' },
              { id: 'group', label: 'Mode B : Groupé' },
              { id: 'broadcast', label: 'Mode C : Général' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id as any)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: filterType === t.id ? '#0062FF' : isLight ? '#F1F5F9' : '#1E293B',
                  color: filterType === t.id ? '#FFFFFF' : textSecondary,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: 'Tous statuts' },
            { id: 'active', label: 'Actives' },
            { id: 'expired', label: 'Expirées' },
            { id: 'disabled', label: 'Désactivées' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setFilterStatus(s.id as any)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                background: filterStatus === s.id ? (isLight ? '#0F172A' : '#334155') : 'transparent',
                color: filterStatus === s.id ? '#FFFFFF' : textSecondary,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau de suivi des campagnes promotionnelles */}
      <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 10px' }} />
            Chargement des offres promotionnelles...
          </div>
        ) : filteredPromos.length === 0 ? (
          <div style={{ padding: '50px 20px', textAlign: 'center' }}>
            <Gift size={36} color="#94A3B8" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: textPrimary, fontWeight: 800 }}>
              Aucune campagne promotionnelle correspondante
            </h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: textSecondary }}>
              Cliquez sur « Créer une Offre Promotionnelle » pour octroyer une réduction personnelle, groupée ou générale.
            </p>
            <button
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              style={{
                background: '#0062FF',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Nouvelle Campagne
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${borderCol}`, color: textSecondary }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800 }}>CAMPAGNE & CODE</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800 }}>CIBLAGE & MODE</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800 }}>RÉDUCTION</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800 }}>PÉRIODE DE VALIDITÉ</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800 }}>BÉNÉFICIAIRES</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800 }}>UTILISATIONS</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800 }}>ÉCONOMIE TOTALE</th>
                  <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800 }}>STATUT</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 800, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromos.map((p) => {
                  const isExpired = p.validUntil && new Date(p.validUntil) < new Date();
                  const isDepleted = p.maxUses && p.redemptionsCount >= p.maxUses;
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: `1px solid ${borderCol}`,
                        background: !p.isActive ? (isLight ? '#F8FAFC' : 'rgba(255,255,255,0.01)') : 'transparent',
                        opacity: !p.isActive ? 0.75 : 1,
                      }}
                    >
                      {/* Campagne & Code */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: textPrimary, fontSize: '13px' }}>
                          {p.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 900,
                              fontSize: '11.5px',
                              background: isLight ? '#EFF6FF' : 'rgba(0,98,255,0.15)',
                              color: '#0062FF',
                              padding: '2px 7px',
                              borderRadius: '4px',
                            }}
                          >
                            {p.code}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(p.code);
                              showToast(`Code "${p.code}" copié !`);
                            }}
                            title="Copier le code"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textSecondary, padding: 0 }}
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </td>

                      {/* Distribution / Mode */}
                      <td style={{ padding: '12px 14px' }}>
                        {p.distributionType === 'personal' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: isLight ? '#FEF3C7' : 'rgba(245,158,11,0.15)', color: '#D97706', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                            <User size={13} /> Personnel (1)
                          </span>
                        )}
                        {p.distributionType === 'group' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: isLight ? '#EDE9FE' : 'rgba(139,92,246,0.15)', color: '#7C3AED', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                            <Users size={13} /> Groupé ({p.beneficiariesCount})
                          </span>
                        )}
                        {p.distributionType === 'broadcast' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: isLight ? '#EFF6FF' : 'rgba(0,98,255,0.15)', color: '#0062FF', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                            <Globe size={13} /> Général (Tous)
                          </span>
                        )}
                      </td>

                      {/* Valeur Réduction */}
                      <td style={{ padding: '12px 14px' }}>
                        <strong style={{ fontSize: '13.5px', color: '#10B981', fontWeight: 900 }}>
                          {p.discountType === 'percent' ? `-${p.discountValue}%` : `-${Number(p.discountValue || 0).toLocaleString('fr-FR')} FCFA`}
                        </strong>
                        {p.maxDiscountCap ? (
                          <div style={{ fontSize: '10.5px', color: textSecondary, marginTop: '2px' }}>
                            Plafond : {Number(p.maxDiscountCap || 0).toLocaleString('fr-FR')} FCFA
                          </div>
                        ) : null}
                      </td>

                      {/* Dates */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: '11.5px', color: textPrimary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} color="#94A3B8" />
                          {p.validUntil ? new Date(p.validUntil).toLocaleDateString('fr-FR') : 'Sans expiration'}
                        </div>
                        <div style={{ fontSize: '10.5px', color: isExpired ? '#EF4444' : textSecondary, marginTop: '2px' }}>
                          {isExpired ? 'Expiré' : p.validUntil ? 'En cours' : 'Illimité'}
                        </div>
                      </td>

                      {/* Bénéficiaires */}
                      <td style={{ padding: '12px 14px' }}>
                        {p.distributionType === 'broadcast' ? (
                          <span style={{ color: textSecondary, fontSize: '11.5px' }}>Tous marchands</span>
                        ) : (
                          <span style={{ fontWeight: 800, color: textPrimary, fontSize: '12.5px' }}>
                            {Number(p.beneficiariesCount || 0)} commerçant(s)
                          </span>
                        )}
                      </td>

                      {/* Utilisations */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: textPrimary }}>{Number(p.redemptionsCount || 0)}</span>
                          <span style={{ color: textSecondary }}>/ {p.maxUses ? p.maxUses : '∞'}</span>
                        </div>
                        {p.maxUses ? (
                          <div style={{ width: '60px', height: '4px', background: isLight ? '#E2E8F0' : '#334155', borderRadius: '2px', marginTop: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${Math.min(100, (Number(p.redemptionsCount || 0) / p.maxUses) * 100)}%`,
                                height: '100%',
                                background: Number(p.redemptionsCount || 0) >= p.maxUses ? '#EF4444' : '#0062FF',
                              }}
                            />
                          </div>
                        ) : null}
                      </td>

                      {/* Économie consentie */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontWeight: 800, color: Number(p.totalDiscountGiven || 0) > 0 ? '#10B981' : textSecondary }}>
                          {Number(p.totalDiscountGiven || 0).toLocaleString('fr-FR')} FCFA
                        </span>
                      </td>

                      {/* Statut */}
                      <td style={{ padding: '12px 14px' }}>
                        {!p.isActive ? (
                          <span style={{ background: isLight ? '#F1F5F9' : '#1E293B', color: textSecondary, fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                            DÉSACTIVÉ
                          </span>
                        ) : isExpired ? (
                          <span style={{ background: '#FEE2E2', color: '#DC2626', fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                            EXPIRÉ
                          </span>
                        ) : isDepleted ? (
                          <span style={{ background: '#FEF3C7', color: '#D97706', fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                            ÉPUISÉ
                          </span>
                        ) : (
                          <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10.5px', fontWeight: 800, padding: '2px 7px', borderRadius: '4px' }}>
                            ● ACTIF
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            onClick={() => setInspectPromo(p)}
                            title="Voir les détails et bénéficiaires"
                            style={{
                              background: isLight ? '#EFF6FF' : 'rgba(0,98,255,0.1)',
                              color: '#0062FF',
                              border: 'none',
                              padding: '6px 9px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Eye size={13} /> Détails
                          </button>

                          <button
                            onClick={() => handleToggleActive(p)}
                            title={p.isActive ? 'Désactiver temporairement' : 'Réactiver'}
                            style={{
                              background: 'transparent',
                              border: `1px solid ${borderCol}`,
                              color: p.isActive ? '#D97706' : '#10B981',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            {p.isActive ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                          </button>

                          <button
                            onClick={() => handleDeletePromo(p)}
                            title="Supprimer la campagne"
                            style={{
                              background: 'transparent',
                              border: `1px solid ${borderCol}`,
                              color: '#EF4444',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
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

      {/* MODALE DE CRÉATION DE CODE PROMO (MODES A, B, C) */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: '16px',
              border: `1px solid ${borderCol}`,
              maxWidth: '820px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header modal */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${borderCol}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: textPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={20} color="#0062FF" />
                  Nouvelle Offre Promotionnelle
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: textSecondary }}>
                  Configurez le ciblage, la formule de réduction et les règles d'utilisation de votre offre.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: textSecondary, cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} style={{ padding: '24px' }}>
              {/* ÉTAPE 1 : CHOIX DU MODE DE DISTRIBUTION */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: textPrimary, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Mode de distribution de l'offre
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {/* Mode A */}
                  <div
                    onClick={() => {
                      setDistributionMode('personal');
                      setSelectedUserIds([]);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: `2px solid ${distributionMode === 'personal' ? '#0062FF' : borderCol}`,
                      background: distributionMode === 'personal' ? (isLight ? '#EFF6FF' : 'rgba(0,98,255,0.12)') : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13px', color: textPrimary, marginBottom: '4px' }}>
                      <User size={16} color="#0062FF" />
                      Mode A : Personnel
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: textSecondary }}>
                      Réservé exclusivement à 1 commerçant précis en base.
                    </p>
                  </div>

                  {/* Mode B */}
                  <div
                    onClick={() => {
                      setDistributionMode('group');
                      setSelectedUserIds([]);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: `2px solid ${distributionMode === 'group' ? '#7C3AED' : borderCol}`,
                      background: distributionMode === 'group' ? (isLight ? '#FAF5FF' : 'rgba(124,58,237,0.12)') : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13px', color: textPrimary, marginBottom: '4px' }}>
                      <Users size={16} color="#7C3AED" />
                      Mode B : Groupé
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: textSecondary }}>
                      Sélection multiple de plusieurs commerçants ciblés.
                    </p>
                  </div>

                  {/* Mode C */}
                  <div
                    onClick={() => {
                      setDistributionMode('broadcast');
                      setSelectedUserIds([]);
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: `2px solid ${distributionMode === 'broadcast' ? '#D97706' : borderCol}`,
                      background: distributionMode === 'broadcast' ? (isLight ? '#FFFBEB' : 'rgba(217,119,6,0.12)') : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '13px', color: textPrimary, marginBottom: '4px' }}>
                      <Globe size={16} color="#D97706" />
                      Mode C : Général
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: textSecondary }}>
                      Distribué à tous les utilisateurs éligibles ({merchants.length}).
                    </p>
                  </div>
                </div>
              </div>

              {/* SÉLECTEUR DE MARCHANDS POUR MODE A & B */}
              {(distributionMode === 'personal' || distributionMode === 'group') && (
                <div style={{ marginBottom: '22px', padding: '16px', borderRadius: '12px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: textPrimary, textTransform: 'uppercase' }}>
                      {distributionMode === 'personal'
                        ? 'Sélectionner le commerçant bénéficiaire unique'
                        : `Cocher les commerçants bénéficiaires (${selectedUserIds.length} sélectionné(s))`}
                    </span>
                    {distributionMode === 'group' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedUserIds(filteredMerchants.map((m) => m.id))}
                          style={{ background: 'transparent', border: 'none', color: '#0062FF', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Tous filtrés ({filteredMerchants.length})
                        </button>
                        <span style={{ color: textSecondary, fontSize: '11px' }}>•</span>
                        <button
                          type="button"
                          onClick={() => setSelectedUserIds([])}
                          style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Effacer
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Recherche commerçant */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', border: `1px solid ${borderCol}`, background: cardBg }}>
                      <Search size={14} color="#94A3B8" />
                      <input
                        type="text"
                        placeholder="Rechercher par nom, email, boutique, ID..."
                        value={merchantSearch}
                        onChange={(e) => setMerchantSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '12px', width: '100%', color: textPrimary }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['all', 'free', 'pro', 'business'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setMerchantPlanFilter(p)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            background: merchantPlanFilter === p ? '#0062FF' : (isLight ? '#E2E8F0' : '#1E293B'),
                            color: merchantPlanFilter === p ? '#FFFFFF' : textSecondary,
                            textTransform: 'capitalize',
                          }}
                        >
                          {p === 'all' ? 'Tous' : p}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Liste marchands défilable */}
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {loadingMerchants ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: textSecondary, fontSize: '12px' }}>
                        Chargement des commerçants réels...
                      </div>
                    ) : filteredMerchants.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: textSecondary, fontSize: '12px' }}>
                        Aucun commerçant trouvé.
                      </div>
                    ) : (
                      filteredMerchants.map((m) => {
                        const isSelected = selectedUserIds.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (distributionMode === 'personal') {
                                setSelectedUserIds([m.id]);
                              } else {
                                setSelectedUserIds((prev) =>
                                  prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                );
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              borderRadius: '8px',
                              marginBottom: '5px',
                              cursor: 'pointer',
                              border: `1px solid ${isSelected ? '#0062FF' : borderCol}`,
                              background: isSelected ? (isLight ? '#EFF6FF' : 'rgba(0,98,255,0.15)') : cardBg,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                            }}
                          >
                            {distributionMode === 'group' && (
                              <div>
                                {isSelected ? <CheckSquare size={16} color="#0062FF" /> : <Square size={16} color="#94A3B8" />}
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '12.5px', color: textPrimary }}>{m.fullName}</strong>
                                <span style={{ fontSize: '9.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', background: m.plan === 'business' ? '#7C3AED' : m.plan === 'pro' ? '#0062FF' : '#64748B', color: '#FFFFFF', textTransform: 'uppercase' }}>
                                  {m.plan}
                                </span>
                              </div>
                              <div style={{ fontSize: '11px', color: textSecondary }}>
                                <span style={{ color: '#0062FF', fontWeight: 600 }}>{m.businessName}</span> • {m.email} {m.phone && `• ${m.phone}`}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* AVERTISSEMENT MODE BROADCAST (MODE C) */}
              {distributionMode === 'broadcast' && (
                <div style={{ marginBottom: '22px', padding: '14px 18px', borderRadius: '12px', background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={16} />
                    Diffusion générale confirmée
                  </div>
                  Cette offre promotionnelle sera accessible et visible par les <strong>{merchants.length} commerçants</strong> enregistrés dans la plateforme lors de leur passage en caisse.
                </div>
              )}

              {/* ÉTAPE 2 : PARAMÉTRAGE DE LA RÉDUCTION */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                    Nom de la Campagne *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Offre Fidélité Mars, Relance VIP..."
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${borderCol}`,
                      background: isLight ? '#F8FAFC' : '#0B1120',
                      fontSize: '13px',
                      color: textPrimary,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
                      Code Promotionnel *
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      style={{ background: 'transparent', border: 'none', color: '#0062FF', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      ⚡ Générer un code
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: COMMERCIA-VIP20"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${borderCol}`,
                      background: isLight ? '#F8FAFC' : '#0B1120',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      fontWeight: 800,
                      color: '#0062FF',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Type et Valeur de réduction */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                    Type de Réduction
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setDiscountType('percent')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${discountType === 'percent' ? '#0062FF' : borderCol}`,
                        background: discountType === 'percent' ? (isLight ? '#EFF6FF' : 'rgba(0,98,255,0.15)') : 'transparent',
                        color: discountType === 'percent' ? '#0062FF' : textSecondary,
                        fontWeight: 800,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Percent size={14} /> Pourcentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '8px',
                        border: `1px solid ${discountType === 'fixed' ? '#10B981' : borderCol}`,
                        background: discountType === 'fixed' ? (isLight ? '#ECFDF5' : 'rgba(16,185,129,0.15)') : 'transparent',
                        color: discountType === 'fixed' ? '#10B981' : textSecondary,
                        fontWeight: 800,
                        fontSize: '12.5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <Coins size={14} /> Montant Fixe (FCFA)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                    Valeur de la Remise ({discountType === 'percent' ? '%' : 'FCFA'}) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={discountType === 'percent' ? 100 : 1000000}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${borderCol}`,
                      background: isLight ? '#F8FAFC' : '#0B1120',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: textPrimary,
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Dates de validité & Quotas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '4px' }}>
                    Date de début
                  </label>
                  <input
                    type="date"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', fontSize: '12px', color: textPrimary }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '4px' }}>
                    Date d'expiration
                  </label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', fontSize: '12px', color: textPrimary }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '4px' }}>
                    Quota global d'usages
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={distributionMode === 'personal' ? 1 : maxUses}
                    disabled={distributionMode === 'personal'}
                    onChange={(e) => setMaxUses(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', fontSize: '12px', color: textPrimary }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: textPrimary, display: 'block', marginBottom: '4px' }}>
                    Usages max / client
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxUsesPerUser}
                    onChange={(e) => setMaxUsesPerUser(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: `1px solid ${borderCol}`, background: isLight ? '#F8FAFC' : '#0B1120', fontSize: '12px', color: textPrimary }}
                  />
                </div>
              </div>

              {/* Conditions supplémentaires */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '24px', padding: '14px', borderRadius: '10px', background: isLight ? '#F8FAFC' : '#0B1120', border: `1px solid ${borderCol}` }}>
                {/* Formules éligibles */}
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                    Formules éligibles
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['pro', 'business'].map((plan) => {
                      const isSelected = eligiblePlans.includes(plan);
                      return (
                        <button
                          key={plan}
                          type="button"
                          onClick={() => {
                            setEligiblePlans((prev) =>
                              prev.includes(plan) ? (prev.length > 1 ? prev.filter((p) => p !== plan) : prev) : [...prev, plan]
                            );
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: `1px solid ${isSelected ? '#0062FF' : borderCol}`,
                            background: isSelected ? '#0062FF' : 'transparent',
                            color: isSelected ? '#FFFFFF' : textSecondary,
                            fontWeight: 700,
                            fontSize: '11px',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                          }}
                        >
                          {plan}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Scénarios autorisés */}
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                    Cas d'application
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: textPrimary }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={allowNew}
                        onChange={(e) => setAllowNew(e.target.checked)}
                      />
                      1ère Souscription
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={allowRenewal}
                        onChange={(e) => setAllowRenewal(e.target.checked)}
                      />
                      Renouvellement
                    </label>
                  </div>
                </div>

                {/* Plafond optionnel pour pourcentage */}
                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 800, color: textPrimary, display: 'block', marginBottom: '6px' }}>
                    Plafond max FCFA (Optionnel)
                  </label>
                  <input
                    type="number"
                    placeholder="Aucun plafond"
                    value={maxDiscountCap}
                    onChange={(e) => setMaxDiscountCap(e.target.value === '' ? '' : Number(e.target.value))}
                    style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: `1px solid ${borderCol}`, background: cardBg, fontSize: '11.5px', color: textPrimary }}
                  />
                </div>
              </div>

              {/* Boutons d'action modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: `1px solid ${borderCol}`,
                    background: 'transparent',
                    color: textSecondary,
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#0062FF',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(0, 98, 255, 0.3)',
                  }}
                >
                  <Sparkles size={16} />
                  {isSubmitting ? 'Création en cours...' : 'Activer la Campagne Promotionnelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DE DÉTAIL / AUDIT D'UNE CAMPAGNE */}
      {inspectPromo && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: cardBg,
              borderRadius: '16px',
              border: `1px solid ${borderCol}`,
              maxWidth: '720px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              padding: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0062FF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Audit de la Campagne Promotionnelle
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '18px', fontWeight: 900, color: textPrimary }}>
                  {inspectPromo.name}
                </h3>
              </div>
              <button
                onClick={() => setInspectPromo(null)}
                style={{ background: 'transparent', border: 'none', color: textSecondary, cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Fiche récapitulative */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px', padding: '16px', borderRadius: '12px', background: isLight ? '#F8FAFC' : '#0B1120', border: `1px solid ${borderCol}` }}>
              <div>
                <div style={{ fontSize: '11px', color: textSecondary }}>Code Promo</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#0062FF', fontFamily: 'monospace' }}>
                  {inspectPromo.code}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: textSecondary }}>Remise</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: '#10B981' }}>
                  {inspectPromo.discountType === 'percent' ? `-${inspectPromo.discountValue}%` : `-${Number(inspectPromo.discountValue || 0).toLocaleString('fr-FR')} FCFA`}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: textSecondary }}>Économies réelles</div>
                <div style={{ fontSize: '15px', fontWeight: 900, color: textPrimary }}>
                  {Number(inspectPromo.totalDiscountGiven || 0).toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            </div>

            {/* Bénéficiaires ciblés (si Mode A ou B) */}
            {inspectPromo.distributionType !== 'broadcast' && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: textPrimary, textTransform: 'uppercase' }}>
                  Commerçants ciblés ({inspectPromo.beneficiaries?.length || 0})
                </h4>
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${borderCol}`, borderRadius: '8px' }}>
                  {(!inspectPromo.beneficiaries || inspectPromo.beneficiaries.length === 0) ? (
                    <div style={{ padding: '14px', textAlign: 'center', color: textSecondary, fontSize: '12px' }}>
                      Aucun bénéficiaire enregistré.
                    </div>
                  ) : (
                    inspectPromo.beneficiaries.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          padding: '10px 14px',
                          borderBottom: `1px solid ${borderCol}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                        }}
                      >
                        <div>
                          <strong>{b.user ? `${b.user.firstName} ${b.user.lastName}` : b.userId}</strong>
                          <div style={{ color: textSecondary, fontSize: '11px' }}>{b.user?.email}</div>
                        </div>
                        <div>
                          {b.usedAt ? (
                            <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '999px' }}>
                              ✔ Utilisé le {new Date(b.usedAt).toLocaleDateString('fr-FR')}
                            </span>
                          ) : (
                            <span style={{ background: isLight ? '#F1F5F9' : '#1E293B', color: textSecondary, fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px' }}>
                              Non encore utilisé
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Utilisations réelles enregistrées (Redemptions) */}
            <div>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: textPrimary, textTransform: 'uppercase' }}>
                Historique des Redemptions Réelles ({inspectPromo.redemptions?.length || 0})
              </h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: `1px solid ${borderCol}`, borderRadius: '8px' }}>
                {(!inspectPromo.redemptions || inspectPromo.redemptions.length === 0) ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: textSecondary, fontSize: '12px' }}>
                    Aucun paiement n'a encore consommé ce code promotionnel.
                  </div>
                ) : (
                  inspectPromo.redemptions.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '10px 14px',
                        borderBottom: `1px solid ${borderCol}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <strong>{r.user ? `${r.user.firstName} ${r.user.lastName}` : r.userId}</strong>
                        <div style={{ color: textSecondary, fontSize: '11px' }}>
                          Payé le {new Date(r.createdAt).toLocaleDateString('fr-FR')} à {new Date(r.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#10B981' }}>-{Number(r.discountAmount || 0).toLocaleString('fr-FR')} FCFA</div>
                        <div style={{ fontSize: '11px', color: textSecondary }}>Final: {Number(r.finalAmount || 0).toLocaleString('fr-FR')} FCFA</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: '22px', textAlign: 'right' }}>
              <button
                onClick={() => setInspectPromo(null)}
                style={{
                  background: isLight ? '#0F172A' : '#334155',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  cursor: 'pointer',
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

