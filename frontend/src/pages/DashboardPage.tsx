import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Sparkles,
  ChevronRight,
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

interface DashboardPageProps {
  onOpenSaleModal: () => void;
  onOpenExpenseModal: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenSaleModal, onOpenExpenseModal }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [trends, setTrends] = useState<Array<{ date: string; sales: number; expenses: number; profit: number }>>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

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

  return (
    <div className="page-wrapper">
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
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Tableau de Bord</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            Situation financière en direct — Devise : <strong>FCFA</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-primary btn-lg" onClick={onOpenSaleModal}>
            <Plus size={18} />
            <span>+ Nouvelle Vente</span>
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onOpenExpenseModal}>
            <Minus size={18} />
            <span>- Dépense</span>
          </button>
        </div>
      </div>

      {/* AI Copilot Smart Insight Card */}
      {data?.insights && data.insights.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
            border: '1px solid #A7F3D0',
            borderRadius: '16px',
            padding: '18px 22px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                background: '#059669',
                color: '#FFFFFF',
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#065F46', marginBottom: '2px' }}>
                Copilote IA : {data.insights[0].title}
              </div>
              <div style={{ fontSize: '0.88rem', color: '#166534' }}>{data.insights[0].message}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="stat-grid">
        {/* Estimated Profit */}
        <div className="stat-card profit">
          <div>
            <div className="stat-label">Bénéfice estimé aujourd'hui</div>
            <div className="stat-value" style={{ color: today.profit >= 0 ? '#10B981' : '#EF4444' }}>
              {today.profit > 0 ? '+' : ''}
              {today.profit.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              Recettes nettes après déduction des dépenses
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Today Sales */}
        <div className="stat-card sales">
          <div>
            <div className="stat-label">Ventes du jour</div>
            <div className="stat-value">{today.sales.toLocaleString('fr-FR')} FCFA</div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {today.salesCount} vente(s) enregistrée(s)
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <ArrowUpRight size={24} />
          </div>
        </div>

        {/* Today Expenses */}
        <div className="stat-card expenses">
          <div>
            <div className="stat-label">Dépenses du jour</div>
            <div className="stat-value" style={{ color: '#D97706' }}>
              {today.expenses.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>Sorties d'argent déclarées</div>
          </div>
          <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
            <ArrowDownRight size={24} />
          </div>
        </div>

        {/* Pending Debts */}
        <div className="stat-card debt">
          <div>
            <div className="stat-label">Crédits clients en attente</div>
            <div className="stat-value" style={{ color: '#EF4444' }}>
              {debt.total.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px' }}>
              {debt.customerCount} client(s) débiteur(s)
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
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }} /> Ventes
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} /> Dépenses
              </span>
            </div>
          </div>

          <div style={{ width: '100%', height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
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
                  tickFormatter={v => (v >= 1000 ? `${v / 1000}k` : v)}
                />
                <Tooltip
                  formatter={(val: any) => `${Number(val || 0).toLocaleString('fr-FR')} FCFA`}
                  contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                />
                <Area type="monotone" dataKey="sales" name="Ventes" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#expGrad)" />
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
              {data?.recentTransactions?.sales?.map(s => (
                <tr key={s.id}>
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
                      {s.items && s.items.length > 0 ? s.items.map(i => i.name).join(', ') : 'Vente comptoir'}
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
                    +{s.totalAmount.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    {new Date(s.saleDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}

              {data?.recentTransactions?.expenses?.map(e => (
                <tr key={e.id}>
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
                    <div style={{ fontWeight: 600 }}>{e.category}</div>
                    {e.description && <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{e.description}</div>}
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem' }}>Sortie caisse</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#DC2626' }}>
                    -{e.amount.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748B' }}>
                    {new Date(e.expenseDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}

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
    </div>
  );
};
