import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Award,
  RefreshCw,
  Users,
  Repeat,
  AlertTriangle,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import { api } from '../../services/api';

interface ProfitabilityViewProps {
  adminTheme: 'light' | 'dark';
  onSelectUser: (userId: string) => void;
}

export const ProfitabilityView: React.FC<ProfitabilityViewProps> = ({
  adminTheme,
  onSelectUser,
}) => {
  const [data, setData] = useState<any | null>(null);
  const [timeframe, setTimeframe] = useState<string>('month');
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>(`/admin/analytics/profitability?timeframe=${timeframe}`);
      setData(res);
    } catch (err: any) {
      console.error('Erreur chargement rentabilité:', err);
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isLight = adminTheme === 'light';
  const cardBg = isLight ? '#FFFFFF' : '#0F172A';
  const borderCol = isLight ? '#E2E8F0' : 'rgba(255,255,255,0.08)';
  const textPrimary = isLight ? '#1E293B' : '#F8FAFC';
  const textSecondary = isLight ? '#64748B' : '#94A3B8';

  return (
    <div>
      {/* EN-TÊTE DE LA SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, color: textPrimary, margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={22} color="#10B981" />
            Performance & Rentabilité Clients (SaaS & FinTech)
          </h2>
          <p style={{ color: textSecondary, fontSize: '13px', marginTop: '4px', margin: 0 }}>
            Indicateurs financiers rigoureux (MRR, ARR, ARPU, CAC, LTV, Churn, Rétention) et classement des clients les plus rentables.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {['today', 'week', 'month', 'quarter', 'year', 'all'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                background: timeframe === tf ? '#2563EB' : isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
                color: timeframe === tf ? '#FFFFFF' : textSecondary,
                border: `1px solid ${timeframe === tf ? '#2563EB' : borderCol}`,
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: timeframe === tf ? 700 : 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tf === 'today' ? "Aujourd'hui" : tf === 'week' ? 'Cette semaine' : tf === 'month' ? 'Ce mois' : tf === 'quarter' ? 'Trimestre' : tf === 'year' ? 'Année' : 'Historique'}
            </button>
          ))}

          <button
            onClick={() => loadData()}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: `1px solid ${borderCol}`,
              background: isLight ? '#F1F5F9' : 'rgba(255,255,255,0.06)',
              color: textPrimary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* RAPPEL CRITIQUE CONFORME AU CAHIER DES CHARGES */}
      <div style={{
        background: isLight ? '#EFF6FF' : 'rgba(37, 99, 235, 0.1)',
        borderLeft: '4px solid #2563EB',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '22px',
        fontSize: '12.5px',
        color: isLight ? '#1E40AF' : '#93C5FD',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <Info size={18} style={{ flexShrink: 0 }} />
        <span>
          <strong>Règle financière stricte :</strong> Le chiffre d’affaires brut n’est jamais confondu avec le bénéfice. Le revenu net correspond aux paiements confirmés déduits des remboursements et des commissions opérateurs, et la contribution financière déduit les coûts d'acquisition attribuables.
        </span>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: textSecondary, fontSize: '13px' }}>
          <div className="animate-spin" style={{ width: '28px', height: '28px', border: '3px solid #10B981', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px' }} />
          Calcul des métriques SaaS & IFRS en cours...
        </div>
      ) : !data ? null : (
        <div>
          {/* GRILLE DES 8 INDICATEURS FINANCIERS CLÉS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {/* MRR */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>MRR (REVENU RÉCURRENT MENSUEL)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563EB', marginTop: '4px' }}>
                {data.kpis.mrr.toLocaleString()} <span style={{ fontSize: '13px' }}>XAF</span>
              </div>
              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>Normalisé sur abonnements payants</div>
            </div>

            {/* ARR */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>ARR (REVENU RÉCURRENT ANNUEL)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#4F46E5', marginTop: '4px' }}>
                {data.kpis.arr.toLocaleString()} <span style={{ fontSize: '13px' }}>XAF</span>
              </div>
              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>MRR × 12 mois</div>
            </div>

            {/* ARPU */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>ARPU (REVENU MOYEN / UTILISATEUR)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: textPrimary, marginTop: '4px' }}>
                {data.kpis.arpu.toLocaleString()} <span style={{ fontSize: '13px' }}>XAF</span>
              </div>
              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>Sur l'ensemble des {data.kpis.totalUsers} inscrits</div>
            </div>

            {/* ARPPU */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>ARPPU (MOYENNE / CLIENT PAYANT)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
                {data.kpis.arppu.toLocaleString()} <span style={{ fontSize: '13px' }}>XAF</span>
              </div>
              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>Sur {data.kpis.payingUsers} abonnés payants</div>
            </div>

            {/* CAC */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>CAC (COÛT ACQUISITION MOYEN)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: textPrimary, marginTop: '4px' }}>
                {data.kpis.cac.toLocaleString()} <span style={{ fontSize: '13px' }}>XAF</span>
              </div>
              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>Coûts connus attribuables</div>
            </div>

            {/* LTV */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>LTV (VALEUR VIE CLIENT ESTIMÉE)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0284C7', marginTop: '4px' }}>
                {data.kpis.ltv.toLocaleString()} <span style={{ fontSize: '13px' }}>XAF</span>
              </div>
              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>ARPPU / Taux d'attrition</div>
            </div>

            {/* CHURN RATE */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>CHURN RATE (ATTRITION)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: data.kpis.churnRate > 15 ? '#EF4444' : '#10B981', marginTop: '4px' }}>
                {data.kpis.churnRate} %
              </div>
              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>Clients perdus sur la période</div>
            </div>

            {/* RETENTION RATE */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: textSecondary, fontWeight: 700, textTransform: 'uppercase' }}>RETENTION RATE (RÉTENTION)</div>
              <div style={{ fontSize: '24px', fontWeight: 900, color: '#10B981', marginTop: '4px' }}>
                {data.kpis.retentionRate} %
              </div>
              <div style={{ fontSize: '11px', color: textSecondary, marginTop: '2px' }}>Clients conservés actifs</div>
            </div>
          </div>

          {/* CLASSEMENTS DES MEILLEURS CLIENTS (TOP CLIENTS) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
            {/* Classement 1 : Par Contribution Financière Nette */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="#D97706" />
                  Top Clients par Contribution Financière Nette
                </h3>
                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700 }}>Revenu Net − Coûts</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.rankings.topByContribution.map((client: any, idx: number) => (
                  <div
                    key={client.id}
                    onClick={() => onSelectUser(client.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${borderCol}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, color: idx === 0 ? '#D97706' : textSecondary, fontSize: '14px', width: '20px' }}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: textPrimary, fontSize: '13px' }}>{client.name}</div>
                        <div style={{ fontSize: '11.5px', color: textSecondary }}>{client.businessName} • {client.plan}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#10B981', fontSize: '14px' }}>
                        {client.estimatedContribution.toLocaleString()} XAF
                      </div>
                      <div style={{ fontSize: '10.5px', color: textSecondary }}>
                        CA Net: {client.netRevenue.toLocaleString()} XAF
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Classement 2 : Par Fidélité & Nombre de Renouvellements */}
            <div style={{ background: cardBg, border: `1px solid ${borderCol}`, borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: textPrimary, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Repeat size={18} color="#2563EB" />
                  Top Clients par Fidélité & Renouvellements
                </h3>
                <span style={{ fontSize: '11px', color: '#2563EB', fontWeight: 700 }}>Périodes renouvelées</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {data.rankings.topByLoyalty.map((client: any, idx: number) => (
                  <div
                    key={client.id}
                    onClick={() => onSelectUser(client.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isLight ? '#F8FAFC' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${borderCol}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontWeight: 800, color: idx === 0 ? '#2563EB' : textSecondary, fontSize: '14px', width: '20px' }}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, color: textPrimary, fontSize: '13px' }}>{client.name}</div>
                        <div style={{ fontSize: '11.5px', color: textSecondary }}>Ancienneté: {client.seniorityDays} jours</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#2563EB', fontSize: '14px' }}>
                        {client.renewalCount} renouvellement(s)
                      </div>
                      <div style={{ fontSize: '10.5px', color: textSecondary }}>
                        {client.paymentsCount} paiements confirmés
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
