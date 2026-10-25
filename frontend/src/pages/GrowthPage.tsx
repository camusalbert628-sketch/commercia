import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  AlertCircle,
  Sparkles,
  BarChart2,
  Calendar,
  Plus,
  Upload,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  CheckCircle,
  Lock,
  RefreshCw,
  ShoppingBag,
  Edit3,
  Trash2,
  Printer,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Globe,
  Sliders,
  PieChart,
  HelpCircle,
  Package,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { growthService } from '../services/growthService';
import { hasPremiumAccess } from '../services/premiumService';
import {
  AcquisitionChannelData,
  AcquisitionCampaignData,
  GrowthSummary,
  BreakEvenAnalysis,
  ProductProfitabilityData,
  AnalysisPeriodKey,
  GrowthAnalyticsResponse,
} from '../types/growth';

export const GrowthPage: React.FC = () => {
  const navigate = useNavigate();
  const access = hasPremiumAccess();

  // Period filter state
  const [period, setPeriod] = useState<AnalysisPeriodKey>('current_month');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
  );
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().slice(0, 10));

  // Active view tab
  const [activeTab, setActiveTab] = useState<
    'synthese' | 'canaux' | 'campagnes' | 'produits' | 'pointMort' | 'copilote' | 'importExport'
  >('synthese');

  // Data states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<GrowthAnalyticsResponse | null>(null);
  const [channelsList, setChannelsList] = useState<AcquisitionChannelData[]>([]);
  const [campaigns, setCampaigns] = useState<AcquisitionCampaignData[]>([]);
  const [productsProf, setProductsProf] = useState<ProductProfitabilityData[]>([]);
  const [aiReport, setAiReport] = useState<{
    periodLabel: string;
    recommendations: string[];
    dataUsed: { totalSalesAnalyzed: number; totalExpensesAnalyzed: number; activeChannelsCount: number };
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [showAddChannelModal, setShowAddChannelModal] = useState(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [showEditChannelModal, setShowEditChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<AcquisitionChannelData | null>(null);
  const [showCsvImportModal, setShowCsvImportModal] = useState(false);

  // New Channel Form state
  const [newChanName, setNewChanName] = useState('');
  const [newChanType, setNewChanType] = useState('Autre');
  const [newChanDescription, setNewChanDescription] = useState('');

  // New Campaign Form state
  const [newCampName, setNewCampName] = useState('');
  const [newCampChannelId, setNewCampChannelId] = useState('');
  const [newCampBudget, setNewCampBudget] = useState<number | ''>('');
  const [newCampActualSpend, setNewCampActualSpend] = useState<number | ''>('');
  const [newCampLeads, setNewCampLeads] = useState<number | ''>('');
  const [newCampStartDate, setNewCampStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newCampEndDate, setNewCampEndDate] = useState('');
  const [newCampNotes, setNewCampNotes] = useState('');

  // CSV Import State
  const [csvContent, setCsvContent] = useState('');
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvValidationErrors, setCsvValidationErrors] = useState<string[]>([]);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvImportResult, setCsvImportResult] = useState<any | null>(null);

  // Load all analytics data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      setErrorMsg('');

      const [analyticsData, rawChannels, campaignsData, productsData, aiData] = await Promise.all([
        growthService.getAnalytics(
          period,
          period === 'custom' ? customStartDate : undefined,
          period === 'custom' ? customEndDate : undefined
        ),
        growthService.getChannels(),
        growthService.getCampaigns(),
        growthService.getProductsProfitability(),
        growthService.getAiAnalysis(
          period,
          period === 'custom' ? customStartDate : undefined,
          period === 'custom' ? customEndDate : undefined
        ),
      ]);

      setAnalytics(analyticsData);
      setChannelsList(rawChannels);
      setCampaigns(campaignsData);
      setProductsProf(productsData);
      setAiReport(aiData);
    } catch (err: any) {
      console.error('Failed to load growth data:', err);
      setErrorMsg(err.message || 'Impossible de charger les données de croissance.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period, customStartDate, customEndDate]);

  // Handle Channel Creation
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChanName.trim()) return;

    try {
      await growthService.createChannel({
        name: newChanName.trim(),
        type: newChanType,
        description: newChanDescription.trim() || undefined,
      });

      setShowAddChannelModal(false);
      setNewChanName('');
      setNewChanDescription('');
      fetchData();
    } catch (err: any) {
      alert('Erreur création canal : ' + err.message);
    }
  };

  // Handle Channel Update
  const handleUpdateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChannel) return;

    try {
      await growthService.updateChannel(editingChannel.id, {
        name: editingChannel.name,
        type: editingChannel.type,
      });

      setShowEditChannelModal(false);
      setEditingChannel(null);
      fetchData();
    } catch (err: any) {
      alert('Erreur modification canal : ' + err.message);
    }
  };

  // Handle Campaign Creation
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampName.trim() || !newCampChannelId) {
      alert('Veuillez renseigner le nom de la campagne et choisir un canal.');
      return;
    }

    try {
      await growthService.createCampaign({
        name: newCampName.trim(),
        channelId: newCampChannelId,
        budgetPlanned: typeof newCampBudget === 'number' ? newCampBudget : 0,
        actualSpend: typeof newCampActualSpend === 'number' ? newCampActualSpend : 0,
        leadsCount: typeof newCampLeads === 'number' ? newCampLeads : 0,
        startDate: newCampStartDate || undefined,
        endDate: newCampEndDate || undefined,
        notes: newCampNotes.trim() || undefined,
      });

      setShowAddCampaignModal(false);
      setNewCampName('');
      setNewCampBudget('');
      setNewCampActualSpend('');
      setNewCampLeads('');
      setNewCampNotes('');
      fetchData();
    } catch (err: any) {
      alert('Erreur création campagne : ' + err.message);
    }
  };

  // CSV file parser and preview
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);

      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const rows: any[] = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || '';
          });
          rows.push(rowObj);
        }

        if (lines.length <= 1) {
          errors.push('Le fichier CSV est vide ou ne contient que les en-têtes.');
        }

        setCsvPreviewRows(rows);
        setCsvValidationErrors(errors);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteCsvImport = async () => {
    if (!csvContent.trim() || csvPreviewRows.length === 0) {
      alert('Veuillez sélectionner un fichier CSV valide contenant des données.');
      return;
    }

    try {
      setCsvImportLoading(true);
      const res = await growthService.importCampaignsCsv(csvPreviewRows, false);
      setCsvImportResult(res);
      fetchData();
    } catch (err: any) {
      alert('Erreur importation CSV : ' + err.message);
    } finally {
      setCsvImportLoading(false);
    }
  };

  // Export CSV of performance data
  const handleExportCsv = () => {
    if (!analytics || !analytics.channels) return;

    const headers = [
      'Canal',
      'Type',
      'Budget Prévu (FCFA)',
      'Dépenses Réelles (FCFA)',
      'Prospects',
      'Nouveaux Clients',
      'Commandes',
      'Articles Vendus',
      'Chiffre Affaires Net (FCFA)',
      'Coût Marchandises (FCFA)',
      'Charges Variables (FCFA)',
      'Bénéfice Net Après Acquisition (FCFA)',
      'CAC (FCFA/Client)',
      'ROAS (%)',
      'Taux Conversion (%)',
      'Statut Rentabilité',
    ];

    const rows = analytics.channels.map(c => [
      `"${c.name}"`,
      `"${c.type}"`,
      c.budgetPlanned,
      c.acquisitionSpend,
      c.leadsCount,
      c.newCustomersCount,
      c.ordersCount,
      c.itemsSold,
      c.netRevenue,
      c.cogs,
      c.variableCosts,
      c.profitAfterAcquisition,
      c.cac !== null ? c.cac : 'Non calculable',
      c.roas !== null ? `${c.roas}%` : 'Non calculable',
      c.conversionRate !== null ? `${c.conversionRate}%` : 'Non calculable',
      c.isProfitable ? '"Rentable"' : '"Déficitaire"',
    ]);

    const csvContentData = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContentData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `commercia_croissance_cac_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Format FCFA helper
  const fmt = (num?: number | null) => {
    if (num === undefined || num === null) return '0 FCFA';
    return `${Math.round(num).toLocaleString('fr-FR')} FCFA`;
  };

  const summary = analytics?.summary;
  const breakEven = analytics?.breakEven;
  const periodInfo = analytics?.period;

  return (
    <div className="page-wrapper growth-module-container" style={{ paddingBottom: '60px' }}>
      {/* HEADER WITH TITLE, STATUS & ACTION BUTTONS */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '1.75rem', margin: 0, fontWeight: 800, color: '#0F172A' }}>
              Croissance Clients & CAC
            </h1>
            <span
              style={{
                background: '#EFF6FF',
                color: '#0062FF',
                border: '1px solid #BFDBFE',
                padding: '3px 10px',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 800,
              }}
            >
              MODULE EXPERT CROISSANCE
            </span>
          </div>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '4px 0 0 0' }}>
            Calcul rigoureux du Coût d'Acquisition Client (CAC), rentabilité par canal, charges variables et point mort.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={fetchData}
            title="Rafraîchir les calculs"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            <span>Rafraîchir</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowCsvImportModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={15} />
            <span>Importer CSV</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleExportCsv}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={15} />
            <span>Exporter CSV</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={handlePrintReport}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} />
            <span>Imprimer Rapport</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setShowAddCampaignModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Nouvelle Campagne</span>
          </button>
        </div>
      </div>

      {/* SOFT PAYWALL IF FREE PLAN */}
      {access === 'none' && (
        <div
          style={{
            background: '#FFFBEB',
            border: '2px solid #F59E0B',
            borderRadius: '14px',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Lock size={24} color="#D97706" />
            <div>
              <strong style={{ color: '#92400E', fontSize: '1rem' }}>
                Fonctionnalités avancées réservées aux comptes Pro & Business
              </strong>
              <div style={{ color: '#B45309', fontSize: '0.86rem' }}>
                Activez votre abonnement pour débloquer l'attribution multi-canal illimitée, l'analyse prédictive et les recommandations du Copilote IA.
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ background: '#D97706' }}
            onClick={() => navigate('/subscription')}
          >
            Débloquer l'accès complet
          </button>
        </div>
      )}

      {/* PERIOD SELECTOR BAR (SECTION 2 DU CAHIER DES CHARGES) */}
      <div
        className="card"
        style={{
          padding: '12px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="#0062FF" />
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E293B' }}>
            Période d'analyse :
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { key: 'today', label: "Aujourd'hui" },
            { key: 'yesterday', label: 'Hier' },
            { key: 'last_7_days', label: '7 derniers jours' },
            { key: 'last_30_days', label: '30 derniers jours' },
            { key: 'current_month', label: 'Mois en cours' },
            { key: 'previous_month', label: 'Mois précédent' },
            { key: 'quarter', label: 'Trimestre' },
            { key: 'custom', label: 'Période personnalisée' },
          ].map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key as AnalysisPeriodKey)}
              style={{
                fontSize: '0.8rem',
                fontWeight: period === p.key ? 700 : 500,
                padding: '6px 12px',
                borderRadius: '8px',
                border: period === p.key ? '1.5px solid #0062FF' : '1px solid #E2E8F0',
                background: period === p.key ? '#EFF6FF' : '#FFFFFF',
                color: period === p.key ? '#0062FF' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Du</span>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '5px 8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Au</span>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '5px 8px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
            />
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'synthese', label: '📊 Synthèse & Performance' },
          { key: 'canaux', label: '🌐 Canaux d\'Acquisition' },
          { key: 'campagnes', label: '🎯 Campagnes Publicitaires' },
          { key: 'produits', label: '📦 Rentabilité Produits & Services' },
          { key: 'pointMort', label: '⚖️ Seuil de Rentabilité (Point Mort)' },
          { key: 'copilote', label: '🤖 Copilote IA Stratégique' },
          { key: 'importExport', label: '📥 Import / Export CSV' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #0062FF' : '3px solid transparent',
              background: 'transparent',
              color: activeTab === tab.key ? '#0062FF' : '#64748B',
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontSize: '0.92rem',
              cursor: 'pointer',
              marginBottom: '-2px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SYNTHÈSE & PERFORMANCE GLOBALE */}
      {activeTab === 'synthese' && summary && (
        <div>
          {/* AI SYNTHESIS BANNER */}
          <div
            className="card"
            style={{
              padding: '16px 20px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
              border: '1px solid #BFDBFE',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <Sparkles size={20} color="#0062FF" />
              <strong style={{ color: '#0F172A', fontSize: '1rem' }}>
                Synthèse Stratégique COMMERCIA ({periodInfo?.label}) :
              </strong>
            </div>
            <p style={{ color: '#334155', fontSize: '0.94rem', margin: 0, lineHeight: 1.6 }}>
              Sur cette période, vous avez investi <strong>{fmt(summary.totalAcquisitionSpend)}</strong> en acquisition et généré{' '}
              <strong>{summary.totalNewCustomers} nouveaux clients uniques</strong> (soit un CAC moyen global de{' '}
              <strong>{summary.globalCac !== null ? `${Math.round(summary.globalCac).toLocaleString('fr-FR')} FCFA/client` : 'Non calculable'}</strong>).
              Le chiffre d'affaires net réalisé s'élève à <strong>{fmt(summary.totalNetRevenue)}</strong> pour un bénéfice net après acquisition de{' '}
              <strong style={{ color: (summary.totalProfitAfterAcquisition || 0) >= 0 ? '#16A34A' : '#DC2626' }}>
                {fmt(summary.totalProfitAfterAcquisition)}
              </strong>
              {analytics?.bestChannel ? (
                <>
                  . Votre canal le plus rentable est <strong>{analytics.bestChannel.name}</strong> avec{' '}
                  <strong>{fmt(analytics.bestChannel.profitAfterAcquisition)}</strong> de marge nette générée.
                </>
              ) : null}
            </p>
          </div>

          {/* 12 MANDATORY KPI CARDS (SECTION 8 DU CAHIER DES CHARGES) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            {/* 1. Budget Pub Dépensé */}
            <div className="stat-card" style={{ borderLeft: '4px solid #0062FF' }}>
              <div>
                <div className="stat-label">Budget Pub Dépensé</div>
                <div className="stat-value" style={{ color: '#0062FF' }}>{fmt(summary.totalAcquisitionSpend)}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>Dépenses réelles engagées</div>
              </div>
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#0062FF' }}>
                <DollarSign size={22} />
              </div>
            </div>

            {/* 2. Nouveaux Clients Acquis */}
            <div className="stat-card" style={{ borderLeft: '4px solid #10B981' }}>
              <div>
                <div className="stat-label">Nouveaux Clients Acquis</div>
                <div className="stat-value" style={{ color: '#10B981' }}>{summary.totalNewCustomers}</div>
                <div style={{ fontSize: '0.76rem', color: '#059669', marginTop: '4px' }}>
                  Clients uniques ayant acheté
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#ECFDF5', color: '#10B981' }}>
                <Users size={22} />
              </div>
            </div>

            {/* 3. CAC Moyen Global */}
            <div className="stat-card" style={{ borderLeft: '4px solid #FF6B00' }}>
              <div>
                <div className="stat-label">CAC Moyen Global</div>
                <div className="stat-value" style={{ color: '#FF6B00' }}>
                  {summary.globalCac !== null ? `${Math.round(summary.globalCac).toLocaleString('fr-FR')} FCFA` : 'Non calculable'}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Coût par nouveau client réel
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#FFF7ED', color: '#FF6B00' }}>
                <Target size={22} />
              </div>
            </div>

            {/* 4. Chiffre d'Affaires Net Attribué */}
            <div className="stat-card" style={{ borderLeft: '4px solid #8B5CF6' }}>
              <div>
                <div className="stat-label">Chiffre d'Affaires Net</div>
                <div className="stat-value" style={{ color: '#8B5CF6' }}>{fmt(summary.totalNetRevenue)}</div>
                <div style={{ fontSize: '0.76rem', color: '#6D28D9', marginTop: '4px' }}>
                  {summary.totalOrders} commandes payées
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>
                <ShoppingBag size={22} />
              </div>
            </div>

            {/* 5. Coût des Marchandises (COGS) */}
            <div className="stat-card" style={{ borderLeft: '4px solid #64748B' }}>
              <div>
                <div className="stat-label">Coût Marchandises (COGS)</div>
                <div className="stat-value" style={{ color: '#334155' }}>{fmt(summary.totalCogs)}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  {summary.totalItemsSold} articles sortis
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#F1F5F9', color: '#475569' }}>
                <Package size={22} />
              </div>
            </div>

            {/* 6. Charges Variables Totales */}
            <div className="stat-card" style={{ borderLeft: '4px solid #E11D48' }}>
              <div>
                <div className="stat-label">Charges Variables</div>
                <div className="stat-value" style={{ color: '#E11D48' }}>{fmt(summary.totalVariableCosts)}</div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Livraison, emballage, commissions
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#FFE4E6', color: '#E11D48' }}>
                <Sliders size={22} />
              </div>
            </div>

            {/* 7. Bénéfice Après Acquisition */}
            <div
              className="stat-card"
              style={{
                borderLeft: `4px solid ${(summary.totalProfitAfterAcquisition || 0) >= 0 ? '#10B981' : '#EF4444'}`,
                background: (summary.totalProfitAfterAcquisition || 0) >= 0 ? '#F0FDF4' : '#FEF2F2',
              }}
            >
              <div>
                <div className="stat-label">Bénéfice Après Acquisition</div>
                <div
                  className="stat-value"
                  style={{ color: (summary.totalProfitAfterAcquisition || 0) >= 0 ? '#15803D' : '#DC2626' }}
                >
                  {fmt(summary.totalProfitAfterAcquisition)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  CA - COGS - Variables - Pub
                </div>
              </div>
              <div
                className="stat-icon"
                style={{
                  background: (summary.totalProfitAfterAcquisition || 0) >= 0 ? '#DCFCE7' : '#FEE2E2',
                  color: (summary.totalProfitAfterAcquisition || 0) >= 0 ? '#15803D' : '#DC2626',
                }}
              >
                <TrendingUp size={22} />
              </div>
            </div>

            {/* 8. ROAS Global */}
            <div className="stat-card" style={{ borderLeft: '4px solid #3B82F6' }}>
              <div>
                <div className="stat-label">ROAS (Rendement Pub)</div>
                <div className="stat-value" style={{ color: '#3B82F6' }}>
                  {summary.globalRoas !== null ? `${summary.globalRoas}%` : 'Non calculable'}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Chiffre d'Affaires / Dépenses Pub
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#EFF6FF', color: '#3B82F6' }}>
                <PieChart size={22} />
              </div>
            </div>

            {/* 9. Taux de Conversion */}
            <div className="stat-card" style={{ borderLeft: '4px solid #14B8A6' }}>
              <div>
                <div className="stat-label">Taux de Conversion</div>
                <div className="stat-value" style={{ color: '#0D9488' }}>
                  {summary.globalConversionRate !== null ? `${summary.globalConversionRate}%` : 'Non calculable'}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Clients acquis / Prospects ({summary.totalLeads})
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#CCFBF1', color: '#0D9488' }}>
                <Zap size={22} />
              </div>
            </div>

            {/* 10. Panier Moyen (AOV) */}
            <div className="stat-card" style={{ borderLeft: '4px solid #F59E0B' }}>
              <div>
                <div className="stat-label">Panier Moyen (AOV)</div>
                <div className="stat-value" style={{ color: '#D97706' }}>
                  {fmt(summary.averageOrderValue)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  Par commande admissible
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                <ShoppingBag size={22} />
              </div>
            </div>

            {/* 11. Marge Contributive Globale */}
            <div className="stat-card" style={{ borderLeft: '4px solid #065F46' }}>
              <div>
                <div className="stat-label">Marge Contributive</div>
                <div className="stat-value" style={{ color: '#065F46' }}>
                  {fmt(summary.globalContributionMargin)}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  CA net - Coûts variables totaux
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#D1FAE5', color: '#065F46' }}>
                <TrendingUp size={22} />
              </div>
            </div>

            {/* 12. Seuil de Rentabilité (Point Mort) */}
            <div className="stat-card" style={{ borderLeft: '4px solid #7C3AED' }}>
              <div>
                <div className="stat-label">Seuil de Rentabilité</div>
                <div className="stat-value" style={{ color: '#7C3AED' }}>
                  {breakEven?.breakEvenRevenue !== null ? fmt(breakEven?.breakEvenRevenue) : 'En cours'}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: '4px' }}>
                  {breakEven?.breakEvenUnits !== null ? `${breakEven?.breakEvenUnits} unités min.` : 'Charges fixes à couvrir'}
                </div>
              </div>
              <div className="stat-icon" style={{ background: '#EDE9FE', color: '#7C3AED' }}>
                <ShieldCheck size={22} />
              </div>
            </div>
          </div>

          {/* SECTION CLASSEMENT DES CANAUX PAR RENTABILITÉ RÉELLE (SECTION 8) */}
          <div className="card" style={{ padding: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Classement des Canaux par Rentabilité Réelle
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
                  Le classement privilégie le bénéfice net après coûts variables et acquisition (pas seulement le ROAS ou le volume brut).
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                onClick={() => setActiveTab('canaux')}
              >
                Gérer les canaux ({channelsList.length})
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {analytics?.channels.map((chan, idx) => {
                const isProfitable = chan.profitAfterAcquisition > 0;
                const isBreakEven = chan.profitAfterAcquisition === 0;

                return (
                  <div
                    key={chan.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      padding: '14px 18px',
                      background: idx === 0 && isProfitable ? '#F8FAFC' : '#FFFFFF',
                      border: idx === 0 && isProfitable ? '1.5px solid #0062FF' : '1px solid #E2E8F0',
                      borderRadius: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                      <span
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: idx === 0 ? '#FEF3C7' : idx === 1 ? '#E2E8F0' : '#F1F5F9',
                          color: idx === 0 ? '#D97706' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <div>
                        <strong style={{ fontSize: '0.96rem', color: '#0F172A' }}>{chan.name}</strong>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          {chan.type} • {chan.newCustomersCount} clients • Dépenses : {fmt(chan.acquisitionSpend)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                          CAC Unitaire
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FF6B00' }}>
                          {chan.cac !== null ? `${Math.round(chan.cac).toLocaleString('fr-FR')} FCFA` : 'Non calculable'}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                          Chiffre d'Affaires Net
                        </div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#334155' }}>
                          {fmt(chan.netRevenue)}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', minWidth: '130px' }}>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 700 }}>
                          Bénéfice Net
                        </div>
                        <div
                          style={{
                            fontSize: '1.05rem',
                            fontWeight: 800,
                            color: isProfitable ? '#16A34A' : isBreakEven ? '#64748B' : '#DC2626',
                          }}
                        >
                          {isProfitable ? '+' : ''}{fmt(chan.profitAfterAcquisition)}
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '14px',
                          fontSize: '0.76rem',
                          fontWeight: 700,
                          background: isProfitable ? '#DCFCE7' : isBreakEven ? '#F1F5F9' : '#FEE2E2',
                          color: isProfitable ? '#15803D' : isBreakEven ? '#475569' : '#DC2626',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        ● {chan.isProfitable ? 'Rentable' : 'Déficitaire'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VUE DÉTAILLÉE PAR CANAL D'ACQUISITION (SECTION 3) */}
      {activeTab === 'canaux' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Canaux d'Acquisition & Historique</h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                Gérez vos canaux (Facebook, WhatsApp, TikTok, Bouche-à-oreille, etc.) avec leurs budgets et coûts variables.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddChannelModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Nouveau Canal Personnalisé</span>
            </button>
          </div>

          <div className="card" style={{ overflowX: 'auto', padding: 0 }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Canal & Type</th>
                  <th style={{ padding: '12px 10px' }}>Budget Prévu</th>
                  <th style={{ padding: '12px 10px' }}>Dépenses Réelles</th>
                  <th style={{ padding: '12px 10px' }}>Prospects</th>
                  <th style={{ padding: '12px 10px' }}>Nouveaux Clients</th>
                  <th style={{ padding: '12px 10px' }}>Commandes</th>
                  <th style={{ padding: '12px 10px' }}>Chiffre d'Affaires Net</th>
                  <th style={{ padding: '12px 10px' }}>CAC</th>
                  <th style={{ padding: '12px 10px' }}>ROAS</th>
                  <th style={{ padding: '12px 10px' }}>Bénéfice Net</th>
                  <th style={{ padding: '12px 10px' }}>Statut</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {analytics?.channels.map(chan => (
                  <tr key={chan.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <strong style={{ color: '#0F172A', display: 'block' }}>{chan.name}</strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{chan.type}</span>
                    </td>
                    <td style={{ padding: '12px 10px', color: '#64748B' }}>{fmt(chan.budgetPlanned)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0062FF' }}>{fmt(chan.acquisitionSpend)}</td>
                    <td style={{ padding: '12px 10px' }}>{chan.leadsCount}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: '#10B981' }}>{chan.newCustomersCount}</td>
                    <td style={{ padding: '12px 10px' }}>{chan.ordersCount} ({chan.itemsSold} art.)</td>
                    <td style={{ padding: '12px 10px', fontWeight: 600 }}>{fmt(chan.netRevenue)}</td>
                    <td style={{ padding: '12px 10px', fontWeight: 700, color: '#FF6B00' }}>
                      {chan.cac !== null ? `${Math.round(chan.cac).toLocaleString('fr-FR')} F` : 'Non calculable'}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      {chan.roas !== null ? `${chan.roas}%` : 'Non calculable'}
                    </td>
                    <td
                      style={{
                        padding: '12px 10px',
                        fontWeight: 800,
                        color: chan.profitAfterAcquisition >= 0 ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {fmt(chan.profitAfterAcquisition)}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                          background: chan.isProfitable ? '#DCFCE7' : '#FEE2E2',
                          color: chan.isProfitable ? '#15803D' : '#DC2626',
                        }}
                      >
                        {chan.isProfitable ? 'Rentable' : 'Déficitaire'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => {
                          setEditingChannel(chan);
                          setShowEditChannelModal(true);
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#0062FF', cursor: 'pointer', padding: '4px' }}
                        title="Modifier"
                      >
                        <Edit3 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CAMPAGNES PUBLICITAIRES (SECTION 3) */}
      {activeTab === 'campagnes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Campagnes Publicitaires & Suivi des Budgets</h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                Suivez individuellement chaque campagne marketing avec son budget prévu, ses dépenses réelles et ses conversions.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowAddCampaignModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              <span>Créer une Campagne</span>
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Nom de la Campagne</th>
                  <th style={{ padding: '12px 10px' }}>Canal Rattaché</th>
                  <th style={{ padding: '12px 10px' }}>Statut</th>
                  <th style={{ padding: '12px 10px' }}>Budget Prévu</th>
                  <th style={{ padding: '12px 10px' }}>Dépenses Réelles</th>
                  <th style={{ padding: '12px 10px' }}>Prospects</th>
                  <th style={{ padding: '12px 10px' }}>Date Début</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      Aucune campagne enregistrée pour le moment. Cliquez sur « Créer une Campagne » pour démarrer.
                    </td>
                  </tr>
                ) : (
                  campaigns.map(camp => (
                    <tr key={camp.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <strong style={{ color: '#0F172A' }}>{camp.name}</strong>
                      </td>
                      <td style={{ padding: '12px 10px', color: '#0062FF', fontWeight: 600 }}>
                        {camp.channel?.name || 'Général'}
                      </td>
                      <td style={{ padding: '12px 10px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            background: camp.status === 'active' ? '#DCFCE7' : '#F1F5F9',
                            color: camp.status === 'active' ? '#15803D' : '#64748B',
                          }}
                        >
                          {camp.status === 'active' ? 'Active' : camp.status === 'completed' ? 'Terminée' : 'En pause'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', color: '#64748B' }}>{fmt(camp.budgetPlanned)}</td>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: '#0062FF' }}>{fmt(camp.actualSpend)}</td>
                      <td style={{ padding: '12px 10px' }}>{camp.leadsCount}</td>
                      <td style={{ padding: '12px 10px' }}>{camp.startDate.slice(0, 10)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Supprimer la campagne "${camp.name}" ?`)) {
                              await growthService.deleteCampaign(camp.id);
                              fetchData();
                            }
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer', padding: '4px' }}
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: RENTABILITÉ PRODUITS & SERVICES (SECTION 4 DU CAHIER DES CHARGES) */}
      {activeTab === 'produits' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Rentabilité des Produits & Charges Variables</h2>
              <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                Décomposition unitaire des coûts (achat, transport, emballage, livraison vendeur, commission) et calcul du CAC maximal toléré.
              </p>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/stock')}
              style={{ fontSize: '0.85rem' }}
            >
              Gérer le Catalogue de Stock
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px' }}>Produit / Service</th>
                  <th style={{ padding: '12px 10px' }}>Prix Vente</th>
                  <th style={{ padding: '12px 10px' }}>Coût Achat</th>
                  <th style={{ padding: '12px 10px' }}>Charges Variables Unit.</th>
                  <th style={{ padding: '12px 10px' }}>Coût Total Unitaire</th>
                  <th style={{ padding: '12px 10px' }}>Marge Contributive Unit.</th>
                  <th style={{ padding: '12px 10px' }}>CAC Maxi Toléré</th>
                  <th style={{ padding: '12px 10px' }}>Unités Vendues</th>
                  <th style={{ padding: '12px 16px' }}>Marge Totale Réalisée</th>
                </tr>
              </thead>
              <tbody>
                {productsProf.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#64748B' }}>
                      Aucun produit trouvé dans votre catalogue.
                    </td>
                  </tr>
                ) : (
                  productsProf.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <strong style={{ color: '#0F172A', display: 'block' }}>{p.name}</strong>
                        {p.reference && <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Réf: {p.reference}</span>}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 700, color: '#0F172A' }}>{fmt(p.sellingPrice)}</td>
                      <td style={{ padding: '12px 10px', color: '#64748B' }}>{fmt(p.costPrice)}</td>
                      <td style={{ padding: '12px 10px', color: '#E11D48' }}>
                        {fmt(p.unitVariableCosts)}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: '#475569' }}>
                        {fmt(p.costPrice + p.unitVariableCosts)}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#16A34A' }}>
                        {fmt(p.unitContributionMargin)}
                      </td>
                      <td style={{ padding: '12px 10px', fontWeight: 800, color: '#FF6B00' }}>
                        {fmt(p.maxAcceptableCac)}
                      </td>
                      <td style={{ padding: '12px 10px' }}>{p.totalUnitsSold} unités</td>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#15803D' }}>
                        {fmt(p.totalContributionProfit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SEUIL DE RENTABILITÉ & POINT MORT (SECTION 6.H) */}
      {activeTab === 'pointMort' && breakEven && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Calcul du Seuil de Rentabilité (Point Mort)</h2>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
              Déterminez le chiffre d'affaires et le nombre d'unités minimales à vendre pour couvrir l'intégralité des coûts fixes et des dépenses d'acquisition.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #7C3AED' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Point Mort en Chiffre d'Affaires
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#7C3AED', marginTop: '6px' }}>
                {breakEven.breakEvenRevenue !== null ? fmt(breakEven.breakEvenRevenue) : 'Non calculable'}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '8px 0 0 0' }}>
                Niveau de chiffre d'affaires à partir duquel votre activité commence à générer du bénéfice net.
              </p>
            </div>

            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #0062FF' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Nombre Minimal d'Unités à Vendre
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0062FF', marginTop: '6px' }}>
                {breakEven.breakEvenUnits !== null ? `${breakEven.breakEvenUnits.toLocaleString('fr-FR')} unités` : 'Non calculable'}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '8px 0 0 0' }}>
                Quantité physique d'articles ou prestations requise pour atteindre l'équilibre financier complet.
              </p>
            </div>

            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #10B981' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Marge de Sécurité Actuelle
              </div>
              <div
                style={{
                  fontSize: '1.8rem',
                  fontWeight: 800,
                  color: (breakEven.marginOfSafety ?? 0) >= 0 ? '#10B981' : '#EF4444',
                  marginTop: '6px',
                }}
              >
                {breakEven.marginOfSafety !== null ? fmt(breakEven.marginOfSafety) : '0 FCFA'}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '8px 0 0 0' }}>
                Baisse de chiffre d'affaires que vous pouvez supporter avant d'entrer en zone de perte financière.
              </p>
            </div>

            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #FF6B00' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                Budget Pub Maximal Compatible
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B00', marginTop: '6px' }}>
                {fmt(breakEven.maxCompatibleAdBudget)}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '8px 0 0 0' }}>
                Plafond d'investissement publicitaire admissible pour maintenir votre rentabilité sur la période.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', background: '#F8FAFC', border: '1px solid #CBD5E1' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: '0 0 10px 0', color: '#0F172A' }}>
              Détails des Paramètres Comptables Utilisés :
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
              <li>
                <strong>Taux de Marge sur Coûts Variables (TMCV) :</strong> {breakEven.tmcv}%.
              </li>
              <li>
                <strong>Marge Contributive Unitaire Moyenne :</strong> {fmt(breakEven.mcvu)}.
              </li>
              <li>
                <strong>Prix de Vente Moyen :</strong> {fmt(breakEven.avgSellingPrice)}.
              </li>
              <li>
                <strong>Charges Fixes enregistrées :</strong> {fmt(summary?.totalFixedCosts)}.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 6: COPILOTE IA STRATÉGIQUE (SECTION 10 DU CAHIER DES CHARGES) */}
      {activeTab === 'copilote' && aiReport && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={22} color="#0062FF" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Copilote IA — Recommandations Fondées sur Chiffres Réels
              </h2>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              Analyses impartiales basées sur vos marges réelles, coûts d'acquisition et rentabilité nette constatée.
            </p>
          </div>

          {/* Strategic Actions & Recommendations */}
          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                Diagnostic Stratégique COMMERCIA ({aiReport.periodLabel}) :
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#64748B', background: '#F1F5F9', padding: '4px 8px', borderRadius: '8px' }}>
                {aiReport.dataUsed.totalSalesAnalyzed} ventes analysées • {aiReport.dataUsed.totalExpensesAnalyzed} dépenses
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {aiReport.recommendations?.map((rec: string, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '14px 16px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: '3px solid #0062FF',
                    fontSize: '0.92rem',
                    lineHeight: 1.6,
                    color: '#1E293B',
                  }}
                >
                  <CheckCircle size={18} color="#0062FF" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: IMPORT / EXPORT CSV & RAPPORTS (SECTION 9 DU CAHIER DES CHARGES) */}
      {activeTab === 'importExport' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Importation & Exportation des Données</h2>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
              Importez vos fichiers CSV de dépenses publicitaires (Facebook, TikTok, Google) ou vos ventes avec validation stricte.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Import Box */}
            <div className="card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Upload size={22} color="#0062FF" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Importer des Données CSV</h3>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, marginBottom: '16px' }}>
                Importez des campagnes ou dépenses marketing. Les doublons et incohérences sont automatiquement détectés.
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Sélectionner un fichier CSV :
                </label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileUpload}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              {csvPreviewRows.length > 0 && (
                <div style={{ marginBottom: '16px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1E293B', marginBottom: '6px' }}>
                    Aperçu avant importation ({csvPreviewRows.length} lignes trouvées) :
                  </div>
                  <pre style={{ fontSize: '0.72rem', color: '#475569', overflowX: 'auto', margin: 0 }}>
                    {JSON.stringify(csvPreviewRows.slice(0, 3), null, 2)}
                  </pre>
                </div>
              )}

              {csvImportResult && (
                <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#DCFCE7', color: '#16A34A', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                  ✅ {csvImportResult.importedCount} enregistrement(s) importé(s) avec succès !
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleExecuteCsvImport}
                disabled={csvImportLoading || !csvContent.trim()}
                style={{ width: '100%' }}
              >
                {csvImportLoading ? 'Traitement en cours...' : 'Valider et Importer le Fichier'}
              </button>
            </div>

            {/* Export Box */}
            <div className="card" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <Download size={22} color="#10B981" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Exporter les Résultats</h3>
              </div>
              <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, marginBottom: '20px' }}>
                Téléchargez l'intégralité des calculs de rentabilité pour vos présentations, audits d'investisseurs ou clôtures comptables.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportCsv}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                >
                  <Download size={16} />
                  <span>Télécharger l'Export CSV Complet ({period})</span>
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handlePrintReport}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                >
                  <Printer size={16} />
                  <span>Imprimer le Rapport Officiel / Sauvegarder en PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJOUT NOUVEAU CANAL PERSONNALISÉ */}
      {showAddChannelModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Nouveau Canal d'Acquisition</h3>
              <button
                onClick={() => setShowAddChannelModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateChannel}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Nom du canal * (ex: Influenceurs Douala, Radio FM, Prospection directe)
                  </label>
                  <input
                    type="text"
                    required
                    value={newChanName}
                    onChange={e => setNewChanName(e.target.value)}
                    placeholder="Nom du canal"
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Type de canal
                  </label>
                  <select
                    value={newChanType}
                    onChange={e => setNewChanType(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="Réseaux Sociaux">Réseaux Sociaux</option>
                    <option value="Publicité Payante">Publicité Payante</option>
                    <option value="Bouche-à-oreille">Bouche-à-oreille</option>
                    <option value="Influenceurs">Influenceurs</option>
                    <option value="Affiliation">Affiliation</option>
                    <option value="Prospection">Prospection Directe</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Description & Notes
                  </label>
                  <textarea
                    rows={2}
                    value={newChanDescription}
                    onChange={e => setNewChanDescription(e.target.value)}
                    placeholder="Objectif de campagne, liens UTM, contact agence..."
                    style={{ width: '100%', padding: '8px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddChannelModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Créer le Canal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MODIFICATION CANAL */}
      {showEditChannelModal && editingChannel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Modifier le Canal</h3>
              <button
                onClick={() => setShowEditChannelModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateChannel}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Nom du canal *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingChannel.name}
                    onChange={e => setEditingChannel({ ...editingChannel, name: e.target.value })}
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Type de canal
                  </label>
                  <select
                    value={editingChannel.type}
                    onChange={e => setEditingChannel({ ...editingChannel, type: e.target.value })}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="Réseaux Sociaux">Réseaux Sociaux</option>
                    <option value="Publicité Payante">Publicité Payante</option>
                    <option value="Bouche-à-oreille">Bouche-à-oreille</option>
                    <option value="Influenceurs">Influenceurs</option>
                    <option value="Affiliation">Affiliation</option>
                    <option value="Prospection">Prospection Directe</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditChannelModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOUVELLE CAMPAGNE */}
      {showAddCampaignModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Créer une Nouvelle Campagne</h3>
              <button
                onClick={() => setShowAddCampaignModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCampaign}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Nom de la campagne * (ex: Promo Rentrée Scolaire 2026, Black Friday)
                  </label>
                  <input
                    type="text"
                    required
                    value={newCampName}
                    onChange={e => setNewCampName(e.target.value)}
                    placeholder="Nom de la campagne"
                    style={{ width: '100%', padding: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Canal d'acquisition associé *
                  </label>
                  <select
                    required
                    value={newCampChannelId}
                    onChange={e => setNewCampChannelId(e.target.value)}
                    style={{ width: '100%', padding: '8px' }}
                  >
                    <option value="">-- Choisir un canal --</option>
                    {channelsList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Budget prévu (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newCampBudget}
                      onChange={e => setNewCampBudget(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Dépenses réelles (FCFA)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newCampActualSpend}
                      onChange={e => setNewCampActualSpend(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Prospects générés (leads / clics)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={newCampLeads}
                      onChange={e => setNewCampLeads(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Date de début
                    </label>
                    <input
                      type="date"
                      value={newCampStartDate}
                      onChange={e => setNewCampStartDate(e.target.value)}
                      style={{ width: '100%', padding: '8px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                    Notes et observations
                  </label>
                  <textarea
                    rows={2}
                    value={newCampNotes}
                    onChange={e => setNewCampNotes(e.target.value)}
                    placeholder="Détails de l'audience, liens UTM, objectifs de conversion..."
                    style={{ width: '100%', padding: '8px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddCampaignModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Enregistrer la Campagne
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
