import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { BarChart3, TrendingUp, TrendingDown, Award, Sparkles, Printer, Compass, Target, PieChart as PieIcon } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { PageGuideBanner } from '../components/common/PageGuideBanner';

const PIE_COLORS = ['#0062FF', '#FF6B00', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4', '#64748B'];

export const AnalyticsPage: React.FC = () => {
  const { user, activeBusinessId } = useAuthStore();
  const activeBusiness = user?.businesses?.find((b: any) => b.id === activeBusinessId) || user?.businesses?.[0];
  const currency = activeBusiness?.currency || 'XAF';

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

  // 1. Données du Graphe Circulaire / Donut (Répartition des dépenses réelles)
  const pieData = categories.map(c => ({ name: c.category, value: Number(c.amount) || 0 }));

  // 2. Données du Radar Chart (Diagnostic Santé Commerciale 360°)
  const salesVal = metrics.totalSales || 0;
  const expVal = metrics.totalExpenses || 0;
  const profitVal = metrics.netProfit || 0;
  const debtVal = metrics.totalDebt || 0;
  const hasActivity = salesVal > 0 || expVal > 0 || (metrics.salesCount || 0) > 0;

  const rentabiliteScore = salesVal > 0 ? Math.min(100, Math.max(0, Math.round((profitVal / salesVal) * 100))) : 0;
  const chargesScore = salesVal > 0 ? Math.min(100, Math.max(0, Math.round(100 - (expVal / salesVal) * 40))) : (expVal > 0 ? 50 : 0);
  const recouvrementScore = debtVal === 0 ? (salesVal > 0 ? 100 : 0) : Math.max(0, Math.min(100, Math.round(100 - (debtVal / (salesVal || 1)) * 100)));
  const rotationScore = (metrics.salesCount || 0) > 0 ? Math.min(100, Math.max(20, (metrics.salesCount || 1) * 12 + 40)) : 0;
  const regulariteScore = trends.length >= 7 ? 90 : (trends.some(t => t.sales > 0) ? 60 : 0);

  const radarData = [
    { subject: 'Rentabilité Nette', score: rentabiliteScore, fullMark: 100 },
    { subject: 'Maîtrise Charges', score: chargesScore, fullMark: 100 },
    { subject: 'Recouvrement Cash', score: recouvrementScore, fullMark: 100 },
    { subject: 'Rotation Stocks', score: rotationScore, fullMark: 100 },
    { subject: 'Régularité Ventes', score: regulariteScore, fullMark: 100 },
  ];

  const overallHealthScore = hasActivity
    ? Math.round((rentabiliteScore + chargesScore + recouvrementScore + rotationScore + regulariteScore) / 5)
    : null;

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

      <PageGuideBanner
        pageId="analytics"
        title="Analytique, Rentabilité & Diagnostic 360°"
        subtitle="Visualisez la répartition de vos charges, le diagnostic de santé de votre entreprise et l'évolution de vos bénéfices."
        autoDomino={[
          "Tous les graphiques de rentabilité et le diagnostic radar 360° se recalculent en continu après chaque vente et dépense.",
          "Les articles les plus rentables (top produits) sont automatiquement classés par marge réelle et non par simple chiffre d'affaires.",
          "Le Copilote IA génère une recommandation stratégique hebdomadaire sur-mesure pour votre secteur d'activité.",
        ]}
        manualActions={[
          "Analyser le diagramme circulaire des dépenses pour identifier le poste de coût qui pèse le plus lourd.",
          "Imprimer ou exporter le rapport périodique pour vos déclarations ou vos rendez-vous bancaires.",
          "Ajuster vos prix de vente sur les articles dont la marge est trop faible.",
        ]}
        concreteExample="Le radar indique un score de recouvrement faible (45%) mais une excellente rentabilité (85%). Cela signifie que vous vendez avec de bonnes marges mais que vos clients tardent trop à payer leurs crédits : vous devez lancer une campagne de relance immédiate."
      />

      {/* AI Automated Recommendation */}
      {report?.recommendation && (
        <div
          style={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #FFF4ED 100%)',
            border: '1px solid #BFDBFE',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 4px 14px rgba(0, 98, 255, 0.08)',
          }}
        >
          <img
            src="/commercia-logo.png"
            alt="COMMERCIA"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#FFFFFF',
              padding: '3px',
              boxShadow: '0 4px 12px rgba(0, 98, 255, 0.25)',
              objectFit: 'contain',
              flexShrink: 0,
              border: '1px solid #E2E8F0',
            }}
          />
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#08162B', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>Analyse automatique du Copilote</span>
              <span className="brand-tag">COMMERCIA</span>
            </div>
            <div style={{ fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>{report.recommendation}</div>
          </div>
        </div>
      )}

      {/* 3 Main KPIs */}
      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card sales">
          <div>
            <div className="stat-label">Chiffre d'Affaires Hebdo</div>
            <div className="stat-value">{metrics.totalSales.toLocaleString('fr-FR')} {currency}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
              {metrics.salesCount} vente(s) réalisée(s)
            </div>
          </div>
          <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0062FF' }}>
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="stat-card expenses">
          <div>
            <div className="stat-label">Charges & Dépenses Hebdo</div>
            <div className="stat-value" style={{ color: '#FF6B00' }}>
              {metrics.totalExpenses.toLocaleString('fr-FR')} {currency}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>Dépenses opérationnelles</div>
          </div>
          <div className="stat-icon" style={{ background: '#FFF4ED', color: '#FF6B00' }}>
            <TrendingDown size={24} />
          </div>
        </div>

        <div className="stat-card profit">
          <div>
            <div className="stat-label">Bénéfice Net Réel</div>
            <div className="stat-value" style={{ color: metrics.netProfit >= 0 ? '#10B981' : '#EF4444' }}>
              {metrics.netProfit > 0 ? '+' : ''}
              {metrics.netProfit.toLocaleString('fr-FR')} {currency}
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
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '16px' }}>Ventes (Bleu COMMERCIA) vs Dépenses (Orange)</p>
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
                  formatter={(val: any) => `${Number(val || 0).toLocaleString('fr-FR')} ${currency}`}
                  contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                />
                <Bar dataKey="sales" name="Ventes" fill="#0062FF" radius={[5, 5, 0, 0]} />
                <Bar dataKey="expenses" name="Dépenses" fill="#FF6B00" radius={[5, 5, 0, 0]} />
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
                  {p.revenue.toLocaleString('fr-FR')} {currency}
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

      {/* Advanced Visual Analytics: Graphe Circulaire & Radar Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {/* 1. Graphe Circulaire (Pie/Donut) */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieIcon size={18} color="#FF6B00" />
              <span>Graphe Circulaire des Charges</span>
            </h3>
            <span style={{ fontSize: '0.78rem', background: '#FFF4ED', color: '#FF6B00', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
              Répartition en %
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '12px' }}>
            Part relative de chaque catégorie de dépense dans le budget opérationnel
          </p>

          {pieData.length > 0 ? (
            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => `${Number(val || 0).toLocaleString('fr-FR')} ${currency}`}
                    contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    wrapperStyle={{ fontSize: '0.8rem', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              style={{
                height: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                textAlign: 'center',
                padding: '20px',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1',
              }}
            >
              <PieIcon size={38} color="#94A3B8" style={{ marginBottom: '10px', opacity: 0.7 }} />
              <strong style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '4px' }}>
                Aucune dépense enregistrée sur cette période
              </strong>
              <p style={{ fontSize: '0.80rem', margin: 0, maxWidth: '280px', color: '#64748B', lineHeight: 1.5 }}>
                Enregistrez vos premières charges dans le module Dépenses pour visualiser leur répartition en direct.
              </p>
            </div>
          )}
        </div>

        {/* 2. Radar Chart (Toile d'araignée: Santé Commerciale 360°) */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} color="#0062FF" />
              <span>Radar de Performance Commerciale 360°</span>
            </h3>
            <span
              style={{
                fontSize: '0.8rem',
                background: hasActivity ? '#EFF6FF' : '#F1F5F9',
                color: hasActivity ? '#0062FF' : '#64748B',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              {hasActivity ? `Score : ${overallHealthScore}/100` : 'En attente'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '12px' }}>
            Évaluation multidimensionnelle : Marges, Dépenses, Recouvrement, Stock & Fréquence
          </p>

          {hasActivity ? (
            <div style={{ width: '100%', height: '280px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#CBD5E1" fontSize={10} />
                  <Radar
                    name="Score Boutique"
                    dataKey="score"
                    stroke="#0062FF"
                    fill="#0062FF"
                    fillOpacity={0.45}
                  />
                  <Tooltip
                    formatter={(val: any) => [`${val} / 100`, 'Indice']}
                    contentStyle={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              style={{
                height: '280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                textAlign: 'center',
                padding: '20px',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1',
              }}
            >
              <Target size={38} color="#94A3B8" style={{ marginBottom: '10px', opacity: 0.7 }} />
              <strong style={{ color: '#475569', fontSize: '0.92rem', marginBottom: '4px' }}>
                En attente de vos premières opérations
              </strong>
              <p style={{ fontSize: '0.80rem', margin: 0, maxWidth: '280px', color: '#64748B', lineHeight: 1.5 }}>
                Enregistrez vos premières ventes et dépenses pour que le diagnostic 360° s'affiche.
              </p>
            </div>
          )}
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
                {c.amount.toLocaleString('fr-FR')} {currency}
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
