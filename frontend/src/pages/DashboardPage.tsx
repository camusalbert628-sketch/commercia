import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  AlertCircle,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  X,
  HelpCircle,
  Wallet,
  Camera,
  User as UserIcon,
  Zap,
  Boxes,
  Users,
  Rocket,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../services/api';
import { DashboardData } from '../types';
import { useModals } from '../context/ModalContext';
import { useAuthStore } from '../store/authStore';
import { DashboardSkeleton } from '../components/common/SkeletonLoader';
import { getBusinessProfile } from '../config/businessProfiles';

const TRACKING_MODES_CONFIG = [
  {
    id: 'simple',
    title: 'Mode Simplifié',
    badge: 'Démarrage rapide',
    icon: Zap,
    color: '#0284C7',
    bg: '#F0F9FF',
    border: '#BAE6FD',
    desc: 'Ventes du jour + Dépenses = Bénéfice net estimé en temps réel.',
  },
  {
    id: 'avec_stock',
    title: 'Gestion de Stock & Alertes',
    badge: 'Le plus populaire',
    icon: Boxes,
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    desc: 'Catalogue complet d\'articles, prix d\'achat/vente et alertes avant rupture.',
  },
  {
    id: 'avec_credit',
    title: 'Carnet de Crédits Clients',
    badge: 'Sécurité de caisse',
    icon: Users,
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    desc: 'Suivez qui vous doit de l\'argent, les dates d\'échéance et relances WhatsApp en 1 clic.',
  },
  {
    id: 'complet',
    title: 'Mode Intégral Tout-en-Un',
    badge: 'SaaS Professionnel',
    icon: Rocket,
    color: '#7C3AED',
    bg: '#FAF5FF',
    border: '#DDD6FE',
    desc: 'Ventes + Dépenses + Stocks & Alertes + Crédits + Clôture de Caisse + Copilote IA.',
  },
];

