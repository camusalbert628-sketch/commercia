import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Award, PieChart, Sparkles, Printer } from 'lucide-react';
import { api } from '../services/api';

export const AnalyticsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [repRes, trendRes, catRes, topRes] = await Promise.all([
          api.get<any>('/analytics/weekly-report'),
          api.get<any[]>('/analytics/trends?days=14'),
          api.get<any[]>('/analytics/categories'),
          api.get<any[]>('/analytics/top-products'),
        ]);
        setReport(repRes);
        setTrends(trendRes || []);
        setCategories(catRes || []);
        setTopProducts(topRes || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: '#059669', fontWeight: 700 }}>Calcul de vos statistiques...</div>
      </div>
    );
  }

  const metrics = report?.metrics || {
    totalSales: 0,
    salesCount: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalDebt: 0,
  };

  return (
    <div className="page-wrapper">
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', margin: '0 0 4px 0' }}>Statistiques & Rapport d'Activité</h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: 0 }}>
            Période : {report?.period?.from} au {report?.period?.to} (7 derniers jours)
          </p>
        </div>

        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Printer size={16} />
          <span>Imprimer le rapport</span>
        </button>
      </div>

      {/* AI Automated Recommendation */}
      {report?.recommendation && (
        <div
          style={{
            background: 'linear-gradient(135deg, #ECFDF5 0%, #EFF6FF 100%)',
            border: '1px solid #A7F3D0',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: '#059669',
              color: 'white',
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
              Analyse automatique du Copilote
            </div>
            <div style={{ fontSize: '0.88rem', color: '#1E293B' }}>{report.recommendation}</div>
          </div>
        </div>
      )}

      {/* 3 Main KPIs */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card sales">
          <div>
            <div className="stat-label">Chiffre d'Affaires Hebdo</div>
            <div className="stat-value">{metrics.totalSales.toLocaleString('fr-FR')} FCFA</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              {metrics.salesCount} vente(s) réalisée(s)
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="stat-card expenses">
          <div>
            <div className="stat-label">Charges & Dépenses Hebdo</div>
            <div className="stat-value" style={{ color: '#DC2626' }}>
              {metrics.totalExpenses.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>Dépenses opérationnelles</div>
          </div>
          <div className="stat-icon" style={{ background: '#FEE2E2', color: '#DC2626' }}>
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="stat-card profit">
          <div>
            <div className="stat-label">Bénéfice Net Réel</div>
            <div className="stat-value" style={{ color: metrics.netProfit >= 0 ? '#10B981' : '#EF4444' }}>
              {metrics.netProfit > 0 ? '+' : ''}
              {metrics.netProfit.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              Trésorerie nette générée
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* Daily Performance Bar Chart */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Performance Journalière (14 jours)</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '16px' }}>Ventes (Vert) vs Dépenses (Rouge)</p>
          <div style={{ width: '100%', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => {
                    if (!d || typeof d !== 'string' || !d.includes('-')) return String(d || '');
                    const p = d.split('-');
                    return `${p[2] || ''}/${p[1] || ''}`;
                  }}
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip
                  formatter={(val: any) => `${Number(val || 0).toLocaleString('fr-FR')} FCFA`}
                  contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                />
                <Bar dataKey="sales" name="Ventes" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Dépenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Best Selling Products */}
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Top Articles les Plus Rentables</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '16px' }}>Classement par chiffre d'affaires généré</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topProducts.map((p, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #F1F5F9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#FEF3C7' : '#E2E8F0',
                      color: idx === 0 ? '#D97706' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{p.quantity} unité(s) vendue(s)</div>
                  </div>
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#059669' }}>
                  {p.revenue.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
            ))}

            {topProducts.length === 0 && (
              <div style={{ textAlign: 'center', color: '#94A3B8', padding: '24px' }}>
                Aucune vente enregistrée pour établir le classement.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expense Categories Breakdown */}
      <div className="card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Répartition des Dépenses par Catégorie</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {categories.map((c, idx) => (
            <div
              key={idx}
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                {c.category}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#DC2626' }}>
                {c.amount.toLocaleString('fr-FR')} FCFA
              </div>
            </div>
          ))}

          {categories.length === 0 && (
            <div style={{ color: '#94A3B8', padding: '16px' }}>Aucune dépense enregistrée.</div>
          )}
        </div>
      </div>
    </div>
  );
};
