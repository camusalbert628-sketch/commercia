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

interface DashboardPageProps {
  onOpenSaleModal?: () => void;
  onOpenExpenseModal?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onOpenSaleModal: propOpenSale,
  onOpenExpenseModal: propOpenExpense,
}) => {
  const { user, activeBusinessId } = useAuthStore();
  const { openSaleModal, openExpenseModal, refreshKey } = useModals();
  const onOpenSaleModal = propOpenSale || openSaleModal;
  const onOpenExpenseModal = propOpenExpense || openExpenseModal;

  const [data, setData] = useState<DashboardData | null>(null);
  const [trends, setTrends] = useState<Array<{ date: string; sales: number; expenses: number; profit: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [hideBanner, setHideBanner] = useState(false);

  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const businessName = activeBusiness?.name || (data as any)?.businessName || 'Votre Boutique';
  const userName = user?.firstName || 'Commerçant';

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, trendsRes] = await Promise.allSettled([
        api.get<DashboardData>('/dashboard'),
        api.get<Array<{ date: string; sales: number; expenses: number; profit: number }>>('/analytics/trends?days=7'),
      ]);
      if (dashRes.status === 'fulfilled') {
        setData(dashRes.value);
      }
      if (trendsRes.status === 'fulfilled') {
        setTrends(trendsRes.value || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [refreshKey, activeBusinessId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: '#059669', fontWeight: 700, fontSize: '1.1rem' }}>
          Chargement de votre copilote...
        </div>
      </div>
    );
  }

  const today = data?.today || { sales: 0, salesCount: 0, expenses: 0, profit: 0 };
  const debt = data?.debt || { total: 0, customerCount: 0 };
  const safeProfit = Number(today.profit || 0);
  const safeRevenue = Number(today.revenue !== undefined ? today.revenue : (today.sales || 0));
  const safeCashCollected = Number(today.cashCollected !== undefined ? today.cashCollected : safeRevenue);
  const safeOperatingExpenses = Number(today.operatingExpenses !== undefined ? today.operatingExpenses : (today.expenses || 0));
  const safeDebtTotal = Number(debt.total || 0);

  const planName = user?.subscription?.planName || 'free';

  return (
    <div className="page-wrapper">
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
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 6px 0', fontWeight: 800, color: '#0F172A' }}>
            Bonjour {userName} 👋
          </h1>
          <p style={{ color: '#475569', fontSize: '0.98rem', margin: 0 }}>
            Voici comment va <span style={{ color: '#0062FF', fontWeight: 800, fontSize: '1.05rem' }}>{businessName}</span> aujourd'hui — Devise : <strong>{user?.currency || 'FCFA'}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary btn-lg" onClick={onOpenSaleModal}>
            <Plus size={18} />
            <span>+ Nouvelle Vente</span>
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onOpenExpenseModal}>
            <Minus size={18} />
            <span>- Dépense</span>
          </button>
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

      {/* AI Copilot Smart Insight Card */}
      {data?.insights && data.insights.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #FFF4ED 100%)',
            border: '1px solid #BFDBFE',
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

      {/* Stat Cards Grid - Distinctions financières rigoureuses */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {/* Bénéfice Net Estimé */}
        <div className="stat-card profit" style={{ position: 'relative' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div className="stat-label">Bénéfice net estimé</div>
              <button
                onClick={() => setShowWhyModal(true)}
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#065F46',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                Pourquoi ?
              </button>
            </div>
            <div className="stat-value" style={{ color: safeProfit >= 0 ? '#10B981' : '#EF4444' }}>
              {safeProfit > 0 ? '+' : ''}
              {safeProfit.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {today.grossMarginPercent !== undefined ? `Marge brute : ${today.grossMarginPercent}%` : 'Recettes nettes après coûts & charges'}
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Chiffre d'Affaires du jour */}
        <div className="stat-card sales">
          <div>
            <div className="stat-label">Chiffre d'affaires</div>
            <div className="stat-value">{safeRevenue.toLocaleString('fr-FR')} FCFA</div>
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
              {safeCashCollected.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {today.creditSales && today.creditSales > 0 ? (
                <span style={{ color: '#DC2626' }}>⚠️ {Number(today.creditSales).toLocaleString('fr-FR')} FCFA à crédit</span>
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
              {safeOperatingExpenses.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {today.personalWithdrawals && today.personalWithdrawals > 0
                ? `Dont ${Number(today.personalWithdrawals).toLocaleString('fr-FR')} F retirés perso`
                : 'Frais de fonctionnement boutique'}
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <ArrowDownRight size={24} />
          </div>
        </div>

        {/* Crédits clients en attente */}
        <div className="stat-card debt">
          <div>
            <div className="stat-label">Crédits clients en attente</div>
            <div className="stat-value" style={{ color: '#EF4444' }}>
              {safeDebtTotal.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {Number(debt.customerCount || 0)} client(s) à relancer
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#FEE2E2', color: '#EF4444' }}>
            <AlertCircle size={24} />
          </div>
        </div>
      </div>


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
                      +{Number(s.totalAmount || 0).toLocaleString('fr-FR')} FCFA
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
                      -{Number(e.amount || 0).toLocaleString('fr-FR')} FCFA
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