interface DashboardPageProps {
  onOpenSaleModal?: () => void;
  onOpenExpenseModal?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenSaleModal: propOpenSale,
  onOpenExpenseModal: propOpenExpense,
}) => {
  const { user, activeBusinessId, updateUser, setTrackingMode } = useAuthStore();
  const { openSaleModal, openExpenseModal, refreshKey } = useModals();
  const onOpenSaleModal = propOpenSale || openSaleModal;
  const onOpenExpenseModal = propOpenExpense || openExpenseModal;

  const [data, setData] = useState<DashboardData | null>(null);
  const [trends, setTrends] = useState<Array<{ date: string; sales: number; expenses: number; profit: number }>>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [debtors, setDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [hideBanner, setHideBanner] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement | null>(null);

  // Quick Express Sale state (Mode Simplifié)
  const [expressAmount, setExpressAmount] = useState<number | ''>('');
  const [expressLabel, setExpressLabel] = useState('');
  const [expressMethod, setExpressMethod] = useState<'cash' | 'mobile_money'>('cash');
  const [expressLoading, setExpressLoading] = useState(false);
  const [expressSuccess, setExpressSuccess] = useState('');

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          updateUser({ avatarUrl: dataUrl });

          try {
            setAvatarUploading(true);
            await api.put('/auth/profile', { avatarUrl: dataUrl });
          } catch (err) {
            console.warn('Sync avatar notice:', err);
          } finally {
            setAvatarUploading(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const profile = getBusinessProfile(activeBusiness?.profileId || 'epicerie_alimentation');
  const businessName = activeBusiness?.name || (data as any)?.businessName || 'Votre Boutique';
  const userName = user?.firstName || 'Commerçant';
  const currency = activeBusiness?.currency || user?.currency || 'FCFA';

  const [tradeMetrics, setTradeMetrics] = useState<any>(null);

  const trackingMode = activeBusiness?.trackingMode || 'complet';
  const currentModeConfig = TRACKING_MODES_CONFIG.find(m => m.id === trackingMode) || TRACKING_MODES_CONFIG[3];

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, trendsRes, prodRes, custRes, tradeRes] = await Promise.allSettled([
        api.get<DashboardData>('/dashboard'),
        api.get<Array<{ date: string; sales: number; expenses: number; profit: number }>>('/analytics/trends?days=7'),
        api.get<any[]>('/products'),
        api.get<any[]>('/customers?onlyDebtors=true'),
        api.get<any>('/business/trade-dashboard'),
      ]);
      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value);
      }
      if (trendsRes.status === 'fulfilled') {
        setTrends(trendsRes.value || []);
      }
      if (prodRes.status === 'fulfilled') {
        setProducts(prodRes.value || []);
      }
      if (custRes.status === 'fulfilled') {
        setDebtors(custRes.value || []);
      }
      if (tradeRes.status === 'fulfilled') {
        setTradeMetrics(tradeRes.value);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getTradeKpiCalculatedValue = (idx: number, label: string) => {
    const l = label.toLowerCase();

    // 1. Restauration / Boulangerie (Food Prep)
    if (tradeMetrics?.foodPrepMetrics) {
      if (idx === 0 || l.includes('recette') || l.includes('plat') || l.includes('fournée') || l.includes('coût')) {
        return `${tradeMetrics.foodPrepMetrics.recipesCount} recettes au menu`;
      }
      if (idx === 1 || l.includes('portion') || l.includes('prépar') || l.includes('cuisin')) {
        return `${tradeMetrics.foodPrepMetrics.portionsPrepared} portions du jour (${tradeMetrics.foodPrepMetrics.portionsRemaining} rest.)`;
      }
      if (idx === 2 || l.includes('taux') || l.includes('écoulement') || l.includes('vente')) {
        return `${tradeMetrics.foodPrepMetrics.sellThroughRate}% vendues`;
      }
      if (idx === 3 || l.includes('perte') || l.includes('invendu')) {
        return `${tradeMetrics.foodPrepMetrics.portionsLost} pertes enregistrées`;
      }
    }

    // 2. Prestations / Service Orders (Couture, Réparations, Garage, Agence)
    if (tradeMetrics?.serviceOrdersMetrics) {
      if (idx === 0 || l.includes('commande') || l.includes('travaux') || l.includes('chantier') || l.includes('en cours')) {
        return `${tradeMetrics.serviceOrdersMetrics.pendingOrders} commandes actives`;
      }
      if (idx === 1 || l.includes('prêt') || l.includes('livr') || l.includes('essayage') || l.includes('termi')) {
        return `${tradeMetrics.serviceOrdersMetrics.readyOrders} prêtes à livrer / essayer`;
      }
      if (idx === 2 || l.includes('acompte') || l.includes('avance') || l.includes('perçu')) {
        return `${(tradeMetrics.serviceOrdersMetrics.totalAdvanceCollected || 0).toLocaleString('fr-FR')} ${currency}`;
      }
      if (idx === 3 || l.includes('solde') || l.includes('restant') || l.includes('créance') || l.includes('dû')) {
        return `${(tradeMetrics.serviceOrdersMetrics.totalBalanceDue || 0).toLocaleString('fr-FR')} ${currency} restant dû`;
      }
    }

    // 3. Mobile Money
    if (tradeMetrics?.mobileMoneyMetrics) {
      if (idx === 0 || l.includes('commission') || l.includes('revenu') || l.includes('gain')) {
        return `${(tradeMetrics.mobileMoneyMetrics.totalCommissionsEarned || 0).toLocaleString('fr-FR')} ${currency}`;
      }
      if (idx === 1 || l.includes('volume') || l.includes('opération') || l.includes('flux')) {
        return `${tradeMetrics.mobileMoneyMetrics.operationsCount} opérations (${((tradeMetrics.mobileMoneyMetrics.totalVolume || 0) / 1000).toFixed(0)}k vol.)`;
      }
      if (idx === 2 || l.includes('dépôt') || l.includes('retrait') || l.includes('float')) {
        return `${(tradeMetrics.mobileMoneyMetrics.depositsVolume || 0).toLocaleString('fr-FR')} Dép. / ${(tradeMetrics.mobileMoneyMetrics.withdrawalsVolume || 0).toLocaleString('fr-FR')} Ret.`;
      }
      if (idx === 3 || l.includes('caisse') || l.includes('tiroir') || l.includes('écart')) {
        return `${(tradeMetrics.mobileMoneyMetrics.netCashFlow || 0).toLocaleString('fr-FR')} ${currency} (flux tiroir)`;
      }
    }

    // 4. Friperie & Lots commerciaux
    if (tradeMetrics?.lotsMetrics) {
      if (idx === 0 || l.includes('lot') || l.includes('ballot') || l.includes('campagne')) {
        return `${tradeMetrics.lotsMetrics.lotsCount} lots / ballots actifs`;
      }
      if (idx === 1 || l.includes('taux') || l.includes('écoulement')) {
        return `${tradeMetrics.lotsMetrics.averageSellThrough}% écoulés`;
      }
      if (idx === 2 || l.includes('pièce') || l.includes('stock')) {
        return `${tradeMetrics.lotsMetrics.totalPiecesRemaining} pièces restantes`;
      }
      if (idx === 3 || l.includes('marge') || l.includes('bénéfice') || l.includes('rentab')) {
        return `${(tradeMetrics.lotsMetrics.netLotsMargin || 0).toLocaleString('fr-FR')} ${currency} marge nette`;
      }
    }

    // 5. Commerce Général, Quincaillerie, Épicerie
    if (idx === 0 || l.includes('stock') || l.includes('alerte') || l.includes('rupture')) {
      const lowStockCount = tradeMetrics?.generalMetrics?.lowStockCount ?? (data?.stockAlertsCount || products.filter((p: any) => (p.quantity || p.stockQuantity || 0) <= (p.lowStockAlert || p.minStockThreshold || 5)).length);
      return `${lowStockCount} articles en rupture/seuil`;
    }
    if (idx === 1 || l.includes('client') || l.includes('dette') || l.includes('créance')) {
      return `${(tradeMetrics?.generalMetrics?.totalDebtsAmount ?? data?.debt?.total ?? 0).toLocaleString('fr-FR')} ${currency} (${tradeMetrics?.generalMetrics?.debtorsCount ?? data?.debt?.customerCount ?? 0} clients)`;
    }
    if (idx === 2 || l.includes('panier') || l.includes('vente') || l.includes('comptoir')) {
      const todaySalesVal = data?.today?.sales || 0;
      const avgBasket = todaySalesVal ? Math.round(todaySalesVal / Math.max(1, data?.today?.salesCount || 1)) : 0;
      return `${avgBasket.toLocaleString('fr-FR')} ${currency} panier moyen`;
    }
    if (idx === 3 || l.includes('marge') || l.includes('bénéfice') || l.includes('net')) {
      return `${(data?.today?.profit || 0).toLocaleString('fr-FR')} ${currency} bénéfice estimé`;
    }

    return 'Actif & Suivi';
  };

  const handleQuickExpressSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expressAmount || Number(expressAmount) <= 0) return;
    try {
      setExpressLoading(true);
      const amount = Number(expressAmount);
      const label = expressLabel.trim() || 'Vente Comptoir Express';
      await api.post('/sales', {
        items: [{ name: label, quantity: 1, unitPrice: amount }],
        totalAmount: amount,
        paidAmount: amount,
        paymentMethod: expressMethod,
      });
      setExpressAmount('');
      setExpressLabel('');
      setExpressSuccess(`Vente express de ${amount.toLocaleString('fr-FR')} ${currency} enregistrée !`);
      setTimeout(() => setExpressSuccess(''), 4500);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'enregistrement de la vente express.");
    } finally {
      setExpressLoading(false);
    }
  };

  const handleWhatsAppReminder = (debtor: any) => {
    if (!debtor.phone) {
      alert('Aucun numéro de téléphone enregistré pour ce client.');
      return;
    }
    const cleanPhone = debtor.phone.replace(/[^0-9]/g, '');
    const bName = activeBusiness?.name || 'notre boutique';
    const message = encodeURIComponent(
      `Bonjour ${debtor.name}, j'espère que vous allez bien.\nPetit rappel amical de la part de ${bName} concernant votre solde restant de ${Number(debtor.totalOwed || 0).toLocaleString('fr-FR')} ${currency}.\nMerci pour votre confiance et à très bientôt !`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  useEffect(() => {
    fetchDashboard();
  }, [refreshKey, activeBusinessId]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const today = data?.today || { sales: 0, salesCount: 0, expenses: 0, profit: 0 };
  const debt = data?.debt || { total: 0, customerCount: 0 };
  const safeProfit = Number(today.profit || 0);
  const safeRevenue = Number(today.revenue !== undefined ? today.revenue : (today.sales || 0));
  const safeCashCollected = Number(today.cashCollected !== undefined ? today.cashCollected : safeRevenue);
  const safeOperatingExpenses = Number(today.operatingExpenses !== undefined ? today.operatingExpenses : (today.expenses || 0));
  const safeDebtTotal = Number(debt.total || 0);

  const totalStockValue = products.reduce((sum, p) => sum + (Number(p.quantity || 0) * Number(p.sellingPrice || 0)), 0);
  const criticalStockProducts = products.filter(p => Number(p.quantity || 0) <= (Number(p.minStockAlert) || 5));

  const planName = user?.subscription?.planName || 'free';

  return (
    <div className="page-wrapper fade-in">
      {/* Plan Upgrade Reminder Banner */}
      {!hideBanner && planName === 'free' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #0A2540 0%, #004BD6 100%)',
            borderRadius: '16px',
            padding: '16px 22px',
            marginBottom: '20px',
            color: '#FFFFFF',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            boxShadow: '0 8px 24px rgba(0, 98, 255, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
              }}
            >
              🚀
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 800, fontSize: '1.02rem', color: '#FFFFFF' }}>
                  Vous utilisez le Plan Gratuit (Démarrage)
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: '#FF7A00',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontWeight: 800,
                  }}
                >
                  Limite : 15 ventes / jour
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: '#BFDBFE' }}>
                Passez au <strong>Plan Pro (4 500 FCFA/mois)</strong> pour débloquer : Ventes illimitées • Gestion de stock & alertes ruptures • Relances créances WhatsApp • Copilote IA omniscient.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              to="/subscription"
              style={{
                background: '#FF6B00',
                color: '#FFFFFF',
                padding: '9px 18px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.88rem',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(255, 107, 0, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Découvrir le Plan Pro</span>
              <ArrowUpRight size={16} />
            </Link>
            <button
              onClick={() => setHideBanner(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '6px',
              }}
              title="Masquer"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {!hideBanner && planName === 'pro' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
            border: '1px solid #A7F3D0',
            borderRadius: '16px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem' }}>⭐</span>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#065F46' }}>
                Votre boutique tourne sur le Plan Pro (Croissance)
              </span>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#047857' }}>
                Besoin de gérer plusieurs points de vente ou d'isoler la caisse de vos employés ? Découvrez le <strong>Plan Business (12 000 FCFA/mois)</strong>.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/subscription"
              style={{
                color: '#059669',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'underline',
              }}
            >
              Voir avantages Business →
            </Link>
            <button
              onClick={() => setHideBanner(true)}
              style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {!hideBanner && planName === 'business' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
            border: '1px solid #D8B4FE',
            borderRadius: '16px',
            padding: '14px 20px',
            marginBottom: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem' }}>👑</span>
            <div>
              <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#581C87' }}>
                Formule Business VIP Active (Multi-boutiques & Multi-caisses)
              </span>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#7E22CE' }}>
                Accès total illimité débloqué : points de vente multiples, rôles caissiers, exports comptables OHADA et support VIP 24/7.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/subscription"
              style={{
                color: '#7C3AED',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'underline',
              }}
            >
              Gérer l'abonnement Business →
            </Link>
            <button
              onClick={() => setHideBanner(true)}
              style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Welcome Banner & Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Photo de profil cliquable sur le tableau de bord */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={userName}
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3px solid #0062FF',
                  boxShadow: '0 4px 14px rgba(0, 98, 255, 0.22)',
                  display: 'block',
                }}
              />
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0062FF 0%, #FF6B00 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 14px rgba(0, 98, 255, 0.22)',
                }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              title="Changer ma photo de profil"
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                background: '#0062FF',
                color: '#FFFFFF',
                border: '2px solid #FFFFFF',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              <Camera size={12} />
            </button>
            <input
              type="file"
              ref={avatarInputRef}
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>

          <div>
            <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0', fontWeight: 800, color: '#0F172A' }}>
              Bonjour {userName} 👋
            </h1>
            <p style={{ color: '#475569', fontSize: '0.98rem', margin: 0 }}>
              Espace de pilotage <span style={{ color: '#0062FF', fontWeight: 800, fontSize: '1.05rem' }}>{businessName}</span> — Devise : <strong>{currency}</strong>
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, rgba(0, 98, 255, 0.08) 0%, rgba(255, 107, 0, 0.08) 100%)', padding: '4px 12px', borderRadius: '12px', marginTop: '6px', border: '1px solid rgba(0, 98, 255, 0.15)' }}>
              <span style={{ fontSize: '1.05rem' }}>{profile.emoji}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>Secteur : {profile.name}</span>
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>• {profile.tagline || profile.familyName}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={onOpenSaleModal}>
            <Plus size={18} />
            <span>{profile.terminology.quickActionSale || '+ Nouvelle Vente'}</span>
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onOpenExpenseModal}>
            <Minus size={18} />
            <span>- Dépense</span>
          </button>
          {profile.id === 'restauration_repas' && (
            <Link
              to="/food-prep"
              className="btn btn-lg"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                background: '#FFF7ED',
                border: '1.5px solid #FDBA74',
                color: '#C2410C',
                fontWeight: 700,
              }}
            >
              <span>🍲 Préparation du jour</span>
            </Link>
          )}
          {['atelier_couture', 'reparation_telephones_info', 'garage_mecanique', 'services_agence_digitale'].includes(profile.id) && (
            <Link
              to="/service-orders"
              className="btn btn-lg"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                background: '#EEF2FF',
                border: '1.5px solid #C7D2FE',
                color: '#4338CA',
                fontWeight: 700,
              }}
            >
              <span>📋 Commandes & Devis</span>
            </Link>
          )}
          {profile.id === 'friperie_vetements' && (
            <Link
              to="/lots"
              className="btn btn-lg"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                background: '#F5F3FF',
                border: '1.5px solid #DDD6FE',
                color: '#6D28D9',
                fontWeight: 700,
              }}
            >
              <span>📦 Ballots & Lots</span>
            </Link>
          )}
          {profile.id === 'agence_mobile_money' && (
            <Link
              to="/mobile-money"
              className="btn btn-lg"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                background: '#ECFDF5',
                border: '1.5px solid #A7F3D0',
                color: '#047857',
                fontWeight: 700,
              }}
            >
              <span>📲 MoMo & Commissions</span>
            </Link>
          )}
          <Link
            to="/cash"
            className="btn btn-outline btn-lg"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              background: '#FFFFFF',
              borderColor: '#CBD5E1',
              color: '#1E293B',
            }}
          >
            <Wallet size={18} color="#0062FF" />
            <span>Caisse Journalière</span>
          </Link>
        </div>
      </div>

      {/* Interactive Tracking Mode Selector Bar */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '18px',
          border: '1.5px solid #E2E8F0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B' }}>
              Mode de pilotage actif :
            </span>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: currentModeConfig.bg,
                border: `1.5px solid ${currentModeConfig.border}`,
                color: currentModeConfig.color,
                fontWeight: 800,
                fontSize: '0.85rem',
              }}
            >
              <currentModeConfig.icon size={16} />
              <span>{currentModeConfig.title}</span>
              <span style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 700 }}>• {currentModeConfig.badge}</span>
            </div>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#475569', fontWeight: 500 }}>
            {currentModeConfig.desc}
          </div>
        </div>

        {/* 4 Interactive Mode Switcher Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px' }}>
          {TRACKING_MODES_CONFIG.map(m => {
            const isSelected = trackingMode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setTrackingMode(m.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${m.color}` : '1px solid #E2E8F0',
                  background: isSelected ? m.bg : '#F8FAFC',
                  color: isSelected ? m.color : '#475569',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 800 : 600,
                  fontSize: '0.84rem',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 2px 8px ${m.color}22` : 'none',
                }}
              >
                <Icon size={18} style={{ color: isSelected ? m.color : '#94A3B8', flexShrink: 0 }} />
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div>{m.title}</div>
                  <div style={{ fontSize: '0.7rem', color: isSelected ? m.color : '#94A3B8', fontWeight: 500 }}>
                    {m.badge}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. WIDGET DÉDIÉ MODE SIMPLIFIÉ : ENCAISSEMENT EXPRESS SANS STOCK OBLIGATOIRE */}
      {/* ========================================================================= */}
      {trackingMode === 'simple' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
            border: '1.5px solid #BAE6FD',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#0284C7', color: '#FFFFFF', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <Zap size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0369A1' }}>
                  Encaissement Express (Mode Simplifié)
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#0284C7' }}>
                  Enregistrez instantanément une recette comptoir sans gestion lourde de catalogue
                </p>
              </div>
            </div>
            {expressSuccess && (
              <span style={{ background: '#DCFCE7', color: '#15803D', padding: '4px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700 }}>
                ✅ {expressSuccess}
              </span>
            )}
          </div>

          <form onSubmit={handleQuickExpressSale} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: '1 1 180px' }}>
              <input
                type="number"
                placeholder="Montant (ex: 5 000 FCFA)"
                value={expressAmount}
                onChange={e => setExpressAmount(e.target.value === '' ? '' : Number(e.target.value))}
                required
                min={1}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #BAE6FD', fontWeight: 700, fontSize: '0.95rem' }}
              />
            </div>
            <div style={{ flex: '2 1 240px' }}>
              <input
                type="text"
                placeholder="Motif (ex: Vente directe, Coiffure, Repas, Boisson...)"
                value={expressLabel}
                onChange={e => setExpressLabel(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid #BAE6FD', fontSize: '0.9rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setExpressMethod('cash')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: expressMethod === 'cash' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                  background: expressMethod === 'cash' ? '#0284C7' : '#FFFFFF',
                  color: expressMethod === 'cash' ? '#FFFFFF' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                💵 Cash
              </button>
              <button
                type="button"
                onClick={() => setExpressMethod('mobile_money')}
                style={{
                  padding: '9px 12px',
                  borderRadius: '10px',
                  border: expressMethod === 'mobile_money' ? '2px solid #0284C7' : '1px solid #CBD5E1',
                  background: expressMethod === 'mobile_money' ? '#0284C7' : '#FFFFFF',
                  color: expressMethod === 'mobile_money' ? '#FFFFFF' : '#475569',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                📱 Mobile Money
              </button>
            </div>

            <button
              type="submit"
              disabled={expressLoading || !expressAmount}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: 'none',
                background: '#0284C7',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
              }}
            >
              {expressLoading ? 'Enregistrement...' : '⚡ Encaisser en 1 clic'}
            </button>
          </form>

          {/* Quick amount shortcuts */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#0369A1', fontWeight: 600 }}>Montants rapides :</span>
            {[1000, 2500, 5000, 10000, 25000, 50000].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setExpressAmount(val)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #BAE6FD',
                  borderRadius: '16px',
                  padding: '3px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#0284C7',
                  cursor: 'pointer',
                }}
              >
                +{val.toLocaleString('fr-FR')} F
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WIDGET DÉDIÉ GESTION DE STOCK & ALERTES RUPTURES */}
      {/* ========================================================================= */}
      {trackingMode === 'avec_stock' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
            border: '1.5px solid #A7F3D0',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#059669', color: '#FFFFFF', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <Boxes size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#065F46' }}>
                  Gestion de Stock & Alertes Ruptures
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857' }}>
                  Valeur totale du stock magasin : <strong style={{ color: '#059669' }}>{totalStockValue.toLocaleString('fr-FR')} FCFA</strong> ({products.length} référence(s))
                </p>
              </div>
            </div>
            <Link
              to="/products"
              className="btn btn-primary"
              style={{ background: '#059669', borderColor: '#059669', padding: '6px 14px', fontSize: '0.84rem' }}
            >
              Catalogue & Réapprovisionnement &rarr;
            </Link>
          </div>

          {criticalStockProducts.length === 0 ? (
            <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#059669', fontWeight: 700, fontSize: '0.9rem' }}>
              ✅ Tous vos stocks sont au vert ! Aucun article en rupture critique immédiate.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
              {criticalStockProducts.slice(0, 4).map((p: any) => (
                <div
                  key={p.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    border: '1.5px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.88rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 700 }}>
                      ⚠️ Reste : {p.quantity} unité(s) (Seuil : {p.minStockAlert || 5})
                    </div>
                  </div>
                  <Link
                    to="/products"
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#059669',
                      background: '#ECFDF5',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                    }}
                  >
                    + Réappro
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. WIDGET DÉDIÉ CARNET DE CRÉDITS CLIENTS & RELANCES WHATSAPP */}
      {/* ========================================================================= */}
      {trackingMode === 'avec_credit' && (
        <div
          style={{
            background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
            border: '1.5px solid #FDE68A',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(217, 119, 6, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: '#D97706', color: '#FFFFFF', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                <Users size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#92400E' }}>
                  Carnet de Crédits Clients & Relances WhatsApp
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#B45309' }}>
                  Total créances impayées : <strong style={{ color: '#DC2626' }}>{safeDebtTotal.toLocaleString('fr-FR')} FCFA</strong>
                </p>
              </div>
            </div>
            <Link
              to="/customers"
              className="btn btn-primary"
              style={{ background: '#D97706', borderColor: '#D97706', padding: '6px 14px', fontSize: '0.84rem' }}
            >
              Ouvrir le Carnet Complet &rarr;
            </Link>
          </div>

          {debtors.length === 0 ? (
            <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#059669', fontWeight: 700, fontSize: '0.9rem' }}>
              ✅ Aucun crédit en retard ! Tous vos clients sont à jour de règlement.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {debtors.slice(0, 4).map((d: any) => (
                <div
                  key={d.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '1px solid #FDE68A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.92rem' }}>
                      {d.name} {d.phone && <span style={{ fontWeight: 500, color: '#64748B', fontSize: '0.8rem' }}>({d.phone})</span>}
                    </div>
                    <div style={{ color: '#DC2626', fontWeight: 800, fontSize: '0.88rem' }}>
                      Reste à payer : {Number(d.totalOwed || 0).toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleWhatsAppReminder(d)}
                      style={{
                        background: '#25D366',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '10px',
                        padding: '7px 12px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
                      }}
                    >
                      <MessageCircle size={15} />
                      <span>💬 Relancer WhatsApp</span>
                    </button>
                    <Link
                      to="/customers"
                      style={{
                        background: '#EFF6FF',
                        color: '#0062FF',
                        border: '1px solid #BFDBFE',
                        borderRadius: '10px',
                        padding: '7px 12px',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                      }}
                    >
                      Encaisser
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Copilot Smart Insight Card */}
      {data?.insights && data.insights.length > 0 && (
        <div
          className="ai-glow-card"
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #FFF4ED 100%)',
            border: '1.5px solid #BFDBFE',
            borderRadius: '16px',
            padding: '18px 22px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 14px rgba(0, 98, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src="/commercia-logo.png"
              alt="COMMERCIA"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: '#FFFFFF',
                padding: '2px',
                boxShadow: '0 4px 10px rgba(0, 98, 255, 0.25)',
                objectFit: 'contain',
                flexShrink: 0,
                border: '1px solid #E2E8F0',
              }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#08162B', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Copilote IA : {data.insights[0]?.title || 'Copilote COMMERCIA'}</span>
                <span className="brand-tag">COMMERCIA</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#334155' }}>{data.insights[0]?.message || 'Prêt à vous accompagner.'}</div>
            </div>
          </div>
          <Link
            to="/copilot"
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem', flexShrink: 0, textDecoration: 'none' }}
          >
            Consulter le Copilote →
          </Link>
        </div>
      )}

      {/* Stat Cards Grid - Distinctions financières adaptées au mode */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Bénéfice Net Estimé */}
        <div className="stat-card profit" style={{ position: 'relative' }}>
          <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
            <div className="stat-label">Bénéfice net estimé</div>
            <div className="stat-value" style={{ color: safeProfit >= 0 ? '#10B981' : '#EF4444' }}>
              {safeProfit > 0 ? '+' : ''}
              {safeProfit.toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span>{today.grossMarginPercent !== undefined ? `Marge brute : ${today.grossMarginPercent}%` : 'Recettes nettes'}</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setShowWhyModal(true)}
                title="Comprendre le détail du calcul"
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>Pourquoi ?</span>
              </button>
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669', flexShrink: 0 }}>
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Chiffre d'Affaires du jour */}
        <div className="stat-card sales">
          <div>
            <div className="stat-label">Chiffre d'affaires</div>
            <div className="stat-value">{safeRevenue.toLocaleString('fr-FR')} {currency}</div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {Number(today.salesCount || 0)} vente(s) facturée(s)
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <ArrowUpRight size={24} />
          </div>
        </div>

        {/* Encaissements Réels (Cash en main) */}
        <div className="stat-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div>
            <div className="stat-label">Encaissements réels</div>
            <div className="stat-value" style={{ color: '#2563EB' }}>
              {safeCashCollected.toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {today.creditSales && today.creditSales > 0 ? (
                <span style={{ color: '#DC2626' }}>⚠️ {Number(today.creditSales).toLocaleString('fr-FR')} {currency} à crédit</span>
              ) : (
                'Espèces & Mobile Money entrés'
              )}
            </div>
            <Link
              to="/cash"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
                color: '#2563EB',
                fontWeight: 600,
                marginTop: '6px',
                textDecoration: 'none',
              }}
            >
              Session caisse du jour &rarr;
            </Link>
          </div>
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
            <DollarSign size={24} />
          </div>
        </div>

        {/* Dépenses d'exploitation */}
        <div className="stat-card expenses">
          <div>
            <div className="stat-label">Charges d'exploitation</div>
            <div className="stat-value" style={{ color: '#D97706' }}>
              {safeOperatingExpenses.toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {today.personalWithdrawals && today.personalWithdrawals > 0
                ? `Dont ${Number(today.personalWithdrawals).toLocaleString('fr-FR')} ${currency} retirés perso`
                : 'Frais de fonctionnement boutique'}
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <ArrowDownRight size={24} />
          </div>
        </div>

        {/* Crédits clients en attente : affiché si mode avec_credit ou complet */}
        {(trackingMode === 'avec_credit' || trackingMode === 'complet') && (
          <div className="stat-card debt">
            <div>
              <div className="stat-label">Crédits clients en attente</div>
              <div className="stat-value" style={{ color: '#EF4444' }}>
                {safeDebtTotal.toLocaleString('fr-FR')} {currency}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                {Number(debt.customerCount || debtors.length || 0)} client(s) à relancer
              </div>
            </div>
            <div className="stat-icon" style={{ background: '#FEE2E2', color: '#EF4444' }}>
              <AlertCircle size={24} />
            </div>
          </div>
        )}

        {/* Valeur totale du stock : affiché si mode avec_stock */}
        {trackingMode === 'avec_stock' && (
          <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
            <div>
              <div className="stat-label">Valeur du stock marchandise</div>
              <div className="stat-value" style={{ color: '#059669' }}>
                {totalStockValue.toLocaleString('fr-FR')} {currency}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
                {products.length} référence(s) en catalogue
              </div>
            </div>
            <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Boxes size={24} />
            </div>
          </div>
        )}
      </div>

      {/* Trade-Specific KPIs Spotlight */}
      {profile.dashboardKpis && profile.dashboardKpis.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
            border: '1.5px solid #E2E8F0',
            borderRadius: '16px',
            padding: '16px 20px',
            marginBottom: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.2rem' }}>{profile.emoji}</span>
              <strong style={{ fontSize: '0.92rem', color: '#0F172A' }}>
                Indicateurs Clés Métier — {profile.name}
              </strong>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748B', background: '#F1F5F9', padding: '3px 8px', borderRadius: '10px', fontWeight: 600 }}>
              Formules et métriques adaptées à votre activité
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {profile.dashboardKpis.map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {kpi.label}
                    </span>
                    <span style={{ fontSize: '0.62rem', background: '#EFF6FF', color: '#0062FF', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                      MÉTRIQUE RÉELLE
                    </span>
                  </div>
                  <div style={{ fontSize: '1.35rem', color: '#0F172A', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0' }}>
                    {getTradeKpiCalculatedValue(idx, kpi.label)}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '6px', lineHeight: 1.35 }}>
                  {kpi.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Chart & Stock Alert Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Weekly Trend Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Évolution des 7 derniers jours</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Recettes vs Dépenses (FCFA)</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0062FF' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#0062FF' }} /> Ventes
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#FF6B00' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF6B00' }} /> Dépenses
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={Array.isArray(trends) ? trends : []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0062FF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0062FF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B00" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF6B00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => {
                    if (!d || typeof d !== 'string' || !d.includes('-')) return String(d || '');
                    const parts = d.split('-');
                    return `${parts[2] || ''}/${parts[1] || ''}`;
                  }}
                  stroke="#94A3B8"
                  fontSize={12}
                />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={11}
                  tickFormatter={v => (Number(v || 0) >= 1000 ? `${(Number(v || 0) / 1000).toFixed(0)}k` : v)}
                />
                <Tooltip
                  formatter={(val: any) => `${Number(val || 0).toLocaleString('fr-FR')} FCFA`}
                  contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                />
                <Area type="monotone" dataKey="sales" name="Ventes" stroke="#0062FF" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="#FF6B00" strokeWidth={2} fillOpacity={1} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alert Box */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Alertes Stock Critique</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Articles à réapprovisionner</p>
            </div>
            {data?.stockAlertsCount !== undefined && data.stockAlertsCount > 0 && (
              <span className="badge badge-warning">{data.stockAlertsCount} alerte(s)</span>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {data?.stockAlertsCount === 0 ? (
              <div style={{ textAlign: 'center', color: '#10B981', padding: '20px' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tous vos stocks sont au vert !</div>
                <div style={{ fontSize: '0.82rem', color: '#64748B' }}>Aucune rupture immédiate détectée.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '12px',
                    padding: '14px',
                    color: '#92400E',
                    fontSize: '0.88rem',
                  }}
                >
                  ⚠️ Vous avez <strong>{data?.stockAlertsCount} article(s)</strong> avec 5 unités ou moins en stock.
                  Anticipez les commandes auprès de vos fournisseurs pour ne pas perdre de ventes.
                </div>
                <a
                  href="/products"
                  className="btn btn-outline"
                  style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>Voir le stock et réapprovisionner</span>
                  <ChevronRight size={16} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Dernières Transactions</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Détails</th>
                <th>Mode</th>
                <th>Montant</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(data?.recentTransactions?.sales) && data.recentTransactions.sales.map((s: any, idx: number) => {
                const saleTime = s.saleDate ? new Date(s.saleDate) : null;
                const timeStr = saleTime && !isNaN(saleTime.getTime())
                  ? saleTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '--:--';

                return (
                  <tr key={s.id || `sale-${idx}`}>
                    <td>
                      <span
                        style={{
                          background: '#ECFDF5',
                          color: '#059669',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        + Vente
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {s.items && Array.isArray(s.items) && s.items.length > 0
                          ? s.items.map((i: any) => i?.name || 'Article').join(', ')
                          : 'Vente comptoir'}
                      </div>
                      {s.customer && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Client : {s.customer.name}</div>}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>
                        {s.paymentMethod === 'mobile_money'
                          ? '📱 Mobile Money'
                          : s.paymentMethod === 'credit'
                          ? '⏳ Crédit'
                          : '💵 Espèces'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#059669' }}>
                      +{Number(s.totalAmount || 0).toLocaleString('fr-FR')} {currency}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {timeStr}
                    </td>
                  </tr>
                );
              })}

              {Array.isArray(data?.recentTransactions?.expenses) && data.recentTransactions.expenses.map((e: any, idx: number) => {
                const expTime = e.expenseDate ? new Date(e.expenseDate) : null;
                const timeStr = expTime && !isNaN(expTime.getTime())
                  ? expTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '--:--';

                return (
                  <tr key={e.id || `expense-${idx}`}>
                    <td>
                      <span
                        style={{
                          background: '#FEF3C7',
                          color: '#D97706',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        - Dépense
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.category || 'Dépense'}</div>
                      {e.description && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{e.description}</div>}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem' }}>Sortie caisse</span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#DC2626' }}>
                      -{Number(e.amount || 0).toLocaleString('fr-FR')} {currency}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {timeStr}
                    </td>
                  </tr>
                );
              })}

              {(!data?.recentTransactions?.sales?.length && !data?.recentTransactions?.expenses?.length) && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#94A3B8', padding: '32px' }}>
                    Aucune transaction enregistrée aujourd'hui. Cliquez sur "+ Vente" pour commencer !
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pédagogique : Pourquoi ce résultat ? */}
      {showWhyModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    background: '#ECFDF5',
                    color: '#059669',
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                  }}
                >
                  <HelpCircle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', margin: 0 }}>Détail de votre résultat financier</h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                    Explication claire et sans jargon de votre bénéfice du jour
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowWhyModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Explication en langage humain */}
              <div
                style={{
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  color: '#166534',
                }}
              >
                {today.whyExplanation || (
                  `Sur un chiffre d'affaires de ${(today.revenue || today.sales).toLocaleString('fr-FR')} FCFA, vos charges d'exploitation s'élèvent à ${(today.operatingExpenses || today.expenses).toLocaleString('fr-FR')} FCFA. Votre bénéfice estimé est de ${today.profit.toLocaleString('fr-FR')} FCFA.`
                )}
              </div>

              {/* Tableau de décomposition financière */}
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.9rem' }}>
                  <span style={{ color: '#475569' }}>1. Ventes totales (CA) :</span>
                  <strong style={{ color: '#0F172A' }}>+{(today.revenue || today.sales).toLocaleString('fr-FR')} FCFA</strong>
                </div>

                {today.cogs !== undefined && today.cogs > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.9rem', borderTop: '1px dashed #E2E8F0' }}>
                    <span style={{ color: '#475569' }}>2. Coût des marchandises vendues (achat) :</span>
                    <strong style={{ color: '#D97706' }}>-{today.cogs.toLocaleString('fr-FR')} FCFA</strong>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.9rem', borderTop: '1px dashed #E2E8F0' }}>
                  <span style={{ color: '#475569' }}>3. Charges de fonctionnement (loyer, transport...) :</span>
                  <strong style={{ color: '#DC2626' }}>-{(today.operatingExpenses || today.expenses).toLocaleString('fr-FR')} FCFA</strong>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 0 4px',
                    fontSize: '1rem',
                    borderTop: '2px solid #E2E8F0',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: '#0F172A' }}>= Bénéfice Net Estimé :</span>
                  <span style={{ color: today.profit >= 0 ? '#10B981' : '#EF4444' }}>
                    {today.profit >= 0 ? '+' : ''}{today.profit.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              {/* Rapprochement de Trésorerie Cash / MoMo */}
              <div style={{ background: '#EFF6FF', borderRadius: '12px', padding: '14px', border: '1px solid #BFDBFE' }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1E40AF', marginBottom: '6px' }}>
                  Point Trésorerie Réelle (Cash & Mobile Money) :
                </div>
                <div style={{ fontSize: '0.85rem', color: '#1E3A8A', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div>• Encaissements réels entrés : <strong>{(today.cashCollected !== undefined ? today.cashCollected : today.sales).toLocaleString('fr-FR')} FCFA</strong></div>
                  {today.creditSales && today.creditSales > 0 ? (
                    <div>• Ventes à crédit (argent chez les clients) : <strong style={{ color: '#DC2626' }}>{today.creditSales.toLocaleString('fr-FR')} FCFA</strong></div>
                  ) : null}
                  {today.personalWithdrawals && today.personalWithdrawals > 0 ? (
                    <div>• Retraits personnels prélevés : <strong style={{ color: '#D97706' }}>{today.personalWithdrawals.toLocaleString('fr-FR')} FCFA</strong></div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setShowWhyModal(false)} style={{ width: '100%' }}>
                Compris, merci !
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

